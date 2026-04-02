import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import { createOrUpdateCheckoutPendingSubscription, getBillingCustomerByWorkspaceId, upsertBillingCustomer } from '@/lib/db/billing';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });

    if (!workspace) {
        return NextResponse.json(
            { error: 'No workspace found' },
            { status: 403 }
        );
    }

    // Already paid
    if (workspace.tier === 'pro' || workspace.tier === 'enterprise') {
        return NextResponse.json(
            { error: 'Already subscribed', redirect: '/dashboard' },
            { status: 400 }
        );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!stripeKey || !priceId) {
        console.error('[CHECKOUT_SESSION] Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID');
        return NextResponse.json(
            { error: 'Billing configuration error' },
            { status: 500 }
        );
    }

    const stripe = new Stripe(stripeKey);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.payflux.dev';

    try {
        // Pre-flight: verify billing store is writable before sending user to pay.
        // If the database is down, we want to fail here (cheap to retry) rather than
        // after payment (expensive support ticket).
        const { getDbPool } = await import('@/lib/db/client');
        const pool = await getDbPool();
        await pool.query('SELECT 1');

        let billingCustomer = await getBillingCustomerByWorkspaceId(workspace.workspaceRecordId);
        if (!billingCustomer) {
            const client = await clerkClient();
            const user = await client.users.getUser(userId);
            const primaryEmail = user.emailAddresses?.find(
                (email) => email.id === user.primaryEmailAddressId
            )?.emailAddress ?? null;

            const stripeCustomer = await stripe.customers.create({
                email: primaryEmail ?? undefined,
                name: workspace.workspaceName,
                metadata: {
                    workspaceId: workspace.workspaceRecordId,
                    clerkOrgId: workspace.workspaceId,
                },
            });

            billingCustomer = await upsertBillingCustomer({
                workspaceId: workspace.workspaceRecordId,
                stripeCustomerId: stripeCustomer.id,
                email: primaryEmail,
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            customer: billingCustomer.stripe_customer_id,
            success_url: `${appUrl}/activate`,
            cancel_url: `${appUrl}/upgrade?cancelled=true`,
            metadata: {
                workspaceId: workspace.workspaceRecordId,
                clerkOrgId: workspace.workspaceId,
                workspaceName: workspace.workspaceName,
            },
            subscription_data: {
                metadata: {
                    workspaceId: workspace.workspaceRecordId,
                    clerkOrgId: workspace.workspaceId,
                },
            },
        });

        if (!session.url) {
            console.error('[CHECKOUT_SESSION] Stripe returned session without URL', { sessionId: session.id });
            return NextResponse.json(
                { error: 'Checkout session created but no redirect URL returned' },
                { status: 502 }
            );
        }

        // Emit checkout_started — user is being redirected to Stripe
        await createOrUpdateCheckoutPendingSubscription({
            workspaceId: workspace.workspaceRecordId,
            billingCustomerId: billingCustomer.id,
            checkoutSessionId: session.id,
            stripePriceId: priceId,
            grantsTier: 'pro',
        });

        logOnboardingEvent('checkout_started', {
            userId,
            workspaceId: workspace.workspaceRecordId,
            metadata: { sessionId: session.id, clerkOrgId: workspace.workspaceId },
        });

        return NextResponse.json({ url: session.url });
    } catch (err) {
        console.error('[CHECKOUT_SESSION] Failed to create Stripe checkout session:', err);

        // Distinguish DB connectivity failures from Stripe failures
        const isDatabaseError = (err as Error).message?.includes('pool') ||
            (err as Error).message?.includes('ECONNREFUSED') ||
            (err as Error).message?.includes('timeout');
        
        if (isDatabaseError) {
            return NextResponse.json(
                { error: 'Our billing system is temporarily unavailable. Please try again in a few minutes.' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Something went wrong starting payment. Please try again.' },
            { status: 502 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { getAppUrl } from '@/lib/app-url';
import { createCheckoutSession } from '@/lib/billing/createCheckoutSession';
import { resolveOrCreateActiveWorkspace } from '@/lib/active-workspace';

type CheckoutPlan = 'pro';

function resolvePriceId(plan: CheckoutPlan): string | null {
    switch (plan) {
        case 'pro':
            return process.env.STRIPE_PRICE_ID_PRO ?? null;
        default:
            return null;
    }
}

function resolvePrimaryEmail(user: any): string | null {
    const primaryEmailId = user.primaryEmailAddressId;
    const primary = user.emailAddresses?.find(
        (email: any) => email.id === primaryEmailId
    );
    return primary?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress ?? null;
}

export async function POST(request: Request) {
    try {
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return NextResponse.json({ error: 'Stripe billing is not configured' }, { status: 500 });
        }

        const body = await request.json().catch(() => ({}));
        const requestedPlan = body?.plan === 'pro' ? ('pro' as const) : null;
        const plan: CheckoutPlan = requestedPlan ?? 'pro';
        const priceId = resolvePriceId(plan);
        if (!priceId) {
            return NextResponse.json({ error: 'Stripe price is not configured' }, { status: 500 });
        }

        // No client-side subscription preflight: Stripe enforces customer-
        // level uniqueness on checkout, and the workspace-centric source of
        // truth lives in lib/db/billing.ts (written by the tracked Phase 2
        // webhook handler). The user-centric cache this used to read is no
        // longer kept in sync with prod, so checking it would give stale
        // answers — Stripe's own validation is the right gate.

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const email = resolvePrimaryEmail(user);
        if (!email) {
            return NextResponse.json({ error: 'Email required for checkout' }, { status: 400 });
        }

        const workspace = await resolveOrCreateActiveWorkspace(userId, orgId ?? null);

        try {
            const { initBillingStore } = await import('@/lib/billing/store');
            await initBillingStore();
        } catch (error) {
            console.error('checkout_preflight_failed:', (error as Error).message);
            return NextResponse.json(
                { error: 'Billing system is temporarily unavailable. Please try again in a few minutes.' },
                { status: 503 }
            );
        }

        const session = await createCheckoutSession(
            userId,
            workspace.workspaceId,
            email,
            priceId,
            getAppUrl(request)
        );

        if (!session.url) {
            return NextResponse.json({ error: 'Checkout session missing URL' }, { status: 500 });
        }

        return NextResponse.json({ url: session.url });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('checkout_session_failed:', message);

        const lowered = message.toLowerCase();
        if (lowered.includes('invalid api key')) {
            return NextResponse.json(
                {
                    error:
                        'Billing is temporarily unavailable right now. Please contact support@payflux.com and we will fix it.',
                },
                { status: 503 }
            );
        }

        if (lowered.includes('stripe')) {
            return NextResponse.json(
                {
                    error:
                        'We could not reach our billing provider right now. Please try again in a few minutes.',
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'We could not start checkout right now. Please try again in a minute.' },
            { status: 500 }
        );
    }
}

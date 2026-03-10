import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { resolveWorkspace } from '@/lib/resolve-workspace';
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

    const workspace = await resolveWorkspace(userId);

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

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?checkout=success`,
        cancel_url: `${appUrl}/checkout?cancelled=true`,
        metadata: {
            workspaceId: workspace.workspaceId,
            workspaceName: workspace.workspaceName,
        },
        subscription_data: {
            metadata: {
                workspaceId: workspace.workspaceId,
            },
        },
    });

    return NextResponse.json({ url: session.url });
}

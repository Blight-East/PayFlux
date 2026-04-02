export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

import { resolveWorkspace } from '@/lib/resolve-workspace';
import { getBillingCustomerByWorkspaceId } from '@/lib/db/billing';

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        return NextResponse.json({ error: 'Stripe billing is not configured' }, { status: 500 });
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    const customer = await getBillingCustomerByWorkspaceId(workspace.workspaceRecordId);
    if (!customer?.stripe_customer_id) {
        return NextResponse.json(
            { error: 'No billing account found. If you recently subscribed, please refresh and try again.' },
            { status: 404 }
        );
    }

    const stripe = new Stripe(stripeKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.payflux.dev';

    const session = await stripe.billingPortal.sessions.create({
        customer: customer.stripe_customer_id,
        configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || undefined,
        return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: session.url });
}

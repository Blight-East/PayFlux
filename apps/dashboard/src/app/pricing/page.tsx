import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import PricingClient from './PricingClient';
import { getUserSubscription, hasActiveSubscription, reconcileOrphanedSubscription } from '@/lib/billing/subscriptions';
import { resolveOrCreateActiveWorkspace } from '@/lib/active-workspace';
import { getBillingStatusFromWorkspaceMetadata } from '@/lib/billing/getBillingStatus';

const CHECKOUT_MESSAGES: Record<string, string> = {
    cancelled: 'You cancelled checkout — no payment was taken. Ready to try again?',
    missing_session: 'Something went wrong starting payment. Please try again.',
    pending: 'Your payment is still processing. This usually takes a few seconds — please refresh this page.',
    verification_failed:
        'We received your payment but had trouble activating your account. ' +
        'If you were charged, we\'ll sort this out — please contact support@payflux.com.',
    service_unavailable: 'Our billing system is temporarily unavailable. Please try again in a few minutes.',
};

type PricingPageProps = {
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
    const { userId, orgId } = await auth();
    if (!userId) {
        redirect('/sign-in');
    }

    let workspace: Awaited<ReturnType<typeof resolveOrCreateActiveWorkspace>> | null = null;
    try {
        workspace = await resolveOrCreateActiveWorkspace(userId, orgId ?? null);
    } catch {
        workspace = null;
    }

    try {
        const subscription = await getUserSubscription(userId);
        if (hasActiveSubscription(subscription?.status)) {
            redirect('/dashboard');
        }

        const metadataBillingStatus = getBillingStatusFromWorkspaceMetadata(workspace);
        if (metadataBillingStatus === 'active' || metadataBillingStatus === 'past_due') {
            redirect('/dashboard');
        }

        // Reconciliation sweep: if no local subscription exists but the user
        // has already paid via Stripe (e.g. webhook was missed, redirect failed),
        // auto-heal by querying Stripe directly and creating the local record.
        if (!subscription || !hasActiveSubscription(subscription.status)) {
            const healed = await reconcileOrphanedSubscription(userId, workspace?.workspaceId ?? null);
            if (healed && hasActiveSubscription(healed.status)) {
                redirect('/dashboard');
            }
        }
    } catch (error) {
        console.error('Subscription check failed:', (error as Error).message);
        // Continue to pricing page — let user subscribe
    }

    const params = (await searchParams) ?? {};
    const checkoutRaw = params.checkout;
    const checkoutState = Array.isArray(checkoutRaw) ? checkoutRaw[0] : checkoutRaw;

    return (
        <PricingClient
            checkoutConfigured={Boolean(process.env.STRIPE_PRICE_ID_PRO)}
            initialError={checkoutState ? CHECKOUT_MESSAGES[checkoutState] ?? null : null}
        />
    );
}

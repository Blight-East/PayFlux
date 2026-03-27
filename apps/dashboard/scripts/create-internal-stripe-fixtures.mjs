import Stripe from 'stripe';

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function main() {
    const email = process.env.INTERNAL_VERIFY_EMAIL ?? 'internal+phase2-verify@payflux.dev';
    const priceId = getEnv('STRIPE_PRICE_ID');
    const workspaceId = process.env.INTERNAL_VERIFY_WORKSPACE_ID ?? null;
    const appUrl = (process.env.INTERNAL_VERIFY_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.payflux.dev').replace(/\/$/, '');
    const stripe = new Stripe(getEnv('STRIPE_SECRET_KEY'), {
        apiVersion: '2026-01-28.clover',
    });

    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    const customer = existingCustomers.data[0] ?? await stripe.customers.create({
        email,
        metadata: {
            internal_verification: 'true',
            ...(workspaceId ? { workspaceId } : {}),
        },
    });

    const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 5,
        status: 'all',
    });

    const existingSubscription = subscriptions.data.find((subscription) =>
        subscription.metadata?.internal_verification === 'true'
    );

    const subscription = existingSubscription ?? await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        trial_period_days: 14,
        metadata: {
            internal_verification: 'true',
            ...(workspaceId ? { workspaceId } : {}),
        },
    });

    const accountCandidates = await stripe.accounts.list({ limit: 100 });
    const connectedAccount =
        accountCandidates.data.find((account) =>
            account.email === email && account.metadata?.internal_verification === 'true'
        ) ??
        await stripe.accounts.create({
            type: 'standard',
            country: 'US',
            email,
            metadata: {
                internal_verification: 'true',
                ...(workspaceId ? { workspaceId } : {}),
            },
        });

    const onboardingLink = await stripe.accountLinks.create({
        account: connectedAccount.id,
        refresh_url: `${appUrl}/connect?refresh=1`,
        return_url: `${appUrl}/connect?return=1`,
        type: 'account_onboarding',
    });

    const platformAccount = await stripe.accounts.retrieve();

    console.log(JSON.stringify({
        customerId: customer.id,
        subscriptionId: subscription.id,
        connectedAccountId: connectedAccount.id,
        connectedAccountType: connectedAccount.type,
        connectedAccountChargesEnabled: connectedAccount.charges_enabled,
        connectedAccountPayoutsEnabled: connectedAccount.payouts_enabled,
        connectedAccountDetailsSubmitted: connectedAccount.details_submitted,
        connectedAccountEmail: connectedAccount.email,
        connectedAccountOnboardingUrl: onboardingLink.url,
        platformAccountId: platformAccount.id,
        workspaceId,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

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
            type: 'express',
            country: 'US',
            email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_profile: {
                url: 'https://payflux.dev/internal-verification',
                product_description: 'Internal PayFlux verification account',
            },
            metadata: {
                internal_verification: 'true',
                ...(workspaceId ? { workspaceId } : {}),
            },
        });

    const platformAccount = await stripe.accounts.retrieve();

    console.log(JSON.stringify({
        customerId: customer.id,
        subscriptionId: subscription.id,
        connectedAccountId: connectedAccount.id,
        platformAccountId: platformAccount.id,
        workspaceId,
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});

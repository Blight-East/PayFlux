import { getOrCreateCustomer } from './customer';
import { stripe } from './stripeClient';

export async function createCheckoutSession(
    userId: string,
    workspaceId: string,
    email: string,
    priceId: string,
    appUrl: string
) {
    const customerId = await getOrCreateCustomer(userId, email);
    const checkoutIdempotencyKey = [
        'checkout',
        userId,
        workspaceId,
        priceId,
        Math.floor(Date.now() / 60_000),
    ].join(':');

    const session = await stripe.checkout.sessions.create(
        {
            customer: customerId,
            client_reference_id: userId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            metadata: {
                userId,
                workspaceId,
            },
            subscription_data: {
                metadata: {
                    userId,
                    workspaceId,
                },
            },
            success_url: `${appUrl}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/pricing?checkout=cancelled`,
        },
        {
            idempotencyKey: checkoutIdempotencyKey,
        }
    );

    return session;
}

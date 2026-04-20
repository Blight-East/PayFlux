import { getBillingCustomerByUserId, saveBillingCustomer } from './store';
import { stripe } from './stripeClient';

export async function getOrCreateCustomer(userId: string, email: string) {
    const existing = await getBillingCustomerByUserId(userId);
    if (existing?.stripeCustomerId) {
        if (existing.email !== email) {
            await stripe.customers.update(existing.stripeCustomerId, {
                email,
                metadata: { userId },
            });
            await saveBillingCustomer(userId, email, existing.stripeCustomerId);
        }
        return existing.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email,
        metadata: { userId },
    });

    await saveBillingCustomer(userId, email, customer.id);
    return customer.id;
}

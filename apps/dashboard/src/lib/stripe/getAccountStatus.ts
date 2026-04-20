import { stripe } from '@/lib/billing/stripeClient';

export async function getAccountStatus(accountId: string) {
    const account = await stripe.accounts.retrieve(accountId);

    return {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        onboardingComplete: account.charges_enabled && account.payouts_enabled,
    };
}

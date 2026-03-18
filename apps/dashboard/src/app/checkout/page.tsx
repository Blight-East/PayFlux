import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

/**
 * /checkout — Legacy upgrade route.
 * Phase 2: redirects to /upgrade (the new contextual upgrade surface).
 * The /api/checkout/session API route remains intact for Stripe session creation.
 */
export default async function CheckoutPage() {
    redirect('/upgrade');
}

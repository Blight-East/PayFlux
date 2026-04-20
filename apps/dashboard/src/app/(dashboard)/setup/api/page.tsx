import { redirect } from 'next/navigation';

/**
 * /setup/api - DISABLED
 * 
 * API-first onboarding is still intentionally folded back into /setup.
 * Persistence now exists, but the dedicated API-first workflow screens
 * have not been rebuilt around the current product surface yet.
 */
export default function APIFirstPage() {
    redirect('/setup');
}

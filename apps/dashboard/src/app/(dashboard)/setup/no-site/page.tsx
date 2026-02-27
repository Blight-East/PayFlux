import { redirect } from 'next/navigation';

/**
 * /setup/no-site - DISABLED
 * 
 * This path requires database persistence for onboarding completion.
 * Redirecting to /setup until database infrastructure is available.
 */
export default function NoSitePage() {
    redirect('/setup');
}

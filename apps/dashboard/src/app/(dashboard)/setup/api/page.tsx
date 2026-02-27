import { redirect } from 'next/navigation';

/**
 * /setup/api - DISABLED
 * 
 * This path requires database persistence for onboarding completion
 * and event log querying for API activity detection.
 * Redirecting to /setup until database infrastructure is available.
 */
export default function APIFirstPage() {
    redirect('/setup');
}

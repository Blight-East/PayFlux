import { redirect } from 'next/navigation';

/**
 * /evidence was an internal infrastructure dashboard.
 * Redirect to the main dashboard for any customer who navigates here.
 */
export default function EvidencePage() {
    redirect('/dashboard');
}

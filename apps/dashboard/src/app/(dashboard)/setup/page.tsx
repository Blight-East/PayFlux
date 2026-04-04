import { redirect } from 'next/navigation';

/**
 * /setup was a legacy self-hosted onboarding wizard.
 * The hosted product uses the /activate flow instead.
 * Redirect any user who navigates here to the main dashboard.
 */
export default function SetupPage() {
    redirect('/dashboard');
}

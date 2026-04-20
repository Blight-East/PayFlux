import { redirect } from 'next/navigation';

/**
 * /setup/no-site - DISABLED
 * 
 * The no-site setup path is still folded back into /setup while the
 * consolidated onboarding experience is the default entrypoint.
 */
export default function NoSitePage() {
    redirect('/setup');
}

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import UpgradeClient from './UpgradeClient';
import LegacyCheckoutQuerySanitizer from '@/components/LegacyCheckoutQuerySanitizer';

export const runtime = 'nodejs';

export default async function UpgradePage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in?redirect_url=%2Fupgrade');
    }

    const onboarding = await resolveOnboardingState(userId);

    // Already paid — send to dashboard
    if (onboarding.stage === 'upgraded') {
        redirect('/dashboard');
    }

    logOnboardingEvent('upgrade_viewed', {
        userId,
        workspaceId: onboarding.workspace?.workspaceId,
        metadata: {
            stage: onboarding.stage,
            source: 'upgrade_page_view',
            stripe_connected: onboarding.hasStripeConnection,
        },
    });

    // Read scan data from org metadata for server-side context
    let scanContext: {
        hasStripeConnection: boolean;
        hasScanCompleted: boolean;
        stage: string;
        workspaceId: string | undefined;
    } = {
        hasStripeConnection: onboarding.hasStripeConnection,
        hasScanCompleted: onboarding.hasScanCompleted,
        stage: onboarding.stage,
        workspaceId: onboarding.workspace?.workspaceId,
    };

    return (
        <>
            <LegacyCheckoutQuerySanitizer />
            <UpgradeClient
                hasStripeConnection={scanContext.hasStripeConnection}
                hasScanCompleted={scanContext.hasScanCompleted}
                stage={scanContext.stage}
                workspaceId={scanContext.workspaceId ?? null}
            />
        </>
    );
}

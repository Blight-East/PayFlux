import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { logStageTransition } from '@/lib/onboarding-events';

export const runtime = 'nodejs';

/**
 * POST /api/onboarding/complete
 *
 * Marks user's onboarding scan as complete.
 * Persists scan completion flag AND scan summary to Clerk org publicMetadata.
 *
 * Body: {
 *   mode: 'UI_SCAN' | 'API_FIRST' | 'NO_SITE',
 *   scanResult?: { url, riskLabel, stabilityScore, findings }
 * }
 */
export async function POST(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { mode, scanResult } = body;

        if (!mode || !['UI_SCAN', 'API_FIRST', 'NO_SITE'].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        // Persist scan completion + summary to Clerk org publicMetadata
        const client = await clerkClient();
        const memberships = await client.users.getOrganizationMembershipList({ userId });

        if (memberships.data && memberships.data.length > 0) {
            const org = memberships.data.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0].organization;

            // Build scan summary for durable persistence (keeps metadata small — ~1KB)
            const scanSummary = scanResult ? {
                url: String(scanResult.url ?? '').slice(0, 200),
                riskLabel: String(scanResult.riskLabel ?? ''),
                stabilityScore: Number(scanResult.stabilityScore ?? 0),
                findingsCount: Array.isArray(scanResult.findings) ? scanResult.findings.length : 0,
                findings: Array.isArray(scanResult.findings)
                    ? scanResult.findings.slice(0, 5).map((f: any) => ({
                        title: String(f.title ?? '').slice(0, 200),
                        description: String(f.description ?? '').slice(0, 300),
                        severity: String(f.severity ?? ''),
                    }))
                    : [],
                scannedAt: new Date().toISOString(),
            } : undefined;

            await client.organizations.updateOrganizationMetadata(org.id, {
                publicMetadata: {
                    ...((org.publicMetadata as Record<string, unknown>) ?? {}),
                    onboardingScanCompleted: true,
                    onboardingScanCompletedAt: new Date().toISOString(),
                    onboardingScanMode: mode,
                    ...(scanSummary ? { onboardingScanResult: scanSummary } : {}),
                },
            });

            console.log(`[ONBOARDING_EVENT] ${JSON.stringify({
                event: 'scan_completed',
                userId,
                workspaceId: org.id,
                metadata: { mode },
                timestamp: new Date().toISOString(),
            })}`);

            // Emit stage transition: none → scanned
            logStageTransition('none', 'scanned', { userId, workspaceId: org.id });
        }

        return NextResponse.json({
            success: true,
            onboarding: {
                completed: true,
                step: 'VALUE_REALIZED',
                completedAt: new Date().toISOString(),
                mode,
            },
        });
    } catch (error) {
        console.error('[Onboarding] Error completing onboarding:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

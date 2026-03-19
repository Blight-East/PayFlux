/**
 * POST /api/activation/run
 *
 * Idempotent activation pipeline for Phase A.
 * Runs the full activation sequence for a paid, connected workspace:
 *   1. Verify processor connection
 *   2. Generate workspace baseline (risk surface)
 *   3. Generate first reserve projection
 *   4. Arm default alert policy
 *   5. Mark workspace as live_monitored
 *
 * Safe to re-call at any point — skips already-completed steps.
 *
 * Phase A note: Steps 1-3 use real system data where available,
 * with deterministic fallback for workspaces that don't yet have
 * enough event history for full risk scoring. Step 4 arms a
 * conservative default policy. All state is persisted to Clerk
 * org publicMetadata.
 */

import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { RiskIntelligence } from '@/lib/risk-infra';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';

export const runtime = 'nodejs';

/** Default alert rules — conservative, high-signal, auto-armed */
const DEFAULT_ALERT_POLICY = {
    rules: [
        { id: 'tier_escalation', name: 'Risk tier escalation', trigger: 'tier_escalation', threshold: 1, channel: 'email', armed: true },
        { id: 'reserve_spike', name: 'Reserve exposure spike (>25%)', trigger: 'reserve_spike', threshold: 0.25, channel: 'email', armed: true },
        { id: 'trend_degradation', name: 'Trend shift to degrading', trigger: 'trend_degradation', threshold: 1, channel: 'dashboard', armed: true },
        { id: 'projection_breach', name: 'Projection exceeds worst-case', trigger: 'projection_breach', threshold: 1, channel: 'email', armed: true },
    ],
};

/** Reserve rate by risk tier (matches existing projection-cadence logic) */
const RESERVE_RATES: Record<number, number> = { 1: 0, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.25 };
const TREND_MULTIPLIERS: Record<string, number> = { IMPROVING: 0.75, STABLE: 1.0, DEGRADING: 1.5 };

export async function POST() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await resolveWorkspace(userId);
    if (!workspace || (workspace.tier !== 'pro' && workspace.tier !== 'enterprise')) {
        return NextResponse.json({ error: 'Not a paid workspace' }, { status: 403 });
    }

    const client = await clerkClient();

    // Fetch current org metadata
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    if (!memberships.data || memberships.data.length === 0) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const org = memberships.data.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0].organization;

    const meta = (org.publicMetadata as Record<string, unknown>) || {};
    const now = new Date().toISOString();

    const steps: { step: string; status: 'completed' | 'skipped' | 'failed'; detail?: string }[] = [];

    // ── Step 1: Verify processor connection ────────────────────────────────
    const stripeAccountId = meta.stripeAccountId as string | undefined;
    if (!stripeAccountId) {
        return NextResponse.json({
            error: 'No processor connected',
            state: 'paid_unconnected',
            steps: [{ step: 'processor_check', status: 'failed', detail: 'No stripeAccountId in metadata' }],
        }, { status: 400 });
    }
    steps.push({ step: 'processor_check', status: 'completed', detail: stripeAccountId });

    // ── Step 2: Generate baseline ──────────────────────────────────────────
    if (meta.baselineGeneratedAt) {
        steps.push({ step: 'baseline_generation', status: 'skipped', detail: 'Already generated' });
    } else {
        try {
            // Attempt to pull real risk data from RiskIntelligence
            let riskTier = 3; // Default: elevated
            let riskBand = 'elevated';
            let stabilityScore = 55;
            let trend = 'STABLE';
            let eventCount = 0;

            const snapshots = await RiskIntelligence.getAllSnapshots();
            if (snapshots.length > 0) {
                const latest = snapshots[snapshots.length - 1];
                riskTier = latest.currentRiskTier || 3;
                trend = latest.trend || 'STABLE';
                stabilityScore = Math.max(10, 100 - (riskTier * 18));
                eventCount = latest.scanCount || 0;
                riskBand = ['low', 'moderate', 'elevated', 'high', 'critical'][riskTier - 1] || 'elevated';
            }

            await client.organizations.updateOrganizationMetadata(org.id, {
                publicMetadata: {
                    baselineGeneratedAt: now,
                    baselineRiskSurface: {
                        riskTier,
                        riskBand,
                        stabilityScore,
                        trend,
                        computedAt: now,
                        eventCount,
                        windowDays: 90,
                    },
                },
            });
            steps.push({ step: 'baseline_generation', status: 'completed', detail: `tier=${riskTier} band=${riskBand}` });
        } catch (err: any) {
            steps.push({ step: 'baseline_generation', status: 'failed', detail: err.message });
            return NextResponse.json({ state: 'connected_generating', steps }, { status: 500 });
        }
    }

    // ── Step 3: Generate first projection ──────────────────────────────────
    if (meta.firstProjectionAt) {
        steps.push({ step: 'first_projection', status: 'skipped', detail: 'Already exists' });
    } else {
        try {
            // Re-read metadata (may have been updated in step 2)
            const updatedOrg = await client.organizations.getOrganization({ organizationId: org.id });
            const updatedMeta = (updatedOrg.publicMetadata as Record<string, unknown>) || {};
            const baseline = updatedMeta.baselineRiskSurface as Record<string, unknown> | undefined;

            const riskTier = Number(baseline?.riskTier || 3);
            const trend = String(baseline?.trend || 'STABLE');
            const baseRate = RESERVE_RATES[riskTier] ?? 0.10;
            const trendMult = TREND_MULTIPLIERS[trend] ?? 1.0;
            const effectiveRate = Math.min(baseRate * trendMult, 0.25);

            const projection = {
                riskTier,
                riskBand: baseline?.riskBand || 'elevated',
                reserveRate: effectiveRate,
                windows: {
                    t30: { trappedBps: Math.round(effectiveRate * 10000 * (30 / 90)) },
                    t60: { trappedBps: Math.round(effectiveRate * 10000 * (60 / 90)) },
                    t90: { trappedBps: Math.round(effectiveRate * 10000) },
                },
                trend,
                generatedAt: now,
            };

            await client.organizations.updateOrganizationMetadata(org.id, {
                publicMetadata: {
                    firstProjectionAt: now,
                    latestProjection: projection,
                },
            });
            steps.push({ step: 'first_projection', status: 'completed', detail: `rate=${(effectiveRate * 100).toFixed(1)}%` });
        } catch (err: any) {
            steps.push({ step: 'first_projection', status: 'failed', detail: err.message });
            return NextResponse.json({ state: 'connected_generating', steps }, { status: 500 });
        }
    }

    // ── Step 4: Arm default alerts ─────────────────────────────────────────
    if (meta.alertPolicyArmed === true) {
        steps.push({ step: 'arm_alerts', status: 'skipped', detail: 'Already armed' });
    } else {
        try {
            await client.organizations.updateOrganizationMetadata(org.id, {
                publicMetadata: {
                    alertPolicyArmed: true,
                    alertPolicyArmedAt: now,
                    defaultAlertPolicy: DEFAULT_ALERT_POLICY,
                },
            });
            steps.push({ step: 'arm_alerts', status: 'completed' });
        } catch (err: any) {
            steps.push({ step: 'arm_alerts', status: 'failed', detail: err.message });
            // Non-fatal — proceed anyway
        }
    }

    // ── Step 5: Mark live_monitored ────────────────────────────────────────
    if (!meta.activationCompletedAt) {
        try {
            await client.organizations.updateOrganizationMetadata(org.id, {
                publicMetadata: {
                    activationState: 'live_monitored',
                    activationCompletedAt: now,
                },
            });

            logOnboardingEvent('onboarding_stage_changed', {
                userId,
                workspaceId: workspace.workspaceId,
                metadata: { from: 'connected_generating', to: 'live_monitored' },
            });
        } catch {
            // Non-fatal
        }
    }
    steps.push({ step: 'mark_live', status: 'completed' });

    return NextResponse.json({
        state: 'live_monitored',
        steps,
        workspace: {
            id: workspace.workspaceId,
            name: workspace.workspaceName,
            tier: workspace.tier,
        },
    });
}

/**
 * GET /api/activation/run — returns current activation status (for polling)
 */
export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await resolveWorkspace(userId);
    if (!workspace || (workspace.tier !== 'pro' && workspace.tier !== 'enterprise')) {
        return NextResponse.json({ error: 'Not a paid workspace', state: 'not_paid' }, { status: 403 });
    }

    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    if (!memberships.data || memberships.data.length === 0) {
        return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    // Direct fetch — the embedded org from membership list can be stale
    const oldestMembership = memberships.data.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    const org = await client.organizations.getOrganization({
        organizationId: oldestMembership.organization.id,
    });

    const meta = (org.publicMetadata as Record<string, unknown>) || {};

    const conditions = {
        paidTier: true,
        processorConnected: !!(meta.stripeAccountId),
        baselineGenerated: !!(meta.baselineGeneratedAt),
        projectionExists: !!(meta.firstProjectionAt),
        alertsArmed: meta.alertPolicyArmed === true,
    };

    let state: string;
    if (conditions.processorConnected && conditions.baselineGenerated && conditions.projectionExists && conditions.alertsArmed) {
        state = 'live_monitored';
    } else if (conditions.processorConnected) {
        state = 'connected_generating';
    } else {
        state = 'paid_unconnected';
    }

    return NextResponse.json({
        state,
        conditions,
        meta: {
            baselineGeneratedAt: meta.baselineGeneratedAt,
            firstProjectionAt: meta.firstProjectionAt,
            alertPolicyArmedAt: meta.alertPolicyArmedAt,
            activationCompletedAt: meta.activationCompletedAt,
            latestProjection: meta.latestProjection,
            baselineRiskSurface: meta.baselineRiskSurface,
        },
    });
}

import { NextResponse, NextRequest } from 'next/server';
import { RiskIntelligence } from '../../../../../../lib/risk-infra';
export const dynamic = 'force-dynamic';

import { requirePaidAuth } from '@/lib/require-auth';
import { isInternalOperatorUser } from '@/lib/resolve-workspace';

export async function POST(request: NextRequest) {
    // 0. Security Gates
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;

    const { userId, workspace } = authResult;

    if (process.env.EVIDENCE_SEED_ENABLED !== 'true') {
        return NextResponse.json({ error: 'SEEDING_DISABLED' }, { status: 403 });
    }

    if (workspace.role !== 'admin') {
        return NextResponse.json(
            { error: 'Forbidden', code: 'ADMIN_REQUIRED_FOR_SEED' },
            { status: 403 }
        );
    }

    const isInternal = await isInternalOperatorUser(userId);
    if (!isInternal) {
        return NextResponse.json(
            { error: 'Forbidden', code: 'INTERNAL_OPERATOR_REQUIRED' },
            { status: 403 }
        );
    }

    try {
        const traceId = `seed-${crypto.randomUUID()}`;
        const seedPayload = {
            url: "https://payflux.dev/smoke-test",
            analyzedAt: new Date().toISOString(),
            riskTier: 1,
            riskLabel: "LOW",
            stabilityScore: 95,
            policies: {
                terms: { status: "Present", matches: 2 },
                privacy: { status: "Present", matches: 2 }
            },
            narrative: {
                summary: "Production Smoke Test Seed",
                recommendations: ["Maintain compliance"]
            }
        };

        await RiskIntelligence.record(traceId, seedPayload, 'fresh');

        return NextResponse.json({
            status: "SUCCESS",
            message: "Production seed data injected successfully",
            traceId
        });
    } catch (e) {
        return NextResponse.json({ error: 'SEED_FAILED' }, { status: 500 });
    }
}

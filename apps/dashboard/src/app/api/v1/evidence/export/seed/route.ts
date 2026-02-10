import { NextResponse, NextRequest } from 'next/server';
import { RiskIntelligence } from '../../../../../../lib/risk-infra';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

import { requireAuth } from '@/lib/require-auth';

export async function POST(request: NextRequest) {
    // 0. Security Gates
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    if (process.env.EVIDENCE_SEED_ENABLED !== 'true') {
        return NextResponse.json({ error: 'SEEDING_DISABLED' }, { status: 403 });
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

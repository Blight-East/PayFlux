import { NextResponse, NextRequest } from 'next/server';
import { RiskIntelligence } from '../../../../../../lib/risk-infra';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

async function isAuthorized(request: NextRequest): Promise<boolean> {
    // 2. Check Bearer Token (PAYFLUX_API_KEY or EVIDENCE_SECRET)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const key1 = process.env.PAYFLUX_API_KEY?.trim();
        const key2 = process.env.EVIDENCE_SECRET?.trim();
        if ((key1 && token === key1) || (key2 && token === key2)) return true;
    }
    return false;
}

export async function POST(request: NextRequest) {
    // 0. Security Gates
    if (!(await isAuthorized(request))) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

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

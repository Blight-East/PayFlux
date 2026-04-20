import { NextResponse } from 'next/server';
import { requirePaidAuth } from '@/lib/require-auth';

function createEmptySummary(reason: string) {
    return {
        available: false,
        reason,
        generated_at: new Date().toISOString(),
        new_merchants_detected: 0,
        high_risk_clusters: 0,
        top_emerging_processors: [],
        merchant_graph_size: 0,
        merchant_relationship_count: 0,
        top_clusters: [],
        merchant_discovery_feed: [],
    };
}

export async function GET() {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;

    const payfluxUrl = process.env.PAYFLUX_API_URL;
    const apiKey = process.env.PAYFLUX_API_KEY;

    if (!payfluxUrl || !apiKey) {
        return NextResponse.json(createEmptySummary('PayFlux runtime not configured'));
    }

    try {
        const response = await fetch(`${payfluxUrl}/merchant_intelligence/summary`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json(
                createEmptySummary(`Runtime returned ${response.status}`),
                { status: 200 }
            );
        }

        const payload = await response.json();
        return NextResponse.json({
            available: true,
            ...payload,
        });
    } catch (error) {
        return NextResponse.json(
            createEmptySummary((error as Error).message || 'Runtime connection failed'),
            { status: 200 }
        );
    }
}

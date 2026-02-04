import { NextResponse } from 'next/server';
import { z } from 'zod';

// Upstream Health Schema validation
const HealthSchema = z.object({
    status: z.string(),
    lastGoodAt: z.string(),
    uptime: z.string(),
    errorCounts: z.object({
        degraded: z.number(),
        drop: z.number(),
        contractViolation: z.number(),
    }),
});

export async function GET() {
    // 1. Env Vars: CORE_* primary, PAYFLUX_* fallback
    const payfluxUrl = process.env.CORE_BASE_URL || process.env.PAYFLUX_API_URL;
    const apiKey = process.env.CORE_AUTH_TOKEN || process.env.PAYFLUX_API_KEY;

    // Fail-soft DEGRADED template (Option A)
    const degradedResponse = {
        status: 'DEGRADED',
        lastGoodAt: 'never',
        uptime: 'unknown',
        errorCounts: {
            degraded: 0,
            drop: 0,
            contractViolation: 0
        },
        diagnostics: [] as string[]
    };

    if (!payfluxUrl || !apiKey) {
        // DEV OVERRIDE: If configured for dev mode, return mock data
        if (process.env.NODE_ENV === 'development' && process.env.PAYFLUX_ENV === 'dev') {
            try {
                const { EVIDENCE_HEALTH } = await import('../../../../lib/dev-fixtures');
                return NextResponse.json(EVIDENCE_HEALTH);
            } catch (ignored) {
                // Fall through to error response if fixture missing/broken
            }
        }

        const response = NextResponse.json({
            ...degradedResponse,
            diagnostics: ['BFF_NOT_CONFIGURED'],
        }, { status: 200 });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        return response;
    }

    try {
        const res = await fetch(`${payfluxUrl}/api/evidence/health`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const response = NextResponse.json({
                ...degradedResponse,
                diagnostics: [`UPSTREAM_ERROR_${res.status}`],
            }, { status: 200 });
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            response.headers.set('Pragma', 'no-cache');
            return response;
        }

        const rawData = await res.json();

        // 2. Strict Shape Guard
        const validation = HealthSchema.safeParse(rawData);
        if (!validation.success) {
            const response = NextResponse.json({
                ...degradedResponse,
                diagnostics: ['UPSTREAM_SHAPE_VIOLATION'],
            }, { status: 200 });
            response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
            response.headers.set('Pragma', 'no-cache');
            return response;
        }

        // 3. Pass-through Validated JSON + Enforce Cache Invariants
        const response = NextResponse.json(validation.data);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        return response;

    } catch (err) {
        // Core Down Case
        const response = NextResponse.json({
            ...degradedResponse,
            diagnostics: ['UPSTREAM_OFFLINE'],
        }, { status: 200 });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        return response;
    }
}

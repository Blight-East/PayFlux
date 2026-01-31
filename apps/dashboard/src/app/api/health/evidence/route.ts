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

    const setNoCacheHeaders = (res: NextResponse) => {
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.headers.set('Pragma', 'no-cache');
        return res;
    };

    if (!payfluxUrl || !apiKey) {
        return setNoCacheHeaders(NextResponse.json({
            ...degradedResponse,
            diagnostics: ['BFF_NOT_CONFIGURED'],
        }, { status: 200 }));
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
            return setNoCacheHeaders(NextResponse.json({
                ...degradedResponse,
                diagnostics: [`UPSTREAM_ERROR_${res.status}`],
            }, { status: 200 }));
        }

        const rawData = await res.json();

        // 2. Strict Shape Guard
        const validation = HealthSchema.safeParse(rawData);
        if (!validation.success) {
            return setNoCacheHeaders(NextResponse.json({
                ...degradedResponse,
                diagnostics: ['UPSTREAM_SHAPE_VIOLATION'],
            }, { status: 200 }));
        }

        // 3. Pass-through Validated JSON + Enforce Cache Invariants
        return setNoCacheHeaders(NextResponse.json(validation.data));

    } catch (err) {
        // Core Down Case
        console.error('Evidence health check failed', err);
        return setNoCacheHeaders(NextResponse.json({
            ...degradedResponse,
            diagnostics: ['UPSTREAM_OFFLINE'],
        }, { status: 200 }));
    }
}

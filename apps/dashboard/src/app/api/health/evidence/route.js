import { NextResponse } from 'next/server';

// Fixtures are imported dynamically in DEV mode from a safe proxy

const UPSTREAM_API_URL = process.env.PAYFLUX_UPSTREAM_URL || (process.env.CORE_BASE_URL ? `${process.env.CORE_BASE_URL}/api/evidence/health` : 'http://localhost:8080/api/evidence/health');

export async function GET(request) {
    const isDev = process.env.NODE_ENV === 'development' && process.env.PAYFLUX_ENV === 'dev';

    // 1. Determine Upstream
    // Priority: Core Config -> Local Fallback
    // Only one upstream for this endpoint as it IS the proxy
    const url = UPSTREAM_API_URL;

    let upstreamData = null;
    let fetchError = null;

    // 2. Fetch with Timeout
    const TIMEOUT_MS = 2500;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
        });

        clearTimeout(timeout);

        if (res.ok) {
            upstreamData = await res.json();
        } else {
            throw new Error(`Upstream returned ${res.status}`);
        }
    } catch (err) {
        fetchError = err;
        // Fall through to fallback logic
    }

    // 3. Process Result
    if (upstreamData) {
        // Return raw health object as requested + diagnostics if present
        return NextResponse.json({
            ...upstreamData,
            diagnostics: upstreamData.diagnostics || []
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
                'Pragma': 'no-cache'
            }
        });
    }

    // 4. Fail-Soft (Strict)
    console.warn(`[EvidenceHealth] Upstream Proxy Failed. Serving Fallback. Error: ${fetchError?.message}`);

    let fallbackHealth = {
        status: "DEGRADED",
        lastGoodAt: "never", // Or unknown
        uptime: "unknown",
        errorCounts: null
    };

    let diagnostics = [
        fetchError?.name === 'AbortError' ? 'UPSTREAM_FETCH_FAILED:timeout_abort' : `UPSTREAM_FETCH_FAILED:${fetchError?.message || 'unknown'}`
    ];

    if (isDev) {
        try {
            // Dynamic import via proxy to satisfy build guard (no direct fixtures import)
            const { EVIDENCE_HEALTH } = await import('../../../../lib/dev-fixtures');
            if (EVIDENCE_HEALTH) {
                fallbackHealth = EVIDENCE_HEALTH;
            }
            diagnostics.push("DEV_FIXTURE_ACTIVE");
        } catch (e) {
            console.error("Failed to load dev fixture", e);
        }
    }

    return NextResponse.json({
        ...fallbackHealth,
        diagnostics
    }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache'
        }
    });
}

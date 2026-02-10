import { NextRequest, NextResponse } from 'next/server';
import { resolveAccountTierConfig, type Account } from '@/lib/tier-enforcement';
import { RateLimiter } from '@/lib/risk-infra';
import { requireAuth } from '@/lib/require-auth';

/**
 * POST /api/v1/ingest
 * 
 * Boundary layer for event ingestion with tier-based rate limiting.
 * 
 * Flow:
 * 1. Resolve account tier (boundary layer)
 * 2. Map tier → numeric QuotaConfig
 * 3. Check rate limit (infra layer, no tier knowledge)
 * 4. Forward to Go backend with numeric headers
 */
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { userId, workspace } = authResult;

    const GO_BACKEND_URL = process.env.PAYFLUX_API_URL;

    if (!GO_BACKEND_URL) {
        return NextResponse.json(
            { error: 'Backend not configured' },
            { status: 500 }
        );
    }

    // 1. Extract API key from Authorization header for Go backend context only
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : 'anon';

    // 2. Resolve account from API key (mock for now - should query DB)
    // TODO: Replace with actual account resolution from database
    const account: Account = {
        id: `acc_${apiKey.slice(0, 12)}`,
        billingTier: apiKey.startsWith('pf_pilot_') ? 'PILOT' :
            apiKey.startsWith('pf_growth_') ? 'GROWTH' :
                apiKey.startsWith('pf_scale_') ? 'SCALE' : 'PILOT',
        tierHistory: [],
        overrides: undefined,
    };

    // 3. Resolve tier config at boundary
    let tierConfig;
    try {
        tierConfig = await resolveAccountTierConfig(account);
    } catch (error) {
        console.error('[TIER_RESOLUTION_FAILED]', {
            accountId: account.id,
            error: error instanceof Error ? error.message : String(error),
        });

        // Fallback: use canonical resolver with PILOT tier
        const fallbackAccount: Account = {
            id: account.id,
            billingTier: 'PILOT',
            tierHistory: [],
            overrides: undefined,
        };

        tierConfig = await resolveAccountTierConfig(fallbackAccount);
    }

    // 4. Map tier → numeric config (boundary layer only)
    const quotaConfig = {
        capacity: tierConfig.rateLimits.ingestRPS * 2, // burst allowance
        refillRate: tierConfig.rateLimits.ingestRPS,
        window: 3600,
    };

    // 5. Check rate limit (infra layer, no tier knowledge)
    let rateLimitResult;
    try {
        rateLimitResult = await RateLimiter.check(account.id, quotaConfig);
    } catch (error) {
        console.error('[RATE_LIMITER_ERROR]', {
            accountId: account.id,
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            { error: 'Rate limit check failed' },
            {
                status: 503,
                headers: {
                    'Retry-After': '60',
                },
            }
        );
    }

    const { allowed, headers: rateLimitHeaders } = rateLimitResult;

    if (!allowed) {
        console.warn('[RATE_LIMIT_EXCEEDED]', {
            accountId: account.id,
            limit: quotaConfig.refillRate,
        });

        return NextResponse.json(
            {
                error: 'E_RATE_LIMIT_EXCEEDED',
                reason: 'TIER_LIMIT_REACHED',
                limit: quotaConfig.refillRate,
            },
            {
                status: 429,
                headers: rateLimitHeaders,
            }
        );
    }

    // 6. Forward to Go backend with numeric headers (NO TIER SEMANTICS)
    try {
        const body = await request.text();

        const goResponse = await fetch(`${GO_BACKEND_URL}/ingest`, {
            method: 'POST',
            headers: {
                // Numeric config only (no tier strings/enums)
                'X-Payflux-Account-Id': account.id,
                'X-Payflux-Ingest-Capacity': String(quotaConfig.capacity),
                'X-Payflux-Ingest-Refill': String(quotaConfig.refillRate),
                'X-Payflux-Ingest-Window': String(quotaConfig.window),

                // Forward original auth for Go's validation
                'Authorization': authHeader || '',
                'Content-Type': 'application/json',
            },
            body,
        });

        const responseData = await goResponse.text();

        // Merge rate limit headers with Go response headers
        const responseHeaders = new Headers(goResponse.headers);
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value);
        });

        return new NextResponse(responseData, {
            status: goResponse.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('[GO_BACKEND_ERROR]', {
            accountId: account.id,
            error: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json(
            { error: 'Backend unavailable' },
            { status: 502 }
        );
    }
}

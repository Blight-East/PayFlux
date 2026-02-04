import { STALE_THRESHOLD_MS } from '../../../../config/risk';

// Helper for strict RFC3339 or null
const sanitizeNever = (ts) => {
    if (!ts || ts === 'never') return null;
    if (Number.isNaN(Date.parse(ts))) return null;
    return ts;
};

function computeCredibility({ meta, nowMs }) {
    let score = 100;
    const reasons = [];

    // 1. No verified watermark
    if (!meta.watermark || meta.watermark.seq === null || meta.watermark.seq === undefined) {
        score -= 60;
        reasons.push('NO_WATERMARK');
    }
    // 2. Never verified (Mutually Exclusive with NO_WATERMARK)
    else if (meta.watermark.lastVerifiedAt === null) {
        score -= 35;
        reasons.push('NEVER_VERIFIED');
    }

    // 3. Source degraded
    if (meta.sourceStatus && meta.sourceStatus.startsWith('DEGRADED')) {
        score -= 25;
        reasons.push('SOURCE_DEGRADED');
    }

    // 4. Stale verification
    if (meta.watermark && meta.watermark.lastVerifiedAt) {
        const lastVer = new Date(meta.watermark.lastVerifiedAt).getTime();
        if (!isNaN(lastVer) && (nowMs - lastVer > STALE_THRESHOLD_MS)) {
            score -= 30;
            reasons.push('VERIFICATION_STALE');
        }
    }

    // 5. Upstream failures present
    const hasFetchFailure = meta.diagnostics && meta.diagnostics.some(d => d.includes('UPSTREAM_FETCH_FAILED'));
    if (hasFetchFailure) {
        score -= 20;
        reasons.push('UPSTREAM_FETCH_FAILED');
    }

    // 6. Timeout abort specifically
    const hasTimeout = meta.diagnostics && meta.diagnostics.some(d => d.includes('UPSTREAM_FETCH_FAILED:timeout_abort'));
    if (hasTimeout) {
        score -= 10;
        reasons.push('TIMEOUT_ABORT');
    }

    // Clamp
    score = Math.max(0, Math.min(100, score));

    // Band
    let band = 'unknown';
    if (score >= 85) band = 'high';
    else if (score >= 60) band = 'medium';
    else if (score >= 1) band = 'low';
    // score 0 remains unknown

    return {
        score,
        band,
        reasons,
        computedAt: new Date(nowMs).toISOString()
    };
}

export async function getRiskLedgerState({ requestUrl, previousWatermark = null }) {
    const isDev = process.env.NODE_ENV === 'development' && process.env.PAYFLUX_ENV === 'dev';

    // 1. Determine Upstream
    // Priority: Same-Origin Proxy -> Core Direct -> Local Fallback
    let upstreamUrls = [];
    try {
        const sameOrigin = new URL('/api/health/evidence', requestUrl);
        upstreamUrls.push(sameOrigin.toString());
    } catch (e) {
        // Falls through
    }

    if (process.env.CORE_BASE_URL) {
        upstreamUrls.push(`${process.env.CORE_BASE_URL}/api/evidence/health`);
    }

    let upstreamData = null;
    let fetchError = null;
    let selectedUpstreamUrl = null;

    // 2. Race Fetch with Timeout
    const TIMEOUT_MS = 2500;

    for (const url of upstreamUrls) {
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
                selectedUpstreamUrl = url;
                break; // Success
            }
        } catch (err) {
            fetchError = err;
            continue; // Try next upstream
        }
    }

    // 3. Process Result
    if (upstreamData) {
        const events = [];
        const now = Date.now();

        // Strict timestamp for calculations
        const rawLastGood = sanitizeNever(upstreamData.lastGoodAt);
        const lastGoodTime = rawLastGood ? new Date(rawLastGood).getTime() : now;

        // Monotonic Base: unix epoch minutes * 100
        const baseSeq = Math.floor(lastGoodTime / 60000) * 100;

        let seqCounter = 0;

        // Determine Mode (Simplified & Deterministic)
        let sourceMode = 'unknown';
        try {
            if (selectedUpstreamUrl) {
                const u = new URL(selectedUpstreamUrl);
                sourceMode = (u.pathname === '/api/health/evidence') ? 'same-origin'
                    : (u.pathname.includes('/api/evidence/health')) ? 'core-direct'
                        : 'unknown';
            }
        } catch (err) { }

        // Normalize upstream health to events
        if (upstreamData.status && upstreamData.status !== 'OK') {
            const stableIdBit = Math.floor(now / 60000);

            events.push({
                id: `evidence_health:${stableIdBit}`,
                seq: baseSeq + seqCounter++,
                ts: new Date().toISOString(),
                kind: 'evidence_health',
                severity: 'warning',
                title: `Evidence Health ${upstreamData.status}`,
                source: {
                    system: 'core',
                    endpoint: '/api/evidence/health',
                    mode: sourceMode,
                    region: 'unknown'
                },
                summary: `Last good: ${rawLastGood || 'Unknown'}`,
                actions: [
                    { label: 'View trace', type: 'view_trace' }
                ],
                evidenceRef: {
                    kind: 'evidence_health',
                    endpoint: '/api/evidence/health',
                    lastGoodAt: rawLastGood,
                    seq: baseSeq
                },
                links: [
                    { label: 'View evidence health', href: '/api/health/evidence' }
                ]
            });
        }

        // Staleness Escalation (> 5 min)
        if (rawLastGood && (now - lastGoodTime > STALE_THRESHOLD_MS)) {
            const stableIdBit = Math.floor(now / 60000);
            events.push({
                id: `evidence_stale:${stableIdBit}`,
                seq: baseSeq + seqCounter++,
                ts: new Date().toISOString(),
                kind: 'evidence_stale',
                severity: 'warning',
                title: 'Evidence Signal Stale',
                source: {
                    system: 'core',
                    endpoint: '/api/evidence/health',
                    mode: 'synthetic',
                    region: 'unknown'
                },
                summary: `No healthy signal for >5m`,
                actions: [
                    { label: 'View diagnostics', type: 'view_diagnostics' }
                ],
                evidenceRef: {
                    kind: 'evidence_health',
                    endpoint: '/api/evidence/health',
                    lastGoodAt: rawLastGood,
                    seq: baseSeq
                },
                links: [
                    { label: 'View evidence health', href: '/api/health/evidence' }
                ]
            });
        }

        const lastVerifiedAt = rawLastGood;

        // Ensure seq never drops if we have a previous good one
        const currentSeq = baseSeq + (seqCounter > 0 ? seqCounter - 1 : 0);
        let effectiveSeq = currentSeq;

        // Safety check: if currentSeq is somehow 0/null but we had previous, use previous
        // (However, baseSeq is time-derived, so it should be robust. This is just extra safety.)
        if ((!effectiveSeq || effectiveSeq === 0) && previousWatermark?.seq) {
            effectiveSeq = previousWatermark.seq;
        }

        const watermark = {
            lastVerifiedAt: lastVerifiedAt,
            seq: effectiveSeq
        };

        const meta = {
            sourceStatus: upstreamData.status === 'OK' ? 'OK' : 'DEGRADED',
            generatedAt: new Date().toISOString(),
            watermark: watermark,
            diagnostics: upstreamData.errorCounts ? [`ERROR_COUNTS: ${JSON.stringify(upstreamData.errorCounts)}`] : []
        };

        meta.credibility = computeCredibility({ meta, nowMs: now });

        return {
            events: events,
            meta: meta
        };
    }

    // 4. Fallback (PROD or DEV)
    let fallbackEvents = [];
    let statusLabel = "DEGRADED";

    // Watermark Continuity: Fallback to previous if available, otherwise null (not 0)
    const watermarkFallback = previousWatermark ? { ...previousWatermark } : {
        lastVerifiedAt: null,
        seq: null // changed from 0 to null to indicate "unknown" rather than "beginning"
    };

    const diagnostics = [];

    // PROD Failure Analysis
    if (fetchError) {
        if (fetchError.name === 'AbortError') {
            diagnostics.push('UPSTREAM_FETCH_FAILED:timeout_abort');
        } else {
            diagnostics.push(`UPSTREAM_FETCH_FAILED:${fetchError.message || 'unknown'}`);
        }
        diagnostics.push(`Attempted: ${upstreamUrls.join(', ')}`);
    }

    // DEV Fixture Fallback
    if (isDev) {
        try {
            // Import from safe proxy in src/lib (bypasses build guard for src/app)
            const { EVENTS } = await import('../../../../lib/dev-fixtures.js');

            fallbackEvents = EVENTS.map((e, i) => ({
                ...e,
                seq: 1000 + i,
                source: { system: 'fixture', endpoint: 'mock', region: 'dev', mode: 'dev' },
                actions: [{ label: 'View trace', type: 'view_trace' }]
            }));
            statusLabel = "DEGRADED (DEV_FIXTURE)";
        } catch (e) {
            diagnostics.push(`DEV_FIXTURE_LOAD_FAILED:${e.message}`);
        }
    }

    const metaFallback = {
        sourceStatus: statusLabel,
        generatedAt: new Date().toISOString(),
        watermark: watermarkFallback,
        diagnostics
    };

    metaFallback.credibility = computeCredibility({ meta: metaFallback, nowMs: Date.now() });

    return {
        events: fallbackEvents,
        meta: metaFallback
    };
}

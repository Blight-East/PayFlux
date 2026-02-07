import { NextResponse, NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { RiskIntelligence } from '../../../../../lib/risk-infra';
import { auth } from '@clerk/nextjs/server';
// Dynamic import for dev-fixtures to avoid build issues in prod if we want strictness, 
// but sticking to standard import with runtime check as per plan.
// Note: dev-fixtures is valid JS, so import should work if path is correct.
// Path: src/app/api/v1/evidence/export -> src/lib/dev-fixtures
import { EVIDENCE_HEALTH } from '../../../../../lib/dev-fixtures';

export const dynamic = 'force-dynamic';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

async function isAuthorized(request: NextRequest): Promise<boolean> {
    // 1. Check Browser Session (Clerk)
    const { userId } = await auth();
    if (userId) return true;

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

function deterministicJSON(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        // Recursively canonicalize elements
        const canonicalized = obj.map(deterministicJSON);

        // Deterministic sorting for specific collections in PayFlux Evidence Contract
        // Reports are sorted by ID, Snapshots by MerchantID.
        // For generic arrays, we use stable string sort if they contain objects with predictable keys,
        // but here we know our schema.
        if (canonicalized.length > 1 && typeof canonicalized[0] === 'object' && canonicalized[0] !== null) {
            if ('id' in canonicalized[0]) {
                return (canonicalized as any[]).sort((a, b) => String(a.id).localeCompare(String(b.id)));
            }
            if ('merchantId' in canonicalized[0]) {
                return (canonicalized as any[]).sort((a, b) => String(a.merchantId).localeCompare(String(b.merchantId)));
            }
        }
        return canonicalized;
    }

    const sortedKeys = Object.keys(obj)
        .filter(key => !FORBIDDEN_KEYS.has(key))
        .sort();

    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
        result[key] = deterministicJSON(obj[key]);
    }
    return result;
}

export async function GET(request: NextRequest) {
    // 0. Internal Authorization Gate
    if (!(await isAuthorized(request))) {
        return NextResponse.json(
            { error: 'UNAUTHORIZED' },
            { status: 401, headers: { 'Cache-Control': 'no-store' } }
        );
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const secret = process.env.EVIDENCE_SECRET;
    const hasSecret = !!secret;

    // 0. Production Key Gate
    if (isProduction && !hasSecret) {
        return NextResponse.json(
            { status: "DEGRADED", error: "EVIDENCE_EXPORT_SIGNING_KEY_MISSING" },
            { status: 503, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 1. Source Data
        let reports = await RiskIntelligence.getAllReports();
        let snapshots = await RiskIntelligence.getAllSnapshots();
        let sourceMode = 'production';

        // Fallback for Dev Verification (Strictly Dev Only)
        // If we are in PROD, we NEVER use fixtures.
        if (reports.length === 0 && snapshots.length === 0 && !isProduction) {
            sourceMode = 'development_mock';
            // Mock structure to match expected export shape
            reports = [{
                id: 'mock-report-1',
                merchantId: 'mock-merchant',
                createdAt: new Date().toISOString(),
                traceId: 'mock-trace',
                payload: EVIDENCE_HEALTH,
                source: 'fresh'
            }];
            snapshots = [{
                merchantId: 'mock-merchant',
                normalizedHost: 'localhost',
                scanCount: 1,
                lastScanAt: new Date().toISOString(),
                currentRiskTier: 0,
                tierDeltaLast: 0,
                trend: 'STABLE',
                policySurface: { present: 1, weak: 0, missing: 0 }
            }];
        } else if (reports.length === 0 && snapshots.length === 0) {
            // PROD: Source unavailable/empty
            return NextResponse.json(
                { error: 'EVIDENCE_SOURCE_UNAVAILABLE', reason: 'EMPTY_DATASET' },
                { status: 503, headers: { 'Cache-Control': 'no-store' } }
            );
        }

        const exportData = { reports, snapshots };

        // 2. Canonicalize (Deep Strip + Stable Sort + Bytes)
        const canonicalData = deterministicJSON(exportData);
        const canonicalString = JSON.stringify(canonicalData);
        const canonicalBytes = Buffer.from(canonicalString, 'utf-8');

        // 3. Hash (Option A: Hash of canonical bytes)
        const hash = crypto.createHash('sha256').update(canonicalBytes).digest('hex');

        // 4. Sign (Option A: HMAC over canonical bytes)
        let signature = null;
        if (hasSecret) {
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(canonicalBytes);
            signature = {
                alg: 'hmac-sha256',
                keyId: 'env',
                value: hmac.digest('hex'),
                integrity_hash: hash
            };
        } else {
            signature = { status: 'DEGRADED', reason: 'MISSING_KEY' };
        }

        // 5. Envelope
        const envelope = {
            payflux_export: {
                schemaVersion: "1.0",
                generatedAt: new Date().toISOString(),
                source: canonicalData,
                sourceMode,
                integrity_hash: hash,
                signature
            }
        };

        // 6. Response
        return new NextResponse(JSON.stringify(envelope, null, 2), {
            status: 200, // Always 200 if we produced an envelope (even degraded)
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Content-Disposition': `attachment; filename="payflux-evidence-${new Date().toISOString().replace(/[:.]/g, '-')}.json"`
            }
        });

    } catch (e) {
        // 5. Sanitized Logging
        console.error('Evidence Export Logic Error:', { type: 'API_HANDLER_FAILURE' });
        return NextResponse.json(
            { error: 'EXPORT_FAILED', detail: 'INTERNAL_ERROR' },
            { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}

export async function HEAD(request: NextRequest) {
    // 0. Internal Authorization Gate
    if (!(await isAuthorized(request))) {
        return new NextResponse(null, {
            status: 401,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const hasSecret = !!process.env.EVIDENCE_SECRET;

    if (isProduction && !hasSecret) {
        return new NextResponse(null, {
            status: 503,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    const reports = await RiskIntelligence.getAllReports();
    const snapshots = await RiskIntelligence.getAllSnapshots();

    if (reports.length === 0 && snapshots.length === 0 && isProduction) {
        return new NextResponse(null, {
            status: 503,
            headers: { 'Cache-Control': 'no-store' }
        });
    }

    return new NextResponse(null, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
    });
}

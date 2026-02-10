import { NextResponse } from 'next/server';
import { z } from 'zod';

// Option A Contract Schema
const MerchantSchema = z.object({
    id: z.string(),
    name: z.string(),
    vol: z.string(),
    status: z.string(),
    severity: z.string(),
    region: z.string(),
    baseline: z.string(),
    segment: z.string(),
});

const ArtifactSchema = z.object({
    id: z.string(),
    timestamp: z.string().datetime(),
    entity: z.string(),
    data: z.any(),
    severity: z.string(),
});

const NarrativeSchema = z.object({
    id: z.string(),
    timestamp: z.string().datetime(),
    type: z.string(),
    desc: z.string(),
    entityId: z.string(),
});

const SystemStateSchema = z.object({
    ingest_rate: z.string(),
    active_models: z.number(),
    uptime: z.string(),
    cluster: z.string(),
    node_count: z.number(),
});

const EnvelopeSchema = z.object({
    schemaVersion: z.literal('1.0'),
    generatedAt: z.string().datetime(),
    meta: z.object({
        lastGoodAt: z.string().datetime().optional(),
        sourceStatus: z.enum(['OK', 'DEGRADED', 'ERROR']).optional(),
        diagnostics: z.array(z.string()).optional(),
    }).optional(),
    payload: z.object({
        merchants: z.array(MerchantSchema),
        artifacts: z.array(ArtifactSchema),
        narratives: z.array(NarrativeSchema),
        system: SystemStateSchema,
    }),
});

type Envelope = z.infer<typeof EnvelopeSchema>;

// Security: Deep strip forbidden keys
function stripForbiddenKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(stripForbiddenKeys);

    const forbidden = ['__proto__', 'constructor', 'prototype'];
    const clean: any = {};
    for (const key in obj) {
        if (!forbidden.includes(key)) {
            clean[key] = stripForbiddenKeys(obj[key]);
        }
    }
    return clean;
}

// Fail-Soft: Create an envelope from an error
function createDegradedEnvelope(error: string, diagnostics: string[] = [], status: 'DEGRADED' | 'ERROR' = 'DEGRADED'): Envelope {
    return {
        schemaVersion: '1.0',
        generatedAt: new Date().toISOString(),
        meta: {
            sourceStatus: status,
            diagnostics: [error, ...diagnostics],
        },
        payload: {
            merchants: [],
            artifacts: [],
            narratives: [],
            system: {
                ingest_rate: '0 req/s',
                active_models: 0,
                uptime: '0s',
                cluster: 'unknown',
                node_count: 0,
            },
        },
    };
}

import { requireAuth } from '@/lib/require-auth';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { userId, workspace } = authResult;

    const baseUrl = process.env.CORE_BASE_URL || process.env.PAYFLUX_API_URL;
    const apiKey = process.env.CORE_AUTH_TOKEN || process.env.PAYFLUX_API_KEY;

    if (!baseUrl || !apiKey) {
        const response = NextResponse.json(
            createDegradedEnvelope('BFF Configuration Error: Missing CORE_BASE_URL or CORE_AUTH_TOKEN'),
            { status: 200 }
        );
        response.headers.set('X-PF-BFF', 'evidence-route-v1-canary');
        return response;
    }

    const url = new URL(request.url);
    const fixture = url.searchParams.get('fixture');
    let targetUrl = `${baseUrl}/api/evidence`;
    if (fixture) {
        targetUrl = `${baseUrl}/api/evidence/fixtures/${fixture}`;
    }

    try {
        const res = await fetch(targetUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        // 1. Handle Upstream Non-OK Responses
        if (!res.ok) {
            return NextResponse.json(
                createDegradedEnvelope(`Core Upstream Error: ${res.status} ${res.statusText}`),
                { status: 200 }
            );
        }

        const rawData = await res.json();

        // 2. Validate against Option A Contract
        const result = EnvelopeSchema.safeParse(rawData);
        if (!result.success) {
            const diags = result.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
            const response = NextResponse.json(
                createDegradedEnvelope('CONTRACT_MISMATCH', ['Core Contract Violation: Schema Mismatch', ...diags], 'DEGRADED')
            );
            response.headers.set('X-PF-BFF', 'evidence-route-v1-canary');
            return response;
        }

        // 3. Post-Process: Deep strip forbidden keys & ensure meta.diagnostics
        const data = result.data;
        if (!data.meta) data.meta = {};
        if (!data.meta.diagnostics) data.meta.diagnostics = [];

        const cleanData = stripForbiddenKeys(data);

        const response = NextResponse.json(cleanData);
        response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
        response.headers.set('X-PF-BFF', 'evidence-route-v1-canary');
        return response;

    } catch (err) {
        // 4. Handle Network/Connection Failures
        const response = NextResponse.json(
            createDegradedEnvelope('Core Connection Failed', [(err as Error).message])
        );
        response.headers.set('X-PF-BFF', 'evidence-route-v1-canary');
        return response;
    }
}

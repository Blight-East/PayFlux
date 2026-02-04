import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Auth Guard
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.CORE_AUTH_TOKEN || process.env.PAYFLUX_API_KEY;
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
        if (!authHeader || !apiKey || authHeader !== `Bearer ${apiKey}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // 2. Return Provenance Data
    // These are injected at build time via next.config.ts
    const provenance = {
        gitSha: process.env.NEXT_PUBLIC_COMMIT_SHA || 'unknown',
        buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
        nodeEnv: process.env.NODE_ENV,
        payfluxEnv: process.env.PAYFLUX_ENV || 'unknown',
    };

    const response = NextResponse.json(provenance);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
}

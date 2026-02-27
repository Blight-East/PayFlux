import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import type { Feature } from '@/lib/tier/features';

// Exact match mapping of allowed proxy paths to their required feature capability
const ALLOWED_PROXY_PATHS: Record<string, Feature> = {
    'pilot/warnings': 'alert_routing',
    'pilot/dashboard': 'alert_routing'
};

function isPilotAllowed(): boolean {
    // Require explicit enablement via env var
    return process.env.DASHBOARD_ALLOW_PILOT_ENDPOINTS === 'true';
}

export async function GET(
    request: Request,
    { params }: any
) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const { workspace } = authResult;

    const { path } = await params;
    const targetPath = path.join('/');
    const payfluxUrl = process.env.PAYFLUX_API_URL;
    const apiKey = process.env.PAYFLUX_API_KEY;

    const requiredCapability = ALLOWED_PROXY_PATHS[targetPath];

    // Defense-in-depth: explicitly allowlist what can be proxied (exact match)
    if (!requiredCapability) {
        return NextResponse.json(
            { error: 'Forbidden', code: 'UNSUPPORTED_PROXY_PATH' },
            { status: 403 }
        );
    }

    // Defense-in-depth: block pilot endpoints unless explicitly enabled AND tier has capability
    if (!isPilotAllowed() || !canAccess(workspace.tier, requiredCapability)) {
        return NextResponse.json(
            { error: 'Not available in this environment or tier' },
            { status: 403 }
        );
    }

    if (!payfluxUrl || !apiKey) {
        return NextResponse.json({ error: 'PayFlux connection not configured' }, { status: 500 });
    }

    const url = new URL(request.url);
    const targetUrl = `${payfluxUrl}/${targetPath}${url.search}`;

    try {
        const res = await fetch(targetUrl, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Payflux-Account-Id': `acc_${workspace.workspaceId}`,
            },
        });

        if (!res.ok) {
            return NextResponse.json({ error: `PayFlux error: ${res.statusText}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Remote endpoint unreachable', err);
        // Mock data for development if PayFlux is down
        if (targetPath === 'pilot/warnings') {
            return NextResponse.json([
                {
                    warning_id: 'w_mock_1',
                    processor: 'stripe',
                    risk_band: 'critical',
                    risk_score: 0.9823,
                    processed_at: new Date().toISOString(),
                    outcome_observed: false
                },
                {
                    warning_id: 'w_mock_2',
                    processor: 'stripe',
                    risk_band: 'high',
                    risk_score: 0.7541,
                    processed_at: new Date(Date.now() - 3600000).toISOString(),
                    outcome_observed: true,
                    outcome_type: 'throttle'
                }
            ]);
        }
        return NextResponse.json({ error: 'Connection failed' }, { status: 502 });
    }
}

export async function POST(
    request: Request,
    { params }: any
) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    const { workspace } = authResult;

    const { path } = await params;
    const targetPath = path.join('/');
    const payfluxUrl = process.env.PAYFLUX_API_URL;
    const apiKey = process.env.PAYFLUX_API_KEY;

    const requiredCapability = ALLOWED_PROXY_PATHS[targetPath];

    // Defense-in-depth: explicitly allowlist what can be proxied (exact match)
    if (!requiredCapability) {
        return NextResponse.json(
            { error: 'Forbidden', code: 'UNSUPPORTED_PROXY_PATH' },
            { status: 403 }
        );
    }

    // Defense-in-depth: block pilot endpoints unless explicitly enabled AND tier has capability
    if (!isPilotAllowed() || !canAccess(workspace.tier, requiredCapability)) {
        return NextResponse.json(
            { error: 'Not available in this environment or tier' },
            { status: 403 }
        );
    }

    if (!payfluxUrl || !apiKey) {
        return NextResponse.json({ error: 'PayFlux connection not configured' }, { status: 500 });
    }

    const body = await request.json();
    const targetUrl = `${payfluxUrl}/${targetPath}`;

    try {
        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Payflux-Account-Id': `acc_${workspace.workspaceId}`,
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        return NextResponse.json({ error: 'Connection failed' }, { status: 502 });
    }
}

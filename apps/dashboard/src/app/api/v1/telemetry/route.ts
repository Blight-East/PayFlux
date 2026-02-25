import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Allowed events — whitelist only, reject anything else
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_EVENTS = new Set([
    'forecast_panel_viewed',
    'forecast_tpv_entered',
    'forecast_export_clicked',
    'forecast_unlock_clicked',
    'forecast_403_hit',
]);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/telemetry
//
// Log-only. No persistence. No external service. Structured JSON to stdout.
// Read with: grep "pfx_telemetry" <logfile>
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const event = typeof body?.event === 'string' ? body.event.trim() : '';

        if (!event || !ALLOWED_EVENTS.has(event)) {
            return new NextResponse(null, { status: 400 });
        }

        // Sanitize properties — flat string map only, cap at 8 keys
        const rawProps = body.properties ?? {};
        const properties: Record<string, string> = {};
        let keyCount = 0;

        for (const [k, v] of Object.entries(rawProps)) {
            if (keyCount >= 8) break;
            if (typeof k === 'string' && typeof v === 'string' && k.length <= 64 && v.length <= 256) {
                properties[k] = v;
                keyCount++;
            }
        }

        // Structured log line — grep-friendly prefix
        console.log(JSON.stringify({
            _tag: 'pfx_telemetry',
            event,
            properties,
            ts: new Date().toISOString(),
        }));

        return new NextResponse(null, { status: 204 });
    } catch {
        return new NextResponse(null, { status: 400 });
    }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    // Check authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token');

    if (!token || token.value !== process.env.ADMIN_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract merchant_id_hash from query params
    const url = new URL(request.url);
    const merchantIdHash = url.searchParams.get('merchant_id_hash');

    if (!merchantIdHash) {
        return NextResponse.json({ error: 'missing merchant_id_hash query parameter' }, { status: 400 });
    }

    // Proxy to PayFlux /v1/coverage endpoint
    const payfluxUrl = process.env.PAYFLUX_API_URL;
    const apiKey = process.env.PAYFLUX_API_KEY;

    if (!payfluxUrl || !apiKey) {
        return NextResponse.json({ error: 'PayFlux connection not configured' }, { status: 500 });
    }

    try {
        const res = await fetch(`${payfluxUrl}/v1/coverage?merchant_id_hash=${encodeURIComponent(merchantIdHash)}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            return NextResponse.json({ error: `PayFlux error: ${res.statusText}`, details: errorText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error('Coverage endpoint unreachable', err);
        // Return error instead of fallback - we need real data
        return NextResponse.json({
            error: 'Connection failed',
            available: false
        }, { status: 502 });
    }
}

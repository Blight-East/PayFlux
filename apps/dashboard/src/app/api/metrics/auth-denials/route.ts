import { NextResponse } from 'next/server';

export async function GET() {
    const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:19090';

    try {
        // Query for auth denials by reason over last 15 minutes
        const query = encodeURIComponent('sum by (reason) (increase(payflux_auth_denied_total[15m]))');
        const url = `${prometheusUrl}/api/v1/query?query=${query}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'prometheus_unreachable', available: false },
                { status: 503 }
            );
        }

        const data = await response.json();

        // Transform Prometheus response to simple format
        const denials: Record<string, number> = {
            missing_key: 0,
            revoked_key: 0,
            invalid_key: 0,
        };

        if (data.status === 'success' && data.data.result) {
            for (const item of data.data.result) {
                const reason = item.metric.reason;
                const value = parseFloat(item.value[1]);
                if (reason in denials) {
                    denials[reason] = Math.round(value);
                }
            }
        }

        return NextResponse.json({
            available: true,
            denials,
            window: '15m',
        });

    } catch (error) {
        return NextResponse.json(
            { error: 'prometheus_unreachable', available: false },
            { status: 503 }
        );
    }
}

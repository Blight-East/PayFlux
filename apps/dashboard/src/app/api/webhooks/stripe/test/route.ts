import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    // Only allow in development with explicit bypass flag
    const isDev = process.env.NODE_ENV === 'development';
    const bypassEnabled = process.env.DASHBOARD_WEBHOOK_TEST_BYPASS === 'true';

    if (!isDev || !bypassEnabled) {
        return NextResponse.json(
            { error: 'Test webhook only available in development with DASHBOARD_WEBHOOK_TEST_BYPASS=true' },
            { status: 403 }
        );
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const webhookUrl = `${protocol}://${host}/api/webhooks/stripe`;

    const mockFailEvent = {
        id: `evt_test_${Math.random().toString(36).substring(7)}`,
        type: 'payment_intent.payment_failed',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: `pi_test_${Math.random().toString(36).substring(7)}`,
                metadata: {
                    merchant_id: 'acme_corp_testing',
                    retry_count: '3'
                },
                last_payment_error: {
                    code: 'card_declined'
                }
            }
        }
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Stripe-Signature': 'test_bypass',
            },
            body: JSON.stringify(mockFailEvent),
        });

        if (res.ok) {
            return NextResponse.json({ success: true, eventId: mockFailEvent.id });
        }
        const err = await res.json();
        return NextResponse.json({ error: err.error || 'Failed to trigger test webhook' }, { status: res.status });
    } catch {
        return NextResponse.json({ error: 'Connection failed' }, { status: 502 });
    }
}

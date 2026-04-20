import { NextResponse } from 'next/server';
import { requirePaidAuth } from '@/lib/require-auth';
import { getRiskLedgerState } from '../_lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;

    const data = await getRiskLedgerState({ requestUrl: request.url });

    return NextResponse.json(data, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache'
        }
    });
}

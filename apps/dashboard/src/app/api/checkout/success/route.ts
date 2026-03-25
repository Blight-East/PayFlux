import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Legacy checkout success path.
 *
 * Historical Stripe sessions pointed here before the funnel moved to /activate.
 * Keep this route as a compatibility redirect so old success URLs do not 404.
 */
export async function GET(request: NextRequest) {
    return new NextResponse(null, {
        status: 307,
        headers: {
            Location: '/activate',
        },
    });
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Legacy pricing path.
 *
 * Keep this as a raw redirect so obsolete query parameters do not leak into
 * the new upgrade flow.
 */
export async function GET(request: NextRequest) {
    return new NextResponse(null, {
        status: 307,
        headers: {
            Location: '/upgrade',
        },
    });
}

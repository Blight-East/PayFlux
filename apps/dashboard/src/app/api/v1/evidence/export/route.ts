
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        { status: "DEGRADED", error: "EVIDENCE_EXPORT_NOT_ENABLED" },
        {
            status: 501,
            headers: {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/json',
            },
        }
    );
}

export async function HEAD() {
    return new NextResponse(null, {
        status: 501,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json',
        },
    });
}

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/onboarding/event
 * Fire-and-forget event logger for client-side onboarding transitions.
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        const body = await req.json();

        console.log(`[ONBOARDING_EVENT] ${JSON.stringify({
            event: body.event,
            userId: userId ?? 'anonymous',
            metadata: body.metadata,
            timestamp: body.timestamp ?? new Date().toISOString(),
        })}`);

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: true }); // Never fail
    }
}

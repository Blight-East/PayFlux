import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { persistEvent } from '@/lib/event-store';

export const runtime = 'nodejs';

/**
 * POST /api/onboarding/event
 * Receives client-side onboarding events and persists them durably.
 */
export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        const body = await req.json();

        const eventName = body.event;
        const metadata = body.metadata ?? {};

        console.log(`[ONBOARDING_EVENT] ${JSON.stringify({
            event: eventName,
            userId: userId ?? 'anonymous',
            workspaceId: orgId ?? null,
            metadata,
            timestamp: body.timestamp ?? new Date().toISOString(),
        })}`);

        // Persist to durable store
        await persistEvent({
            eventName,
            userId: userId ?? undefined,
            workspaceId: orgId ?? undefined,
            metadata,
        });

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[ONBOARDING_EVENT_API] Error:', err);
        return NextResponse.json({ ok: true }); // Never fail
    }
}

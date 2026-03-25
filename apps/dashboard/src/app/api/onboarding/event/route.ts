import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { persistEvent } from '@/lib/event-store';

export const runtime = 'nodejs';

/**
 * POST /api/onboarding/event
 * Receives client-side onboarding events and persists them durably.
 * Reads pf_journey cookie to ensure journey_id is always present.
 */
export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        const body = await req.json();

        const eventName = body.event;
        const metadata = body.metadata ?? {};

        // Ensure journey_id is present — client should send it,
        // but fall back to cookie if missing
        if (!metadata.journey_id) {
            const journeyCookie = req.cookies.get('pf_journey');
            if (journeyCookie?.value) {
                metadata.journey_id = journeyCookie.value;
            }
        }

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

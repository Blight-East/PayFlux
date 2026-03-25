import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { queryEvents } from '@/lib/event-store';

export const runtime = 'nodejs';

/**
 * GET /api/onboarding/events
 * Query persisted onboarding funnel events.
 *
 * Query params:
 *   ?limit=50         — max rows (default 100)
 *   ?userId=user_xxx  — filter by user
 *   ?event=scan_completed — filter by event name
 */
export async function GET(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);
    const filterUser = searchParams.get('userId') ?? undefined;
    const filterEvent = searchParams.get('event') ?? undefined;

    try {
        const rows = await queryEvents({
            limit,
            userId: filterUser,
            eventName: filterEvent,
        });

        return NextResponse.json({
            count: rows.length,
            events: rows.map(r => ({
                id: r.id,
                event: r.event_name,
                userId: r.user_id,
                workspaceId: r.workspace_id,
                metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
                createdAt: r.created_at,
            })),
        });
    } catch (err) {
        console.error('[EVENTS_QUERY] Failed:', err);
        return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
}

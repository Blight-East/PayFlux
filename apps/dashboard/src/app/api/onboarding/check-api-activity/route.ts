import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/onboarding/check-api-activity
 * 
 * Checks if user has made any API calls (for API-first onboarding path).
 * 
 * In production, this should query event logs or ingestion table.
 * For now, returns false (requires manual implementation).
 */
export async function GET(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        // TODO: Query event logs or ingestion table for user's first API call
        // For now, always return false

        // In production:
        // const hasActivity = await db.events.count({
        //     where: {
        //         accountId: account.id,
        //     },
        // }) > 0;

        const hasActivity = false;

        return NextResponse.json({
            hasActivity,
        });
    } catch (error) {
        console.error('[Onboarding] Error checking API activity:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

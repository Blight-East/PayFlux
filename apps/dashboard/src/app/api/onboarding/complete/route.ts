import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/onboarding/complete
 * 
 * Marks user's onboarding as complete.
 * 
 * Body:
 * - mode: 'UI_SCAN' | 'API_FIRST' | 'NO_SITE'
 * 
 * PRODUCTION BLOCKER:
 * - No database client configured
 * - Cannot persist onboarding state
 * - Completion is logged but NOT stored
 * 
 * NOTE: Onboarding completion is enforced at the UI/middleware level only.
 * Persistence will be added once database infrastructure exists.
 * 
 * Current behavior:
 * - Logs completion event
 * - Returns success response
 * - Does NOT persist to database
 * - State does NOT survive session/page refresh
 */
export async function POST(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { mode } = body;

        if (!mode || !['UI_SCAN', 'API_FIRST', 'NO_SITE'].includes(mode)) {
            return NextResponse.json(
                { error: 'Invalid mode' },
                { status: 400 }
            );
        }

        // TODO: Update database with onboarding completion
        // For now, this is a placeholder that returns success
        // The actual state is managed in the account resolver mock

        // In production:
        // await db.accounts.update({
        //     where: { userId },
        //     data: {
        //         onboarding: {
        //             completed: true,
        //             step: 'VALUE_REALIZED',
        //             completedAt: new Date().toISOString(),
        //             mode,
        //         },
        //     },
        // });

        console.log(`[Onboarding] User ${userId} completed onboarding via ${mode}`);

        return NextResponse.json({
            success: true,
            onboarding: {
                completed: true,
                step: 'VALUE_REALIZED',
                completedAt: new Date().toISOString(),
                mode,
            },
        });
    } catch (error) {
        console.error('[Onboarding] Error completing onboarding:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

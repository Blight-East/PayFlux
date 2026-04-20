import { NextResponse } from 'next/server';
import { requirePaidAuth } from '@/lib/require-auth';
import { hasAccountAPIActivity } from '@/lib/account-resolver';

/**
 * GET /api/onboarding/check-api-activity
 * 
 * Checks if user has made any API calls (for API-first onboarding path).
 * 
 * Reads the persisted API activity marker from the account store.
 */
export async function GET(request: Request) {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;
    const { userId } = authResult;

    try {
        const hasActivity = await hasAccountAPIActivity(userId);

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

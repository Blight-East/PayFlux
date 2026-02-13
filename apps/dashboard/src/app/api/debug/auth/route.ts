import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { userId, sessionId } = await auth();

    return NextResponse.json({
        auth: {
            userId,
            sessionId,
            isAuthenticated: !!userId
        },
        env: {
            hasSecretKey: !!process.env.CLERK_SECRET_KEY,
            secretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 7),
            nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
            clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
            nodeEnv: process.env.NODE_ENV
        }
    });
}

export const dynamic = "force-dynamic";

import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/oauth-state';
import { resolveOrCreateActiveWorkspace } from '@/lib/active-workspace';
import { requireAdmin } from '@/lib/guards';

export async function GET() {
    console.log("STRIPE_AUTHORIZE_START");

    try {
        // 1. Auth Check
        const { userId, orgId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        await clerkClient();
        const workspace = await resolveOrCreateActiveWorkspace(userId, orgId || null);
        requireAdmin(workspace);

        // 3. Generate Secure State
        // Note: generateStateToken uses hardened HMAC logic (Buffer.from)
        const state = await generateStateToken(workspace.workspaceId, userId);

        // 4. Construct Stripe URL
        const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
        if (!clientId) {
            console.error("Missing Stripe Connect client ID");
            throw new Error("Misconfigured Stripe Client ID");
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI
            || (appUrl ? `${appUrl.replace(/\/$/, '')}/api/stripe/callback` : null);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            scope: 'read_only',
            state: state
        });

        if (redirectUri) {
            params.set('redirect_uri', redirectUri);
        }

        const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

        console.log("Redirecting to Stripe Connect authorize endpoint");
        return NextResponse.redirect(url);

    } catch (err: any) {
        if (err instanceof Error && err.message === 'ADMIN_REQUIRED') {
            return new NextResponse('Forbidden', { status: 403 });
        }
        console.error("STRIPE_AUTHORIZE_CRASH", err?.message ?? 'unknown');
        return new NextResponse('Stripe Authorize Failed', { status: 500 });
    }
}

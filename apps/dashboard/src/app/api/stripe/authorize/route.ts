export const dynamic = "force-dynamic";

import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/oauth-state';

// Helper to resolve or create org
async function resolveActiveOrgId(client: any, userId: string, orgId: string | null) {
    if (orgId) return orgId;

    // Try to find existing membership
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    if (memberships?.data?.length > 0) {
        return memberships.data[0].organization.id;
    }

    // Create default org
    const org = await client.organizations.createOrganization({
        name: "Default Payflux Org",
        createdBy: userId,
    });
    return org.id;
}

export async function GET() {
    console.log("STRIPE_AUTHORIZE_START");

    try {
        // 1. Auth Check
        const { userId, orgId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const client = await clerkClient();

        // 2. Resolve Org
        const activeOrgId = await resolveActiveOrgId(client, userId, orgId || null);

        // 3. Generate Secure State
        // Note: generateStateToken uses hardened HMAC logic (Buffer.from)
        const state = await generateStateToken(activeOrgId, userId);

        // 4. Construct Stripe URL
        const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
        if (!clientId) {
            console.error("Missing NEXT_PUBLIC_STRIPE_CLIENT_ID");
            throw new Error("Misconfigured Stripe Client ID");
        }

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            scope: 'read_write',
            state: state
        });

        const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

        console.log("Redirecting to Stripe:", url);
        return NextResponse.redirect(url);

    } catch (err: any) {
        console.error("STRIPE_AUTHORIZE_CRASH", err);
        return new NextResponse(`Stripe Authorize Failed: ${err.message}`, { status: 500 });
    }
}

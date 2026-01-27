import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    if (process.env.NODE_ENV === "production") {
        return new NextResponse("Not Found", { status: 404 });
    }

    const { userId, orgId } = await auth();
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const client = await clerkClient();

    // Resolve active orgId
    let activeOrgId = orgId;
    if (!activeOrgId) {
        const memberships = await client.users.getOrganizationMembershipList({ userId });
        if (memberships?.data?.length > 0) {
            activeOrgId = memberships.data[0].organization.id;
        } else {
            const org = await client.organizations.createOrganization({
                name: "Default Payflux Org",
                createdBy: userId,
            });
            activeOrgId = org.id;
        }
    }

    // Write mock metadata
    await client.organizations.updateOrganizationMetadata(activeOrgId, {
        publicMetadata: {
            stripeAccountId: "acct_mock_123456789",
            stripeConnectedAt: new Date().toISOString(),
            stripeConnectionStatus: "CONNECTED",
        },
    });

    console.log(`[DEV] Mock Stripe Account connected for Org: ${activeOrgId}`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL("/onboarding", baseUrl));
}

import { NextResponse } from 'next/server';
import { findWorkspaceById } from '@/lib/db/workspaces';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { workspace_id, signal, current_count, baseline_average } = body;

        const workspace = await findWorkspaceById(workspace_id);
        if (!workspace || !workspace.owner_clerk_user_id) {
            return NextResponse.json({ error: 'Workspace or owner not found' }, { status: 404 });
        }

        const client = await clerkClient();
        const user = await client.users.getUser(workspace.owner_clerk_user_id);
        const email = user.emailAddresses[0]?.emailAddress;

        if (email) {
            // Simulated Resend email send
            console.log(`[ALERT] Email sent to ${email}`);
            console.log(`Subject: PayFlux Alert: Payment failure spike detected`);
            console.log(`Body: We detected an abnormal spike in payment failures. Current count: ${current_count}. Baseline average: ${baseline_average}. Please check your dashboard.`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to process alert:', error);
        return NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
    }
}

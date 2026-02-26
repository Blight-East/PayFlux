import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveWorkspace(userId);

    if (!workspace) {
        redirect('/onboarding');
    }

    return <DashboardClient tier={workspace.tier} />;
}

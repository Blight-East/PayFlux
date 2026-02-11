import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';

import Sidebar from '@/components/Sidebar';
import WorkspaceHeader from '@/components/WorkspaceHeader';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveWorkspace(userId);

    // If authenticated but no workspace (e.g. not in an org), 
    // we redirect to onboarding or sign-in for now.
    if (!workspace) {
        redirect('/sign-in');
    }

    return (
        <div className="flex h-screen bg-black text-white">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <WorkspaceHeader workspace={workspace} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

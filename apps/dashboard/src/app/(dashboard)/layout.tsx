import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import Sidebar from '@/components/Sidebar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const workspace = await resolveWorkspace(userId);
    if (!workspace) redirect('/onboarding');

    return (
        <div className="flex h-screen bg-black text-white">
            <Sidebar workspace={workspace} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <WorkspaceHeader workspace={workspace} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

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

    return (
        <div className="flex h-screen bg-black text-white">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <WorkspaceHeader />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

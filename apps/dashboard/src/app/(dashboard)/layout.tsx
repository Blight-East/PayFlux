import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { resolveWorkspace } from '@/lib/resolve-workspace';

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

    if (!workspace) {
        redirect('/onboarding');
    }

    return (
        <div className="flex min-h-screen bg-black text-white">
            <aside className="w-64 border-r border-zinc-800">
                <Sidebar workspace={workspace} />
            </aside>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    );
}

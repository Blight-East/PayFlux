import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex bg-zinc-950 min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-black">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-zinc-400">Workspace:</span>
                        <span className="text-sm font-bold text-white px-2 py-1 bg-zinc-900 rounded border border-zinc-800">Acme Corp</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                            Tier 2
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

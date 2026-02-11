import { type WorkspaceContext } from '@/lib/resolve-workspace';

interface WorkspaceHeaderProps {
    workspace: WorkspaceContext;
}

export default function WorkspaceHeader({ workspace }: WorkspaceHeaderProps) {
    return (
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-black">
            <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-zinc-400">Workspace:</span>
                <span className="text-sm font-bold text-white px-2 py-1 bg-zinc-900 rounded border border-zinc-800">
                    {workspace.workspaceName}
                </span>
                <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800/50">
                    {workspace.role}
                </span>
            </div>
            <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wider ${workspace.tier === 'enterprise' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                        workspace.tier === 'pro' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                    {workspace.tier}
                </div>
            </div>
        </header>
    );
}

import type { WorkspaceContext } from '@/lib/resolve-workspace';

export default function WorkspaceHeader({
    workspace,
}: {
    workspace: WorkspaceContext;
}) {
    const { workspaceName, role, tier } = workspace;

    return (
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950">
            <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-500">Workspace</span>
                <span className="text-sm font-semibold text-white">
                    {workspaceName}
                </span>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-slate-700 text-slate-400">
                    {role}
                </span>
            </div>

            <div className="flex items-center space-x-3">
                <span
                    className={`
            text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded
            ${tier === 'enterprise'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : tier === 'pro'
                                ? 'bg-blue-500/10 text-[#0A64BC] border border-blue-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }
          `}
                >
                    {tier}
                </span>
            </div>
        </header>
    );
}

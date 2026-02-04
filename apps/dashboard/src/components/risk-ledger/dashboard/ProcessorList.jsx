// STUB: Real implementation would fetch or use a hook.
const PROCESSORS = [];

export function ProcessorList() {
    return (
        <div className="bg-panel border border-white/10 rounded-sm p-4 h-full flex flex-col">
            <h3 className="text-muted text-[10px] font-medium uppercase tracking-wider mb-3">Connected Processors Summary</h3>

            <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                {PROCESSORS.map((proc, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 -mx-2 transition-colors">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-sm ${proc.status === 'operational' ? 'bg-safe' : proc.status === 'degraded' ? 'bg-warning' : 'bg-danger'}`} />
                            <div className="text-xs font-mono text-gray-300">{proc.name}</div>
                        </div>
                        <div className="text-[10px] font-mono text-subtle">
                            {proc.latency}ms
                        </div>
                    </div>
                ))}
                {PROCESSORS.length === 0 && (
                    <div className="text-[10px] text-void-dim font-mono italic py-4 text-center">No processors connected.</div>
                )}
            </div>
        </div>
    );
}

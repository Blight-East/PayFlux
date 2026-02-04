import { PROCESSORS } from '../../../fixtures/mockData'; // DEV_ONLY: Fixture until API wired

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
            </div>
        </div>
    );
}

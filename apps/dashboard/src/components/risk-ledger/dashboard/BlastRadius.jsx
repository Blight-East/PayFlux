// STUB: Real implementation would fetch or use a hook.
const BLAST_RADIUS = {
    regions: [],
    volume_at_risk: "$0.00",
    merchants: []
};

export function BlastRadius() {
    return (
        <div className="bg-panel border border-white/10 rounded-sm p-4 h-full flex flex-col gap-4">
            {/* Header */}
            <div>
                <h3 className="text-muted text-[10px] font-medium uppercase tracking-wider">Blast Radius & Impact Analysis</h3>
                <p className="text-subtle text-[10px] mt-1 font-mono">Real-time exposure assessment.</p>
            </div>

            {/* Top Regions - Heat Bars (Flat) */}
            <div>
                <h4 className="text-[10px] uppercase text-subtle font-semibold mb-2">Top Risk Regions</h4>
                <div className="space-y-3">
                    {BLAST_RADIUS.regions.map((region) => (
                        <div key={region.name} className="group">
                            <div className="flex justify-between text-[10px] mb-1 font-mono">
                                <span className="text-gray-300">{region.name}</span>
                                <span className={`${region.risk > 50 ? 'text-warning' : 'text-safe'}`}>
                                    {region.risk}% Risk
                                </span>
                            </div>
                            <div className="h-1.5 w-full bg-mid border border-white/5 overflow-hidden">
                                <div
                                    className={`h-full ${region.risk > 80 ? 'bg-danger' : region.risk > 40 ? 'bg-warning' : 'bg-safe'} transition-all duration-500`}
                                    style={{ width: `${region.risk}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {BLAST_RADIUS.regions.length === 0 && (
                        <div className="text-[10px] text-void-dim font-mono italic">Awaiting telemetry...</div>
                    )}
                </div>
            </div>

            <div className="h-px bg-white/10" />

            {/* Merchants at Risk - List */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] uppercase text-subtle font-semibold">Merchants at Risk</h4>
                    <span className="text-[10px] text-danger font-mono font-bold tracking-tight">Vol: {BLAST_RADIUS.volume_at_risk}</span>
                </div>

                <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {BLAST_RADIUS.merchants.map((merchant) => (
                        <div key={merchant.id} className="flex items-center justify-between p-1.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer group">
                            <div>
                                <div className="text-[11px] font-medium text-gray-300 group-hover:text-white font-mono">{merchant.name}</div>
                                <div className="text-[9px] text-subtle font-mono">{merchant.id}</div>
                            </div>
                            <Badge variant={merchant.risk > 80 ? 'down' : 'degraded'}>
                                Risk: {merchant.risk}
                            </Badge>
                        </div>
                    ))}
                    {BLAST_RADIUS.merchants.length === 0 && (
                        <div className="text-center py-8 text-[10px] text-void-dim font-mono italic">No exposure detected.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

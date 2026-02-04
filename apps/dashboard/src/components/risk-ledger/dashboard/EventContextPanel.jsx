import { Badge } from '../ui/Badge';

export function EventContextPanel({ event, credibility }) {
    if (!event) {
        return (
            <div className="bg-panel border border-white/10 rounded-sm h-full flex items-center justify-center">
                <span className="text-void-dim text-[10px] font-mono">Select an event</span>
            </div>
        );
    }

    return (
        <div className="bg-panel border border-white/10 rounded-sm h-full flex flex-col overflow-hidden">
            <div className="h-8 border-b border-white/10 flex items-center px-3 bg-white/[0.02]">
                <span className="text-[10px] font-medium uppercase tracking-wider text-subtle">Event Context</span>
            </div>

            <div className="p-4 flex flex-col gap-6 overflow-y-auto">
                {/* Event Summary/Title */}
                <div className="space-y-1">
                    <h3 className="text-white font-medium">{event.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-subtle font-mono">
                        <span>{event.kind}</span>
                        <span className="text-white/10">|</span>
                        <div className="flex justify-between">
                            <span className="text-subtle">Endpoint</span>
                            <span className="text-white font-mono">{event.source?.endpoint || 'N/A'}</span>
                        </div>
                        {event.evidenceRef?.lastGoodAt && (
                            <div className="grid grid-cols-[80px_1fr] gap-2">
                                <span className="text-subtle">Verified:</span>
                                <span className="font-mono text-white tracking-tight">{event.evidenceRef.lastGoodAt}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-subtle">Mode</span>
                            <span className="text-white font-mono">{event.source?.mode || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Proof Section */}
                <div className="space-y-2">
                    <h4 className="text-[10px] text-void-dim uppercase tracking-wider">Proof</h4>
                    <div className="p-3 bg-void-surface border border-white/5 rounded text-xs px-3 py-2 space-y-2 font-mono">
                        {/* Credibility Snapshot */}
                        {credibility && (
                            <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                                <div className="flex justify-between">
                                    <span className="text-subtle">Credibility</span>
                                    <span className={credibility.band === 'high' ? 'text-white' : credibility.band === 'medium' ? 'text-warning' : 'text-subtle'}>
                                        {credibility.score} ({credibility.band})
                                    </span>
                                </div>
                                {credibility.reasons?.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-subtle">Reasons</span>
                                        <span className="text-void-fg text-[10px] max-w-[120px] truncate text-right" title={credibility.reasons.join(', ')}>
                                            {credibility.reasons[0]}{credibility.reasons.length > 1 ? ` +${credibility.reasons.length - 1}` : ''}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-subtle">Computed</span>
                                    <span className="text-void-dim text-[10px]">
                                        {credibility.computedAt ? new Date(credibility.computedAt).toLocaleTimeString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {event.evidenceRef && (
                            <div className="flex flex-col gap-1 pb-2 border-b border-white/5">
                                <div className="flex justify-between">
                                    <span className="text-subtle">Ref Kind</span>
                                    <span className="text-void-fg">{event.evidenceRef.kind}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-subtle">Ref Seq</span>
                                    <span className="text-void-fg">{event.evidenceRef.seq}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-subtle">Ref Endpoint</span>
                                    <span className="text-void-fg truncate max-w-[120px]">{event.evidenceRef.endpoint}</span>
                                </div>
                            </div>
                        )}

                        {(event.links || []).map((link, i) => (
                            <div key={i} className="flex justify-between items-center group">
                                <span className="text-subtle group-hover:text-white transition-colors">{link.label}</span>
                                <code className="text-[10px] bg-white/5 px-1 py-0.5 rounded text-void-dim group-hover:text-safe transition-colors select-all cursor-text">
                                    {link.href}
                                </code>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-3 bg-void-surface border border-white/5 rounded text-xs">
                    <p className="text-void-fg leading-relaxed">
                        {event.summary}
                    </p>
                </div>

                {/* Raw ID for verification */}
                <div className="pt-4 border-t border-white/5 mt-4">
                    <span className="text-[10px] text-void-dim uppercase">Event ID</span>
                    <div className="text-[10px] text-subtle mt-1 font-mono">{event.id}</div>
                </div>
            </div>
        </div>
    );
}

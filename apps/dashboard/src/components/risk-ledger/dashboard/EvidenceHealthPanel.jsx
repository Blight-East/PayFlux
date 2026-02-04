import { Activity, AlertTriangle, check } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useEvidenceHealth } from '../../../hooks/useEvidenceHealth';
import { clsx } from 'clsx';
import { STALE_THRESHOLD_MS } from '../../../config/risk';

export function EvidenceHealthPanel() {
    const { health, isLoading } = useEvidenceHealth();

    // Staleness Logic
    const lastGoodDate = health?.lastGoodAt && health.lastGoodAt !== 'never' ? new Date(health.lastGoodAt) : null;
    const timeSinceGood = lastGoodDate ? (Date.now() - lastGoodDate.getTime()) : null;
    const isStale = timeSinceGood && timeSinceGood > STALE_THRESHOLD_MS;

    if (isLoading && !health) {
        return (
            <div className="p-4 border border-white/10 bg-void rounded-sm">
                <div className="flex items-center gap-2 text-void-dim text-xs">
                    <Activity className="h-3 w-3 animate-pulse" />
                    <span>Awaiting health signal...</span>
                </div>
            </div>
        );
    }

    const isDegraded = health?.status !== 'OK';

    // Status colors: OK=Success, DEGRADED=Warning, STALE=Warning
    const statusVariant = isDegraded ? 'warning' : 'success';

    // Relative Time Helper
    const getRelativeTime = (date) => {
        if (!date) return 'Never';
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return (
        <div className="p-4 border border-white/10 bg-void rounded-sm space-y-4 font-mono">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-void-dim text-xs uppercase tracking-wider">Evidence Health</h3>
                <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5">
                    {health?.status || 'UNKNOWN'}
                </Badge>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-[10px] text-void-dim uppercase">Last Good</div>
                    <div className={clsx("text-xs mt-0.5 truncate flex items-center gap-1", isStale ? "text-warning" : "text-void-fg")}>
                        {getRelativeTime(lastGoodDate)}
                        {isStale && <AlertTriangle className="h-3 w-3" />}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-void-dim uppercase">Uptime</div>
                    <div className="text-xs text-void-fg mt-0.5">
                        {health?.uptime || '-'}
                    </div>
                </div>
            </div>

            {/* Error Counts (Compact) */}
            {health?.errorCounts && (
                <div className="border-t border-white/5 pt-3">
                    <div className="text-[10px] text-void-dim uppercase mb-2">Error Counts</div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-void-dim">
                        <div className="flex flex-col">
                            <span>Degraded</span>
                            <span className="text-void-fg">{health.errorCounts.degraded}</span>
                        </div>
                        <div className="flex flex-col">
                            <span>Dropped events</span>
                            <span className="text-void-fg">{health.errorCounts.drop}</span>
                        </div>
                        <div className="flex flex-col">
                            <span>Violations</span>
                            <span className="text-void-fg">{health.errorCounts.contractViolation}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Diagnostics (If degraded or present) */}
            {health?.diagnostics?.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-void-dim uppercase">Diagnostics</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(health.diagnostics))}
                            className="text-[10px] text-warning hover:text-warning-fg cursor-pointer"
                        >
                            Copy
                        </button>
                    </div>
                    <ul className="space-y-1">
                        {health.diagnostics.map((diag, i) => (
                            <li key={i} className="text-[10px] text-warning flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                <span className="break-all">{diag}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Actions (Read-Only) */}
            <div className="border-t border-white/5 pt-3 flex items-center justify-end gap-3">
                <button className="text-[10px] text-void-dim hover:text-void-fg transition-colors">
                    View Details
                </button>
                <button className="text-[10px] text-void-dim hover:text-void-fg transition-colors">
                    View Trace
                </button>
            </div>
        </div>
    );
}

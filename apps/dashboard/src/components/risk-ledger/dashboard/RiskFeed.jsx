import { Badge } from '../ui/Badge';
import { ArrowRight, CornerDownRight, Activity } from 'lucide-react';
import { clsx } from 'clsx';

function EventRow({ evt, isChild = false, isSelected, onSelect }) {
    // Format: <timestamp> | <kind> | <processor> | <summary> | Action: [View trace]
    // 12:04:22 | Evidence health | Stripe | status: OK | Action: [View trace]

    const timeStr = evt.ts ? new Date(evt.ts).toLocaleTimeString('en-GB', { hour12: false }) : evt.timestamp;

    return (
        <div
            onClick={() => onSelect(evt.id)}
            className={clsx(
                "group flex items-center py-2 px-3 border-b border-white/5 last:border-0 cursor-pointer transition-colors font-mono text-[11px]",
                isSelected ? "bg-white/10" : "hover:bg-white/5",
                isChild && "bg-white/[0.01]"
            )}
        >
            {/* 0. Seq */}
            <div className="w-16 shrink-0 text-void-dim border-r border-white/5 mr-3 pr-2 text-right">
                {evt.seq || '----'}
            </div>

            {/* 1. Timestamp */}
            <div className="w-20 text-subtle shrink-0">
                {timeStr}
            </div>

            <span className="text-white/10 mx-2">|</span>

            {/* 2. Kind */}
            <div className={clsx("w-32 shrink-0 truncate", evt.severity === 'critical' || evt.severity === 'warning' ? 'text-white' : 'text-subtle')}>
                {evt.kind || evt.title}
            </div>

            <span className="text-white/10 mx-2">|</span>

            {/* 3. Processor (Source) */}
            <div className="w-24 shrink-0 truncate text-subtle flex items-center gap-1">
                {evt.source?.system ? (
                    <span className="px-1 py-0.5 rounded-[1px] bg-white/5 text-[9px] uppercase tracking-wider">{evt.source.system}</span>
                ) : (
                    <span>{evt.source || evt.processor || 'Global'}</span>
                )}
            </div>

            <span className="text-white/10 mx-2">|</span>

            {/* 4. Summary */}
            <div className="flex-1 truncate text-void-fg">
                {evt.summary || evt.title}
            </div>

            {/* 5. Action Rail */}
            <div className="pl-4 border-l border-white/5 ml-4 shrink-0 w-28 flex justify-end">
                {evt.actions?.[0] ? (
                    <button className="text-[10px] text-subtle hover:text-white flex items-center gap-1 transition-colors">
                        Action: [{evt.actions[0].label}]
                    </button>
                ) : (
                    <button className="text-[10px] text-subtle hover:text-white flex items-center gap-1 transition-colors">
                        Action: [View trace]
                    </button>
                )}
            </div>
        </div>
    );
}

export function RiskFeed({ events = [], selectedId, onSelect, isLoading }) {
    if (isLoading && events.length === 0) {
        return (
            <div className="bg-panel border border-white/10 rounded-sm h-full flex flex-col items-center justify-center text-subtle gap-2">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] font-mono">Syncing Ledger...</span>
            </div>
        );
    }

    return (
        <div className="bg-panel border border-white/10 rounded-sm h-full flex flex-col overflow-hidden">
            {/* Header Removed (Handled by Parent Layout now, or simplified) */}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {events.map((evt, idx) => (
                    <div key={evt.id} className={idx === 0 ? "bg-white/[0.02]" : ""}>
                        {/* Parent Row */}
                        <EventRow
                            evt={evt}
                            isSelected={selectedId === evt.id}
                            onSelect={onSelect}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

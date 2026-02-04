import { Activity } from 'lucide-react';

export function EmptyState() {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-[480px] mx-auto">
            {/* 1. Primary Headline */}
            <h2 className="text-white text-[13px] font-sans tracking-wide mb-4">
                Ledger initialized. Buffer empty.
            </h2>

            {/* 2. Explanation Text */}
            <p className="text-void-dim text-[11px] font-mono leading-relaxed mb-8 max-w-[400px]">
                PayFlux monitors connected payment infrastructure for availability, latency, and policy restrictions.
                It records observable state changes as a passive observer and does not intervene in transaction processing or settlement logic.
            </p>

            {/* 3. Next-Step Actions */}
            <div className="flex flex-col gap-3 w-full max-w-[200px] mb-12">
                <button className="h-8 border border-white/10 rounded-sm text-[11px] text-subtle hover:text-white hover:border-white/20 transition-colors bg-transparent">
                    [Connect processor]
                </button>
                <button className="h-8 border border-white/10 rounded-sm text-[11px] text-subtle hover:text-white hover:border-white/20 transition-colors bg-transparent">
                    [View signal definitions]
                </button>
                <button className="h-8 border border-white/10 rounded-sm text-[11px] text-subtle hover:text-white hover:border-white/20 transition-colors bg-transparent">
                    [View evidence health]
                </button>
            </div>

            {/* 4. Status Footer */}
            <div className="flex items-center gap-2 text-[10px] text-void-dim font-mono border-t border-white/5 pt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-void-dim" />
                <span>Evidence channel idle. Last health check: 3s ago.</span>
            </div>
        </div>
    );
}

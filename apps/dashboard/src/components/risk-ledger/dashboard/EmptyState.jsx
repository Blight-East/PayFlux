import { Activity } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-[480px] mx-auto">
            {/* 1. Primary Headline */}
            <h2 className="text-white text-[13px] font-sans tracking-wide mb-4">
                No risk events yet
            </h2>

            {/* 2. Explanation Text */}
            <p className="text-void-dim text-[11px] font-mono leading-relaxed mb-8 max-w-[400px]">
                Run your first scan to populate the ledger and enable evidence export.
                PayFlux monitors connected payment infrastructure for availability, latency, and policy restrictions.
            </p>

            {/* 3. Next-Step Actions */}
            <div className="flex flex-col gap-3 w-full max-w-[200px] mb-12">
                <Link href="/risk">
                    <button className="w-full h-8 border border-white/20 rounded-sm text-[11px] text-white hover:bg-white/5 hover:border-white/30 transition-colors bg-transparent">
                        Run test scan
                    </button>
                </Link>
            </div>

            {/* 4. Status Footer */}
            <div className="flex items-center gap-2 text-[10px] text-void-dim font-mono border-t border-white/5 pt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-void-dim" />
                <span>Evidence channel idle. Awaiting signal acquisition.</span>
            </div>
        </div>
    );
}

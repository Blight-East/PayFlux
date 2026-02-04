import { Activity, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { motion } from 'framer-motion';

export function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 h-10 bg-mid border-b border-white/10 flex items-center justify-between px-4 z-50">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-gray-200 font-semibold tracking-tight text-sm">
                    <Zap className="w-3.5 h-3.5 text-gray-400" />
                    <span>PayFlux</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-wider">
                    {/* Conditional Opacity-Only Pulse */}
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-safe opacity-50"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-safe"></span>
                    </span>
                    <span>System Operational</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <a href="/dashboard-v2" className="text-[10px] text-safe hover:text-safe-fg transition-colors uppercase tracking-wider font-medium">
                    Try Dashboard v2 (Preview)
                </a>
            </div>

            {/* Center: Ticker (Static, Boring) */}
            <div className="flex items-center gap-6 text-[11px] text-muted hidden md:flex font-mono">
                <div className="flex items-center gap-2">
                    <span className="text-safe">●</span>
                    <span>Stripe: Operational</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-safe">●</span>
                    <span>Adyen: Operational</span>
                </div>
                <div className="flex items-center gap-2 text-warning">
                    <span>●</span>
                    <span>Braintree: Degraded (450ms)</span>
                </div>
            </div>

            {/* Right: Quartered Risk Band */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-mid border border-white/10 rounded-sm px-2 py-0.5">
                    <span className="text-[9px] uppercase tracking-wider text-subtle">Global Risk</span>

                    <div className="flex items-center gap-0.5 w-32 h-2">
                        {/* 0-25 Nominal */}
                        <div className="flex-1 h-full bg-safe/20 relative group">
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-safe"></div> {/* Active Indicator */}
                        </div>
                        {/* 25-50 Elevated */}
                        <div className="flex-1 h-full bg-warning/10 border-l border-mid"></div>
                        {/* 50-75 Critical */}
                        <div className="flex-1 h-full bg-danger/10 border-l border-mid"></div>
                        {/* 75+ Emergency */}
                        <div className="flex-1 h-full bg-danger/5 border-l border-mid"></div>

                        {/* Physics Needle */}
                        <motion.div
                            initial={{ left: 0 }}
                            animate={{ left: "12%" }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="absolute w-0.5 h-3 bg-white -mt-0.5 shadow-sm"
                            style={{ position: 'absolute', pointerEvents: 'none', marginLeft: '62px' }} // Adjusted relative to container
                        />
                    </div>

                    <span className="text-[10px] font-mono text-gray-300">12</span>
                </div>

                <span className="text-[11px] text-subtle font-mono">12:05:32 UTC</span>
            </div>
        </header>
    );
}

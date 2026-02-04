import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export function ActiveIncidents() {
    const hasIncidents = false;

    return (
        <div className={clsx(
            "rounded-sm border p-5 flex flex-col items-center justify-center text-center h-full transition-all duration-300",
            hasIncidents
                ? "bg-danger/5 border-danger/30"
                : "bg-panel border-white/10"
        )}>
            {hasIncidents ? (
                <>
                    <div className="p-2 rounded bg-danger/10 text-danger mb-2">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-medium text-sm">Critical Alert</h3>
                    <p className="text-danger/80 text-xs mt-1 font-mono">Processor Risk Restriction Detected: EU-West-1</p>
                </>
            ) : (
                <>
                    <div className="mb-2 text-safe opacity-80">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-gray-200 font-medium text-sm mb-1">Systems Nominal.</h3>
                    <p className="text-muted text-xs font-mono">No active risk conditions detected in the last 15 minutes.</p>
                </>
            )}
        </div>
    );
}

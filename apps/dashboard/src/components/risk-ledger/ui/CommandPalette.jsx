import { useEffect, useState } from 'react';
import { Search, Zap, Settings, Lock, Fingerprint, X } from 'lucide-react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

export function CommandPalette({ isOpen, onClose }) {
    const [query, setQuery] = useState('');

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-mid/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.1 }}
                    className="w-full max-w-lg bg-surface border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Input */}
                    <div className="flex items-center px-4 py-3 border-b border-white/5 gap-3">
                        <Search className="w-5 h-5 text-muted" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Type a command or search..."
                            className="bg-transparent border-none outline-none text-white placeholder-subtle text-sm flex-1"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <div className="flex gap-1">
                            <span className="text-xs text-subtle bg-white/5 px-1.5 py-0.5 rounded">Esc</span>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="py-2">
                        <div className="px-3 py-1.5 text-xs font-semibold text-subtle uppercase tracking-wider">Suggested</div>

                        <CommandItem icon={Zap} label="Connect Processor" shortcut="C" />
                        <CommandItem icon={Settings} label="Configure Thresholds" shortcut="S" />
                        <CommandItem icon={Fingerprint} label="View Audit Log" shortcut="L" />

                        <div className="my-2 h-px bg-white/5" />

                        <div className="px-3 py-1.5 text-xs font-semibold text-subtle uppercase tracking-wider">Critical</div>
                        <CommandItem icon={AlertTriangle} label="Create Incident" shortcut="!" isDanger />
                    </div>

                    <div className="bg-white/5 px-4 py-2 flex justify-between items-center text-[10px] text-subtle border-t border-white/5">
                        <span>Use arrow keys to navigate</span>
                        <span>PayFlux Command v1.0</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

function CommandItem({ icon: Icon, label, shortcut, isDanger }) {
    return (
        <button className={clsx(
            "w-full flex items-center justify-between px-4 py-2 text-sm group transition-colors",
            isDanger ? "hover:bg-danger/10 text-danger hover:text-danger" : "hover:bg-info/10 text-gray-300 hover:text-white"
        )}>
            <div className="flex items-center gap-3">
                <Icon className={clsx("w-4 h-4", isDanger ? "text-danger" : "text-muted group-hover:text-white")} />
                <span>{label}</span>
            </div>
            {shortcut && (
                <span className="text-xs text-subtle font-mono border border-white/10 px-1.5 rounded bg-black/20 group-hover:border-white/20">
                    {shortcut}
                </span>
            )}
        </button>
    );
}

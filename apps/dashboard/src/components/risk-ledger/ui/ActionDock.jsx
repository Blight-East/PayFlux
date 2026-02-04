import { Terminal, Settings, Activity, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CommandPalette } from './CommandPalette';

export function ActionDock() {
    const [isCmdKOpen, setIsCmdKOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCmdKOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 h-8 bg-panel border-t border-white/10 flex items-center justify-between px-4 z-50 text-[11px] font-mono text-subtle">

                {/* Left: Toolbar Actions */}
                <div className="flex items-center gap-4 h-full">
                    <span className="font-semibold text-muted hidden md:inline">Terminal Toolbar</span>
                    <div className="h-4 w-px bg-white/10" />

                    <button className="hover:text-white hover:bg-white/5 px-2 h-full flex items-center gap-2 transition-colors border-x border-transparent hover:border-white/5">
                        <span>&gt; Connect Processor</span>
                    </button>
                    <button className="hover:text-white hover:bg-white/5 px-2 h-full flex items-center gap-2 transition-colors border-x border-transparent hover:border-white/5">
                        <span>&gt; Configure Rules</span>
                    </button>
                    <button className="hover:text-white hover:bg-white/5 px-2 h-full flex items-center gap-2 transition-colors border-x border-transparent hover:border-white/5">
                        <span>&gt; View Audit Logs</span>
                    </button>
                </div>

                {/* Right: Cmd+K Hint */}
                <div className="flex items-center gap-2 hover:text-white cursor-pointer" onClick={() => setIsCmdKOpen(true)}>
                    <Terminal className="w-3 h-3" />
                    <span>Cmd+K for actions</span>
                </div>
            </div>

            <CommandPalette isOpen={isCmdKOpen} onClose={() => setIsCmdKOpen(false)} />
        </>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChooseTierPage() {
    const [selectedTier, setSelectedTier] = useState<'tier1' | 'tier2'>('tier1');
    const [pilotMode, setPilotMode] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if user came from connect page
        const secret = sessionStorage.getItem('setup_webhook_secret');
        if (!secret) {
            router.push('/setup/connect');
        }
    }, [router]);

    const handleContinue = () => {
        sessionStorage.setItem('setup_tier', selectedTier);
        sessionStorage.setItem('setup_pilot_mode', pilotMode ? 'true' : 'false');
        router.push('/setup/generate');
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center space-x-2 text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                    <span className="text-zinc-600">Step 1</span>
                    <span>→</span>
                    <span className="text-blue-400">Step 2</span>
                    <span>→</span>
                    <span>Choose Tier</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Choose Your Tier</h2>
                <p className="text-zinc-500 text-sm mt-1">Select the PayFlux tier that matches your needs.</p>
            </div>

            <div className="space-y-4">
                {/* Tier 1 */}
                <button
                    onClick={() => setSelectedTier('tier1')}
                    className={`w-full text-left p-6 rounded-lg border transition-all ${selectedTier === 'tier1'
                            ? 'bg-zinc-900 border-blue-500'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-white">Tier 1</h3>
                            <p className="text-zinc-400 text-sm mt-1">Detection Only</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTier === 'tier1' ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                            }`}>
                            {selectedTier === 'tier1' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                    </div>
                    <ul className="mt-4 text-xs text-zinc-500 space-y-1.5">
                        <li>• Event ingestion and deduplication</li>
                        <li>• Processor-level risk scoring</li>
                        <li>• Risk band classification (normal, elevated, high, critical)</li>
                        <li>• Prometheus metrics export</li>
                    </ul>
                </button>

                {/* Tier 2 */}
                <button
                    onClick={() => setSelectedTier('tier2')}
                    className={`w-full text-left p-6 rounded-lg border transition-all ${selectedTier === 'tier2'
                            ? 'bg-zinc-900 border-blue-500'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold text-white">Tier 2</h3>
                            <p className="text-zinc-400 text-sm mt-1">Interpretation + Alerts</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTier === 'tier2' ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                            }`}>
                            {selectedTier === 'tier2' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                    </div>
                    <ul className="mt-4 text-xs text-zinc-500 space-y-1.5">
                        <li>• Everything in Tier 1</li>
                        <li>• Playbook context for elevated+ events</li>
                        <li>• Risk trajectory analysis</li>
                        <li>• Alert routing integration (Slack, PagerDuty)</li>
                    </ul>
                </button>
            </div>

            {/* Pilot Mode Toggle */}
            {selectedTier === 'tier2' && (
                <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-white">Enable Pilot Mode</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">Access the warnings dashboard for outcome annotation</p>
                        </div>
                        <button
                            onClick={() => setPilotMode(!pilotMode)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${pilotMode ? 'bg-blue-600' : 'bg-zinc-700'
                                }`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${pilotMode ? 'left-6' : 'left-1'
                                }`} />
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-between">
                <button
                    onClick={() => router.push('/setup/connect')}
                    className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded text-sm hover:bg-zinc-800 transition-colors"
                >
                    ← Back
                </button>
                <button
                    onClick={handleContinue}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded text-sm hover:bg-zinc-200 transition-colors"
                >
                    Continue →
                </button>
            </div>
        </div>
    );
}

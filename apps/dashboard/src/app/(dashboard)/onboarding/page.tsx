'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
    const [orgName, setOrgName] = useState('Acme Corp');
    const [complete, setComplete] = useState(false);
    const router = useRouter();

    const handleComplete = () => {
        setComplete(true);
        setTimeout(() => {
            router.push('/dashboard');
        }, 1500);
    };

    return (
        <div className="p-12 max-w-2xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white tracking-tight">Welcome to PayFlux</h2>
                <p className="text-zinc-500 mt-2">Let's get your workspace ready for risk monitoring.</p>
            </div>

            <div className="space-y-12">
                <div className="relative">
                    <div className="absolute -left-8 top-1 flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-[10px] font-bold text-white">1</div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Workspace Identity</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                                Organization Name
                            </label>
                            <input
                                type="text"
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="e.g. Acme Corp"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="relative opacity-50 pointer-events-none">
                    <div className="absolute -left-8 top-1 flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">2</div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Processor Connection</h3>
                    <p className="text-xs text-zinc-600">You will configure Stripe in the next step via the Connectors tab.</p>
                </div>

                <div className="pt-8 flex justify-center">
                    <button
                        onClick={handleComplete}
                        disabled={complete}
                        className={`px-8 py-3 rounded text-sm font-bold transition-all ${complete ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-zinc-200'
                            }`}
                    >
                        {complete ? '✓ Setup Complete' : 'Initialize Workspace'}
                    </button>
                </div>
            </div>
        </div>
    );
}

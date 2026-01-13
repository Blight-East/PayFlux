'use client';

import { useState, useEffect } from 'react';

interface Warning {
    warning_id: string;
    processor: string;
    risk_band: string;
    risk_score: number;
    processed_at: string;
    outcome_observed: boolean;
    outcome_type: string;
}

export default function DashboardPage() {
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchWarnings() {
            try {
                const res = await fetch('/api/proxy/pilot/warnings');
                if (res.ok) {
                    const data = await res.json();
                    setWarnings(data || []);
                }
            } catch (err) {
                console.error('Failed to fetch warnings', err);
            } finally {
                setLoading(false);
            }
        }
        fetchWarnings();
    }, []);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Warnings Dashboard</h2>
                    <p className="text-zinc-500 text-sm mt-1">Risk signals from PayFlux core.</p>
                </div>
                <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold rounded hover:bg-zinc-800 transition-colors">
                        Export JSON
                    </button>
                </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-black border-b border-zinc-800 text-zinc-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Processor</th>
                            <th className="px-6 py-4">Risk Band</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4">Processed At</th>
                            <th className="px-6 py-4">Outcome</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">
                                    Loading warnings...
                                </td>
                            </tr>
                        ) : warnings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">
                                    No warnings detected in the last 24 hours.
                                </td>
                            </tr>
                        ) : (
                            warnings.map((w) => (
                                <tr key={w.warning_id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${w.outcome_observed ? 'bg-zinc-600' : 'bg-red-500 animate-pulse'}`}></div>
                                            <span className="text-xs font-medium text-zinc-300">
                                                {w.outcome_observed ? 'Resolved' : 'Active'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white uppercase tracking-wider text-[10px]">{w.processor}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${w.risk_band === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                            w.risk_band === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                            }`}>
                                            {w.risk_band}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">{(w.risk_score || 0).toFixed(4)}</td>
                                    <td className="px-6 py-4 text-xs text-zinc-500">{new Date(w.processed_at).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {w.outcome_observed ? (
                                            <span className="text-xs text-green-500 font-medium">✓ {w.outcome_type}</span>
                                        ) : (
                                            <span className="text-xs text-zinc-600 italic">Needs review</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';

export default function ApiKeysPage() {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showKey, setShowKey] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchKey() {
            // In a real app, this would fetch from a secure store
            // For MVP, we'll just mock it or use the one from env if allowed to show it
            setLoading(false);
        }
        fetchKey();
    }, []);

    const generateKey = () => {
        const newKey = `pf_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
        setApiKey(newKey);
        setShowKey(true);
    };

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">API Key Management</h2>
                <p className="text-zinc-500 text-sm mt-1">Authenticates your connector or custom integration with the PayFlux control plane.</p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Active API Key</h3>
                    <button
                        onClick={generateKey}
                        className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors"
                    >
                        Rotate Key
                    </button>
                </div>

                {apiKey ? (
                    <div className="space-y-4">
                        <div className="bg-black border border-zinc-900 rounded p-4 flex items-center justify-between">
                            <code className="text-blue-400 text-sm">
                                {showKey ? apiKey : `${apiKey.substring(0, 8)}************************`}
                            </code>
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="text-xs text-zinc-500 hover:text-white"
                            >
                                {showKey ? 'Hide' : 'Reveal'}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 italic">
                            Warning: This key will only be shown once. Please store it securely.
                        </p>
                    </div>
                ) : (
                    <div className="text-center py-12 bg-black/50 border border-zinc-900 border-dashed rounded">
                        <p className="text-zinc-500 text-sm mb-4">No active API key found.</p>
                        <button
                            onClick={generateKey}
                            className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold rounded hover:bg-zinc-700 transition-colors"
                        >
                            Generate First Key
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                <h4 className="text-sm font-bold text-white mb-4">Safe Prefix Reference</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="text-zinc-500 border-b border-zinc-800">
                            <tr>
                                <th className="pb-2">Label</th>
                                <th className="pb-2">Prefix (First 8)</th>
                                <th className="pb-2">Created</th>
                                <th className="pb-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-zinc-400">
                            <tr>
                                <td className="py-3 text-white font-medium">Production Key</td>
                                <td className="py-3 font-mono">pf_a1b2c3d...</td>
                                <td className="py-3">Jan 13, 2026</td>
                                <td className="py-3 text-green-500 font-bold uppercase tracking-widest text-[8px]">Active</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

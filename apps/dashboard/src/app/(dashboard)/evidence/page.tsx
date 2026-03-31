'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface EvidenceData {
    schemaVersion: string;
    generatedAt: string;
    meta?: {
        sourceStatus?: 'OK' | 'DEGRADED' | 'ERROR';
        diagnostics?: string[];
    };
    payload: {
        merchants: any[];
        artifacts: any[];
        narratives: any[];
        system: {
            ingest_rate: string;
            active_models: number;
            uptime: string;
            cluster: string;
            node_count: number;
        };
    };
}

function EvidenceContent() {
    const searchParams = useSearchParams();
    const fixture = searchParams.get('fixture');

    const [data, setData] = useState<EvidenceData | null>(null);
    const [lkgData, setLkgData] = useState<EvidenceData | null>(null);
    const [status, setStatus] = useState<'OK' | 'DEGRADED' | 'VIOLATION'>('OK');
    const formatSyncTime = () => {
        const d = new Date();
        const h = String(d.getUTCHours()).padStart(2, '0');
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        const s = String(d.getUTCSeconds()).padStart(2, '0');
        return `${h}:${m}:${s} UTC`;
    };
    const [lastSync, setLastSync] = useState<string>('Never');
    const [error, setError] = useState<string | null>(null);

    const fetchEvidence = async () => {
        try {
            const url = fixture ? `/api/v1/evidence?fixture=${fixture}` : '/api/v1/evidence';
            const res = await fetch(url);
            const json: EvidenceData = await res.json();

            // 1. Contract Violation Check (LKG Freeze)
            if (json.schemaVersion !== '1.0') {
                setStatus('VIOLATION');
                setLastSync(formatSyncTime());
                setData(null); // Clear the 'bad' data but lkgData remains!
                return;
            }

            // 2. Source Status Check
            if (json.meta?.sourceStatus === 'DEGRADED') {
                setStatus('DEGRADED');
            } else {
                setStatus('OK');
                // Persist LKG
                setLkgData(json);
            }

            setData(json);
            setLastSync(formatSyncTime());
            setError(null);
        } catch (err) {
            console.error('Fetch failed', err);
            setError('Connection Failure');
            setStatus('DEGRADED');
        }
    };

    useEffect(() => {
        fetchEvidence();
        const interval = setInterval(fetchEvidence, 5000);
        return () => clearInterval(interval);
    }, [fixture]);

    const activeData = status === 'VIOLATION' ? lkgData : data;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Infrastructure Evidence</h1>
                    <p className="text-gray-500 text-sm mt-1">Core node evidence and artifact stream.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Last Sync</div>
                        <div className="text-sm font-mono text-gray-700">{lastSync}</div>
                    </div>
                    <div className="px-3 py-1 bg-gray-100 border border-gray-200 rounded flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${status === 'OK' ? 'bg-green-500' : status === 'DEGRADED' ? 'bg-amber-500' : 'bg-red-500 pulse'}`}></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{fixture ? `Fixture: ${fixture}` : 'Live'}</span>
                    </div>
                </div>
            </div>

            {/* Contract Banner */}
            {status === 'VIOLATION' && (
                <div className="bg-red-950 border-2 border-red-500 p-4 rounded-lg flex items-center justify-between shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <div className="text-red-400 font-black text-sm uppercase tracking-tighter">CRITICAL: CONTRACT VIOLATION</div>
                            <div className="text-red-200/70 text-xs mt-0.5 font-medium">Core schema version mismatch. Dashboard is frozen on Last Known Good (LKG) data.</div>
                        </div>
                    </div>
                    <div className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded border border-red-400 uppercase tracking-widest">Frozen</div>
                </div>
            )}

            {status === 'DEGRADED' && (
                <div className="bg-amber-950/50 border border-amber-500/50 p-4 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">🚧</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm uppercase tracking-tight">SOURCE DEGRADED: Partial Evidence</div>
                            <div className="text-amber-200/70 text-xs mt-0.5 font-medium">{data?.meta?.diagnostics?.[0] || 'Downstream warningStore or artifacts are currently unreachable.'}</div>
                        </div>
                    </div>
                    <div className="text-[10px] font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-widest">Degraded</div>
                </div>
            )}

            {/* System Info Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Ingest Rate</div>
                    <div className="text-xl font-bold text-gray-900 font-mono">{activeData?.payload.system.ingest_rate || '---'}</div>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Node Count</div>
                    <div className="text-xl font-bold text-gray-900 font-mono">{activeData?.payload.system.node_count || 0}</div>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Upstream Status</div>
                    <div className="text-xl font-bold text-gray-900 font-mono uppercase tracking-tighter">{activeData?.meta?.sourceStatus || '---'}</div>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Cluster</div>
                    <div className="text-xl font-bold text-gray-900 font-mono">{activeData?.payload.system.cluster || '---'}</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Merchants Panel */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[400px]">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-bold text-xs uppercase tracking-widest text-gray-700">Merchants Snapshot</div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-white text-gray-500 border-b border-gray-200 font-medium">
                                <tr>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3 text-right">Vol</th>
                                    <th className="px-6 py-3 text-right">Baseline</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900">
                                {activeData?.payload.merchants.map((m: any) => (
                                    <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-3 font-mono text-slate-400">{m.id}</td>
                                        <td className="px-6 py-3 text-right font-mono text-white">{m.vol}</td>
                                        <td className="px-6 py-3 text-right font-mono text-slate-500">{m.baseline}</td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${m.status === 'healthy' ? 'text-green-500 bg-green-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                    </tr>
                                )) || (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-600 italic">No merchant data available</td></tr>
                                    )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Artifacts Panel */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-[400px]">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-bold text-xs uppercase tracking-widest text-gray-700">Artifact Stream</div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {activeData?.payload.artifacts.map((a: any) => (
                            <div key={a.id} className="border-l-2 border-slate-800 pl-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="text-[10px] font-mono font-bold text-[#0A64BC]">{a.id}</div>
                                    <div className="text-[9px] text-slate-600 font-mono">{(() => { const d = new Date(a.timestamp); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} UTC`; })()}</div>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono bg-slate-900/50 p-2 rounded truncate">
                                    {JSON.stringify(a.data)}
                                </div>
                            </div>
                        )) || (
                                <div className="text-center py-12 text-slate-600 italic text-sm">No artifacts in stream</div>
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function EvidencePage() {
    return (
        <Suspense fallback={<div className="p-8 text-slate-500 animate-pulse">Loading evidence scope...</div>}>
            <EvidenceContent />
        </Suspense>
    );
}

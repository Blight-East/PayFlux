'use client';

import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Network Aggregate — Cross-Merchant Model Performance
//
// Visible to all authenticated merchants (network transparency).
// Only renders when statistical significance threshold is met.
// No merchant names, no TPV, no dollar amounts.
// ─────────────────────────────────────────────────────────────────────────────

interface AggregateData {
    modelVersion: string;
    activeVersions: string[];
    window: string;
    evaluatedMerchants: number;
    totalEvaluations: number;
    meetsSignificanceThreshold: boolean;
    thresholds: { minMerchants: number; minEvaluations: number };
    tierAccuracy: number | null;
    trendAccuracy: number | null;
    meanVarianceBps: number | null;
    medianVarianceBps: number | null;
    stdDevVarianceBps: number | null;
    versionStability: boolean;
    generatedAt: string;
}

export default function NetworkAggregate() {
    const [data, setData] = useState<AggregateData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAggregate() {
            try {
                const res = await fetch('/api/v1/risk/forecast/aggregate');
                if (!res.ok) { setLoading(false); return; }
                const json: AggregateData = await res.json();
                setData(json);
            } catch {
                // Silent — aggregate is supplementary
            } finally {
                setLoading(false);
            }
        }
        fetchAggregate();
    }, []);

    // Don't render: loading, error, or below significance threshold
    if (loading) return null;
    if (!data) return null;
    if (!data.meetsSignificanceThreshold) return null;

    return (
        <div className="border border-zinc-800 rounded-lg px-5 py-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">
                    Model Performance — Network Aggregate
                </span>
                <span className="text-[10px] text-zinc-700 font-mono">
                    {data.evaluatedMerchants} merchant{data.evaluatedMerchants !== 1 ? 's' : ''} · {data.window} window
                </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-3">
                <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Tier Accuracy</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">{data.tierAccuracy}%</span>
                </div>
                <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Trend Accuracy</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">{data.trendAccuracy}%</span>
                </div>
                <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Mean Variance</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">±{data.meanVarianceBps} bps</span>
                </div>
                <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Evaluations</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">{data.totalEvaluations}</span>
                </div>
            </div>

            {/* Secondary metrics */}
            <div className="border-t border-zinc-800 pt-2 flex items-center space-x-6">
                <span className="text-[10px] text-zinc-600 font-mono">
                    Model: {data.modelVersion}
                </span>
                <span className={`text-[10px] font-mono ${data.versionStability ? 'text-emerald-500/60' : 'text-amber-500/60'}`}>
                    {data.versionStability ? '✓ Stable' : `${data.activeVersions.length} active version${data.activeVersions.length !== 1 ? 's' : ''}`}
                </span>
                {data.medianVarianceBps !== null && (
                    <span className="text-[10px] text-zinc-600 font-mono">
                        Median: ±{data.medianVarianceBps} bps
                    </span>
                )}
                {data.stdDevVarianceBps !== null && (
                    <span className="text-[10px] text-zinc-600 font-mono">
                        σ: {data.stdDevVarianceBps} bps
                    </span>
                )}
            </div>
        </div>
    );
}

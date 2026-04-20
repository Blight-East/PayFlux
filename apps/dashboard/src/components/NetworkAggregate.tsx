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
        <div className="pf-panel rounded-[1.6rem] px-6 py-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[var(--pf-muted)] uppercase tracking-[0.2em] font-bold">
                    Across Similar Merchants
                </span>
                <span className="text-[11px] text-[var(--pf-muted)] font-mono">
                    {data.evaluatedMerchants} merchant{data.evaluatedMerchants !== 1 ? 's' : ''} · {data.window} window
                </span>
            </div>

            <div className="mb-4 grid gap-5 md:grid-cols-4">
                <div>
                    <span className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider block mb-1">Level Match</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">{data.tierAccuracy}%</span>
                </div>
                <div>
                    <span className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider block mb-1">Trend Match</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">{data.trendAccuracy}%</span>
                </div>
                <div>
                    <span className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider block mb-1">Average Difference</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">±{data.meanVarianceBps} bps</span>
                </div>
                <div>
                    <span className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider block mb-1">Checks Run</span>
                    <span className="text-lg font-mono font-bold text-zinc-200">{data.totalEvaluations}</span>
                </div>
            </div>

            {/* Secondary metrics */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--pf-line)] pt-3">
                <span className="text-[11px] text-[var(--pf-muted)] font-mono">
                    Model: {data.modelVersion}
                </span>
                <span className={`text-[11px] font-mono ${data.versionStability ? 'text-emerald-300/80' : 'text-amber-300/80'}`}>
                    {data.versionStability ? '✓ Stable' : `${data.activeVersions.length} version${data.activeVersions.length !== 1 ? 's' : ''} in use`}
                </span>
                {data.medianVarianceBps !== null && (
                    <span className="text-[11px] text-[var(--pf-muted)] font-mono">
                        Middle range: ±{data.medianVarianceBps} bps
                    </span>
                )}
                {data.stdDevVarianceBps !== null && (
                    <span className="text-[11px] text-[var(--pf-muted)] font-mono">
                        Spread: {data.stdDevVarianceBps} bps
                    </span>
                )}
            </div>
        </div>
    );
}

'use client';

import type { AggregateData } from '@/types/aggregate';

// ─────────────────────────────────────────────────────────────────────────────
// Variance Band — Forecast Confidence
//
// Answers: "How wrong are we when we are wrong?"
//
// Isolated from Model Authority because variance is a different conceptual
// layer than accuracy. Authority says "are we right?" — Variance says
// "when wrong, by how much?"
//
// Does NOT render below significance threshold. Variance without
// significance is noise.
// ─────────────────────────────────────────────────────────────────────────────

interface VarianceBandProps {
    data: AggregateData | null;
    loading: boolean;
}

export default function VarianceBand({ data, loading }: VarianceBandProps) {
    // Loading state
    if (loading) {
        return (
            <div className="border border-slate-800/60 rounded-xl px-6 py-5 animate-pulse">
                <div className="h-4 w-32 bg-slate-800 rounded mb-6" />
                <div className="grid grid-cols-3 gap-6">
                    <div className="h-12 w-28 bg-slate-800 rounded" />
                    <div className="h-10 w-24 bg-slate-800 rounded" />
                    <div className="h-10 w-20 bg-slate-800 rounded" />
                </div>
            </div>
        );
    }

    // No data or below threshold — don't render
    if (!data) return null;
    if (!data.meetsSignificanceThreshold) return null;
    if (data.meanVarianceBps === null) return null;

    const { meanVarianceBps, medianVarianceBps, stdDevVarianceBps, totalEvaluations, window: evalWindow } = data;

    return (
        <div className="border border-slate-800/60 rounded-xl px-6 py-5">
            {/* Section Header */}
            <div className="mb-5">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                    Variance Band
                </span>
            </div>

            {/* 3-Column Grid — Mean dominant, Median + StdDev secondary */}
            <div className="grid grid-cols-3 gap-6">
                {/* Mean Variance — Primary */}
                <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Mean Variance
                    </span>
                    <span className="text-4xl font-mono font-bold text-slate-100">
                        ±{meanVarianceBps}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono ml-1">bps</span>
                </div>

                {/* Median Variance — Secondary */}
                <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Median Variance
                    </span>
                    <span className="text-2xl font-mono font-bold text-slate-300">
                        ±{medianVarianceBps ?? '—'}
                    </span>
                    {medianVarianceBps !== null && (
                        <span className="text-[11px] text-slate-500 font-mono ml-1">bps</span>
                    )}
                </div>

                {/* Standard Deviation — Secondary */}
                <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Std Deviation
                    </span>
                    <span className="text-2xl font-mono font-bold text-slate-300">
                        {stdDevVarianceBps ?? '—'}
                    </span>
                    {stdDevVarianceBps !== null && (
                        <span className="text-[11px] text-slate-500 font-mono ml-1">bps</span>
                    )}
                </div>
            </div>

            {/* Footer — Derivation context */}
            <p className="text-[11px] text-slate-500 font-mono mt-4">
                Derived from {totalEvaluations} evaluation pairs · {evalWindow} window
            </p>
        </div>
    );
}

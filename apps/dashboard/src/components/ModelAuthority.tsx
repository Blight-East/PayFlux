'use client';

import type { AggregateData } from '@/types/aggregate';

// ─────────────────────────────────────────────────────────────────────────────
// Model Authority — Accuracy + Evaluation Depth + Version Stability
//
// Unified institutional surface. Executives interpret accuracy, sample size,
// and significance together. Splitting them causes cognitive fragmentation.
//
// Always renders — even below threshold, shows progress toward significance.
// ─────────────────────────────────────────────────────────────────────────────

interface ModelAuthorityProps {
    data: AggregateData | null;
    loading: boolean;
}

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export default function ModelAuthority({ data, loading }: ModelAuthorityProps) {
    // Loading state
    if (loading) {
        return (
            <div className="border border-slate-700 rounded-xl px-6 py-6 animate-pulse">
                <div className="h-4 w-40 bg-slate-800 rounded mb-6" />
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="h-12 w-32 bg-slate-800 rounded" />
                        <div className="h-12 w-32 bg-slate-800 rounded" />
                    </div>
                    <div className="space-y-6">
                        <div className="h-12 w-24 bg-slate-800 rounded" />
                        <div className="h-12 w-24 bg-slate-800 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    // No data — don't render
    if (!data) return null;

    const {
        tierAccuracy,
        trendAccuracy,
        totalEvaluations,
        evaluatedMerchants,
        meetsSignificanceThreshold,
        thresholds,
        modelVersion,
        versionStability,
        window: evalWindow,
        generatedAt,
    } = data;

    const hasAccuracy = tierAccuracy !== null && trendAccuracy !== null;

    return (
        <div className="border border-slate-700 rounded-xl px-6 py-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                    Model Authority
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                    Network Aggregate
                </span>
            </div>

            {/* Two-Column Layout: Accuracy (left) + Depth (right) */}
            <div className="grid grid-cols-2 gap-8">
                {/* Left Column — Prediction Accuracy */}
                <div className="space-y-5">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Tier Prediction
                        </span>
                        <span className="text-4xl font-mono font-bold text-slate-100">
                            {hasAccuracy ? `${tierAccuracy}%` : '—'}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Trend Prediction
                        </span>
                        <span className="text-4xl font-mono font-bold text-slate-100">
                            {hasAccuracy ? `${trendAccuracy}%` : '—'}
                        </span>
                    </div>
                    {/* Micro-context */}
                    <p className="text-[11px] text-slate-500 font-mono">
                        {hasAccuracy
                            ? `Based on ${totalEvaluations} evaluated projections`
                            : `Requires ≥${thresholds.minEvaluations} evaluations across ≥${thresholds.minMerchants} merchants`
                        }
                    </p>
                </div>

                {/* Right Column — Evaluation Depth */}
                <div className="space-y-5">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Total Evaluations
                        </span>
                        <span className="text-3xl font-mono font-bold text-slate-100">
                            {meetsSignificanceThreshold
                                ? totalEvaluations
                                : `${totalEvaluations} / ${thresholds.minEvaluations}`
                            }
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                            Merchants Evaluated
                        </span>
                        <span className="text-3xl font-mono font-bold text-slate-100">
                            {meetsSignificanceThreshold
                                ? evaluatedMerchants
                                : `${evaluatedMerchants} / ${thresholds.minMerchants}`
                            }
                        </span>
                    </div>
                    {/* Significance Badge */}
                    <div className="flex items-center space-x-2">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            meetsSignificanceThreshold ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        <span className={`text-[10px] font-mono ${
                            meetsSignificanceThreshold ? 'text-emerald-500/60' : 'text-amber-500/60'
                        }`}>
                            {meetsSignificanceThreshold ? 'Statistically Significant' : 'Below Threshold'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer — Model Version + Stability + Window */}
            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center space-x-6">
                <span className="text-[10px] text-slate-500 font-mono">
                    Model: {modelVersion}
                </span>
                <span className={`text-[10px] font-mono ${
                    versionStability ? 'text-emerald-500/60' : 'text-amber-500/60'
                }`}>
                    {versionStability ? '✓ Stable' : `${data.activeVersions.length} active versions`}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                    {evalWindow} window
                </span>
                <span className="text-[10px] text-slate-600 font-mono ml-auto">
                    {formatTimestamp(generatedAt)}
                </span>
            </div>
        </div>
    );
}

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
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${month} ${day}, ${h}:${m} UTC`;
}

export default function ModelAuthority({ data, loading }: ModelAuthorityProps) {
    // Loading state
    if (loading) {
        return (
            <div className="border border-gray-200 rounded-xl px-6 py-6 animate-pulse">
                <div className="h-4 w-40 bg-gray-200 rounded mb-6" />
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="h-12 w-32 bg-gray-200 rounded" />
                        <div className="h-12 w-32 bg-gray-200 rounded" />
                    </div>
                    <div className="space-y-6">
                        <div className="h-12 w-24 bg-gray-200 rounded" />
                        <div className="h-12 w-24 bg-gray-200 rounded" />
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
        <div className="border border-gray-200 rounded-xl px-6 py-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                    Model Authority
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                    Network Aggregate
                </span>
            </div>

            {/* Two-Column Layout: Accuracy (left) + Depth (right) */}
            <div className="grid grid-cols-2 gap-8">
                {/* Left Column — Prediction Accuracy */}
                <div className="space-y-5">
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                            Tier Prediction
                        </span>
                        <span className="text-4xl font-mono font-bold text-gray-900">
                            {hasAccuracy ? `${tierAccuracy}%` : '—'}
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                            Trend Prediction
                        </span>
                        <span className="text-4xl font-mono font-bold text-gray-900">
                            {hasAccuracy ? `${trendAccuracy}%` : '—'}
                        </span>
                    </div>
                    {/* Evaluation basis */}
                    <p className="text-[11px] text-gray-500 font-mono">
                        {hasAccuracy
                            ? `${totalEvaluations} Evaluated Projections · ${evaluatedMerchants} Merchants`
                            : `Threshold: ≥${thresholds.minEvaluations} evaluations · ≥${thresholds.minMerchants} merchants`
                        }
                    </p>
                </div>

                {/* Right Column — Evaluation Depth */}
                <div className="space-y-5">
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                            Total Evaluations
                        </span>
                        <span className="text-3xl font-mono font-bold text-gray-900">
                            {meetsSignificanceThreshold
                                ? totalEvaluations
                                : `${totalEvaluations} / ${thresholds.minEvaluations}`
                            }
                        </span>
                    </div>
                    <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">
                            Merchants Evaluated
                        </span>
                        <span className="text-3xl font-mono font-bold text-gray-900">
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
                            {meetsSignificanceThreshold ? 'Statistically Significant (p < 0.05)' : 'Below Threshold'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer — Stacked metadata */}
            <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
                <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Model</span>
                    <span className="text-[10px] text-gray-500 font-mono">{modelVersion}</span>
                </div>
                <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Window</span>
                    <span className="text-[10px] text-gray-500 font-mono">{evalWindow === '8w' ? '8 Weeks' : evalWindow}</span>
                </div>
                <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Status</span>
                    <span className={`text-[10px] font-mono ${
                        versionStability ? 'text-emerald-500/60' : 'text-amber-500/60'
                    }`}>
                        {versionStability ? 'Stable' : `${data.activeVersions.length} Versions Active`}
                    </span>
                </div>
                <div>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Generated</span>
                    <span className="text-[10px] text-gray-500 font-mono">{formatTimestamp(generatedAt)}</span>
                </div>
            </div>
        </div>
    );
}

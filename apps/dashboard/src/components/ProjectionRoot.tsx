'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import ReserveForecastPanel from '@/components/ReserveForecastPanel';
import ModelAuthority from '@/components/ModelAuthority';
import VarianceBand from '@/components/VarianceBand';
import ProjectionTimeline from '@/components/ProjectionTimeline';
import BoardReserveReport from '@/components/BoardReserveReport';
import { Lock } from 'lucide-react';
import type { AggregateData } from '@/types/aggregate';

interface ProjectionRootProps {
    tier: string;
    host: string | null;
}

export default function ProjectionRoot({ tier, host }: ProjectionRootProps) {
    const isFree = tier === 'free';

    // ─────────────────────────────────────────────────────────────────────────
    // Aggregate fetch — single call, passed to ModelAuthority + VarianceBand
    // ─────────────────────────────────────────────────────────────────────────

    const [aggregate, setAggregate] = useState<AggregateData | null>(null);
    const [aggregateLoading, setAggregateLoading] = useState(true);

    useEffect(() => {
        async function fetchAggregate() {
            try {
                const res = await fetch('/api/v1/risk/forecast/aggregate');
                if (!res.ok) {
                    setAggregateLoading(false);
                    return;
                }
                const json: AggregateData = await res.json();
                setAggregate(json);
            } catch {
                // Silent — aggregate is supplementary
            } finally {
                setAggregateLoading(false);
            }
        }
        fetchAggregate();
    }, []);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-lg font-semibold text-slate-300 tracking-tight">Dashboard</h2>
                    <p className="text-[11px] text-slate-600 mt-0.5">Capital Projection Surface</p>
                </div>
                <UserButton
                    appearance={{
                        elements: {
                            userButtonAvatarBox: "w-8 h-8"
                        }
                    }}
                />
            </div>

            {/* A. CAPITAL AT RISK — Hero, owns the page */}
            <div className="mb-16">
                <ReserveForecastPanel host={host} />
            </div>

            {/* B. MODEL AUTHORITY — Accuracy + Depth + Stability */}
            <div className="mb-12">
                <ModelAuthority data={aggregate} loading={aggregateLoading} />
            </div>

            {/* C. VARIANCE BAND — Forecast Confidence */}
            <div className="mb-16">
                <VarianceBand data={aggregate} loading={aggregateLoading} />
            </div>

            {/* Free tier: intervention lock + upgrade CTA */}
            {isFree && (
                <div className="mb-8 border border-slate-800 rounded-lg px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Lock className="w-4 h-4 text-slate-600" />
                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                                Intervention Modeling
                            </span>
                        </div>
                        <span className="text-[9px] bg-[#0A64BC]/5 text-[#0A64BC]/40 border border-[#0A64BC]/10 px-1.5 py-0.5 rounded uppercase">
                            PRO
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2 font-mono leading-relaxed">
                        Scope: Pro. Projection windows and capital-at-risk available on all tiers.
                    </p>
                    <a
                        href="/settings"
                        className="inline-block mt-3 text-[11px] text-[#0A64BC] hover:text-[#0856a3] font-medium transition-colors"
                    >
                        Upgrade
                    </a>
                </div>
            )}

            {/* D. RESERVE HISTORY + BOARD REPORT */}
            <div className="mb-12">
                <div className="border-t border-slate-800/60 pt-6 mb-4 flex items-center justify-between">
                    <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Reserve Ledger</h3>
                    <BoardReserveReport host={host} />
                </div>
                <ProjectionTimeline host={host} />
            </div>

            {/* E. Diagnostics — tertiary, discoverable but not prominent */}
            <div className="pt-12 pb-2">
                <a
                    href="/dashboard/diagnostics"
                    className="text-[10px] text-slate-800 hover:text-slate-600 transition-colors"
                >
                    System Diagnostics
                </a>
            </div>
        </div>
    );
}

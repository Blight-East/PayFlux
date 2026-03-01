'use client';

import { UserButton } from '@clerk/nextjs';
import ReserveForecastPanel from '@/components/ReserveForecastPanel';
import ProjectionTimeline from '@/components/ProjectionTimeline';
import BoardReserveReport from '@/components/BoardReserveReport';
import NetworkAggregate from '@/components/NetworkAggregate';
import { Lock } from 'lucide-react';

interface ProjectionRootProps {
    tier: string;
    host: string | null;
}

export default function ProjectionRoot({ tier, host }: ProjectionRootProps) {
    const isFree = tier === 'free';

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-300 tracking-tight">Dashboard</h2>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Capital projection surface</p>
                </div>
                <UserButton
                    appearance={{
                        elements: {
                            userButtonAvatarBox: "w-8 h-8"
                        }
                    }}
                />
            </div>

            {/* A. CAPITAL AT RISK — Primary Instrument */}
            <div className="mb-12">
                <ReserveForecastPanel host={host} />
            </div>

            {/* Free tier: intervention lock + upgrade CTA */}
            {isFree && (
                <div className="mb-8 border border-zinc-800 rounded-lg px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Lock className="w-4 h-4 text-zinc-600" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                                Intervention Modeling
                            </span>
                        </div>
                        <span className="text-[9px] bg-blue-500/5 text-blue-500/40 border border-blue-500/10 px-1.5 py-0.5 rounded uppercase">
                            PRO
                        </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-2 font-mono leading-relaxed">
                        Intervention modeling requires a Pro subscription. Projection windows and capital-at-risk metrics are available on all tiers.
                    </p>
                    <a
                        href="/settings"
                        className="inline-block mt-3 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        Upgrade to model reserve accumulation.
                    </a>
                </div>
            )}

            {/* B. NETWORK BENCHMARK — Only if significance met */}
            <div className="mb-8">
                <NetworkAggregate />
            </div>

            {/* C. RESERVE HISTORY + MODEL ACCURACY + BOARD REPORT */}
            <div className="mb-12">
                <div className="border-t border-zinc-900 pt-6 mb-4 flex items-center justify-between">
                    <h3 className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">Reserve History</h3>
                    <BoardReserveReport host={host} />
                </div>
                <ProjectionTimeline host={host} />
            </div>

            {/* Diagnostics — tertiary, discoverable but not prominent */}
            <div className="pt-12 pb-2">
                <a
                    href="/dashboard/diagnostics"
                    className="text-[10px] text-zinc-800 hover:text-zinc-600 transition-colors"
                >
                    Diagnostics
                </a>
            </div>
        </div>
    );
}

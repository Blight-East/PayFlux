'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import ReserveForecastPanel from '@/components/ReserveForecastPanel';
import ProjectionTimeline from '@/components/ProjectionTimeline';
import BoardReserveReport from '@/components/BoardReserveReport';

interface ProjectionRootProps {
    tier: string;
    host: string | null;
}

export default function ProjectionRoot({ tier, host }: ProjectionRootProps) {
    const isFree = tier === 'free';

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-lg font-semibold text-slate-300 tracking-tight">Dashboard</h2>
                    <p className="text-sm text-slate-400 mt-1 max-w-3xl">
                        PayFlux shows when your payment processor may start holding back money, slowing payouts, or escalating account risk, and what to do before it happens.
                    </p>
                </div>
                <UserButton
                    appearance={{
                        elements: {
                            userButtonAvatarBox: 'w-8 h-8',
                        },
                    }}
                />
            </div>

            <div className="mb-12">
                <ReserveForecastPanel host={host} />
            </div>

            <div className="mb-12 rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Payout stability & recent history</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                            Use recent checks to see whether payout risk is getting better, getting worse, or lining up with what PayFlux warned about earlier.
                        </p>
                    </div>
                    {!isFree && host && <BoardReserveReport host={host} />}
                </div>

                <div className="mt-5">
                    <ProjectionTimeline host={host} />
                </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
                <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Advanced detail & trust</h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                    Model confidence, signed exports, and system diagnostics still exist, but they no longer sit in the main operator path.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <Link
                        href="/dashboard/governance"
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 no-underline transition-colors hover:border-slate-700"
                    >
                        <p className="text-sm font-semibold text-white">Forecast confidence</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            See how forecasts are calculated, evaluated, and versioned.
                        </p>
                    </Link>
                    <Link
                        href="/dashboard/verify"
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 no-underline transition-colors hover:border-slate-700"
                    >
                        <p className="text-sm font-semibold text-white">Check a signed export</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            Validate an exported report if you need an audit trail or outside review.
                        </p>
                    </Link>
                    <Link
                        href="/dashboard/diagnostics"
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 no-underline transition-colors hover:border-slate-700"
                    >
                        <p className="text-sm font-semibold text-white">System status</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            Review supporting infrastructure health and internal warning logs.
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
}

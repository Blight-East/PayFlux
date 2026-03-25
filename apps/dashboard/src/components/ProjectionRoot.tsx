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

            <details className="group rounded-2xl border border-slate-800 bg-slate-900/20 p-6 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between outline-none">
                    <div>
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Advanced detail and audit trail</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Forecast confidence, monitoring history, exports, and diagnostics.
                        </p>
                    </div>
                    <div className="text-slate-500 transition-transform group-open:rotate-180">
                        <svg className="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </summary>

                <div className="mt-6 pt-6 border-t border-slate-800/60 space-y-12">
                    <div>
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                            <div>
                                <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Monitoring history & confidence</h4>
                                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                                    Historical checks, accuracy reports, and signed audit records.
                                </p>
                            </div>
                            {!isFree && host && <BoardReserveReport host={host} />}
                        </div>
                        <ProjectionTimeline host={host} />
                    </div>

                    <div>
                        <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-3">Model trust & exports</h4>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Link
                                href="/dashboard/governance"
                                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 no-underline transition-colors hover:border-slate-700"
                            >
                                <p className="text-sm font-semibold text-slate-300">Forecast confidence</p>
                                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                    See how forecasts are calculated, evaluated, and versioned.
                                </p>
                            </Link>
                            <Link
                                href="/dashboard/verify"
                                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 no-underline transition-colors hover:border-slate-700"
                            >
                                <p className="text-sm font-semibold text-slate-300">Check a signed export</p>
                                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                    Validate an exported report if you need an audit trail or outside review.
                                </p>
                            </Link>
                            <Link
                                href="/dashboard/diagnostics"
                                className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 no-underline transition-colors hover:border-slate-700"
                            >
                                <p className="text-sm font-semibold text-slate-300">System status</p>
                                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                                    Review supporting infrastructure health and internal warning logs.
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
            </details>
        </div>
    );
}

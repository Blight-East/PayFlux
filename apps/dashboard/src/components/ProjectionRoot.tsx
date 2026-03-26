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
        <div className="mx-auto max-w-6xl p-8">
            <div className="mb-10 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">Dashboard</h2>
                    <p className="mt-1 max-w-3xl text-sm text-gray-500">
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

            <details className="group rounded-xl border border-gray-200 bg-white p-6 transition-all duration-300">
                <summary className="flex cursor-pointer items-center justify-between outline-none">
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Advanced detail and audit trail</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Forecast confidence, monitoring history, exports, and diagnostics.
                        </p>
                    </div>
                    <div className="text-gray-400 transition-transform group-open:rotate-180">
                        <svg className="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </summary>

                <div className="mt-6 space-y-12 border-t border-gray-200 pt-6">
                    <div>
                        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Monitoring history &amp; confidence</h4>
                                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-gray-500">
                                    Historical checks, accuracy reports, and signed audit records.
                                </p>
                            </div>
                            {!isFree && host && <BoardReserveReport host={host} />}
                        </div>
                        <ProjectionTimeline host={host} />
                    </div>

                    <div>
                        <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Model trust &amp; exports</h4>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Link
                                href="/dashboard/governance"
                                className="rounded-lg border border-gray-200 bg-white p-4 no-underline transition-colors hover:border-gray-300 hover:bg-gray-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">Forecast confidence</p>
                                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                                    See how forecasts are calculated, evaluated, and versioned.
                                </p>
                            </Link>
                            <Link
                                href="/dashboard/verify"
                                className="rounded-lg border border-gray-200 bg-white p-4 no-underline transition-colors hover:border-gray-300 hover:bg-gray-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">Check a signed export</p>
                                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                                    Validate an exported report if you need an audit trail or outside review.
                                </p>
                            </Link>
                            <Link
                                href="/dashboard/diagnostics"
                                className="rounded-lg border border-gray-200 bg-white p-4 no-underline transition-colors hover:border-gray-300 hover:bg-gray-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">System status</p>
                                <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
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

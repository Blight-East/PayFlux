'use client';

import { useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Lock } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';
import { useScanData } from '@/lib/use-scan-data';
import Link from 'next/link';

interface DashboardFreePreviewProps {
    host: string | null;
    hasStripeConnection: boolean;
    onboardingStage: string;
}

function riskBandColor(label?: string) {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (l === 'ELEVATED') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (l === 'MODERATE') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
}

export default function DashboardFreePreview({ host, hasStripeConnection, onboardingStage }: DashboardFreePreviewProps) {
    const { scanData } = useScanData();

    useEffect(() => {
        logOnboardingEventClient('dashboard_preview_viewed');
    }, []);

    const score = scanData?.data?.stabilityScore ?? scanData?.data?.riskScore ?? null;
    const label = scanData?.data?.riskLabel ?? null;
    const findings = scanData?.data?.findings ?? [];
    const hasCompletedScan = onboardingStage !== 'none' || !!scanData;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-lg font-semibold text-slate-300 tracking-tight">Dashboard</h2>
                    <p className="text-sm text-slate-400 mt-1 max-w-3xl">
                        PayFlux shows when your payment processor may start holding back money, slowing payouts, or escalating account risk, and what to do before it happens.
                    </p>
                </div>
                <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
            </div>

            {/* Resume / continue banner — persistent guidance */}
            {onboardingStage !== 'upgraded' && (
                <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-lg px-5 py-4 flex items-center justify-between">
                    <div>
                        {!hasCompletedScan ? (
                            <>
                                <p className="text-sm text-slate-300">
                                    Start with a quick check to see whether your processor may become a cash-flow problem.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    The scan gives you a first snapshot, explains the warning signs, and shows what to do next.
                                </p>
                            </>
                        ) : !hasStripeConnection ? (
                            <>
                                <p className="text-sm text-slate-300">
                                    You&apos;ve completed the snapshot. Connect Stripe for live payout monitoring.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Live data turns this from a one-time check into an early-warning system for held funds, slower payouts, and account pressure.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-slate-300">
                                    You can see the current warning level. You can&apos;t yet see how much money may be affected over time.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Pro unlocks the forward-looking view so you can see potential held funds and the best actions before cash flow gets hit.
                                </p>
                            </>
                        )}
                    </div>
                    <Link
                        href={!hasCompletedScan ? '/scan' : !hasStripeConnection ? '/connect' : '/upgrade'}
                        onClick={() => {
                            if (!hasCompletedScan) {
                                logOnboardingEventClient('scan_started', { source: 'dashboard_banner' });
                            } else if (hasStripeConnection) {
                                logOnboardingEventClient('upgrade_cta_clicked', { source: 'banner' });
                            } else {
                                logOnboardingEventClient('connect_cta_clicked', { source: 'dashboard_banner' });
                            }
                        }}
                        className="ml-4 flex-shrink-0 px-4 py-2 bg-amber-500 text-slate-950 text-xs font-semibold rounded-lg hover:bg-amber-400 transition-all no-underline"
                    >
                        {!hasCompletedScan ? 'Run the first check' : !hasStripeConnection ? 'Connect Stripe' : 'Unlock the forecast'}
                    </Link>
                </div>
            )}

            {/* A. Current snapshot */}
            {scanData && (
                <div className="mb-8">
                    <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-3">What PayFlux sees right now</h3>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-slate-400">{scanData.url}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    This is a first snapshot based on your public site and any connected processor data.
                                </p>
                            </div>
                            <div className="flex items-center space-x-3">
                                {score !== null && (
                                    <div className="text-right">
                                        <span className="text-2xl font-bold text-white">{score}</span>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Risk score</p>
                                    </div>
                                )}
                                {label && (
                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${riskBandColor(label)}`}>
                                        {label} payout risk
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Score bar */}
                        {score !== null && (
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                                <div
                                    className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.max(score, 3)}%` }}
                                />
                            </div>
                        )}

                        {/* Top findings */}
                        {findings.length > 0 && (
                            <div className="space-y-2 mt-4">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Why this matters</p>
                                {findings.slice(0, 3).map((f, i) => (
                                    <div key={i} className="flex items-start space-x-2">
                                        <div className="w-1 h-1 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs text-slate-300">{f.title}</p>
                                            <p className="text-[10px] text-slate-500">{f.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* B. Monitoring status */}
            <div className="mb-8">
                <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-3">What happens next</h3>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center space-x-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${hasStripeConnection ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                        <span className="text-sm text-slate-300">
                            {hasStripeConnection ? 'Stripe connected. PayFlux can watch payout risk live.' : 'No processor connected yet.'}
                        </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                        {hasStripeConnection
                            ? 'The next step is unlocking the forward-looking view so you can estimate how much money could be held back and what to fix first.'
                            : 'Connect Stripe to move from a static snapshot to live monitoring for held funds, slower payouts, and warning signs from your processor.'}
                    </p>
                    {!hasStripeConnection && (
                        <div className="mt-3">
                            <Link
                                href="/connect"
                                className="text-xs text-amber-400 hover:text-amber-300 transition-colors no-underline"
                            >
                                Connect Stripe safely →
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* C. Locked forecast */}
            <div className="mb-8">
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-6 relative overflow-hidden">
                    {/* Blur overlay */}
                    <div className="absolute inset-0 backdrop-blur-sm bg-slate-950/40 z-10 flex flex-col items-center justify-center p-6">
                        <div className="flex items-center space-x-2 mb-3">
                            <Lock className="w-4 h-4 text-slate-500" />
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Pro</span>
                        </div>
                        <p className="text-sm text-slate-300 text-center max-w-sm leading-relaxed">
                            See how much money your processor could hold back over the next 30, 60, and 90 days.
                            This is the forward-looking view that turns risk into a cash-flow number.
                        </p>
                        <Link
                            href="/upgrade"
                            onClick={() => logOnboardingEventClient('upgrade_cta_clicked', { source: 'projection_panel' })}
                            className="mt-4 px-5 py-2 bg-amber-500 text-slate-950 text-xs font-semibold rounded-lg hover:bg-amber-400 transition-all no-underline"
                        >
                            Unlock the forecast
                        </Link>
                    </div>

                    {/* Ghost content behind blur */}
                    <div className="opacity-20 pointer-events-none" aria-hidden="true">
                        <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-4">How soon this could matter</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <p className="text-[10px] text-slate-600">30-day outlook</p>
                                <p className="text-lg font-bold text-white mt-1">$—</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <p className="text-[10px] text-slate-600">60-day outlook</p>
                                <p className="text-lg font-bold text-white mt-1">$—</p>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-4">
                                <p className="text-[10px] text-slate-600">90-day outlook</p>
                                <p className="text-lg font-bold text-white mt-1">$—</p>
                            </div>
                        </div>
                        <div className="mt-6 h-32 bg-slate-800/30 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* D. Locked action plan */}
            <div className="mb-8">
                <div className="border border-slate-800/60 rounded-xl px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Lock className="w-4 h-4 text-slate-600" />
                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                                Top actions to lower payout risk
                            </span>
                        </div>
                        <span className="text-[9px] bg-amber-500/10 text-amber-400/60 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                            Pro
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                        Pro shows the top actions most likely to reduce payout risk and estimates how much they may help if they work.
                    </p>
                    <Link
                        href="/upgrade"
                        onClick={() => logOnboardingEventClient('upgrade_cta_clicked', { source: 'intervention_panel' })}
                        className="inline-block mt-3 text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors no-underline"
                    >
                        Unlock the action plan →
                    </Link>
                </div>
            </div>

            {/* Advanced link */}
            <div className="pt-8 pb-2">
                <Link
                    href="/dashboard/diagnostics"
                    className="text-[10px] text-slate-800 hover:text-slate-600 transition-colors no-underline"
                >
                    System status
                </Link>
            </div>
        </div>
    );
}

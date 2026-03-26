'use client';

import { useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Lock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';
import { useScanData } from '@/lib/use-scan-data';
import Link from 'next/link';

interface DashboardFreePreviewProps {
    host: string | null;
    hasStripeConnection: boolean;
    onboardingStage: string;
}

function riskBandLabel(label?: string): { text: string; color: string; bgColor: string; borderColor: string } {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') return { text: l, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    if (l === 'ELEVATED') return { text: 'ELEVATED', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
    if (l === 'MODERATE') return { text: 'MODERATE', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    return { text: 'LOW', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
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

    const riskBand = riskBandLabel(label ?? undefined);
    const hasIssues = findings.length > 0 && label && label.toUpperCase() !== 'LOW';

    return (
        <div className="mx-auto max-w-5xl p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {host ? host : 'Your processor risk overview'}
                    </p>
                </div>
                <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
            </div>

            {/* ── Status Banner ── */}
            {hasCompletedScan && (
                <div className={`mb-6 flex items-center justify-between rounded-lg px-5 py-3 ${hasIssues
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-emerald-50 border border-emerald-200'
                    }`}>
                    <div className="flex items-center gap-3">
                        {hasIssues ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                        ) : (
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                        <span className={`text-sm font-semibold ${hasIssues ? 'text-amber-900' : 'text-emerald-900'}`}>
                            {hasIssues
                                ? `${findings.length} item${findings.length !== 1 ? 's' : ''} need attention`
                                : 'All clear — no immediate payout risk detected'}
                        </span>
                    </div>
                    {hasIssues && (
                        <span className="text-sm text-amber-700">Review below&nbsp;&darr;</span>
                    )}
                </div>
            )}

            {/* ── Resume Banner (no scan yet) ── */}
            {!hasCompletedScan && (
                <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-4">
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            Start with a quick check to see where you stand.
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                            The scan gives you a snapshot, explains the warning signs, and shows what to do next.
                        </p>
                    </div>
                    <Link
                        href="/scan"
                        onClick={() => logOnboardingEventClient('scan_started', { source: 'dashboard_banner' })}
                        className="ml-4 flex-shrink-0 rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                    >
                        Run a scan
                    </Link>
                </div>
            )}

            {/* ── Action Cards (if issues exist) ── */}
            {hasIssues && findings.length > 0 && (
                <div className="mb-6 space-y-3">
                    {findings.slice(0, 3).map((f, i) => (
                        <div key={i} className="rounded-lg border border-gray-200 border-l-4 border-l-amber-400 bg-white px-5 py-4">
                            <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                            <p className="mt-1 text-sm text-gray-600">{f.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── KPI Row ── */}
            {hasCompletedScan && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Risk Level */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Overall Risk</p>
                        <p className={`mt-2 text-2xl font-bold ${riskBand.color}`}>{riskBand.text}</p>
                        <p className="mt-1 text-xs text-gray-400">
                            Based on {findings.length} signal{findings.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Score */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Risk Score</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{score !== null ? `${score}/100` : '—'}</p>
                        <p className="mt-1 text-xs text-gray-400">From latest scan</p>
                    </div>

                    {/* Stripe Connection */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Stripe</p>
                        <p className={`mt-2 text-2xl font-bold ${hasStripeConnection ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {hasStripeConnection ? 'Connected' : 'Not connected'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                            {hasStripeConnection ? 'Live data active' : 'Connect for live monitoring'}
                        </p>
                    </div>

                    {/* Monitoring */}
                    <div className="rounded-lg border border-gray-200 bg-white p-5">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Monitoring</p>
                        <p className="mt-2 text-2xl font-bold text-gray-400">Snapshot only</p>
                        <p className="mt-1 text-xs text-gray-400">Upgrade for continuous</p>
                    </div>
                </div>
            )}

            {/* ── Next Step + Quick Actions ── */}
            <div className="mb-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                {/* Next step card */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-gray-900">Next step</h3>
                    {!hasCompletedScan ? (
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                            Run a scan to see whether your processor may become a cash-flow problem. The scan checks your store for public risk signals and gives you a first snapshot.
                        </p>
                    ) : !hasStripeConnection ? (
                        <>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                Connect Stripe to move from a one-time snapshot to live monitoring. PayFlux will watch for payout timing changes, held funds, and rising processor pressure.
                            </p>
                            <Link
                                href="/connect"
                                onClick={() => logOnboardingEventClient('connect_cta_clicked', { source: 'dashboard_next_step' })}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                            >
                                Connect Stripe <ArrowRight className="h-4 w-4" />
                            </Link>
                        </>
                    ) : (
                        <>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                Stripe is connected. Upgrade to Pro to unlock the forward-looking view — see how much money could be affected and what to fix first.
                            </p>
                            <Link
                                href="/upgrade"
                                onClick={() => logOnboardingEventClient('upgrade_cta_clicked', { source: 'dashboard_next_step' })}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                            >
                                Upgrade to Pro <ArrowRight className="h-4 w-4" />
                            </Link>
                        </>
                    )}
                </div>

                {/* Quick actions */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h3 className="text-sm font-semibold text-gray-900">Quick actions</h3>
                    <div className="mt-4 space-y-2">
                        <Link
                            href="/scan"
                            onClick={() => logOnboardingEventClient('scan_started', { source: 'dashboard_quick_action' })}
                            className="block w-full rounded-lg bg-[#0A64BC] px-4 py-2.5 text-center text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                        >
                            Run new scan
                        </Link>
                        {!hasStripeConnection && (
                            <Link
                                href="/connect"
                                onClick={() => logOnboardingEventClient('connect_cta_clicked', { source: 'dashboard_quick_action' })}
                                className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50"
                            >
                                Connect Stripe
                            </Link>
                        )}
                        <Link
                            href="/dashboard/diagnostics"
                            className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-center text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50"
                        >
                            System status
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Locked Forecast (Pro upsell) ── */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">Forward-looking forecast</span>
                    </div>
                    <span className="rounded bg-[#0A64BC]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0A64BC]">
                        Pro
                    </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    See how much money your processor could hold back over the next 30, 60, and 90 days. This is the forward-looking view that turns risk into a cash-flow number.
                </p>
                <Link
                    href="/upgrade"
                    onClick={() => logOnboardingEventClient('upgrade_cta_clicked', { source: 'projection_panel' })}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0A64BC] no-underline transition-colors hover:text-[#0B5BA8]"
                >
                    Unlock the forecast <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {/* ── Locked Action Plan ── */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">Top actions to lower payout risk</span>
                    </div>
                    <span className="rounded bg-[#0A64BC]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#0A64BC]">
                        Pro
                    </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Pro shows the top actions most likely to reduce payout risk and estimates how much they may help.
                </p>
                <Link
                    href="/upgrade"
                    onClick={() => logOnboardingEventClient('upgrade_cta_clicked', { source: 'intervention_panel' })}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#0A64BC] no-underline transition-colors hover:text-[#0B5BA8]"
                >
                    Unlock the action plan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}

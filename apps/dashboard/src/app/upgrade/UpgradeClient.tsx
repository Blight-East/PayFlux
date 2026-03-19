'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Shield, FileCheck } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';
import { useScanData } from '@/lib/use-scan-data';

interface UpgradeClientProps {
    hasStripeConnection: boolean;
    hasScanCompleted: boolean;
    stage: string;
    workspaceId: string | null;
}

function riskBandStyle(label?: string) {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
    if (l === 'ELEVATED') return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    if (l === 'MODERATE') return { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
}

function contextualHeadline(label?: string, hasConnection?: boolean): string {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') {
        return 'Your risk level is elevated. Here\u2019s what you still can\u2019t see.';
    }
    if (l === 'ELEVATED') {
        return 'You\u2019ve identified exposure. Pro shows how it evolves before it hits.';
    }
    if (hasConnection) {
        return 'You\u2019ve seen the warning signs. Pro shows the trajectory.';
    }
    return 'You\u2019ve completed your scan. Here\u2019s what\u2019s still hidden.';
}

export default function UpgradeClient({ hasStripeConnection, hasScanCompleted, stage, workspaceId }: UpgradeClientProps) {
    const { scanData } = useScanData();
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const score = scanData?.data?.stabilityScore ?? scanData?.data?.riskScore ?? null;
    const label = scanData?.data?.riskLabel ?? null;
    const findings = scanData?.data?.findings ?? [];
    const riskStyle = riskBandStyle(label ?? undefined);

    const handleCheckout = async () => {
        if (!workspaceId) return;
        setCheckoutLoading(true);
        logOnboardingEventClient('upgrade_cta_clicked', { source: 'upgrade_page_cta' });

        try {
            const res = await fetch('/api/checkout/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setCheckoutLoading(false);
            }
        } catch {
            setCheckoutLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">

                {/* ── Resume guidance ── */}
                {stage === 'scanned' && !hasStripeConnection && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-300">Your scan is complete but Stripe isn&apos;t connected yet.</p>
                            <p className="text-xs text-slate-500 mt-1">Connect for live monitoring, or upgrade now for full visibility.</p>
                        </div>
                        <Link
                            href="/connect"
                            className="ml-4 flex-shrink-0 px-3 py-1.5 border border-slate-700 text-xs text-slate-400 rounded-lg hover:text-slate-300 hover:border-slate-600 transition-all no-underline"
                        >
                            Connect Stripe
                        </Link>
                    </div>
                )}

                {/* ── A. Headline ── */}
                <div className="space-y-4">
                    <h1 className="text-2xl font-semibold tracking-tight leading-tight">
                        {contextualHeadline(label ?? undefined, hasStripeConnection)}
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                        {hasStripeConnection
                            ? 'Your processor is connected and we\u2019re monitoring live signals. Pro unlocks the forward-looking layers that turn detection into prevention.'
                            : 'Your risk scan identified exposure. Pro gives you the forward visibility to act before reserve holds, payout freezes, or account actions escalate.'
                        }
                    </p>
                </div>

                {/* ── B. Context block ── */}
                {(scanData || hasScanCompleted) && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-4">Your Current Exposure</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {/* Risk band */}
                            {label && (
                                <div className={`${riskStyle.bg} border ${riskStyle.border} rounded-lg p-3 text-center`}>
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Risk Level</p>
                                    <p className={`text-sm font-bold ${riskStyle.text}`}>{label}</p>
                                </div>
                            )}
                            {/* Score */}
                            {score !== null && (
                                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Stability</p>
                                    <p className="text-sm font-bold text-white">{score}/100</p>
                                </div>
                            )}
                            {/* Findings */}
                            {findings.length > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Findings</p>
                                    <p className="text-sm font-bold text-white">{findings.length}</p>
                                </div>
                            )}
                            {/* Connection */}
                            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                                <p className="text-[10px] text-slate-500 uppercase mb-1">Monitoring</p>
                                <p className={`text-sm font-bold ${hasStripeConnection ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {hasStripeConnection ? 'Live' : 'Snapshot'}
                                </p>
                            </div>
                        </div>

                        {/* What you can see now */}
                        <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">What you can see now</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded">Risk band</span>
                                <span className="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded">Key findings</span>
                                <span className="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded">Connection status</span>
                                {hasStripeConnection && (
                                    <span className="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded">Live signals</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── C. Three Pro value blocks ── */}
                <div className="space-y-4">
                    <h2 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">What Pro unlocks</h2>

                    {/* Block 1: Reserve Projection */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Reserve Projection</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            See how much capital your processor could hold over the next 30, 60, and 90 days based on your actual payment behavior.
                            {hasStripeConnection
                                ? ' With your Stripe connection, projections update continuously as new transactions flow through.'
                                : ' Once connected, projections reflect your real transaction patterns, not estimates.'
                            }
                        </p>
                        <p className="text-xs text-slate-500">
                            Reserve holds compound silently. By the time you notice, the capital is already trapped.
                        </p>
                    </div>

                    {/* Block 2: Intervention Modeling */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Intervention Modeling</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Test what happens to your reserve exposure if dispute rates rise, processing volume shifts, or your processor tightens terms.
                            Run scenarios before the outcome is real.
                        </p>
                        <p className="text-xs text-slate-500">
                            Processors adjust terms without warning. Modeling lets you see the impact before it lands on your balance sheet.
                        </p>
                    </div>

                    {/* Block 3: Signed Evidence */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                                <FileCheck className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Signed Evidence &amp; Reporting</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Generate timestamped, signed records of your reserve exposure and risk trajectory.
                            Use them for board reporting, processor negotiation, or audit preparation.
                        </p>
                        <p className="text-xs text-slate-500">
                            When you need to prove what your processor did and when, you&apos;ll have the receipts.
                        </p>
                    </div>
                </div>

                {/* ── D. Price block ── */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-baseline justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-lg font-semibold text-white">Pro</span>
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase font-bold">
                                Full access
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-light tracking-tight text-white">$499</span>
                            <span className="text-slate-500 text-sm ml-1">/ month</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-6">
                        <span>Reserve projections</span>
                        <span className="text-slate-700">&middot;</span>
                        <span>Intervention modeling</span>
                        <span className="text-slate-700">&middot;</span>
                        <span>Signed evidence</span>
                        <span className="text-slate-700">&middot;</span>
                        <span>Board reports</span>
                        <span className="text-slate-700">&middot;</span>
                        <span>Continuous monitoring</span>
                    </div>

                    {/* ── E. CTA ── */}
                    <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading || !workspaceId}
                        className="w-full px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
                    >
                        {checkoutLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Connecting to Stripe...
                            </span>
                        ) : (
                            'Start Pro monitoring'
                        )}
                    </button>

                    {/* Explanation for disabled state */}
                    {!workspaceId && (
                        <p className="text-center text-xs text-slate-600 mt-2">
                            Complete your scan first to set up your workspace.
                        </p>
                    )}

                    {/* Secondary */}
                    <Link
                        href="/dashboard"
                        className="flex items-center justify-center w-full mt-3 px-4 py-2 text-sm text-slate-500 hover:text-slate-400 transition-colors no-underline"
                    >
                        Return to dashboard
                    </Link>
                </div>

                {/* ── F. "Why now" line ── */}
                <p className="text-center text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    {score !== null && score < 50
                        ? 'At your current risk level, delaying visibility increases the chance that reserve exposure compounds before you see it.'
                        : 'You\u2019ve already identified risk. Pro helps you see whether it is stabilizing or accelerating.'
                    }
                </p>

                {/* Trust footer */}
                <p className="text-center text-[10px] text-slate-600">
                    Secure checkout via Stripe. Cancel anytime.
                </p>
            </div>
        </div>
    );
}

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
        return 'Your payout risk is elevated. PayFlux can show what may happen next before it hits cash flow.';
    }
    if (l === 'ELEVATED') {
        return 'You found early warning signs. Pro shows whether they are likely to turn into held funds or slower payouts.';
    }
    if (hasConnection) {
        return 'You can already see the warning signs. Pro shows how quickly they may turn into payout pain.';
    }
    return 'You ran the first check. Here is what PayFlux can warn you about before the processor acts.';
}

export default function UpgradeClient({ hasStripeConnection, hasScanCompleted, stage, workspaceId }: UpgradeClientProps) {
    const { scanData } = useScanData();
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    const score = scanData?.data?.stabilityScore ?? scanData?.data?.riskScore ?? null;
    const label = scanData?.data?.riskLabel ?? null;
    const findings = scanData?.data?.findings ?? [];
    const riskStyle = riskBandStyle(label ?? undefined);
    const hasActualScan = hasScanCompleted || !!scanData;

    const headline = hasActualScan
        ? contextualHeadline(label ?? undefined, hasStripeConnection)
        : 'Start with a scan to surface your current exposure.';

    const shouldConnectFirst = stage === 'scanned' && !hasStripeConnection;

    const handleCheckout = async () => {
        if (!workspaceId) return;
        setCheckoutLoading(true);
        setCheckoutError(null);
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
                setCheckoutError(data.error || 'Unable to start checkout. Please try again.');
            }
        } catch {
            setCheckoutLoading(false);
            setCheckoutError('Connection error. Please check your network and try again.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">

                {/* ── Resume guidance ── */}
                {stage === 'scanned' && !hasStripeConnection && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-5 py-4 flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-300">Your scan is complete, but you are still on a one-time snapshot.</p>
                            <p className="text-xs text-slate-500 mt-1">Recommended next step: connect Stripe first so Pro can start with live payout data instead of making you loop back after checkout.</p>
                        </div>
                        <Link
                            href="/connect"
                            className="ml-4 flex-shrink-0 px-3 py-1.5 border border-slate-700 text-xs text-slate-400 rounded-lg hover:text-slate-300 hover:border-slate-600 transition-all no-underline"
                        >
                            Connect first
                        </Link>
                    </div>
                )}

                {/* ── A. Headline ── */}
                <div className="space-y-4">
                    <h1 className="text-2xl font-semibold tracking-tight leading-tight">
                        {headline}
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                        {!hasActualScan
                            ? 'Run a first check so the upgrade path starts from your real payout-risk warning signs, not generic assumptions.'
                            : hasStripeConnection
                            ? 'Your processor is already connected. Pro turns live monitoring into an operator view of what may happen next, why it matters, and what to do before payouts are affected.'
                            : 'Your scan found signs that could lead to held funds, slower payouts, or tighter account review. Connect first if you want Pro to start from live processor data on day one.'
                        }
                    </p>
                </div>

                {/* ── B. Context block ── */}
                {(scanData || hasScanCompleted) && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-4">What PayFlux knows right now</h2>
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
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Current risk score</p>
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
                                    <p className="text-[10px] text-slate-500 uppercase mb-1">Monitoring mode</p>
                                    <p className={`text-sm font-bold ${hasStripeConnection ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {hasStripeConnection ? 'Live data' : 'One-time snapshot'}
                                    </p>
                            </div>
                        </div>

                        {/* What you can see now */}
                        <div className="mt-4 pt-4 border-t border-slate-800/50">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">What you can see right now</p>
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

                {shouldConnectFirst && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
                        <h2 className="text-[10px] text-amber-400 uppercase tracking-[0.2em] font-bold">Best path from here</h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            If you upgrade before connecting Stripe, you will still need to connect it on the next step before PayFlux can go live. Connecting first makes the paid setup feel immediate instead of fragmented.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Link
                                href="/connect"
                                className="flex items-center justify-center flex-1 px-4 py-2.5 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all no-underline"
                            >
                                Connect Stripe first
                            </Link>
                            <button
                                type="button"
                                onClick={handleCheckout}
                                disabled={checkoutLoading || !workspaceId}
                                className="flex items-center justify-center flex-1 px-4 py-2.5 border border-slate-700 text-sm text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-all disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
                            >
                                {checkoutLoading ? 'Opening checkout...' : 'Upgrade first anyway'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── C. Three Pro value blocks ── */}
                <div className="space-y-4">
                    <h2 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">What Pro adds</h2>

                    {/* Block 1: Money at risk */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-amber-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">See how much money could be held back</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            See how much of your sales your processor may decide to hold back over the next 30, 60, and 90 days based on real payment behavior.
                            {hasStripeConnection
                                ? ' With Stripe connected, those estimates stay tied to live processor behavior instead of a one-time snapshot.'
                                : ' Once you connect Stripe, these estimates are based on live processor data instead of a one-time site check.'
                            }
                        </p>
                        <p className="text-xs text-slate-500">
                            Held funds compound quietly. By the time most merchants notice, the cash is already harder to access.
                        </p>
                    </div>

                    {/* Block 2: Clear next actions */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-blue-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">See what to do before payouts are hit</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Turn warnings into a practical action list. PayFlux highlights the fixes most likely to reduce payout risk before the outcome becomes real.
                        </p>
                        <p className="text-xs text-slate-500">
                            The job is not to admire the model. The job is to make the next processor decision less painful.
                        </p>
                    </div>

                    {/* Block 3: History and proof */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
                                <FileCheck className="w-4 h-4 text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white">Keep a usable history when you need proof</h3>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Keep timestamped records of risk changes, held-fund estimates, and what PayFlux saw over time for reporting or processor conversations.
                        </p>
                        <p className="text-xs text-slate-500">
                            Advanced trust details stay available, but they no longer have to be the first thing an operator sees.
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
                        <span>Held-back money forecasts</span>
                        <span className="text-slate-700">&middot;</span>
                        <span>Action checklist</span>
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
                                Opening checkout...
                            </span>
                        ) : (
                            'Start Pro'
                        )}
                    </button>

                    {/* Checkout error */}
                    {checkoutError && (
                        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                            <p className="text-sm text-red-400">{checkoutError}</p>
                        </div>
                    )}

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
                        Go back for now
                    </Link>
                </div>

                {/* ── F. "Why now" line ── */}
                <p className="text-center text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    {score !== null && score < 50
                        ? 'At your current risk level, waiting makes it more likely the processor acts before you do.'
                        : 'The warning signs are visible now. Pro helps you see whether they are calming down or getting worse.'
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

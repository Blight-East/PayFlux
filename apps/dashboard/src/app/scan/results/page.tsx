'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { logOnboardingEventClient } from '@/lib/onboarding-events';
import { useScanData } from '@/lib/use-scan-data';

const SEVERITY_STYLE: Record<string, string> = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function riskColor(label?: string) {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
    if (l === 'ELEVATED') return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    if (l === 'MODERATE') return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
}

function riskSummary(score: number, findingsCount: number): string {
    if (score < 40) {
        return `Your processor may see enough warning signs to hold back money, slow payouts, or review the account. ${findingsCount} issue${findingsCount !== 1 ? 's were' : ' was'} found that could raise concern quickly.`;
    }
    if (score <= 70) {
        return `There are early signs your processor could become more cautious if volume changes or enforcement tightens. ${findingsCount} area${findingsCount !== 1 ? 's' : ''} should be fixed before they turn into payout problems.`;
    }
    return `Nothing major is jumping out right now. Your current payout risk looks manageable, but it is still worth fixing smaller gaps before they become processor issues.`;
}

function headline(label?: string): string {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') return 'Your processor may be quick to hold back money if this pattern continues.';
    if (l === 'ELEVATED') return 'Your processor may be seeing early warning signs.';
    if (l === 'MODERATE') return 'Your payout risk is not urgent yet, but the warning signs are real.';
    return 'Your current payout risk looks fairly stable.';
}

function nextStepCopy(label?: string): string {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') {
        return 'Do not stop at the snapshot. Connect live processor data so PayFlux can warn you when held funds or slower payouts start showing up.';
    }
    if (l === 'ELEVATED' || l === 'MODERATE') {
        return 'These warning signs can get worse without much notice. Connect your processor so PayFlux can tell you if payouts slow down or money starts getting held back.';
    }
    return 'Things look calm right now, but processors can change terms quickly. Connect live data so PayFlux can keep watching instead of relying on a one-time check.';
}

export default function ScanResultsPage() {
    const router = useRouter();
    const { userId } = useAuth();
    const { scanData: result, loading } = useScanData();

    useEffect(() => {
        // Only redirect to /scan if loading is complete and no data exists anywhere
        if (!loading && !result) {
            router.push('/scan');
        }
    }, [loading, result, router]);

    // Emit scan_results_viewed once we have valid data
    useEffect(() => {
        if (!loading && result) {
            logOnboardingEventClient('scan_results_viewed', {
                risk_score: result.data.stabilityScore ?? result.data.riskScore,
                risk_band: result.data.riskLabel,
                findings_count: result.data.findings?.length ?? 0,
                source_page: 'scan_results',
            });
        }
    }, [loading, result]);

    if (loading || !result) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-700 border-t-amber-400 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-sm text-slate-500">Loading results...</p>
                </div>
            </div>
        );
    }

    const { url, data } = result;
    const score = data.stabilityScore ?? data.riskScore ?? 0;
    const label = data.riskLabel ?? 'Unknown';
    const findings = data.findings ?? [];
    const colors = riskColor(label);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-2xl w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                        {headline(result?.data?.riskLabel)}
                    </h1>
                    <p className="text-sm text-slate-400">{url}</p>
                </div>

                {/* Risk score card */}
                <div className={`${colors.bg} border ${colors.border} rounded-xl p-6 space-y-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {label} payout risk
                            </span>
                        </div>
                        <div className="text-right">
                            <div className={`text-3xl font-bold ${colors.text}`}>{score}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Current risk score</div>
                        </div>
                    </div>

                    {/* Score bar */}
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.max(score, 3)}%` }}
                        />
                    </div>

                    {/* Interpretation */}
                    <p className="text-sm text-slate-300 leading-relaxed">
                        {riskSummary(score, findings.length)}
                    </p>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
                    <div>
                        <p className="text-[10px] text-amber-400 uppercase tracking-[0.2em] font-bold">This check is a snapshot</p>
                        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            Live monitoring is what tells you when these issues are getting worse, when payouts may slow down, or when money may start getting held back.
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                        <p className="text-xs font-semibold text-white">What is happening?</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            Your site is showing warning signs a processor could use to justify slower payouts, held funds, or tighter account review.
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                        <p className="text-xs font-semibold text-white">Why does it matter?</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            If concern rises, the money impact lands on cash flow first. Merchants usually feel it before they can explain it.
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                        <p className="text-xs font-semibold text-white">What should you do next?</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            Fix the strongest warning signs and connect live processor data so PayFlux can watch for real payout changes.
                        </p>
                    </div>
                </div>

                {/* Findings */}
                {findings.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider">What we found</h2>
                        <div className="space-y-2">
                            {findings.slice(0, 5).map((finding, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 flex items-start space-x-3"
                                >
                                    <div className="flex-shrink-0 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center mt-0.5">
                                        <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-white">{finding.title}</h3>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{finding.description}</p>
                                        {finding.severity && (
                                            <span className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-medium rounded border ${SEVERITY_STYLE[finding.severity] ?? SEVERITY_STYLE.low}`}>
                                                {finding.severity}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {findings.length === 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                        <p className="text-sm text-emerald-400">
                            No significant risk signals detected. Your site appears to be in good standing.
                        </p>
                    </div>
                )}

                {/* Context line */}
                <div className="text-center space-y-1">
                    <p className="text-xs text-slate-300">{nextStepCopy(label)}</p>
                    <p className="text-xs text-slate-500">
                        Keep watching for payout slowdowns, held funds, and rising processor pressure.
                    </p>
                </div>

                {/* CTA ladder */}
                <div className="space-y-3">
                    {userId ? (
                        <>
                            <Link
                                href="/connect"
                                onClick={() => logOnboardingEventClient('scan_results_continue_clicked', {
                                    source_page: 'scan_results',
                                    destination_page: 'connect',
                                    risk_score: score,
                                    risk_band: label,
                                    findings_count: findings.length,
                                    authenticated: true,
                                })}
                                className="flex items-center justify-center w-full px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] no-underline"
                            >
                                Connect Stripe and keep watching this live
                            </Link>
                            <Link
                                href="/dashboard"
                                onClick={() => logOnboardingEventClient('scan_results_continue_clicked', {
                                    source_page: 'scan_results',
                                    destination_page: 'dashboard',
                                    risk_score: score,
                                    risk_band: label,
                                    findings_count: findings.length,
                                    authenticated: true,
                                    skipped: true,
                                })}
                                className="flex items-center justify-center w-full px-6 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors no-underline"
                            >
                                Stop at the snapshot for now
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/sign-up?redirect_url=%2Fconnect"
                                onClick={() => logOnboardingEventClient('scan_results_continue_clicked', {
                                    source_page: 'scan_results',
                                    destination_page: 'sign_up',
                                    risk_score: score,
                                    risk_band: label,
                                    findings_count: findings.length,
                                    authenticated: false,
                                })}
                                className="flex items-center justify-center w-full px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] no-underline"
                            >
                                Create a free account and continue to live monitoring
                            </Link>
                            <Link
                                href="/sign-in?redirect_url=%2Fconnect"
                                onClick={() => logOnboardingEventClient('scan_results_continue_clicked', {
                                    source_page: 'scan_results',
                                    destination_page: 'sign_in',
                                    risk_score: score,
                                    risk_band: label,
                                    findings_count: findings.length,
                                    authenticated: false,
                                })}
                                className="flex items-center justify-center w-full px-6 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors no-underline"
                            >
                                Already have an account? Sign in and continue
                            </Link>
                        </>
                    )}
                </div>

                {/* Trust footer */}
                <p className="text-center text-[11px] text-slate-600">
                    PayFlux does not change processor settings or payout behavior. Live mode is read-only.
                </p>
            </div>
        </div>
    );
}

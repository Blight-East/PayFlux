'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

interface ScanResult {
    url: string;
    data: {
        riskLabel?: string;
        riskScore?: number;
        stabilityScore?: number;
        findings?: Array<{
            title: string;
            description: string;
            severity?: string;
        }>;
    };
}

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
        return `Your payment infrastructure has significant exposure. ${findingsCount} risk factor${findingsCount !== 1 ? 's were' : ' was'} identified that could lead to reserve holds, processing interruptions, or account review.`;
    }
    if (score <= 70) {
        return `Your payment setup is functional but has gaps. ${findingsCount} area${findingsCount !== 1 ? 's' : ''} could become problems if your processor tightens enforcement or volume changes.`;
    }
    return `Your payment infrastructure looks stable. Minor gaps exist but your current risk profile is within normal bounds.`;
}

export default function ScanResultsPage() {
    const router = useRouter();
    const [result, setResult] = useState<ScanResult | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('payflux_scan_result');
        if (stored) {
            const parsed = JSON.parse(stored);
            setResult(parsed);
            // Don't clear — user may refresh
        } else {
            router.push('/scan');
        }
    }, [router]);

    if (!result) {
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
                        Your Payment Risk Profile
                    </h1>
                    <p className="text-sm text-slate-400">{url}</p>
                </div>

                {/* Risk score card */}
                <div className={`${colors.bg} border ${colors.border} rounded-xl p-6 space-y-4`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                                {label} Risk
                            </span>
                        </div>
                        <div className="text-right">
                            <div className={`text-3xl font-bold ${colors.text}`}>{score}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Stability Score</div>
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
                <p className="text-xs text-slate-500 text-center">
                    This is a point-in-time snapshot. Connect your processor for continuous monitoring.
                </p>

                {/* CTA ladder */}
                <div className="space-y-3">
                    {/* Primary: Connect Stripe */}
                    <Link
                        href="/connect"
                        onClick={() => logOnboardingEventClient('connect_started')}
                        className="flex items-center justify-center w-full px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] no-underline"
                    >
                        Connect Stripe for live monitoring
                    </Link>

                    {/* Secondary: Skip to dashboard preview */}
                    <Link
                        href="/dashboard"
                        onClick={() => logOnboardingEventClient('connect_skipped')}
                        className="flex items-center justify-center w-full px-6 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors no-underline"
                    >
                        Continue to dashboard preview
                    </Link>
                </div>

                {/* Trust footer */}
                <p className="text-center text-[11px] text-slate-600">
                    Read-only access via Stripe Connect. We never modify your payments.
                </p>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

function normalizeUrl(input: string): string {
    let s = input.trim();
    if (!s) return '';
    // Strip protocol if present, we'll add it back
    s = s.replace(/^https?:\/\//, '');
    // Strip trailing slashes
    s = s.replace(/\/+$/, '');
    return s;
}

export default function ScanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { userId } = useAuth();
    const [url, setUrl] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanStage, setScanStage] = useState('');
    const [scanStageIdx, setScanStageIdx] = useState(0);
    const demoViewed = useRef(false);
    const entrySource = searchParams.get('source') ?? undefined;
    const entryCta = searchParams.get('cta') ?? undefined;
    const entryJourney = searchParams.get('journey_id') ?? undefined;

    const attribution = {
        entry_source: entrySource,
        entry_cta: entryCta,
        entry_journey_id: entryJourney,
        referrer_host: typeof document !== 'undefined' && document.referrer
            ? (() => {
                try {
                    return new URL(document.referrer).host;
                } catch {
                    return undefined;
                }
            })()
            : undefined,
    };

    useEffect(() => {
        sessionStorage.setItem('payflux_scan_attribution', JSON.stringify(attribution));
        logOnboardingEventClient('scan_viewed', { source_page: 'scan', ...attribution });
    }, [entryCta, entryJourney, entrySource]);

    // Emit scan_example_viewed once (the example result block is always visible)
    useEffect(() => {
        if (!demoViewed.current) {
            demoViewed.current = true;
            logOnboardingEventClient('scan_example_viewed');
        }
    }, []);

    const SCAN_STAGES = [
        { label: 'Checking for payout-risk warning signs...', detail: 'Reviewing your site for the policies and support paths processors look for.' },
        { label: 'Estimating where processor concern may rise...', detail: 'Looking for gaps that can increase disputes, reviews, or payout pressure.' },
        { label: 'Estimating money your processor could hold back...', detail: 'Turning those warning signs into a first risk read in plain English.' },
    ];

    async function handleScan() {
        const domain = normalizeUrl(url);
        if (!domain) {
            setError('Enter your website to continue.');
            return;
        }

        setScanning(true);
        setError(null);
        setScanStageIdx(0);
        setScanStage(SCAN_STAGES[0].label);

        logOnboardingEventClient('scan_submitted', { domain, ...attribution });

        let stageIdx = 0;
        const stageTimer = setInterval(() => {
            stageIdx = Math.min(stageIdx + 1, SCAN_STAGES.length - 1);
            setScanStageIdx(stageIdx);
            setScanStage(SCAN_STAGES[stageIdx].label);
        }, 4000);

        try {
            const response = await fetch('/api/v1/risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: domain,
                    industry: 'general',
                    processor: 'stripe',
                }),
            });

            clearInterval(stageTimer);

            if (!response.ok) {
                throw new Error('Scan failed');
            }

            const data = await response.json();

            // Store result for results page
            sessionStorage.setItem('payflux_scan_result', JSON.stringify({ url: domain, data }));
            sessionStorage.setItem('payflux_scan_attribution', JSON.stringify({
                ...attribution,
                scanned_domain: domain,
            }));

            // Persist scan completion + summary when the user is signed in.
            // Anonymous users still get the result in-session via sessionStorage.
            if (userId) {
                await fetch('/api/onboarding/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'UI_SCAN',
                        scanResult: {
                            url: domain,
                            riskLabel: data.riskLabel,
                            stabilityScore: data.stabilityScore ?? data.riskScore,
                            findings: data.findings,
                        },
                        attribution,
                    }),
                }).catch(() => { });
            } else {
                logOnboardingEventClient('scan_completed', {
                    domain,
                    mode: 'UI_SCAN',
                    risk_band: data.riskLabel,
                    findings_count: data.findings?.length ?? 0,
                    authenticated: false,
                    ...attribution,
                });
            }

            // scan_completed is emitted server-side in /api/onboarding/complete
            // (authoritative, has userId + workspace context)

            router.push('/scan/results');
        } catch {
            clearInterval(stageTimer);
            setError('We could not complete the check. Confirm the domain and try again.');
            setScanning(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-8">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-2">
                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                        Check whether your processor may start holding back money or slowing payouts.
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                        PayFlux gives you a fast first check of payout risk. Enter your domain and we&apos;ll show what warning signs a processor may see, why they matter, and whether it is worth moving into live monitoring next.
                    </p>
                </div>

                {/* ── Scan Form ── */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div>
                        <label htmlFor="url" className="block text-xs font-medium text-slate-500 mb-2">
                            Your website or domain
                        </label>
                        <input
                            id="url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="yourbusiness.com"
                            disabled={scanning}
                            autoFocus
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !scanning && url.trim()) {
                                    handleScan();
                                }
                            }}
                        />
                        <p className="mt-1.5 text-[10px] text-slate-600">
                            Just the domain. No processor connection needed for this first check.
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleScan}
                        disabled={scanning || !url.trim()}
                        className="w-full px-6 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed"
                    >
                        {scanning ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Checking your payout risk...
                            </span>
                        ) : (
                            'Check my payout risk'
                        )}
                    </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold text-white">What is happening?</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            Your site may already be showing signs that make a processor more likely to slow payouts, hold back money, or review the account.
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold text-white">Why does it matter?</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            These issues usually turn into cash-flow problems before a merchant sees them clearly in reporting.
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
                        <p className="text-xs font-semibold text-white">What should you do next?</p>
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                            Start with this first check. Then connect live processor data so PayFlux can keep watching for changes.
                        </p>
                    </div>
                </div>

                {/* ── Example result preview ── */}
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-bold">Example scan output</p>
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase font-bold">
                            Payout risk is elevated
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            <div className="text-2xl font-bold text-red-400">38</div>
                            <div className="text-[9px] text-slate-600 uppercase">Risk score</div>
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{ width: '38%' }} />
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <div className="text-sm font-semibold text-white">4 warning signs</div>
                            <div className="text-[9px] text-slate-600 uppercase">Found</div>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-400">Refund terms are hard to find, which can raise dispute pressure.</p>
                        </div>
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-400">Cancellation steps are unclear, which can make a processor more cautious.</p>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-800/50">
                        This one-time check flags the warning. The next step is connecting live processor data so PayFlux can keep watching for real payout changes.
                    </p>
                </div>

                {/* ── What you'll get ── */}
                <div className="flex items-start space-x-6 px-2">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <p className="text-xs text-slate-300">Current payout risk</p>
                        </div>
                        <p className="text-[10px] text-slate-600 ml-3.5">A simple read on whether processor concern looks low, moderate, or rising</p>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <p className="text-xs text-slate-300">Why it matters</p>
                        </div>
                        <p className="text-[10px] text-slate-600 ml-3.5">The site issues that can lead to reserve holds, slower payouts, or account review</p>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        <p className="text-xs text-slate-300">Next step</p>
                    </div>
                        <p className="text-[10px] text-slate-600 ml-3.5">A clear handoff into live monitoring if the warning signs look real enough to matter</p>
                    </div>
                </div>

                {/* ── Scan progress ── */}
                {scanning && (
                    <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-5 space-y-3">
                        {SCAN_STAGES.map((stage, idx) => (
                            <div key={idx} className="flex items-start space-x-3">
                                <div className="mt-0.5 flex-shrink-0">
                                    {idx < scanStageIdx ? (
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : idx === scanStageIdx ? (
                                        <svg className="animate-spin w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-700" />
                                    )}
                                </div>
                                <div>
                                    <p className={`text-xs ${idx <= scanStageIdx ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {stage.label}
                                    </p>
                                    {idx === scanStageIdx && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">{stage.detail}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trust footer */}
                <p className="text-center text-[11px] text-slate-600">
                    This first check is read-only. PayFlux does not touch your processor settings or payout flow.
                </p>

                {/* Escape hatch — visually secondary */}
                <div className="text-center">
                    {userId ? (
                        <Link
                            href="/dashboard"
                            className="text-[11px] text-slate-600 hover:text-slate-500 transition-colors no-underline"
                        >
                            Skip to dashboard →
                        </Link>
                    ) : (
                        <Link
                            href="/sign-up?redirect_url=%2Fscan"
                            className="text-[11px] text-slate-600 hover:text-slate-500 transition-colors no-underline"
                        >
                            Create a free account to keep going after the scan →
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

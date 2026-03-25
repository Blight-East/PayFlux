'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
    const [url, setUrl] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanStage, setScanStage] = useState('');
    const [scanStageIdx, setScanStageIdx] = useState(0);
    const demoViewed = useRef(false);

    useEffect(() => {
        logOnboardingEventClient('scan_started');
    }, []);

    // Emit scan_example_viewed once (the example result block is always visible)
    useEffect(() => {
        if (!demoViewed.current) {
            demoViewed.current = true;
            logOnboardingEventClient('scan_example_viewed');
        }
    }, []);

    const SCAN_STAGES = [
        { label: 'Checking processor configuration...', detail: 'Identifying your payment stack and processor relationship' },
        { label: 'Identifying exposure points...', detail: 'Analyzing compliance gaps, dispute patterns, and risk signals' },
        { label: 'Estimating reserve risk...', detail: 'Calculating how much capital your processor could hold' },
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

            // Persist scan completion + summary to Clerk org metadata
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
                }),
            });

            // scan_completed is emitted server-side in /api/onboarding/complete
            // (authoritative, has userId + workspace context)

            router.push('/scan/results');
        } catch {
            clearInterval(stageTimer);
            setError('Scan failed. Check the domain and try again.');
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
                        How exposed is your payment stack?
                    </h1>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                        Enter your domain. In 30 seconds you&apos;ll see your processor risk level, compliance gaps, and how much capital could be at risk.
                    </p>
                </div>

                {/* ── Example result preview ── */}
                <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-bold">Example scan output</p>
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase font-bold">
                            Elevated
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                            <div className="text-2xl font-bold text-red-400">38</div>
                            <div className="text-[9px] text-slate-600 uppercase">Stability</div>
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{ width: '38%' }} />
                        </div>
                        <div className="flex-shrink-0 text-right">
                            <div className="text-sm font-semibold text-white">4 findings</div>
                            <div className="text-[9px] text-slate-600 uppercase">Detected</div>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-400">Missing refund policy increases dispute escalation risk</p>
                        </div>
                        <div className="flex items-start space-x-2">
                            <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-400">No clear cancellation flow detected — processor flag risk</p>
                        </div>
                    </div>

                    <p className="text-[10px] text-slate-600 pt-1 border-t border-slate-800/50">
                        This merchant&apos;s processor could place a 10% rolling reserve on monthly volume within 60 days.
                    </p>
                </div>

                {/* ── What you'll get ── */}
                <div className="flex items-start space-x-6 px-2">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <p className="text-xs text-slate-300">Processor risk signals</p>
                        </div>
                        <p className="text-[10px] text-slate-600 ml-3.5">Dispute rates, account flags, reserve triggers</p>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <p className="text-xs text-slate-300">Compliance gaps</p>
                        </div>
                        <p className="text-[10px] text-slate-600 ml-3.5">Policies, disclosures, checkout signals</p>
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <p className="text-xs text-slate-300">Reserve exposure</p>
                        </div>
                        <p className="text-[10px] text-slate-600 ml-3.5">How much capital your processor could hold</p>
                    </div>
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
                            Just the domain — no https:// needed. Takes about 30 seconds.
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
                                Analyzing your exposure...
                            </span>
                        ) : (
                            'Show my risk'
                        )}
                    </button>
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
                    Read-only analysis. We never modify your payment configuration.
                </p>

                {/* Escape hatch — visually secondary */}
                <div className="text-center">
                    <Link
                        href="/dashboard"
                        className="text-[11px] text-slate-600 hover:text-slate-500 transition-colors no-underline"
                    >
                        Skip to dashboard →
                    </Link>
                </div>
            </div>
        </div>
    );
}

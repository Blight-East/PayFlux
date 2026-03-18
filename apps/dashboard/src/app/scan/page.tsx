'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

export default function ScanPage() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanStage, setScanStage] = useState('');

    useEffect(() => {
        logOnboardingEventClient('scan_started');
    }, []);

    async function handleScan() {
        if (!url.trim()) {
            setError('Enter your website to continue.');
            return;
        }

        setScanning(true);
        setError(null);

        const stages = [
            'Checking processor configuration...',
            'Analyzing compliance signals...',
            'Calculating risk exposure...',
        ];
        let stageIdx = 0;
        setScanStage(stages[0]);
        const stageTimer = setInterval(() => {
            stageIdx = Math.min(stageIdx + 1, stages.length - 1);
            setScanStage(stages[stageIdx]);
        }, 3000);

        try {
            const response = await fetch('/api/v1/risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url.trim(),
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
            sessionStorage.setItem('payflux_scan_result', JSON.stringify({ url: url.trim(), data }));

            // Persist scan completion + summary to Clerk org metadata
            await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'UI_SCAN',
                    scanResult: {
                        url: url.trim(),
                        riskLabel: data.riskLabel,
                        stabilityScore: data.stabilityScore ?? data.riskScore,
                        findings: data.findings,
                    },
                }),
            });

            logOnboardingEventClient('scan_completed', {
                url: url.trim(),
                riskScore: data.stabilityScore ?? data.riskScore,
                riskLabel: data.riskLabel,
            });

            router.push('/scan/results');
        } catch {
            clearInterval(stageTimer);
            setError('Scan failed. Check the URL and try again.');
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
                        Enter your website. We'll analyze your processor risk, compliance gaps, and reserve exposure.
                    </p>
                </div>

                {/* Scan Form */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
                    <div>
                        <label htmlFor="url" className="block text-sm font-medium text-slate-400 mb-2">
                            Your website
                        </label>
                        <input
                            id="url"
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="example.com"
                            disabled={scanning}
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !scanning) {
                                    handleScan();
                                }
                            }}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            In about 30 seconds, you'll see how much capital your processor could put at risk.
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
                                Scanning...
                            </span>
                        ) : (
                            'Check my risk'
                        )}
                    </button>
                </div>

                {/* Loading detail */}
                {scanning && (
                    <div className="text-center space-y-2">
                        <p className="text-sm text-slate-400">{scanStage}</p>
                        <p className="text-xs text-slate-600">This may take up to 30 seconds</p>
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

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ScanResult {
    url: string;
    data: {
        riskLabel?: string;
        riskScore?: number;
        findings?: Array<{
            title: string;
            description: string;
            severity?: string;
        }>;
    };
}

export default function CompletePage() {
    const router = useRouter();
    const [result, setResult] = useState<ScanResult | null>(null);

    useEffect(() => {
        // Load scan result from session storage
        const stored = sessionStorage.getItem('onboarding_scan_result');
        if (stored) {
            setResult(JSON.parse(stored));
            // Clear from session storage
            sessionStorage.removeItem('onboarding_scan_result');
        } else {
            // No result found - redirect back to setup
            router.push('/setup');
        }
    }, [router]);

    if (!result) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--pf-accent)]"></div>
                    <p className="mt-4 text-[var(--pf-text-soft)]">Loading results...</p>
                </div>
            </div>
        );
    }

    const { url, data } = result;
    const findings = data.findings || [];
    const riskLabel = data.riskLabel || 'Unknown';
    const riskScore = data.riskScore || 0;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6">
            <div className="max-w-3xl w-full space-y-6">
                <div className="text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(126,207,195,0.12)]">
                        <svg className="h-8 w-8 text-[var(--pf-cool)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="pf-editorial mb-2 text-3xl text-[var(--pf-paper)] md:text-[3rem]">
                        First scan complete
                    </h1>
                    <p className="text-[var(--pf-text-soft)]">
                        Here&apos;s the first pass for {url}
                    </p>
                </div>

                <div className="pf-panel rounded-[2rem] p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--pf-paper)]">{url}</h2>
                            <p className="mt-1 text-[var(--pf-text-soft)]">Risk assessment</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-[var(--pf-accent)]">{riskScore}</div>
                            <div className="text-sm uppercase tracking-wide text-[var(--pf-text-soft)]">{riskLabel}</div>
                        </div>
                    </div>

                    {findings.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-[var(--pf-paper)]">Key findings</h3>
                            <ul className="space-y-3">
                                {findings.slice(0, 3).map((finding, idx) => (
                                    <li key={idx} className="rounded-[1.25rem] border border-white/8 bg-black/18 p-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(233,181,117,0.12)]">
                                                <span className="text-xs font-semibold text-[var(--pf-accent)]">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-[var(--pf-paper)]">{finding.title}</h4>
                                                <p className="mt-1 text-sm text-[var(--pf-text-soft)]">{finding.description}</p>
                                                {finding.severity && (
                                                    <span className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${
                                                        finding.severity === 'high'
                                                            ? 'bg-red-500/12 text-red-300'
                                                            : finding.severity === 'medium'
                                                              ? 'bg-[rgba(233,181,117,0.12)] text-[var(--pf-accent-soft)]'
                                                              : 'bg-[rgba(126,207,195,0.12)] text-[var(--pf-cool)]'
                                                        }`}>
                                                        {finding.severity}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {findings.length === 0 && (
                        <div className="rounded-lg border border-[rgba(126,207,195,0.2)] bg-[rgba(126,207,195,0.08)] p-4">
                            <p className="text-sm text-[var(--pf-cool)]">
                                No significant risk signals detected. Your site appears to be in good standing.
                            </p>
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center rounded-full bg-[var(--pf-accent)] px-8 py-4 text-lg font-semibold text-[var(--pf-ink)] transition-all active:scale-[0.98] no-underline hover:opacity-95"
                    >
                        Continue to Billing
                    </Link>
                    <p className="mt-4 text-sm text-[var(--pf-text-soft)]">
                        Your workspace is set up. Start your plan next to unlock the dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}

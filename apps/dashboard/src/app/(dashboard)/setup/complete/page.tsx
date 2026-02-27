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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading results...</p>
                </div>
            </div>
        );
    }

    const { url, data } = result;
    const findings = data.findings || [];
    const riskLabel = data.riskLabel || 'Unknown';
    const riskScore = data.riskScore || 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-3xl w-full space-y-6">
                {/* Header */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Risk Analysis Complete
                    </h1>
                    <p className="text-slate-600">
                        Here's what we found for {url}
                    </p>
                </div>

                {/* Risk Summary Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">{url}</h2>
                            <p className="text-slate-600 mt-1">Risk Assessment</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-indigo-600">{riskScore}</div>
                            <div className="text-sm text-slate-600 uppercase tracking-wide">{riskLabel}</div>
                        </div>
                    </div>

                    {/* Findings */}
                    {findings.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900">Key Findings</h3>
                            <ul className="space-y-3">
                                {findings.slice(0, 3).map((finding, idx) => (
                                    <li key={idx} className="bg-slate-50 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                                                <span className="text-xs font-semibold text-indigo-600">{idx + 1}</span>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-slate-900">{finding.title}</h4>
                                                <p className="text-sm text-slate-600 mt-1">{finding.description}</p>
                                                {finding.severity && (
                                                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded ${finding.severity === 'high' ? 'bg-red-100 text-red-800' :
                                                            finding.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-green-100 text-green-800'
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
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800">
                                No significant risk signals detected. Your site appears to be in good standing.
                            </p>
                        </div>
                    )}
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold text-lg rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] no-underline"
                    >
                        Go to Dashboard
                    </Link>
                    <p className="mt-4 text-sm text-slate-600">
                        Your dashboard is now unlocked
                    </p>
                </div>
            </div>
        </div>
    );
}

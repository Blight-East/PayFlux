'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleScan() {
        if (!url) {
            setError('Please enter a URL');
            return;
        }

        setScanning(true);
        setError(null);

        try {
            // Set timeout for partial results
            const timeoutId = setTimeout(() => {
                // TODO: Show partial results after 10s
                console.log('Timeout reached - showing partial results');
            }, 10000);

            const response = await fetch('/api/v1/risk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url,
                    industry: 'general',
                    processor: 'stripe',
                }),
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('Scan failed');
            }

            const data = await response.json();

            // Store scan result in session storage for completion page
            sessionStorage.setItem('onboarding_scan_result', JSON.stringify({
                url,
                data,
            }));

            // Mark onboarding as complete
            await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: 'UI_SCAN',
                }),
            });

            // Redirect to completion page
            router.push('/setup/complete');
        } catch (err) {
            setError('Failed to scan. Please try again.');
            setScanning(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="max-w-2xl w-full space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Scan your website
                    </h1>
                    <p className="text-slate-600">
                        Enter your website URL to analyze risk signals
                    </p>
                </div>

                {/* Scan Form */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="url" className="block text-sm font-medium text-slate-700 mb-2">
                                Website URL
                            </label>
                            <input
                                id="url"
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="example.com"
                                disabled={scanning}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !scanning) {
                                        handleScan();
                                    }
                                }}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleScan}
                            disabled={scanning || !url}
                            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                            {scanning ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Scanning...
                                </span>
                            ) : (
                                'Scan Now'
                            )}
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {scanning && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <p className="text-sm text-indigo-800 text-center">
                            Analyzing your website for risk signals...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

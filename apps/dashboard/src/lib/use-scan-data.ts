'use client';

import { useEffect, useState } from 'react';

export interface ScanData {
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

/**
 * Load scan data from sessionStorage (fast) with API fallback (durable).
 *
 * Priority:
 *   1. sessionStorage — instant, same-session only
 *   2. /api/onboarding/scan-result — persisted in Clerk org metadata, survives refresh/bookmark
 *
 * When API data is loaded, it's also written to sessionStorage for subsequent reads.
 */
export function useScanData(): { scanData: ScanData | null; loading: boolean } {
    const [scanData, setScanData] = useState<ScanData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        // 1. Try sessionStorage first
        const stored = sessionStorage.getItem('payflux_scan_result');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (!cancelled) {
                    setScanData(parsed);
                    setLoading(false);
                }
                return;
            } catch { /* fall through to API */ }
        }

        // 2. Fetch from API (durable persistence)
        fetch('/api/onboarding/scan-result')
            .then(res => res.json())
            .then(data => {
                if (cancelled) return;
                if (data.scanResult) {
                    // Reshape persisted summary into ScanData format
                    const result: ScanData = {
                        url: data.scanResult.url ?? '',
                        data: {
                            riskLabel: data.scanResult.riskLabel,
                            stabilityScore: data.scanResult.stabilityScore,
                            findings: data.scanResult.findings,
                        },
                    };
                    setScanData(result);
                    // Cache in sessionStorage for subsequent reads
                    sessionStorage.setItem('payflux_scan_result', JSON.stringify(result));
                }
                setLoading(false);
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    return { scanData, loading };
}

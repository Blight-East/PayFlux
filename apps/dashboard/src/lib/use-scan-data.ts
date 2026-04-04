'use client';

import { useEffect, useState } from 'react';
import { readStoredScanResult, writeStoredScanResult, type ScanData } from '@/lib/scan-storage';

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
        const stored = readStoredScanResult();
        if (stored) {
            if (!cancelled) {
                setScanData(stored);
                setLoading(false);
            }
            return;
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
                    writeStoredScanResult(result);
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

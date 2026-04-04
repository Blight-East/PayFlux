'use client';

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

const SCAN_RESULT_KEY = 'payflux_scan_result';
const SCAN_ATTRIBUTION_KEY = 'payflux_scan_attribution';

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;

    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

function readStorage<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    const sessionValue = safeParse<T>(window.sessionStorage.getItem(key));
    if (sessionValue) return sessionValue;

    return safeParse<T>(window.localStorage.getItem(key));
}

function writeStorage<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;

    const raw = JSON.stringify(value);
    window.sessionStorage.setItem(key, raw);
    window.localStorage.setItem(key, raw);
}

export function readStoredScanResult(): ScanData | null {
    return readStorage<ScanData>(SCAN_RESULT_KEY);
}

export function writeStoredScanResult(value: ScanData) {
    writeStorage(SCAN_RESULT_KEY, value);
}

export function readStoredScanAttribution<T extends Record<string, unknown>>() {
    return readStorage<T>(SCAN_ATTRIBUTION_KEY) ?? {};
}

export function writeStoredScanAttribution<T extends Record<string, unknown>>(value: T) {
    writeStorage(SCAN_ATTRIBUTION_KEY, value);
}

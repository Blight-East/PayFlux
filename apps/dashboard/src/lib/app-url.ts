import type { NextRequest } from 'next/server';

const DEFAULT_PRODUCTION_APP_URL = 'https://app.payflux.dev';
const DEFAULT_DEVELOPMENT_APP_URL = 'http://localhost:3000';
const APP_URL_ENV_KEYS = [
    'PAYFLUX_DASHBOARD_URL',
    'NEXT_PUBLIC_APP_URL',
    'APP_URL',
];

function normalizeAppUrl(value: string | null | undefined): string | null {
    if (!value) return null;

    const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed) return null;

    const candidate = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed.replace(/^\/+/, '')}`;

    try {
        const url = new URL(candidate);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }
        return url.origin.replace(/\/$/, '');
    } catch {
        return null;
    }
}

export function getAppUrl(request?: Request | NextRequest | null): string {
    for (const key of APP_URL_ENV_KEYS) {
        const normalized = normalizeAppUrl(process.env[key]);
        if (normalized) {
            return normalized;
        }
    }

    if (request) {
        try {
            return new URL(request.url).origin.replace(/\/$/, '');
        } catch {
            // Ignore malformed request URLs and fall back below.
        }
    }

    return process.env.NODE_ENV === 'production'
        ? DEFAULT_PRODUCTION_APP_URL
        : DEFAULT_DEVELOPMENT_APP_URL;
}

export function buildAppUrl(
    pathname: string,
    request?: Request | NextRequest | null
): string {
    return new URL(pathname, `${getAppUrl(request)}/`).toString();
}

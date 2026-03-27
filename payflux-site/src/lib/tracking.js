export const SCAN_URL = 'https://app.payflux.dev/scan';
const EVENT_URL = 'https://app.payflux.dev/api/onboarding/event';
const JOURNEY_KEY = 'pf_journey_id';
const COOKIE_NAME = 'pf_journey';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function resolveCookieDomain() {
    if (typeof window === 'undefined') return null;
    const { hostname } = window.location;
    return hostname === 'payflux.dev' || hostname.endsWith('.payflux.dev')
        ? '.payflux.dev'
        : null;
}

function readCookie(name) {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function syncJourneyCookie(id) {
    if (typeof document === 'undefined') return;
    const domain = resolveCookieDomain();
    const domainAttr = domain ? `; domain=${domain}` : '';
    document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${domainAttr}`;
}

export function getJourneyId() {
    if (typeof window === 'undefined') return '';
    let id = window.localStorage.getItem(JOURNEY_KEY) || readCookie(COOKIE_NAME);
    if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(JOURNEY_KEY, id);
    }
    syncJourneyCookie(id);
    return id;
}

export function logMarketingEvent(event, metadata = {}) {
    const payload = JSON.stringify({
        event,
        metadata: {
            ...metadata,
            journey_id: getJourneyId(),
        },
        timestamp: new Date().toISOString(),
    });

    try {
        fetch(EVENT_URL, {
            method: 'POST',
            mode: 'no-cors',
            credentials: 'include',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: payload,
            keepalive: true,
        }).catch(() => {
            if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
                const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
                navigator.sendBeacon(EVENT_URL, blob);
            }
        });
    } catch {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
            navigator.sendBeacon(EVENT_URL, blob);
        }
    }
}

export function buildScanUrl(source, cta) {
    const url = new URL(SCAN_URL);
    url.searchParams.set('source', source);
    url.searchParams.set('cta', cta);
    url.searchParams.set('journey_id', getJourneyId());
    return url.toString();
}

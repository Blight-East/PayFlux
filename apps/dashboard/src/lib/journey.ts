/**
 * Journey ID — Anonymous-safe funnel identity.
 *
 * Creates a stable UUID on first visit, stores in localStorage + first-party cookie.
 * Survives auth redirects and page refreshes.
 * Included on every onboarding event so pre-auth and post-auth
 * behavior can be stitched via a single journey_id.
 */

const JOURNEY_KEY = 'pf_journey_id';
const COOKIE_NAME = 'pf_journey';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export function getJourneyId(): string {
    if (typeof window === 'undefined') return '';

    let id = localStorage.getItem(JOURNEY_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(JOURNEY_KEY, id);
    }

    // Sync to cookie so server-side handlers can read it
    document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    return id;
}

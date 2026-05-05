export const POSTHOG_KEY = 'phc_ADQ5FzWb5y2JJtVEZaFWCdyDWH5hNjrbmMqhuGnVyWiC';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

export function warnOnPostHogEnvMismatch(scope: 'client' | 'server') {
    const envKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const envHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const serverKey = scope === 'server' ? process.env.POSTHOG_PROJECT_API_KEY : undefined;
    const serverHost = scope === 'server' ? process.env.POSTHOG_HOST : undefined;

    if ((envKey && envKey !== POSTHOG_KEY) || (serverKey && serverKey !== POSTHOG_KEY)) {
        console.warn('[POSTHOG_CONFIG] Ignoring conflicting PostHog key; using PayFlux production project key');
    }
    if ((envHost && envHost !== POSTHOG_HOST) || (serverHost && serverHost !== POSTHOG_HOST)) {
        console.warn('[POSTHOG_CONFIG] Ignoring conflicting PostHog host; using US ingestion host');
    }
}

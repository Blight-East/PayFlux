export function getBaseUrl(): string {
    // Order: CANONICAL_SITE_URL -> NEXT_PUBLIC_SITE_URL -> DEPLOY_PRIME_URL -> URL -> DEPLOY_URL -> Default
    const rawUrl =
        process.env.CANONICAL_SITE_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.DEPLOY_PRIME_URL ||
        process.env.URL ||
        process.env.DEPLOY_URL ||
        'https://payflux.dev';

    // Normalize: remove trailing slash
    return rawUrl.replace(/\/$/, '');
}

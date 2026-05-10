import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        // Netlify provides COMMIT_REF. Vercel provides VERCEL_GIT_COMMIT_SHA.
        NEXT_PUBLIC_COMMIT_SHA: process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || 'dev-sha',
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
        PAYFLUX_GIT_SHA: process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || 'dev-sha',
        PAYFLUX_BUILD_TIME: new Date().toISOString(),
    },
    async redirects() {
        return [
            {
                source: '/use-cases/:slug*',
                destination: 'https://payflux.dev/docs/use-cases/:slug*',
                permanent: true,
            },
        ];
    },
    serverExternalPackages: ['better-sqlite3'],
};

// Sentry's Next.js plugin handles source map upload and runtime injection.
// All flags are no-ops when SENTRY_DSN / SENTRY_AUTH_TOKEN are unset, so this
// stays inert in dev and CI without explicit guarding.
export default withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    disableLogger: true,
    automaticVercelMonitors: false,
});

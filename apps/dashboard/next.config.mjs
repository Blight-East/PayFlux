import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isE2EMode = process.env.PAYFLUX_E2E_MODE === '1';

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
    webpack(config) {
        if (isE2EMode) {
            // E2E-only: swap Clerk for local mocks that (a) read a test
            // identity cookie on the server and (b) render pass-through
            // components on the client. Never active in production builds.
            config.resolve = config.resolve ?? {};
            config.resolve.alias = {
                ...(config.resolve.alias ?? {}),
                '@clerk/nextjs/server$': path.resolve(
                    __dirname,
                    'src/test-helpers/clerk-nextjs-server-mock.ts'
                ),
                '@clerk/nextjs$': path.resolve(
                    __dirname,
                    'src/test-helpers/clerk-nextjs-client-mock.tsx'
                ),
            };
        }
        return config;
    },
};

export default nextConfig;

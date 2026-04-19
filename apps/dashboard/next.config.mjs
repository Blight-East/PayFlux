import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
        root: __dirname,
    },
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

export default nextConfig;

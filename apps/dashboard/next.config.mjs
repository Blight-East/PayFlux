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
};

export default nextConfig;

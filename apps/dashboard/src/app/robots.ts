
import { MetadataRoute } from 'next';

const BASE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    'https://app.payflux.dev';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // If there were private routes, we'd disallow them here, 
            // but requirements say "Append... Do NOT remove existing" (implies manual check).
            // Since this file didn't exist, we create minimal permissive + docs.
        },
        sitemap: `${BASE_URL}/sitemap-docs.xml`,
    };
}

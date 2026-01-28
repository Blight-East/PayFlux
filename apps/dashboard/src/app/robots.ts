
import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

const BASE_URL = getBaseUrl();

// Sitemap must point to the canonical location if possible
// getBaseUrl() now resolves towards payflux.dev
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: `${BASE_URL}/sitemap-docs.xml`,
    };
}

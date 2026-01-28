
import { MetadataRoute } from 'next';
import { getBaseUrl } from '../lib/seo';

const BASE_URL = getBaseUrl();

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


import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // If there were private routes, we'd disallow them here, 
            // but requirements say "Append... Do NOT remove existing" (implies manual check).
            // Since this file didn't exist, we create minimal permissive + docs.
        },
        sitemap: 'https://payflux.dev/sitemap-docs.xml',
    };
}

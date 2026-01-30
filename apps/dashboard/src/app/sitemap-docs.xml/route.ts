


import { getBaseUrl } from '@/lib/seo';
import docsBundle from '../../data/docs.json';

const BASE_URL = getBaseUrl();

// Use the bundled data directly
const docsFiles = Object.keys(docsBundle.docs);
const generatedAt = docsBundle.generatedAt;

export async function GET() {
    // Base URLs
    // Note: getBaseUrl() is configured to fallback/prioritize payflux.dev
    const urls = [
        {
            loc: `${BASE_URL}/docs`,
            lastmod: generatedAt,
            changefreq: 'daily',
            priority: 0.9
        }
    ];

    /*
      Loop through keys (docs/risk/foo.md) and create URLs:
      -> https://payflux.dev/docs/risk/foo (via BASE_URL)
    */
    docsFiles.forEach((relativePath) => {
        // Remove extension
        const routePath = relativePath.replace(/\.md$/, '');
        // Ensure forward slashes
        const slug = routePath.split('/').join('/');

        // Skip index.md as it is covered by /docs (or mapping to /docs)
        if (slug === 'index') return;

        urls.push({
            loc: `${BASE_URL}/docs/${slug}`,
            lastmod: generatedAt,
            changefreq: 'monthly',
            priority: 0.7
        });
    });

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.map((url) => `
  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>
  `).join('')}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}

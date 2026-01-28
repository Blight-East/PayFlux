
import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

// Define the root docs directory relative to CWD (apps/dashboard)
const MANIFEST_PATH = path.join(process.cwd(), '../../docs/manifest.json');

// Determine Base URL in order: NEXT_PUBLIC_SITE_URL -> URL (Netlify) -> Fallback
const BASE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL ||
    'https://app.payflux.dev';

interface Manifest {
    generatedAt: string;
    basePath: string;
    files: string[];
}

export async function GET() {
    let manifest: Manifest;

    try {
        const fileContents = fs.readFileSync(MANIFEST_PATH, 'utf8');
        manifest = JSON.parse(fileContents);
    } catch (error) {
        console.error('Failed to read docs manifest:', error);
        // Fallback or error - returning empty sitemap for resilience
        manifest = { generatedAt: new Date().toISOString(), basePath: 'docs', files: [] };
    }

    // Base URLs
    const urls = [
        {
            loc: `${BASE_URL}/docs`,
            lastmod: manifest.generatedAt,
            changefreq: 'daily',
            priority: 0.9
        }
    ];

    /*
      Loop through manifest files and create URLs:
      docs/risk/foo.md -> https://app.payflux.dev/docs/risk/foo
    */
    manifest.files.forEach((cleanPath) => {
        // Remove extension
        const routePath = cleanPath.replace(/\.md$/, '');
        // Ensure forward slashes
        const slug = routePath.split('/').join('/');

        // Skip index.md as it is covered by /docs (or mapping to /docs)
        if (slug === 'index') return;

        urls.push({
            loc: `${BASE_URL}/docs/${slug}`,
            lastmod: manifest.generatedAt,
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
  </url>
  `).join('')}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}

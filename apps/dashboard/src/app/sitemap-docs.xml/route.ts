
import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

// Define the root docs directory relative to CWD (apps/dashboard)
const DOCS_DIRECTORY = path.join(process.cwd(), '../../docs');
const BASE_URL = 'https://payflux.dev';

function getDocsFiles(dir: string, fileList: string[] = [], relativeDir = ''): string[] {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        // Skip hidden files/dirs and drafts (underscore prefix)
        if (file.startsWith('.') || file.startsWith('_')) return;

        const fullPath = path.join(dir, file);
        const relativePath = path.join(relativeDir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            getDocsFiles(fullPath, fileList, relativePath);
        } else {
            // Only include markdown files
            if (file.endsWith('.md')) {
                fileList.push(relativePath);
            }
        }
    });

    return fileList;
}

export async function GET() {
    const allFiles = getDocsFiles(DOCS_DIRECTORY);

    // Base URLs
    const urls = [
        {
            loc: `${BASE_URL}/docs`,
            lastmod: new Date().toISOString(),
            changefreq: 'daily',
            priority: 0.9
        }
    ];

    /*
      Loop through files and create URLs:
      docs/risk/foo.md -> https://payflux.dev/docs/risk/foo
    */
    allFiles.forEach((cleanPath) => {
        // Remove extension
        const routePath = cleanPath.replace(/\.md$/, '');
        // Ensure forward slashes
        const slug = routePath.split(path.sep).join('/');

        // Skip index.md as it is covered by /docs (or mapping to /docs)
        if (slug === 'index') return;

        urls.push({
            loc: `${BASE_URL}/docs/${slug}`,
            lastmod: new Date().toISOString(), // In real app, git mtime is better, but build time is accepted constraint
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

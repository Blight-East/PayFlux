
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';

// Import the bundled content directly
// This ensures it is included in the build output by Webpack/Next.js
import docsBundle from '../data/docs.json';

// Type safe access to the bundle
const docsData = docsBundle.docs as Record<string, string>;

export interface DocPage {
    title: string;
    description: string;
    contentHtml: string;
    slug: string;
    fullPath: string; // virtual path
}

export async function getDocBySlug(slug: string[]): Promise<DocPage | null> {
    try {
        // 1. Resolve path
        let relativePath = '';

        if (!slug || slug.length === 0) {
            relativePath = 'index.md';
        } else {
            relativePath = slug.join('/');
            if (!relativePath.endsWith('.md')) {
                relativePath += '.md';
            }
        }

        // Prevent directory traversal (though less risky with map lookup)
        if (relativePath.includes('..')) {
            return null;
        }

        // 2. Lookup content
        // The keys in data/docs.json are normalized relative paths (risk/foo.md)
        const fileContent = docsData[relativePath];

        if (!fileContent) {
            return null;
        }

        // 4. Parse content
        // We use gray-matter to strip frontmatter
        const { content } = matter(fileContent);

        // 5. Extract metadata (Title & Description) from markdown content manually
        // Title: First H1
        const titleMatch = content.match(/^# (.*$)/m);
        const title = titleMatch ? titleMatch[1] : path.basename(relativePath, '.md');

        // Description: First non-empty paragraph after Title
        const paragraphs = content.split(/\n\n+/);
        let description = '';
        for (const p of paragraphs) {
            const trimmed = p.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('#')) continue; // Header
            if (trimmed.startsWith('<script')) continue; // Script block
            if (trimmed.startsWith('Up:')) continue; // Nav links

            description = trimmed.replace(/\r?\n|\r/g, ' ').slice(0, 160);
            if (description.length >= 160) description += '...';
            break;
        }

        // 6. Convert Markdown to HTML
        const processedContent = await unified()
            .use(remarkParse)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(rehypeSlug)
            .use(rehypeStringify)
            .process(content);

        let contentHtml = processedContent.toString();

        // 7. Normalize Links
        contentHtml = contentHtml.replace(/href="([^"]+)\.md"/g, (match, p1) => {
            if (p1.startsWith('http')) return match;
            return `href="${p1}"`;
        });

        return {
            title,
            description,
            contentHtml,
            slug: slug ? slug.join('/') : '',
            fullPath: `virtual://${relativePath}`
        };

    } catch (error) {
        console.error('Error getting doc:', error);
        return null;
    }
}

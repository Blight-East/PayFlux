
import path from 'path';
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

// Helper: Resolve slug array to relative path
function resolveRelativePath(slug: string[]): string {
    if (!slug || slug.length === 0) {
        return 'index.md';
    }

    let relativePath = slug.join('/');
    if (!relativePath.endsWith('.md')) {
        relativePath += '.md';
    }

    return relativePath;
}

// Helper: Check for directory traversal attempts
function isTraversalAttempt(relativePath: string): boolean {
    return relativePath.includes('..');
}

// Helper: Extract title from markdown content
function extractTitle(content: string, relativePath: string): string {
    const titleMatch = content.match(/^# (.*$)/m);
    return titleMatch ? titleMatch[1] : path.basename(relativePath, '.md');
}

// Helper: Extract description from markdown content
function extractDescription(content: string): string {
    const paragraphs = content.split(/\n\n+/);

    for (const p of paragraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('#')) continue; // Header
        if (trimmed.startsWith('<script')) continue; // Script block
        if (trimmed.startsWith('Up:')) continue; // Nav links

        let description = trimmed.replace(/\r?\n|\r/g, ' ').slice(0, 160);
        if (description.length >= 160) description += '...';
        return description;
    }

    return '';
}

// Helper: Render markdown to HTML
async function renderMarkdownToHtml(content: string): Promise<string> {
    const processedContent = await unified()
        .use(remarkParse)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeRaw)
        .use(rehypeSlug)
        .use(rehypeStringify)
        .process(content);

    let contentHtml = processedContent.toString();

    // Normalize Links
    contentHtml = contentHtml.replace(/href="([^"]+)\.md"/g, (match, p1) => {
        if (p1.startsWith('http')) return match;
        return `href="${p1}"`;
    });

    return contentHtml;
}

export async function getDocBySlug(slug: string[]): Promise<DocPage | null> {
    try {
        const relativePath = resolveRelativePath(slug);

        if (isTraversalAttempt(relativePath)) {
            return null;
        }

        const fileContent = docsData[relativePath];
        if (!fileContent) {
            return null;
        }

        const { content } = matter(fileContent);
        const title = extractTitle(content, relativePath);
        const description = extractDescription(content);
        const contentHtml = await renderMarkdownToHtml(content);

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

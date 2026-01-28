
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';

// Define the root docs directory relative to the CWD (which should be apps/dashboard)
// In monorepo: apps/dashboard -> ../../docs
const DOCS_DIRECTORY = path.join(process.cwd(), '../../docs');

export interface DocPage {
    title: string;
    description: string;
    contentHtml: string;
    slug: string;
    fullPath: string; // for debugging
}

export async function getDocBySlug(slug: string[]): Promise<DocPage | null> {
    try {
        // 1. Resolve path
        // If slug is empty or undefined, we want index.md
        let relativePath = '';

        if (!slug || slug.length === 0) {
            relativePath = 'index.md';
        } else {
            // Join slug parts
            relativePath = slug.join('/');
            // If it doesn't end in .md, try adding it
            if (!relativePath.endsWith('.md')) {
                // Check if directory first (for potential future index behavior, though requirements say file mapping)
                // Requirements say /docs/risk/foo -> docs/risk/foo.md
                // But also check if it might be a directory? For now, assume file mapping strictly as per requirements.
                // " /docs -> renders docs/index.md"
                // " /docs/<path...> -> renders matching markdown file"

                // We'll try adding .md
                relativePath += '.md';
            }
        }

        // Prevent directory traversal
        if (relativePath.includes('..')) {
            return null;
        }

        const fullPath = path.join(DOCS_DIRECTORY, relativePath);

        // 2. Check existence
        if (!fs.existsSync(fullPath)) {
            return null;
        }

        // 3. Read file
        const fileContents = fs.readFileSync(fullPath, 'utf8');

        // 4. Parse content
        // We use gray-matter to strip frontmatter (if any exists, currently none, but good safety)
        // and passing the rest to remark
        const { content } = matter(fileContents);

        // 5. Extract metadata (Title & Description) from markdown content manually
        // Title: First H1
        const titleMatch = content.match(/^# (.*$)/m);
        const title = titleMatch ? titleMatch[1] : path.basename(relativePath, '.md');

        // Description: First non-empty paragraph after Title
        // Simple heuristic: split by double newline, find first chunk that isn't title or import or script
        const paragraphs = content.split(/\n\n+/);
        let description = '';
        for (const p of paragraphs) {
            const trimmed = p.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('#')) continue; // Header
            if (trimmed.startsWith('<script')) continue; // Script block
            if (trimmed.startsWith('Up:')) continue; // Nav links

            // Found potential description
            description = trimmed.replace(/\r?\n|\r/g, ' ').slice(0, 160);
            if (description.length >= 160) description += '...';
            break;
        }

        // 6. Convert Markdown to HTML
        // Allow raw HTML for JSON-LD scripts
        const processedContent = await unified()
            .use(remarkParse)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw) // Pass raw HTML through
            .use(rehypeSlug) // Add IDs to headings
            .use(rehypeStringify)
            .process(content);

        let contentHtml = processedContent.toString();

        // 7. Normalize Links
        // Transform relative internal links like `[Foo](../risk/bar.md)` to `/docs/risk/bar`
        // Regex strategy: find href with .md and typical relative path chars
        // Be careful not to break external links
        contentHtml = contentHtml.replace(/href="([^"]+)\.md"/g, (match, p1) => {
            // p1 is the path without .md
            // If it's http/https, ignore formatting (though .md usually implies internal file)
            if (p1.startsWith('http')) return match;

            // Resolve relative to current doc?
            // Actually, the requirements say: "normalize them to /docs/risk/foo (best-effort)"
            // Since we are just rendering HTML, simple replacement might be tricky if we don't know the base.
            // But usually relative links in markdown are relative to the file.
            // We can do a best effort replacement of `../` and `./`

            // This is complex to do perfectly in regex on the final HTML.
            // A better way would be a rehype plugin, but let's stick to requirements "Best Effort".
            // simple replace: href="../foo.md" -> href="/docs/foo" is wrong if context is deep.

            // Let's implement a simple rehype plugin/transformer instead?
            // Or simpler: Just replace .md with empty string if it looks like a relative path?
            // If we have `href="../risk/foo.md"`, replacing `.md` gives `href="../risk/foo"`.
            // The browser will resolve `../risk/foo` relative to the current URL `/docs/something`.
            // That actually works perfectly for client-side navigation!
            // `/docs/pillars/observability` + `../risk/foo` -> `/docs/risk/foo`.
            // PERFECT.
            return `href="${p1}"`;
        });

        return {
            title,
            description,
            contentHtml,
            slug: slug ? slug.join('/') : '',
            fullPath
        };

    } catch (error) {
        console.error('Error getting doc:', error);
        return null;
    }
}

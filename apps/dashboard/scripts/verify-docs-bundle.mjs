
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_BUNDLE_PATH = path.join(__dirname, '../src/data/docs.json');

console.log('🔍 verifying blocks bundle integrity...');

if (!fs.existsSync(DOCS_BUNDLE_PATH)) {
    console.error('❌ Error: docs.json not found at:', DOCS_BUNDLE_PATH);
    process.exit(1);
}

// Helper to simulate app rendering pipeline
async function renderDoc(contentRaw) {
    try {
        const { content } = matter(contentRaw);

        // Title extraction (same regex as app)
        const titleMatch = content.match(/^# (.*$)/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled';

        const processed = await unified()
            .use(remarkParse)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(rehypeSlug)
            .use(rehypeStringify)
            .process(content);

        return {
            title,
            html: processed.toString()
        };
    } catch (e) {
        throw new Error(`Render failed: ${e.message}`);
    }
}

async function verify() {
    try {
        const content = fs.readFileSync(DOCS_BUNDLE_PATH, 'utf8');
        const data = JSON.parse(content);

        if (!data.docs || Object.keys(data.docs).length === 0) {
            console.error('❌ Error: docs.json is valid JSON but contains no docs.');
            process.exit(1);
        }

        // Tripwire assertions (Presence + Renderability)
        const tripwires = [
            'index.md',
            'risk/mechanics-payment-reserves-and-balances.md',
            'verticals/payment-risk-observability-for-saas.md'
        ];

        console.log(`Testing renderability for ${tripwires.length} tripwires...`);

        for (const key of tripwires) {
            const docContent = data.docs[key];
            if (!docContent) {
                console.error(`❌ Error: Critical doc missing: ${key}`);
                process.exit(1);
            }

            try {
                const { title, html } = await renderDoc(docContent);

                if (!title || title.trim().length === 0) {
                    console.error(`❌ Error: Doc ${key} has empty title.`);
                    process.exit(1);
                }

                if (!html || html.trim().length === 0) {
                    console.error(`❌ Error: Doc ${key} rendered empty HTML.`);
                    process.exit(1);
                }

                // Check for H1 or H2 tags to ensure structure
                if (!html.includes('<h') && !html.includes('<p')) {
                    console.warn(`⚠️ Warning: Doc ${key} HTML seems too simple (no headers/paragraphs).`);
                }

                console.log(`  ✅ Verified: ${key} (Title: "${title.substring(0, 20)}...", HTML Size: ${html.length})`);

            } catch (renderError) {
                console.error(`❌ Error: Failed to render ${key}:`, renderError.message);
                process.exit(1);
            }
        }

        console.log('✅ Docs bundle verified. All tripwires present and renderable.');
        process.exit(0);

    } catch (e) {
        console.error('❌ Error: Script failed:', e.message);
        process.exit(1);
    }
}

verify();

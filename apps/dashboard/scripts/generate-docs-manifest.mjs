
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/dashboard/scripts -> apps/dashboard -> ../../docs
const DOCS_DIR = path.resolve(__dirname, '../../../docs');
// Output to src/data so it can be imported (bundled) into the serverless function
const OUTPUT_PATH = path.join(__dirname, '../src/data/docs.json');
// We also keep the original manifest path if anything depends on it, but we can deprecate it
const LEGACY_MANIFEST_PATH = path.join(DOCS_DIR, 'manifest.json');

console.log(`Scanning docs directory: ${DOCS_DIR}`);

// Iterate and collect all files
function getAllDocs(dir, collection = {}, relativeDir = '') {
    if (!fs.existsSync(dir)) {
        console.warn(`Docs directory not found: ${dir}`);
        return collection;
    }

    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        // Skip hidden files/dirs and drafts (underscore prefix)
        if (file.startsWith('.') || file.startsWith('_')) return;

        const fullPath = path.join(dir, file);
        const relativePath = path.join(relativeDir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            getAllDocs(fullPath, collection, relativePath);
        } else {
            // Only include markdown files
            if (file.endsWith('.md')) {
                const content = fs.readFileSync(fullPath, 'utf8');
                // Key: risk/foo.md
                // We normalize separators to /
                const key = relativePath.split(path.sep).join('/');
                collection[key] = content;
            }
        }
    });

    return collection;
}

try {
    // Ensure src/data exists
    const dataDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const docsData = getAllDocs(DOCS_DIR);
    const fileCount = Object.keys(docsData).length;

    if (fileCount === 0) {
        throw new Error(`No markdown files found in ${DOCS_DIR}. Check path resolution.`);
    }

    // Sort keys
    const sortedData = {};
    const fileList = [];
    Object.keys(docsData).sort().forEach(key => {
        sortedData[key] = docsData[key];
        fileList.push(key);
    });

    const output = {
        generatedAt: new Date().toISOString(),
        docs: sortedData
    };

    // Write the big bundle
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`✅ Generated docs bundle with ${fileCount} files at: ${OUTPUT_PATH}`);

    // Update the legacy manifest just in case (optional, but good hygiene)
    const legacyManifest = {
        generatedAt: new Date().toISOString(),
        basePath: 'docs',
        files: fileList
    };
    try {
        fs.writeFileSync(LEGACY_MANIFEST_PATH, JSON.stringify(legacyManifest, null, 2));
        console.log(`✅ Updated legacy manifest at: ${LEGACY_MANIFEST_PATH}`);
    } catch (e) {
        // Ignore if we can't write to docs dir (e.g. read only)
        console.warn('Could not update legacy manifest in docs folder (likely redundant now)');
    }

} catch (error) {
    console.error('Failed to generate docs manifest:', error);
    process.exit(1);
}

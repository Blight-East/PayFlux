
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/dashboard/scripts -> apps/dashboard -> ../../docs
const DOCS_DIR = path.resolve(__dirname, '../../../docs');
const MANIFEST_PATH = path.join(DOCS_DIR, 'manifest.json');

console.log(`Scanning docs directory: ${DOCS_DIR}`);

function getDocsFiles(dir, fileList = [], relativeDir = '') {
    if (!fs.existsSync(dir)) {
        console.warn(`Docs directory not found: ${dir}`);
        return fileList;
    }

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
                // Uniform forward slashes for cross-platform consistency
                fileList.push(relativePath.split(path.sep).join('/'));
            }
        }
    });

    return fileList;
}

try {
    const files = getDocsFiles(DOCS_DIR);

    // Sort for deterministic output
    files.sort();

    const manifest = {
        generatedAt: new Date().toISOString(),
        basePath: 'docs',
        files: files
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`✅ Generated docs manifest with ${files.length} markdown files (including index.md) at: ${MANIFEST_PATH}`);

} catch (error) {
    console.error('Failed to generate docs manifest:', error);
    process.exit(1);
}

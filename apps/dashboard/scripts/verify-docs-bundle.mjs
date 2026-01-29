
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_BUNDLE_PATH = path.join(__dirname, '../src/data/docs.json');

console.log('🔍 verifying blocks bundle integrity...');

if (!fs.existsSync(DOCS_BUNDLE_PATH)) {
    console.error('❌ Error: docs.json not found at:', DOCS_BUNDLE_PATH);
    process.exit(1);
}

try {
    const content = fs.readFileSync(DOCS_BUNDLE_PATH, 'utf8');
    const data = JSON.parse(content);

    if (!data.docs || Object.keys(data.docs).length === 0) {
        console.error('❌ Error: docs.json is valid JSON but contains no docs.');
        process.exit(1);
    }

    // Tripwire assertions
    const requiredKeys = [
        'index.md',
        'risk/mechanics-payment-reserves-and-balances.md'
    ];

    const missingKeys = requiredKeys.filter(key => !data.docs[key]);

    if (missingKeys.length > 0) {
        console.error('❌ Error: Critical docs missing from bundle:', missingKeys);
        process.exit(1);
    }

    console.log('✅ Docs bundle verified. Contains index and critical risk anchors.');
    process.exit(0);

} catch (e) {
    console.error('❌ Error: Failed to parse docs.json:', e.message);
    process.exit(1);
}

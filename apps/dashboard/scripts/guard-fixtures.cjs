const fs = require('fs');
const path = require('path');

const SRC_APP_DIR = path.join(__dirname, '../src/app');
const SRC_PAGES_DIR = path.join(__dirname, '../src/pages');
const DIRS_TO_SCAN = [SRC_APP_DIR, SRC_PAGES_DIR];

// Strict patterns: catch static AND dynamic imports of fixtures
const FORBIDDEN_IMPORT_REGEX = /from\s+['"]\.\.?\/.*fixtures\/mockData['"]|from\s+['"]@\/fixtures\/mockData['"]/g;
const FORBIDDEN_DYNAMIC = /(import\(|require\()\s*['"][^'"]*fixtures\/mockData(\.js)?['"]/g;

function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    let hasError = false;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (scanDirectory(fullPath)) {
                hasError = true;
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            // Skip test files
            if (file.includes('.test.') || file.includes('.spec.') || file.includes('.stories.')) continue;

            const content = fs.readFileSync(fullPath, 'utf8');

            // Check both static and dynamic patterns
            if (FORBIDDEN_IMPORT_REGEX.test(content) || FORBIDDEN_DYNAMIC.test(content) || content.includes('src/fixtures/mockData')) {
                console.error(`[Build Guard] Forbidden fixture import found in: ${fullPath}`);
                hasError = true;
            }
        }
    }
    return hasError;
}

console.log('🔒 Scanning for fixture leaks in src/app and src/pages...');
let globalError = false;

for (const dir of DIRS_TO_SCAN) {
    if (fs.existsSync(dir)) {
        if (scanDirectory(dir)) {
            globalError = true;
        }
    }
}

if (globalError) {
    console.error('❌ FAIL: Fixtures imported in production routes!');
    process.exit(1);
}
console.log('✅ PASS: No leaked fixtures.');

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Real tripwire: scan codebase for ILLEGAL imports of fixtures.
// 1. No direct imports of ok_fixture.json or fixtures/* from src/app
// 2. No static imports of dev-fixtures.js from src/app
// Dev fixtures must ONLY be loaded via dynamic import() inside gated code.

console.log("guard-fixtures: Scanning for illegal fixture imports...");

const srcDir = path.join(__dirname, '../src');
// We need to scan src/app (and src/pages if it exists, though this appears to be App Router)
// The user request explicitly mentioned src/pages so we include it to be safe.
const targetDirs = [path.join(srcDir, 'app'), path.join(srcDir, 'pages')];

let hasError = false;

// Helper to run grep
function checkPattern(pattern, description) {
    try {
        // grep -rE returns 0 if match found (FAIL), 1 if no match (PASS)
        // We scan specific directories that might contain app code
        const dirsToScan = targetDirs.filter(d => fs.existsSync(d)).join(' ');

        if (!dirsToScan) return;

        const cmd = `grep -rE "${pattern}" ${dirsToScan}`;
        execSync(cmd, { stdio: 'pipe' });

        // If we get here, grep passed (found matches) -> VIOLATION
        console.error(`guard-fixtures: FAIL - ${description}`);
        console.error(`  Pattern found: ${pattern}`);
        console.error(`  Run 'grep -rE "${pattern}" ${dirsToScan}' to see violations.`);
        hasError = true;
    } catch (error) {
        if (error.status !== 1) {
            console.error(`guard-fixtures: ERROR executing grep for ${description}`, error);
            hasError = true;
        }
        // status 1 means no matches -> PASS
    }
}

// 1. Block direct JSON fixture imports (ok_fixture.json, violation_fixture.json, etc)
//    Matches: import ... from '...ok_fixture.json' or require('...ok_fixture.json')
checkPattern("import .*_fixture\\.json|require\\(.*_fixture\\.json", "Direct import of raw fixture JSON");

// 2. Block general fixtures path imports (generic safety net)
//    Matches: from '.../fixtures/...' (excluding mockData if we wanted to be specific, but user said 'any fixtures/* pattern')
//    Refined: We want to allow imports *inside* lib/dev-fixtures.js (which is in src/lib), but NOT in src/app.
checkPattern("from .*fixtures/|require\\(.*fixtures/", "Direct import from fixtures directory");

// 3. Block STATIC import of dev-fixtures.js
//    Matches: import ... from '...dev-fixtures' (static)
//    Matches: require('...dev-fixtures') (CJS static-ish)
//    EXPLICITLY DOES NOT MATCH: import('...dev-fixtures') (Dynamic)
checkPattern("import .* from .*dev-fixtures|require\\(.*dev-fixtures", "Static import of dev-fixtures proxy");

if (hasError) {
    console.error("guard-fixtures: TRIPWIRED. Illegal imports detected in application code.");
    process.exit(1);
} else {
    console.log("guard-fixtures: PASS (No illegal fixture imports found)");
    process.exit(0);
}

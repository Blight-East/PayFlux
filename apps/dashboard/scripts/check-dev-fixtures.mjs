import { fileURLToPath } from 'url';
import path from 'path';

// Resolve absolute path to dev-fixtures.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devFixturesPath = path.resolve(__dirname, '../src/lib/dev-fixtures.js');

try {
    // We use dynamic import here, which is allowed.
    const { EVENTS, EVIDENCE_HEALTH } = await import(devFixturesPath);

    if (Array.isArray(EVENTS) && typeof EVIDENCE_HEALTH === 'object' && EVIDENCE_HEALTH !== null) {
        console.log("check-dev-fixtures: PASS");
        process.exit(0);
    } else {
        console.error("check-dev-fixtures: FAIL - Invalid export types");
        console.error("EVENTS:", typeof EVENTS);
        console.error("EVIDENCE_HEALTH:", typeof EVIDENCE_HEALTH);
        process.exit(1);
    }
} catch (error) {
    console.error("check-dev-fixtures: FAIL - Import failed");
    console.error(error);
    process.exit(1);
}

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve absolute path to dev-fixtures.js relative to this script
// Assumes structure: apps/dashboard/scripts/check-dev-fixtures.mjs -> apps/dashboard/src/lib/dev-fixtures.js
const devFixturesPath = path.join(__dirname, '../src/lib/dev-fixtures.js');
const devFixturesUrl = pathToFileURL(devFixturesPath).href;

console.log(`🔒 Verifying dev-fixtures exports from: ${devFixturesPath}`);

try {
    const mod = await import(devFixturesUrl);

    if (!mod.EVENTS || !Array.isArray(mod.EVENTS)) {
        console.error(`❌ EVENTS export missing or invalid (Type: ${typeof mod.EVENTS})`);
        console.error(`   Loaded module: ${devFixturesPath}`);
        process.exit(1);
    }

    if (!mod.EVIDENCE_HEALTH || typeof mod.EVIDENCE_HEALTH !== 'object') {
        console.error(`❌ EVIDENCE_HEALTH export missing or invalid (Type: ${typeof mod.EVIDENCE_HEALTH})`);
        console.error(`   Loaded module: ${devFixturesPath}`);
        process.exit(1);
    }

    console.log(`✅ PASS: dev-fixtures exports validated (Events: ${mod.EVENTS.length}).`);
    process.exit(0);
} catch (error) {
    console.error(`❌ Failed to import dev-fixtures from ${devFixturesPath}`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
}

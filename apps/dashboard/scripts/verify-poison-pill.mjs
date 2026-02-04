import { fileURLToPath } from 'url';
import path from 'path';

// Force NODE_ENV to production for this test
process.env.NODE_ENV = 'production';

console.log("verify-poison-pill: Testing production import prohibition...");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const devFixturesPath = path.resolve(__dirname, '../src/lib/dev-fixtures.js');

try {
    await import(devFixturesPath);
    console.error("verify-poison-pill: FAIL - Import succeeded in production environment!");
    process.exit(1);
} catch (error) {
    if (error.code === 'FIXTURE_PATH_VIOLATION') {
        console.log("verify-poison-pill: PASS (Caught expected FIXTURE_PATH_VIOLATION)");
        process.exit(0);
    } else {
        console.error("verify-poison-pill: FAIL - Caught unexpected error:", error.message);
        process.exit(1);
    }
}

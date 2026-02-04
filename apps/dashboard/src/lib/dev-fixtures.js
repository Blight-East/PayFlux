import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// POISON PILL: Fail loudly if this module is loaded in non-development environment
if (
    process.env.NODE_ENV !== 'development' ||
    process.env.PAYFLUX_ENV !== 'dev'
) {
    const err = new Error('FIXTURE_PATH_VIOLATION');
    err.code = 'FIXTURE_PATH_VIOLATION';
    throw err;
}

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.resolve(__dirname, '../../../../ok_fixture.json');
const data = require(fixturePath);


// Map 'artifacts' to EVENTS as they represent stream events
export const EVENTS = data.payload.artifacts || [];

// Map 'system' to EVIDENCE_HEALTH
export const EVIDENCE_HEALTH = data.payload.system || {};

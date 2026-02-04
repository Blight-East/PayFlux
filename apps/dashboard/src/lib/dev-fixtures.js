import { createRequire } from 'module';

// POISON PILL: Fail loudly if this module is loaded in non-development environment
if (process.env.NODE_ENV !== 'development') {
    throw new Error('FIXTURE_PATH_VIOLATION');
}

const require = createRequire(import.meta.url);
const data = require('../../../../ok_fixture.json');

// Map 'artifacts' to EVENTS as they represent stream events
export const EVENTS = data.payload.artifacts || [];

// Map 'system' to EVIDENCE_HEALTH
export const EVIDENCE_HEALTH = data.payload.system || {};

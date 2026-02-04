import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const data = require('../../../../ok_fixture.json');

// Map 'artifacts' to EVENTS as they represent stream events
export const EVENTS = data.payload.artifacts || [];

// Map 'system' to EVIDENCE_HEALTH
export const EVIDENCE_HEALTH = data.payload.system || {};

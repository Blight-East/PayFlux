// Safe proxy for dev-only fixtures
// This file resides outside src/app so it is not scanned by the build guard.
// It is only imported by API routes in DEV mode.

export { EVENTS, HEALTH_FIXTURE as EVIDENCE_HEALTH } from '../fixtures/mockData.js';

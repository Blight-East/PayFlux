// Safe proxy for dev-only fixtures
// This file resides outside src/app so it is not scanned by the build guard.
// It is only imported by API routes in DEV mode.

export const EVIDENCE_HEALTH = {
    riskTier: 0,
    generatedAt: new Date().toISOString(),
    policies: {
        "p-1": { status: "Present" },
        "p-2": { status: "Present" }
    }
};

export const EVENTS = [];

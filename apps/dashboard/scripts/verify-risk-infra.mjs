import { strict as assert } from 'assert';

console.log("Running Verification Harness...");

const LIMIT_CONFIG = {
    capacity: 3,
    refillRate: 10 / 600, // ~0.01666
    window: 600
};

// State Sim
let tokens = 3;
let lastRefill = Date.now();

function consume(requests, waitSeconds = 0) {
    // Advance time
    lastRefill -= (waitSeconds * 1000);

    for (let i = 0; i < requests; i++) {
        const now = Date.now();
        const elapsed = (now - lastRefill) / 1000;
        const refill = elapsed * LIMIT_CONFIG.refillRate;

        tokens = Math.min(LIMIT_CONFIG.capacity, tokens + refill);

        // Before consume
        const allowed = tokens >= 1;

        if (allowed) {
            tokens -= 1;
        }

        // Reset calc
        let reset = 0;
        if (tokens < 1) {
            reset = Math.ceil((1 - tokens) / LIMIT_CONFIG.refillRate);
        }

        lastRefill = now;

        console.log(`Req #${i + 1}: Allowed=${allowed}, Tokens=${tokens.toFixed(3)}, Reset=${reset}s`);

        if (i < 3) assert(allowed, `Req #${i + 1} should be allowed`);
        if (i === 3 && waitSeconds === 0) assert(!allowed, `Req #${i + 1} should be blocked`);
    }
}

console.log("Test 1: Burst Sequence (3 allowed, 4th blocked)");
consume(4);

console.log("\nTest 2: Wait 60s (Refill 1 token)");
// Wait
lastRefill -= 60000;
// 1 min elapsed. Refill = 60 * 0.0166 = 1.0.
// Tokens = 0 + 1 = 1.
// Req 5 should be allowed.
consume(1);

console.log("\nTests passed. Logic holds.");

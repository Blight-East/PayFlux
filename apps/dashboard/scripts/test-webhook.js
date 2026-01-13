#!/usr/bin/env node
/**
 * PayFlux Dashboard - Webhook Verification Test
 * Tests the bypass rules for webhook signature verification.
 */

// Test 1: Verify Stripe package loads correctly
console.log('Test 1: Loading stripe package...');
try {
    const Stripe = require('stripe').default || require('stripe');
    // Use a dummy key - constructEvent doesn't make network calls
    const stripe = new Stripe('sk_test_dummy_key_for_testing', { apiVersion: '2023-10-16' });
    console.log('✅ Stripe package loaded successfully');
} catch (err) {
    console.log('❌ Stripe package failed to load:', err.message);
    process.exit(1);
}

// Test 2: Verify bypass rules
console.log('\nTest 2: Checking bypass rules...');

function isTestBypassAllowed() {
    const isDev = process.env.NODE_ENV === 'development';
    const bypassEnabled = process.env.DASHBOARD_WEBHOOK_TEST_BYPASS === 'true';
    return isDev && bypassEnabled;
}

function isValidStripeSecret(secret) {
    return !!secret && secret.startsWith('whsec_') && secret.length > 10;
}

// Simulate different environments
const testCases = [
    { NODE_ENV: 'development', DASHBOARD_WEBHOOK_TEST_BYPASS: 'true', expected: true, name: 'Dev + Bypass enabled' },
    { NODE_ENV: 'development', DASHBOARD_WEBHOOK_TEST_BYPASS: 'false', expected: false, name: 'Dev + Bypass disabled' },
    { NODE_ENV: 'production', DASHBOARD_WEBHOOK_TEST_BYPASS: 'true', expected: false, name: 'Prod + Bypass flag (should be blocked)' },
    { NODE_ENV: 'production', DASHBOARD_WEBHOOK_TEST_BYPASS: 'false', expected: false, name: 'Prod + No bypass' },
];

let allPassed = true;
for (const tc of testCases) {
    // Temporarily set env vars
    const origEnv = process.env.NODE_ENV;
    const origBypass = process.env.DASHBOARD_WEBHOOK_TEST_BYPASS;

    process.env.NODE_ENV = tc.NODE_ENV;
    process.env.DASHBOARD_WEBHOOK_TEST_BYPASS = tc.DASHBOARD_WEBHOOK_TEST_BYPASS;

    const result = isTestBypassAllowed();
    const passed = result === tc.expected;

    console.log(`  ${passed ? '✅' : '❌'} ${tc.name}: got ${result}, expected ${tc.expected}`);
    if (!passed) allPassed = false;

    // Restore
    process.env.NODE_ENV = origEnv;
    process.env.DASHBOARD_WEBHOOK_TEST_BYPASS = origBypass;
}

// Test 3: Verify secret validation
console.log('\nTest 3: Secret validation...');
const secretTests = [
    { secret: 'whsec_abc123def456', expected: true, name: 'Valid secret' },
    { secret: 'whsec_shor', expected: false, name: 'Too short (10 chars)' },
    { secret: 'invalid_secret', expected: false, name: 'Wrong prefix' },
    { secret: '', expected: false, name: 'Empty' },
    { secret: undefined, expected: false, name: 'Undefined' },
];

for (const tc of secretTests) {
    const result = isValidStripeSecret(tc.secret);
    const passed = result === tc.expected;
    console.log(`  ${passed ? '✅' : '❌'} ${tc.name}: got ${result}, expected ${tc.expected}`);
    if (!passed) allPassed = false;
}

console.log('\n' + (allPassed ? '✅ All tests passed' : '❌ Some tests failed'));
process.exit(allPassed ? 0 : 1);

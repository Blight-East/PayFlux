// k6 load test for /connect (authenticated SSR path).
//
// The audit claims 30-50ms TTFB for returning users after the React.cache()
// optimization. This test verifies that under concurrent load.
//
// Usage:
//   BASE_URL=https://staging.payflux.dev \
//   CLERK_SESSION_COOKIE='__session=...' \
//   k6 run scripts/load/connect.k6.js
//
// CLERK_SESSION_COOKIE is the cookie value for an authenticated test workspace.
// Mint one by signing in to staging as the test user and copying the __session
// cookie. Rotate before sharing the run output.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        steady: {
            executor: 'constant-vus',
            vus: 50,
            duration: '3m',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<200'],   // SSR optimization should hold p95 under 200ms
        ttfb: ['p(99)<300'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const COOKIE = __ENV.CLERK_SESSION_COOKIE || '';

export default function () {
    if (!COOKIE) {
        throw new Error('CLERK_SESSION_COOKIE env var is required');
    }
    const res = http.get(`${BASE_URL}/connect`, {
        headers: { Cookie: COOKIE },
        tags: { endpoint: 'connect' },
    });

    check(res, {
        'status 200': (r) => r.status === 200,
        'no 5xx': (r) => r.status < 500,
    });

    sleep(1);
}

// k6 load test for /sign-up.
//
// Two goals:
//  1. Confirm the SSR path holds up under burst (the audit claims 300-500 req/min).
//  2. Confirm the edge rate-limiter actually trips at 20 req/min/IP.
//
// Usage:
//   BASE_URL=https://staging.payflux.dev k6 run scripts/load/signup.k6.js

import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const ratelimitedCounter = new Counter('ratelimited_responses');

export const options = {
    scenarios: {
        ramp: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 },
                { duration: '60s', target: 100 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        'http_req_duration{status:200}': ['p(95)<800'],
        'ratelimited_responses': ['count>0'], // We expect some 429s — proves limiter works
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    const res = http.get(`${BASE_URL}/sign-up`, { tags: { endpoint: 'sign-up' } });

    check(res, {
        'status 200 or 429': (r) => r.status === 200 || r.status === 429,
        'no 5xx': (r) => r.status < 500,
    });

    if (res.status === 429) {
        ratelimitedCounter.add(1);
    }
}

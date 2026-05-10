// k6 load test for the forecast endpoint.
//
// Usage:
//   BASE_URL=https://staging.payflux.dev \
//   FORECAST_API_KEY=... \
//   WORKSPACE_ID=... \
//   k6 run scripts/load/forecast.k6.js
//
// The endpoint is auth-gated (Clerk session in browser, API key in headers
// when called server-to-server). Set FORECAST_API_KEY to a key issued for
// the test workspace; never use a production-issued key.

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    scenarios: {
        steady: {
            executor: 'constant-vus',
            vus: 50,
            duration: '5m',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.01'],         // <1% errors
        http_req_duration: ['p(95)<500'],       // p95 under 500ms
        'http_req_duration{status:200}': ['p(99)<1000'], // p99 under 1s for healthy responses
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.FORECAST_API_KEY || '';
const WORKSPACE_ID = __ENV.WORKSPACE_ID || '';

export default function () {
    const url = `${BASE_URL}/api/v1/risk/forecast?workspaceId=${WORKSPACE_ID}`;
    const res = http.get(url, {
        headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
        tags: { endpoint: 'forecast' },
    });

    check(res, {
        'status 200': (r) => r.status === 200,
        'has forecast payload': (r) => r.status !== 200 || (r.body && r.body.length > 0),
    });

    // Realistic dashboard polling cadence — 60s per VU.
    sleep(60);
}

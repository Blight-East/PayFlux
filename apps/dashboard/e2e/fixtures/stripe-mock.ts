import http from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * Minimal mock of the Stripe HTTP API sufficient for the Stripe Connect
 * token-exchange call in `api/stripe/callback`. Stripe's Node SDK pings a
 * single URL (`POST /v1/oauth/token`), so we only implement that one.
 *
 * Pointed at by the Next.js server via `STRIPE_API_HOST` / `STRIPE_API_PORT`
 * / `STRIPE_API_PROTOCOL=http` — see `playwright.config.ts`.
 */

export interface StripeTokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    stripe_publishable_key: string;
    stripe_user_id: string;
    scope: string;
    livemode: boolean;
    expires_in?: number;
}

export interface StripeMockRecord {
    method: string;
    url: string;
    body: string;
}

export interface StripeMockServer {
    url: string;
    port: number;
    host: string;
    requests: StripeMockRecord[];
    close(): Promise<void>;
    setTokenResponse(response: StripeTokenResponse): void;
}

const DEFAULT_RESPONSE: StripeTokenResponse = {
    access_token: 'sk_test_mock_access_token_abc123',
    refresh_token: 'rt_test_mock_refresh_token_xyz789',
    token_type: 'bearer',
    stripe_publishable_key: 'pk_test_mock_publishable',
    stripe_user_id: 'acct_mock_E2E12345',
    scope: 'read_write',
    livemode: false,
    expires_in: 3600,
};

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

export async function startStripeMockServer(
    port: number,
    host = '127.0.0.1'
): Promise<StripeMockServer> {
    let currentResponse: StripeTokenResponse = { ...DEFAULT_RESPONSE };
    const requests: StripeMockRecord[] = [];

    const server = http.createServer(async (req, res) => {
        const body = await readBody(req);
        requests.push({
            method: req.method ?? 'UNKNOWN',
            url: req.url ?? '',
            body,
        });

        if (req.method === 'POST' && req.url === '/v1/oauth/token') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(currentResponse));
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                error: {
                    type: 'stripe_mock_unhandled',
                    message: `Unhandled ${req.method} ${req.url}`,
                },
            })
        );
    });

    await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
            server.removeListener('error', reject);
            resolve();
        });
    });

    const addr = server.address() as AddressInfo;

    return {
        host,
        port: addr.port,
        url: `http://${host}:${addr.port}`,
        requests,
        setTokenResponse(response: StripeTokenResponse) {
            currentResponse = { ...response };
        },
        async close() {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            });
        },
    };
}

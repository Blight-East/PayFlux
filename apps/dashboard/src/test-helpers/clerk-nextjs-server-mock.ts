/**
 * E2E-only mock for `@clerk/nextjs/server`.
 *
 * Enabled via a webpack alias in `next.config.mjs` when
 * `PAYFLUX_E2E_MODE === '1'`. Has zero effect on production builds.
 *
 * The mock reads a deterministic identity from the `__payflux_e2e_clerk`
 * cookie (base64url-encoded JSON `{ userId, orgId, orgName? }`) that the
 * Playwright test sets before navigation. All external network calls
 * (Clerk API, organization fetch, metadata mirror) are stubbed locally.
 */

import { NextResponse, type NextRequest } from 'next/server';

export const E2E_CLERK_COOKIE = '__payflux_e2e_clerk';

interface E2EClerkIdentity {
    userId: string;
    orgId: string;
    orgName?: string;
}

function decodeIdentity(raw: string | undefined | null): E2EClerkIdentity | null {
    if (!raw) return null;
    try {
        const json = Buffer.from(raw, 'base64url').toString('utf8');
        const parsed = JSON.parse(json);
        if (
            parsed &&
            typeof parsed.userId === 'string' &&
            typeof parsed.orgId === 'string'
        ) {
            return {
                userId: parsed.userId,
                orgId: parsed.orgId,
                orgName: typeof parsed.orgName === 'string' ? parsed.orgName : undefined,
            };
        }
    } catch {
        // fallthrough
    }
    return null;
}

async function readIdentityFromHeaders(): Promise<E2EClerkIdentity | null> {
    try {
        const { cookies } = await import('next/headers');
        const store = await cookies();
        return decodeIdentity(store.get(E2E_CLERK_COOKIE)?.value);
    } catch {
        return null;
    }
}

function readIdentityFromRequest(
    request: NextRequest | Request
): E2EClerkIdentity | null {
    const anyReq = request as { cookies?: { get?: (name: string) => { value: string } | undefined } };
    if (typeof anyReq?.cookies?.get === 'function') {
        const val = anyReq.cookies.get(E2E_CLERK_COOKIE)?.value;
        if (val) return decodeIdentity(val);
    }
    const cookieHeader = (request as Request).headers?.get?.('cookie');
    if (!cookieHeader) return null;
    const part = cookieHeader
        .split(/;\s*/)
        .find((p) => p.startsWith(`${E2E_CLERK_COOKIE}=`));
    if (!part) return null;
    return decodeIdentity(decodeURIComponent(part.slice(E2E_CLERK_COOKIE.length + 1)));
}

// ─── Public API shape matching @clerk/nextjs/server ────────────────────────

export async function auth(): Promise<{
    userId: string | null;
    orgId: string | null;
    orgRole: string | null;
    sessionId: string | null;
}> {
    const identity = await readIdentityFromHeaders();
    if (!identity) {
        return { userId: null, orgId: null, orgRole: null, sessionId: null };
    }
    return {
        userId: identity.userId,
        orgId: identity.orgId,
        orgRole: 'org:admin',
        sessionId: 'sess_e2e_mock',
    };
}

export function createRouteMatcher(patterns: string[]) {
    const regexps = patterns.map((p) => {
        // Convert Clerk-style patterns like "/dashboard(.*)" to a real RegExp.
        const escaped = p
            .replace(/[.+?^${}|[\]\\]/g, '\\$&')
            .replace(/\\\(\\\.\\\*\\\)/g, '.*');
        return new RegExp(`^${escaped}$`);
    });
    return (req: NextRequest | Request) => {
        const url = new URL((req as NextRequest).url);
        return regexps.some((r) => r.test(url.pathname));
    };
}

type ClerkMiddlewareHandler = (
    auth: () => Promise<{
        userId: string | null;
        orgId: string | null;
        orgRole: string | null;
        sessionId: string | null;
    }>,
    request: NextRequest
) => unknown | Promise<unknown>;

export function clerkMiddleware(
    handler?: ClerkMiddlewareHandler
): (request: NextRequest) => Promise<Response | undefined> {
    return async (request: NextRequest): Promise<Response | undefined> => {
        if (!handler) return NextResponse.next();
        const identity = readIdentityFromRequest(request);
        const authFn = async () => ({
            userId: identity?.userId ?? null,
            orgId: identity?.orgId ?? null,
            orgRole: identity ? 'org:admin' : null,
            sessionId: identity ? 'sess_e2e_mock' : null,
        });
        const result = await handler(authFn, request);
        if (result instanceof Response) return result;
        return NextResponse.next();
    };
}

// ─── clerkClient stub ──────────────────────────────────────────────────────

interface MockUser {
    id: string;
    emailAddresses: Array<{ id: string; emailAddress: string }>;
    primaryEmailAddressId: string;
}

interface MockMembership {
    role: string;
    createdAt: string;
    organization: { id: string; name: string };
}

interface MockOrganization {
    id: string;
    name: string;
    publicMetadata: Record<string, unknown>;
}

export async function clerkClient() {
    return {
        users: {
            getUser: async (userId: string): Promise<MockUser> => ({
                id: userId,
                emailAddresses: [{ id: 'email_mock_1', emailAddress: 'e2e@payflux.test' }],
                primaryEmailAddressId: 'email_mock_1',
            }),
            getOrganizationMembershipList: async ({
                userId: _userId,
            }: {
                userId: string;
            }): Promise<{ data: MockMembership[] }> => {
                const identity = await readIdentityFromHeaders();
                if (!identity) return { data: [] };
                return {
                    data: [
                        {
                            role: 'org:admin',
                            createdAt: new Date(0).toISOString(),
                            organization: {
                                id: identity.orgId,
                                name: identity.orgName ?? 'E2E Test Workspace',
                            },
                        },
                    ],
                };
            },
        },
        organizations: {
            getOrganization: async ({
                organizationId,
            }: {
                organizationId: string;
            }): Promise<MockOrganization> => {
                const identity = await readIdentityFromHeaders();
                return {
                    id: organizationId,
                    name: identity?.orgName ?? 'E2E Test Workspace',
                    publicMetadata: {},
                };
            },
            createOrganization: async ({
                name,
            }: {
                name: string;
                createdBy: string;
            }): Promise<MockOrganization> => ({
                id: `org_mock_${Date.now()}`,
                name,
                publicMetadata: {},
            }),
            updateOrganizationMetadata: async (): Promise<void> => undefined,
        },
    };
}

export const E2E_CLERK_COOKIE = '__payflux_e2e_clerk';

export interface ClerkTestIdentity {
    userId: string;
    orgId: string;
    orgName?: string;
}

/**
 * Mirror of the encoding used by `src/test-helpers/clerk-nextjs-server-mock.ts`.
 * Base64url-encoded JSON so server-side `cookies()` can decode it identically.
 */
export function encodeClerkIdentity(identity: ClerkTestIdentity): string {
    return Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url');
}

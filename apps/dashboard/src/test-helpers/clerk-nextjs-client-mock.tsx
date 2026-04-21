/**
 * E2E-only mock for `@clerk/nextjs` (client exports).
 *
 * Enabled via a webpack alias in `next.config.mjs` when
 * `PAYFLUX_E2E_MODE === '1'`. Replaces ClerkProvider / UserButton /
 * SignIn / SignUp / SignOutButton / useAuth with harmless stubs so the
 * app renders without a real Clerk publishable key.
 *
 * Has zero effect on production builds.
 */

'use client';

import React from 'react';

export function ClerkProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

export function UserButton(_props: Record<string, unknown>) {
    return <div data-testid="e2e-user-button" />;
}

export function SignOutButton({
    children,
}: {
    children?: React.ReactNode;
}) {
    return <>{children ?? <button type="button">Sign out</button>}</>;
}

export function SignIn(_props: Record<string, unknown>) {
    return <div data-testid="e2e-sign-in" />;
}

export function SignUp(_props: Record<string, unknown>) {
    return <div data-testid="e2e-sign-up" />;
}

export function useAuth() {
    return {
        isLoaded: true,
        isSignedIn: true,
        userId: 'user_test_e2e_001',
        orgId: 'org_test123',
        sessionId: 'sess_e2e_mock',
        getToken: async () => 'e2e-mock-token',
        signOut: async () => undefined,
    };
}

export function useUser() {
    return {
        isLoaded: true,
        isSignedIn: true,
        user: {
            id: 'user_test_e2e_001',
            primaryEmailAddress: { emailAddress: 'e2e@payflux.test' },
        },
    };
}

export function useOrganization() {
    return {
        isLoaded: true,
        organization: {
            id: 'org_test123',
            name: 'E2E Test Workspace',
        },
    };
}

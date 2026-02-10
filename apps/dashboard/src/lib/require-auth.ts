import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { resolveWorkspace, type WorkspaceContext } from './resolve-workspace';

/**
 * Enforced authentication and workspace resolution for API routes.
 * 
 * Rules:
 * 1. Must have a valid Clerk userId (401 Unauthorized)
 * 2. Must belong to an active workspace (403 Forbidden)
 */
export async function requireAuth(): Promise<
    | { ok: true; userId: string; workspace: WorkspaceContext }
    | { ok: false; response: NextResponse }
> {
    const { userId } = await auth();

    if (!userId) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
                { status: 401 }
            ),
        };
    }

    const workspace = await resolveWorkspace(userId);

    if (!workspace) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Forbidden', code: 'WORKSPACE_REQUIRED' },
                { status: 403 }
            ),
        };
    }

    return { ok: true, userId, workspace };
}

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { createWorkspaceApiKey, listWorkspaceApiKeys } from '@/lib/db/api-keys';
import { generateWorkspaceApiKey, hashWorkspaceApiKey, workspaceApiKeyPrefix } from '@/lib/workspace-api-keys';

export const runtime = 'nodejs';

export async function GET() {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    if (authResult.workspace.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    const { workspace } = authResult;
    const keys = await listWorkspaceApiKeys(workspace.workspaceRecordId);

    return NextResponse.json({
        keys: keys.map((key) => ({
            id: key.id,
            label: key.label,
            keyPrefix: key.key_prefix,
            lastUsedAt: key.last_used_at,
            revokedAt: key.revoked_at,
            createdAt: key.created_at,
        })),
    });
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;
    if (authResult.workspace.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    const { userId, workspace } = authResult;
    const body = await request.json().catch(() => ({}));
    const rawLabel = typeof body.label === 'string' ? body.label.trim() : '';
    const label = rawLabel || 'Primary key';

    const apiKey = generateWorkspaceApiKey();
    const created = await createWorkspaceApiKey({
        workspaceId: workspace.workspaceRecordId,
        label: label.slice(0, 80),
        keyPrefix: workspaceApiKeyPrefix(apiKey),
        keyHash: hashWorkspaceApiKey(apiKey),
        createdByClerkUserId: userId,
    });

    return NextResponse.json({
        key: {
            id: created.id,
            label: created.label,
            keyPrefix: created.key_prefix,
            createdAt: created.created_at,
        },
        plaintextKey: apiKey,
    });
}

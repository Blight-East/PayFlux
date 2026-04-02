import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { revokeWorkspaceApiKey } from '@/lib/db/api-keys';

export const runtime = 'nodejs';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    if (authResult.workspace.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    const { id } = await params;
    const key = await revokeWorkspaceApiKey({
        workspaceId: authResult.workspace.workspaceRecordId,
        keyId: id,
    });

    if (!key) {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    return NextResponse.json({
        success: true,
        key: {
            id: key.id,
            revokedAt: key.revoked_at,
        },
    });
}

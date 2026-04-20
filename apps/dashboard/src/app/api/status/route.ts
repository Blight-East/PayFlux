import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requirePaidAuth } from '@/lib/require-auth';
import { requireAdmin } from '@/lib/guards';

const STATUS_PATH = path.join(process.cwd(), 'data', 'status.json');

export async function GET() {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;
    try {
        requireAdmin(authResult.workspace);
    } catch {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    try {
        const data = await fs.readFile(STATUS_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (err) {
        return NextResponse.json({ lastEventAt: null });
    }
}

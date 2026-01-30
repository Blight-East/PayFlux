import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

const STATUS_PATH = path.join(process.cwd(), 'data', 'status.json');

export async function GET() {
    try {
        const data = await fs.readFile(STATUS_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (err) {
        return NextResponse.json({ lastEventAt: null });
    }
}

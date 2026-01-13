import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { token } = await request.json();
    const adminToken = process.env.ADMIN_TOKEN;

    if (token === adminToken) {
        const cookieStore = await cookies();
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 1 week
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}

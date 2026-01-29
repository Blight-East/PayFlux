import { NextResponse } from 'next/server';

export async function GET() {
    return new NextResponse('google-site-verification: googlec9febe29141cc19f.html', {
        status: 200,
        headers: {
            'Content-Type': 'text/html',
        },
    });
}

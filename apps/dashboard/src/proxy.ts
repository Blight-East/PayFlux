import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const proxy = clerkMiddleware((auth, request) => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-payflux-pathname', request.nextUrl.pathname);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
});

export default proxy;

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
};

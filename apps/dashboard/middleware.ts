import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/setup(.*)',
    '/api-keys(.*)',
    '/connectors(.*)',
    '/evidence(.*)',
    '/settings(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
        const { userId } = await auth();
        if (!userId) {
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('redirect_url', request.nextUrl.pathname);
            return NextResponse.redirect(signInUrl);
        }
    }
});

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
};

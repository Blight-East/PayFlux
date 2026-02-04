import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/api/webhooks(.*)',
  '/api/login',
  '/api/health/evidence',
  '/api/v1/risk(.*)',
  '/terms',
  '/privacy',
  '/docs(.*)',
  '/sitemap-docs.xml',
  '/api/debug(.*)',
  '/dashboard-v2',
  '/',
  '/googlec9febe29141cc19f.html',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

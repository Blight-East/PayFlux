import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';


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
  '/api/risk(.*)',
  '/dashboard-v2',
  '/use-cases',
  '/use-cases(.*)',
  '/api/v1/evidence/export(.*)',
  '/',
  '/googlec9febe29141cc19f.html',
]);

const middleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export default middleware;

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
  ],
};

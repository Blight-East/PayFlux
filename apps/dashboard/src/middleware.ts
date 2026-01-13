import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const adminToken = process.env.ADMIN_TOKEN;

  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // GUARDRAIL: Only these routes bypass authentication:
  // 1. /api/webhooks/* - External webhook handlers (Stripe, etc.) that use their own signature verification
  // 2. /api/login - Must remain unauthenticated so the user can establish a session.
  //    This route does not proxy PayFlux or expose data.
  // ALL OTHER /api/* ROUTES REQUIRE AUTH.
  if (isApiRoute && request.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next();
  }
  if (isApiRoute && request.nextUrl.pathname === '/api/login') {
    return NextResponse.next();
  }

  if (!token && !isLoginPage) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && token !== adminToken && !isLoginPage) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  if (token === adminToken && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

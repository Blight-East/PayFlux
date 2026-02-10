import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const middleware = clerkMiddleware(() => {
  return NextResponse.next();
});

export default middleware;

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};

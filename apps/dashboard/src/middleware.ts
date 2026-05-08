import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight, edge-compatible in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();
const MAX_STORE_SIZE = 10000;

function pruneRateLimitStore() {
    const now = Date.now();
    for (const [key, state] of rateLimitStore.entries()) {
        if (now > state.expiresAt) {
            rateLimitStore.delete(key);
        }
    }
}

function checkRateLimit(ip: string, routeKey: string, limit: number, windowMs: number): boolean {
    if (rateLimitStore.size > MAX_STORE_SIZE) {
        pruneRateLimitStore();
        // If still too large, aggressively clear the oldest half (maps iterate in insertion order)
        if (rateLimitStore.size > MAX_STORE_SIZE) {
            let i = 0;
            const toDelete = Math.floor(rateLimitStore.size / 2);
            for (const key of rateLimitStore.keys()) {
                if (i++ >= toDelete) break;
                rateLimitStore.delete(key);
            }
        }
    }

    const key = `${routeKey}:${ip}`;
    const now = Date.now();
    const state = rateLimitStore.get(key);

    if (!state || now > state.expiresAt) {
        rateLimitStore.set(key, { count: 1, expiresAt: now + windowMs });
        return true;
    }

    if (state.count >= limit) {
        return false;
    }

    state.count++;
    return true;
}

const authMiddleware = clerkMiddleware();

export default function middleware(req: NextRequest, event: any) {
    const forwarded = req.headers.get('x-forwarded-for') || '';
    const ip = forwarded.split(',')[0]?.trim() || 'unknown';
    const path = req.nextUrl.pathname;
    const windowMs = 60 * 1000; // 1 minute

    let allowed = true;

    if (path.startsWith('/sign-up')) {
        allowed = checkRateLimit(ip, 'signup', 20, windowMs);
    } else if (path.startsWith('/connect')) {
        allowed = checkRateLimit(ip, 'connect', 30, windowMs);
    } else if (path.startsWith('/api/onboarding')) {
        allowed = checkRateLimit(ip, 'api_onboarding', 60, windowMs);
    }

    if (!allowed) {
        return new NextResponse('Too Many Requests', { status: 429 });
    }

    return authMiddleware(req, event);
}

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)'],
};

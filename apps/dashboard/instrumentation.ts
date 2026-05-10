// Next.js calls register() once per runtime (nodejs, edge, browser). We route
// to the matching Sentry config so each runtime initializes its own SDK.
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

// Next.js calls onRequestError for unhandled errors in route handlers and
// server components. Sentry's helper forwards them to the SDK.
export { captureRequestError as onRequestError } from '@sentry/nextjs';

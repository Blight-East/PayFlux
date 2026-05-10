import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_PAYFLUX_ENV || process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_COMMIT_SHA,
        tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
        sampleRate: 1.0,
        // Browser bundle: avoid sending dev errors to the shared project.
        enabled: process.env.NODE_ENV === 'production',
    });
}

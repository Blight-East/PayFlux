import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.PAYFLUX_ENV || process.env.NODE_ENV,
        release: process.env.PAYFLUX_GIT_SHA || process.env.COMMIT_REF,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
        sampleRate: 1.0,
        enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLED === 'true',
    });
}

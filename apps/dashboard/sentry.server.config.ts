import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.PAYFLUX_ENV || process.env.NODE_ENV,
        release: process.env.PAYFLUX_GIT_SHA || process.env.COMMIT_REF,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
        // Errors always fully sampled — they're the signal we cannot afford
        // to miss; trace breadcrumbs are sampled separately above.
        sampleRate: 1.0,
        // Local + non-prod runs default to off-network: avoids spamming the
        // shared Sentry project from dev machines and CI.
        enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE_ENABLED === 'true',
    });
}

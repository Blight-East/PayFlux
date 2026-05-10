// Long-running entry for the Stripe sync worker. Designed to run on Fly.io
// in its own process group, separate from the Next.js dashboard. The
// underlying runStripeSync acquires a 15-minute lease lock in job_locks,
// so multiple instances are safe — one wins, others exit and retry next tick.

import '../../sentry.server.config';
import * as Sentry from '@sentry/nextjs';
import { runStripeSync } from './sync';

const TICK_INTERVAL_MS = Number(process.env.WORKER_TICK_INTERVAL_MS ?? 60_000);

function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let stopping = false;

async function tick() {
    try {
        await runStripeSync();
    } catch (err) {
        Sentry.captureException(err);
        console.error('[WORKER] tick failed:', err);
    }
}

async function main() {
    console.log(`[WORKER] starting; tick=${TICK_INTERVAL_MS}ms`);

    // Graceful shutdown: finish in-flight tick, then exit. Fly sends SIGINT on
    // deploy and SIGTERM on stop; both go through the same path.
    const handleSignal = (sig: NodeJS.Signals) => {
        console.log(`[WORKER] received ${sig}; will exit after current tick`);
        stopping = true;
    };
    process.on('SIGINT', handleSignal);
    process.on('SIGTERM', handleSignal);

    while (!stopping) {
        await tick();
        if (stopping) break;
        await sleep(TICK_INTERVAL_MS);
    }

    await Sentry.flush(2000).catch(() => {});
    console.log('[WORKER] exiting cleanly');
    process.exit(0);
}

main().catch((err) => {
    console.error('[WORKER] fatal:', err);
    Sentry.captureException(err);
    Sentry.flush(2000).finally(() => process.exit(1));
});

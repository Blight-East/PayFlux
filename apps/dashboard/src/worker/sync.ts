import { dbQuery } from '@/lib/db/client';
import Stripe from 'stripe';
import { saveStripeFinancials } from '@/lib/db/stripe-financials';
import { pLimit } from '@/lib/p-limit';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

async function acquireLock(jobName: string, workerId: string, durationMinutes: number = 5): Promise<boolean> {
    const res = await dbQuery(`
        INSERT INTO job_locks (job_name, locked_until, worker_id, updated_at)
        VALUES ($1, NOW() + INTERVAL '${durationMinutes} minutes', $2, NOW())
        ON CONFLICT (job_name) DO UPDATE
        SET locked_until = NOW() + INTERVAL '${durationMinutes} minutes',
            worker_id = $2,
            updated_at = NOW()
        WHERE job_locks.locked_until < NOW()
        RETURNING *
    `, [jobName, workerId]);

    return res.rowCount !== null && res.rowCount > 0;
}

async function releaseLock(jobName: string, workerId: string) {
    await dbQuery(`
        UPDATE job_locks 
        SET locked_until = NOW() - INTERVAL '1 minute'
        WHERE job_name = $1 AND worker_id = $2
    `, [jobName, workerId]);
}

export async function runStripeSync() {
    const workerId = crypto.randomUUID();
    const jobName = 'sync_stripe_financials';

    console.log(`[WORKER] Attempting to acquire lock for ${jobName}`);
    const locked = await acquireLock(jobName, workerId, 15); // 15 min max duration
    if (!locked) {
        console.log(`[WORKER] Job ${jobName} is currently locked by another worker. Exiting.`);
        return;
    }

    try {
        console.log(`[WORKER] Lock acquired. Fetching active connections...`);
        const result = await dbQuery(`
            SELECT id, workspace_id, stripe_account_id, access_token 
            FROM processor_connections 
            WHERE status = 'connected' AND provider = 'stripe' AND access_token IS NOT NULL
        `);
        
        const connections = result.rows;
        console.log(`[WORKER] Found ${connections.length} connected accounts.`);

        // Bounded concurrency: max 5 merchants at a time
        const limit = pLimit(5);
        let successCount = 0;
        let failCount = 0;

        const syncTasks = connections.map(conn => limit(async () => {
            try {
                // Jitter: 150-600ms before starting this merchant's API calls to prevent synchronized bursts
                await sleep(random(150, 600));

                const accessToken = conn.access_token as string;
                // @ts-ignore
                const stripe = new Stripe(accessToken, { apiVersion: '2025-02-24.acacia' });
                
                // 1. Balance
                const balance = await stripe.balance.retrieve();
                const availableBalance = balance.available.reduce((acc, b) => acc + b.amount, 0);
                const pendingBalance = balance.pending.reduce((acc, b) => acc + b.amount, 0);
                
                // 2. Payouts & Volume & Delay
                const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
                
                const payouts = await stripe.payouts.list({
                    limit: 100,
                    created: { gte: thirtyDaysAgo }
                });
                
                let totalVolume30d = 0;
                let totalDelayDays = 0;
                let payoutCount = 0;
                let lastPayoutAt: Date | null = null;
                
                for (const payout of payouts.data) {
                    if (payout.status === 'paid' || payout.status === 'in_transit' || payout.status === 'pending') {
                        totalVolume30d += payout.amount;
                        
                        const delaySeconds = payout.arrival_date - payout.created;
                        const delayDays = delaySeconds / (24 * 60 * 60);
                        if (delayDays >= 0) {
                            totalDelayDays += delayDays;
                            payoutCount++;
                        }
                        
                        if (!lastPayoutAt || new Date(payout.created * 1000) > lastPayoutAt) {
                            lastPayoutAt = new Date(payout.created * 1000);
                        }
                    }
                }
                
                const avgPayoutDelayDays = payoutCount > 0 ? Number((totalDelayDays / payoutCount).toFixed(2)) : null;
                
                // 3. Disputes
                const disputes = await stripe.disputes.list({
                    limit: 100,
                    created: { gte: thirtyDaysAgo }
                });
                
                const disputeCount30d = disputes.data.length;
                
                await saveStripeFinancials({
                    workspaceId: String(conn.workspace_id),
                    stripeAccountId: String(conn.stripe_account_id),
                    availableBalance,
                    pendingBalance,
                    totalVolume30d,
                    disputeCount30d,
                    avgPayoutDelayDays,
                    lastPayoutAt,
                    rawPayouts: payouts.data as any
                });
                
                successCount++;
                console.log(`[WORKER] Successfully synced ${conn.stripe_account_id}`);
            } catch (err) {
                failCount++;
                console.error(`[WORKER] Failed to sync ${conn.stripe_account_id}:`, err);
                // We DO NOT throw here, we want the other merchants to continue syncing
            }
        }));

        await Promise.allSettled(syncTasks);

        console.log(`[WORKER] Sync complete. Success: ${successCount}, Failed: ${failCount}`);

    } finally {
        await releaseLock(jobName, workerId);
        console.log(`[WORKER] Released lock for ${jobName}`);
    }
}

// Allow running directly via ts-node or similar
if (require.main === module) {
    runStripeSync().catch(err => {
        console.error('[WORKER] Fatal error:', err);
        process.exit(1);
    }).then(() => process.exit(0));
}

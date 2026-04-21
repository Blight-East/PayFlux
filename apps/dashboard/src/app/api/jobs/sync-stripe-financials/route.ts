import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { dbQuery } from '@/lib/db/client';
import { saveStripeFinancials } from '@/lib/db/stripe-financials';

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const result = await dbQuery(
            `SELECT id, workspace_id, stripe_account_id, access_token 
             FROM processor_connections 
             WHERE status = 'connected' AND provider = 'stripe' AND access_token IS NOT NULL`
        );
        
        const connections = result.rows;
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const conn of connections) {
            try {
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
            } catch (err) {
                console.error(`Failed to sync account ${conn.stripe_account_id}:`, err);
                failCount++;
                errors.push({ account: conn.stripe_account_id, error: String(err) });
            }
        }

        return NextResponse.json({
            success: true,
            synced: successCount,
            failed: failCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err) {
        console.error('Sync job failed:', err);
        return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
    }
}

import { dbQuery } from './client';
import { mapStripeFinancialsRow } from './rows';
import type { StripeFinancialsRow, JsonObject } from './types';

export async function saveStripeFinancials(args: {
    workspaceId: string;
    stripeAccountId: string;
    availableBalance: number;
    pendingBalance: number;
    totalVolume30d: number;
    disputeCount30d: number;
    avgPayoutDelayDays: number | null;
    lastPayoutAt: Date | null;
    rawPayouts: JsonObject | null;
}): Promise<StripeFinancialsRow> {
    const result = await dbQuery(
        `
        INSERT INTO stripe_financials (
            workspace_id,
            stripe_account_id,
            available_balance,
            pending_balance,
            total_volume_30d,
            dispute_count_30d,
            avg_payout_delay_days,
            last_payout_at,
            raw_payouts,
            fetched_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())
        RETURNING *
        `,
        [
            args.workspaceId,
            args.stripeAccountId,
            args.availableBalance,
            args.pendingBalance,
            args.totalVolume30d,
            args.disputeCount30d,
            args.avgPayoutDelayDays,
            args.lastPayoutAt ? args.lastPayoutAt.toISOString() : null,
            args.rawPayouts ? JSON.stringify(args.rawPayouts) : null,
        ]
    );

    return mapStripeFinancialsRow(result.rows[0]);
}

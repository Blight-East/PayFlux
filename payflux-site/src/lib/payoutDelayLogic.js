/**
 * Payout Delay Cost Calculator — deterministic math
 *
 * Assumptions (stated explicitly):
 * - "Normal" and "delayed" payout timing are expressed in business days (T+N)
 * - delay_days = delayed_timing - normal_timing
 * - estimated_cash_delayed = average_daily_sales * delay_days
 * - Weekly obligation comparisons are simple ratios against the delayed cash amount
 * - This is an estimate — actual payout mechanics vary by processor
 */

/**
 * @param {object} inputs
 * @param {number} inputs.dailySales        — average daily sales in dollars
 * @param {number} inputs.normalTiming      — normal payout timing in days (e.g. 2 for T+2)
 * @param {number} inputs.delayedTiming     — delayed payout timing in days (e.g. 5 for T+5)
 * @param {number} [inputs.weeklyPayroll]   — optional weekly payroll amount
 * @param {number} [inputs.weeklyInventory] — optional weekly inventory / vendor commitments
 * @param {number} [inputs.weeklyAdSpend]   — optional weekly ad spend
 *
 * @returns {object|null} results or null if inputs are invalid
 */
export function calculatePayoutDelay(inputs) {
    const { dailySales, normalTiming, delayedTiming, weeklyPayroll, weeklyInventory, weeklyAdSpend } = inputs;

    if (!dailySales || dailySales <= 0) return null;
    if (normalTiming == null || normalTiming < 0) return null;
    if (delayedTiming == null || delayedTiming <= 0) return null;
    if (delayedTiming <= normalTiming) return null;

    const delayDays = delayedTiming - normalTiming;
    const cashDelayed = dailySales * delayDays;

    // Weekly cash delayed (delay impact expressed per week)
    const weeklyCashDelayed = dailySales * delayDays; // same as cashDelayed — represents the additional float at any point

    // Obligation comparisons
    const obligations = [];

    if (weeklyPayroll && weeklyPayroll > 0) {
        const ratio = cashDelayed / weeklyPayroll;
        obligations.push({
            label: 'Weekly Payroll',
            amount: weeklyPayroll,
            ratio,
            coverage: generateCoverageNote('payroll', ratio, cashDelayed, weeklyPayroll),
        });
    }

    if (weeklyInventory && weeklyInventory > 0) {
        const ratio = cashDelayed / weeklyInventory;
        obligations.push({
            label: 'Weekly Inventory / Vendors',
            amount: weeklyInventory,
            ratio,
            coverage: generateCoverageNote('inventory', ratio, cashDelayed, weeklyInventory),
        });
    }

    if (weeklyAdSpend && weeklyAdSpend > 0) {
        const ratio = cashDelayed / weeklyAdSpend;
        obligations.push({
            label: 'Weekly Ad Spend',
            amount: weeklyAdSpend,
            ratio,
            coverage: generateCoverageNote('ad spend', ratio, cashDelayed, weeklyAdSpend),
        });
    }

    // Total weekly obligations
    const totalWeeklyObligations =
        (weeklyPayroll || 0) + (weeklyInventory || 0) + (weeklyAdSpend || 0);

    let obligationPressure = null;
    if (totalWeeklyObligations > 0) {
        const overallRatio = cashDelayed / totalWeeklyObligations;
        obligationPressure = {
            totalWeekly: totalWeeklyObligations,
            ratio: overallRatio,
        };
    }

    return {
        delayDays,
        cashDelayed,
        dailySales,
        normalTiming,
        delayedTiming,
        obligations,
        obligationPressure,
    };
}

/**
 * Generate a plain-English coverage note for an obligation comparison.
 */
function generateCoverageNote(type, ratio, cashDelayed, obligation) {
    if (ratio >= 1) {
        return `The delayed cash (${formatCurrency(cashDelayed)}) exceeds your weekly ${type} (${formatCurrency(obligation)}). This could create real timing pressure.`;
    }
    if (ratio >= 0.5) {
        return `The delayed cash covers about ${Math.round(ratio * 100)}% of your weekly ${type}. Depending on your cash cushion, this could tighten your window.`;
    }
    return `The delayed cash represents about ${Math.round(ratio * 100)}% of your weekly ${type} — manageable for most businesses, but still worth tracking.`;
}

/**
 * Format a dollar amount for display.
 * Rounds to nearest dollar for amounts >= $100, otherwise 2 decimal places.
 */
export function formatCurrency(amount) {
    if (amount >= 100) {
        return '$' + Math.round(amount).toLocaleString('en-US');
    }
    return '$' + amount.toFixed(2);
}

/**
 * Generate a plain-English interpretation of the payout delay impact.
 */
export function generateInterpretation(results) {
    const { delayDays, cashDelayed, dailySales, normalTiming, delayedTiming } = results;
    const lines = [];

    lines.push(
        `Moving from T+${normalTiming} to T+${delayedTiming} adds ${delayDays} extra day${delayDays !== 1 ? 's' : ''} before your sales revenue reaches your bank account. At ${formatCurrency(dailySales)} per day, that means roughly ${formatCurrency(cashDelayed)} is sitting in transit at any given time instead of being available to your business.`
    );

    if (delayDays >= 5) {
        lines.push(
            `A ${delayDays}-day shift is significant. Cash that used to arrive within a few days of a sale is now delayed nearly a full business week longer. That can change how you manage payroll cycles, vendor payments, and reorder timing.`
        );
    } else if (delayDays >= 3) {
        lines.push(
            `A ${delayDays}-day shift is enough to notice in your operating rhythm — especially if you run lean or have weekly obligations that depend on predictable settlement timing.`
        );
    }

    return lines;
}

/**
 * Generate operational impact bullets based on the delay size.
 */
export function generateOperationalImpact(results) {
    const { delayDays, cashDelayed, obligationPressure } = results;
    const impacts = [];

    impacts.push('Cash that would normally be available sooner is now sitting in the settlement pipeline longer.');

    if (delayDays >= 5) {
        impacts.push('A delay this large can create real pressure on payroll timing, vendor payments, and inventory restocking.');
        impacts.push('If your processor has also introduced reserves or increased documentation requests, the combined effect on working capital could be substantial.');
    } else if (delayDays >= 3) {
        impacts.push('This level of delay may tighten your operating cushion — especially around weekly payroll or vendor payment cycles.');
    } else {
        impacts.push('At this level, the delay is modest, but it still reduces your available working capital on any given day.');
    }

    if (obligationPressure && obligationPressure.ratio >= 0.5) {
        impacts.push(
            `The delayed cash represents ${Math.round(obligationPressure.ratio * 100)}% of your combined weekly obligations (${formatCurrency(obligationPressure.totalWeekly)}). That ratio is worth watching.`
        );
    }

    if (cashDelayed >= 25000) {
        impacts.push('For this dollar amount, consider whether your operating account has enough buffer to absorb the slower settlement without delaying commitments.');
    }

    impacts.push('Payout delays often appear alongside other processor risk signals — reserves, documentation requests, or increased holds. If you are seeing more than one of these, the combined pressure may be more significant than any single change suggests.');

    return impacts;
}

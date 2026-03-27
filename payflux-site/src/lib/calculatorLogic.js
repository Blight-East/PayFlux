/**
 * Reserve Impact Calculator — deterministic math
 *
 * Assumptions (stated explicitly):
 * - 1 month = 30 days (for day-to-month conversion)
 * - Reserve is applied as a flat percentage of monthly processed volume
 * - "Total temporarily tied up" estimates the rolling reserve balance
 *   that accumulates over the hold duration before any releases begin
 * - This is an estimate — actual processor reserve mechanics vary
 */

const DAYS_PER_MONTH = 30;

/**
 * @param {object} inputs
 * @param {number} inputs.monthlyVolume     — monthly processing volume in dollars
 * @param {number} inputs.reservePercent    — reserve percentage (e.g. 10 for 10%)
 * @param {number} inputs.duration          — reserve hold duration
 * @param {string} inputs.durationUnit      — 'days' or 'months'
 * @param {string} [inputs.payoutCadence]   — 'daily' | 'every_2_days' | 'weekly' | ''
 *
 * @returns {object|null} results or null if inputs are invalid
 */
export function calculateReserveImpact(inputs) {
    const { monthlyVolume, reservePercent, duration, durationUnit, payoutCadence } = inputs;

    if (!monthlyVolume || monthlyVolume <= 0) return null;
    if (!reservePercent || reservePercent <= 0 || reservePercent > 100) return null;
    if (!duration || duration <= 0) return null;

    // Core calculations
    const heldPerMonth = monthlyVolume * (reservePercent / 100);
    const durationInMonths = durationUnit === 'days'
        ? duration / DAYS_PER_MONTH
        : duration;
    const durationInDays = durationUnit === 'days'
        ? duration
        : duration * DAYS_PER_MONTH;

    // Total reserve exposure = amount held per month * duration in months
    // This represents the rolling balance that builds up before releases start
    const totalTiedUp = heldPerMonth * durationInMonths;

    // Daily held amount (useful for payout cadence context)
    const heldPerDay = heldPerMonth / DAYS_PER_MONTH;

    // Payout cadence impact — how much reserve accumulates per payout cycle
    let payoutCycleDays = null;
    let payoutCycleLabel = null;
    let heldPerPayoutCycle = null;

    if (payoutCadence === 'daily') {
        payoutCycleDays = 1;
        payoutCycleLabel = 'day';
    } else if (payoutCadence === 'every_2_days') {
        payoutCycleDays = 2;
        payoutCycleLabel = '2-day cycle';
    } else if (payoutCadence === 'weekly') {
        payoutCycleDays = 7;
        payoutCycleLabel = 'week';
    }

    if (payoutCycleDays) {
        heldPerPayoutCycle = heldPerDay * payoutCycleDays;
    }

    // Reserve as a share of monthly volume (for context)
    const reserveShareOfVolume = (totalTiedUp / monthlyVolume) * 100;

    return {
        heldPerMonth,
        totalTiedUp,
        durationInMonths,
        durationInDays,
        heldPerDay,
        payoutCycleDays,
        payoutCycleLabel,
        heldPerPayoutCycle,
        reserveShareOfVolume,
        // Pass inputs through for display
        monthlyVolume,
        reservePercent,
    };
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
 * Generate a plain-English interpretation of the reserve impact.
 */
export function generateInterpretation(results) {
    const { totalTiedUp, heldPerMonth, durationInMonths, monthlyVolume, reservePercent, payoutCycleLabel, heldPerPayoutCycle } = results;

    const lines = [];

    // Main explanation
    if (durationInMonths <= 1) {
        lines.push(
            `At ${reservePercent}% of your monthly volume, roughly ${formatCurrency(heldPerMonth)} would be held back each month. Over a ${Math.round(results.durationInDays)}-day hold period, that means approximately ${formatCurrency(totalTiedUp)} could be sitting in reserve at any given time before releases begin.`
        );
    } else {
        lines.push(
            `At ${reservePercent}% of your monthly volume, roughly ${formatCurrency(heldPerMonth)} would be held back each month. Over a ${Math.round(durationInMonths)}-month hold period, that means approximately ${formatCurrency(totalTiedUp)} could be sitting in reserve before the earliest funds start releasing.`
        );
    }

    // Payout cadence context
    if (payoutCycleLabel && heldPerPayoutCycle) {
        lines.push(
            `With payouts every ${payoutCycleLabel}, roughly ${formatCurrency(heldPerPayoutCycle)} of each cycle's volume would be diverted to the reserve instead of reaching your bank account.`
        );
    }

    return lines;
}

/**
 * Generate operational impact bullets based on the reserve size relative to volume.
 */
export function generateOperationalImpact(results) {
    const { reserveShareOfVolume, totalTiedUp } = results;
    const impacts = [];

    impacts.push('Cash that would normally be available for operations is temporarily inaccessible.');

    if (reserveShareOfVolume >= 50) {
        impacts.push('A reserve this large relative to your volume could create significant pressure on payroll, vendor payments, and inventory purchasing.');
        impacts.push('If payout timing also shifts, the combined effect on working capital could be substantial.');
    } else if (reserveShareOfVolume >= 20) {
        impacts.push('This level of reserve may tighten your operating cushion — especially around inventory restocking or vendor payment cycles.');
        impacts.push('Worth monitoring whether the reserve percentage or duration increases over time.');
    } else {
        impacts.push('At this level, the reserve is manageable for most businesses, but it still reduces your available working capital.');
    }

    if (totalTiedUp >= 50000) {
        impacts.push('For this dollar amount, consider whether your operating account has enough buffer to absorb the hold without delaying commitments.');
    }

    impacts.push('If your processor has also slowed payouts or requested documentation, the combined pressure may be more significant than the reserve alone suggests.');

    return impacts;
}

const categories = [
    {
        id: 'funds_hold',
        label: 'Funds Hold / Reserve',
        triggers: [
            /rolling\s+reserve/i,
            /reserve\s+requirement/i,
            /held\s+funds/i,
            /hold\s*back/i,
            /funds?\s+hold/i,
            /funds?\s+held/i,
            /withheld/i,
            /\bretain(?:ed)?\b/i,
            /\breserve\b/i,
        ],
        summary:
            'Your processor is placing or adjusting a hold on a portion of your funds. This is commonly called a rolling reserve or holdback.',
        whatItMeans:
            'A reserve means your processor is keeping a percentage of your processed volume in a separate account for a set period. This is a risk-management measure — not a penalty. It protects the processor against future chargebacks or refunds on transactions you have already settled. The funds are typically released after a holding period (often 90 to 180 days), but the reserve percentage can increase if your risk profile changes.',
        whyProcessorsSendThis:
            'Processors impose reserves when they see elevated risk indicators on your account — rising chargeback ratios, sudden volume increases, high-ticket transactions in a new category, or industry-level risk. Sometimes a reserve is applied at onboarding for merchants in higher-risk verticals and is adjusted over time based on processing history.',
        whatToCheckNow: [
            'Review your current chargeback and refund ratios for the last 30, 60, and 90 days.',
            'Check whether your average transaction size or monthly volume has changed recently.',
            'Look at your payout schedule — has settlement timing shifted alongside this notice?',
            'Confirm the exact reserve percentage and holding period stated in the email.',
        ],
        suggestedNextStep:
            'Document your current metrics and compare them to your processing agreement terms. If the reserve percentage seems higher than expected, prepare a summary of your dispute rate and volume trends to discuss with your processor. A free scan can help you see where your risk signals stand right now.',
    },
    {
        id: 'payout_delay',
        label: 'Payout Delay',
        triggers: [
            /payout\s+delay/i,
            /delayed\s+payout/i,
            /payout\s+schedule\s+change/i,
            /settlement\s+delay/i,
            /disbursement\s+delay/i,
            /payout.*\b(slow|held|pending|suspend)/i,
            /delay.*\bpayout/i,
            /settlement.*\b(slow|held|pending|suspend)/i,
        ],
        summary:
            'Your processor is signaling that payouts may be delayed or that your settlement schedule is changing.',
        whatItMeans:
            'A payout delay means the time between when you process a transaction and when the funds land in your bank account is getting longer. This can happen because your processor has placed your account under additional review, applied a reserve that affects disbursement timing, or adjusted your settlement window due to perceived risk. In some cases, it is a temporary hold while specific transactions are reviewed.',
        whyProcessorsSendThis:
            'Processors slow payouts when they need more time to evaluate risk on your account. Common triggers include a spike in chargebacks, a sudden change in transaction volume or average ticket size, refund activity that exceeds normal patterns, or flagged transactions that require manual review before funds are released.',
        whatToCheckNow: [
            'Compare your current payout timing to your normal settlement schedule (e.g., T+2 vs. T+7).',
            'Check if any specific transactions are being held or flagged for review.',
            'Review your recent chargeback, refund, and dispute activity.',
            'Look for any other notices from your processor that arrived around the same time.',
        ],
        suggestedNextStep:
            'Track your actual payout timing over the next 5 to 10 business days and compare it to what your processing agreement specifies. If the delay is unexplained, contact your processor with your recent volume and dispute data ready. Running a free scan can help you identify which risk signals may be contributing to the slowdown.',
    },
    {
        id: 'account_review',
        label: 'Account Review',
        triggers: [
            /account\s+review/i,
            /under\s+review/i,
            /risk\s+review/i,
            /ongoing\s+review/i,
            /temporary\s+review/i,
            /\breview\s+of\s+your\s+account/i,
            /\baccount.*\bunder\b.*\breview/i,
            /\breview\b/i,
        ],
        summary:
            'Your processor has placed your account under review. This means they are actively evaluating your risk profile.',
        whatItMeans:
            'An account review is a formal evaluation of your merchant account by your processor\'s risk team. During this period, the processor may examine your transaction patterns, chargeback history, refund rates, and business practices. Reviews can be routine or triggered by specific events. While under review, you may experience slower payouts, temporary holds, or requests for additional documentation.',
        whyProcessorsSendThis:
            'Account reviews are triggered when risk signals cross internal thresholds — a chargeback ratio approaching monitoring program limits, unusual transaction patterns, customer complaints routed to the processor, or periodic compliance checks. Some reviews are triggered by card network alerts rather than the processor\'s own monitoring.',
        whatToCheckNow: [
            'Note whether the email specifies what triggered the review or if it is vague.',
            'Check your chargeback ratio — is it approaching 0.9% (Visa) or 1.5% (Mastercard)?',
            'Review any recent changes to your business — new products, new markets, volume changes.',
            'Look for requests for documentation or action items embedded in the notice.',
        ],
        suggestedNextStep:
            'Respond to your processor promptly if they have asked for information. Gather your recent processing metrics, dispute history, and any documentation about business changes. Understanding your current risk position before responding puts you in a stronger position. A free scan gives you a clear picture of where your signals stand.',
    },
    {
        id: 'documents_requested',
        label: 'Documents Requested',
        triggers: [
            /provide\s+documents/i,
            /additional\s+information/i,
            /identity\s+verification/i,
            /supplier\s+invoices/i,
            /fulfillment\s+evidence/i,
            /tracking\s+information/i,
            /business\s+documentation/i,
            /\bverification\b/i,
            /\bdocument(?:s|ation)?\s+(?:request|require|need|submit)/i,
            /(?:request|require|need|submit)\s+document/i,
            /proof\s+of/i,
            /supporting\s+document/i,
        ],
        summary:
            'Your processor is requesting documentation to verify aspects of your business or specific transactions.',
        whatItMeans:
            'A documentation request means your processor needs evidence to validate your business operations, verify your identity, or confirm the legitimacy of specific transactions. This is a standard part of processor risk management and does not always indicate a serious problem. However, failing to respond promptly and completely can escalate the situation — potentially leading to holds, reserves, or account restrictions.',
        whyProcessorsSendThis:
            'Processors request documentation for several reasons: onboarding compliance checks, transaction-level disputes that require evidence, periodic KYC (Know Your Customer) re-verification, sudden business model changes that need explanation, or as part of a broader account review. Card networks may also require processors to collect evidence for specific merchant categories.',
        whatToCheckNow: [
            'Read the request carefully — note exactly what documents are being asked for and the deadline.',
            'Check if the request is tied to specific transactions, a general account review, or a compliance requirement.',
            'Gather the requested documents — common asks include business licenses, bank statements, supplier invoices, shipping/tracking records, and identity verification.',
            'Note whether the request mentions consequences for non-response (holds, restrictions, account closure).',
        ],
        suggestedNextStep:
            'Respond by the stated deadline with complete, organized documentation. If you are unsure what is being asked, contact your processor for clarification before submitting partial information. Incomplete responses often trigger follow-up requests and extend the review period. A free scan can help you understand what risk signals may have prompted the request.',
    },
    {
        id: 'dispute_chargeback',
        label: 'Dispute / Chargeback Pressure',
        triggers: [
            /excessive\s+disputes?/i,
            /elevated\s+dispute\s+rate/i,
            /chargeback\s+rate/i,
            /chargeback\s+ratio/i,
            /cardholder\s+complaint/i,
            /refund\s+activity/i,
            /dispute\s+monitoring/i,
            /chargeback\s+monitoring/i,
            /\bchargebacks?\b/i,
            /\bdisputes?\b/i,
            /\brefund\b/i,
            /fraud\s+rate/i,
        ],
        summary:
            'Your processor is flagging elevated dispute, chargeback, or refund activity on your account.',
        whatItMeans:
            'Elevated dispute or chargeback activity means your account is generating more customer-initiated reversals than your processor considers safe. Card networks like Visa and Mastercard run formal monitoring programs with hard thresholds — once you cross them, fines and restrictions follow automatically. Even before you hit those thresholds, your processor may take preemptive action to protect themselves.',
        whyProcessorsSendThis:
            'Processors send these notices when your chargeback-to-transaction ratio is rising, when you receive fraud-coded chargebacks, when refund rates spike, or when cardholder complaints reach their support channels. They are required by card networks to monitor and act on these metrics. Ignoring these warnings can lead to enrollment in formal monitoring programs with monthly fines starting at $25,000.',
        whatToCheckNow: [
            'Calculate your current chargeback ratio for the last 30 and 90 days.',
            'Identify the reason codes on your recent chargebacks — are they fraud, product not received, or subscription cancellation?',
            'Review your refund rate alongside your dispute rate — high refunds can signal problems before they become chargebacks.',
            'Check if any specific product, offer, or customer segment is driving the disputes.',
        ],
        suggestedNextStep:
            'Prioritize understanding where the disputes are coming from. Segment by reason code, product, and acquisition channel. Address the root cause — whether it is unclear product descriptions, shipping delays, or subscription billing confusion. A free scan can map your current dispute exposure and show you where the pressure is building.',
    },
];

const fallbackResult = {
    id: 'generic_concern',
    label: 'Generic Processor Concern',
    matchCount: 0,
    summary:
        'This email does not clearly match a specific processor warning category. The language is vague or general, which is common — processors often send notices that are intentionally broad.',
    whatItMeans:
        'Vague processor communications are not unusual. Processors sometimes send general notices before taking specific action, or they use templated language that does not map to a single issue. This can also mean the situation is still being evaluated internally and the processor has not yet decided on a specific course of action.',
    whyProcessorsSendThis:
        'Processors send vague or general notices for several reasons: as an early heads-up before a formal review, as part of routine compliance outreach, when multiple minor signals are present but none are dominant, or when they are required to communicate but do not yet have a specific finding. The vagueness itself can be a signal — it often precedes more specific action.',
    whatToCheckNow: [
        'Review your payout timing — has anything shifted in the last 7 to 14 days?',
        'Check your held funds or reserve balance — has it increased?',
        'Look at your dispute and refund activity for the last 30 days.',
        'Review any other recent notices or emails from your processor.',
        'Check whether your transaction volume or average ticket size has changed recently.',
    ],
    suggestedNextStep:
        'Even when the email is unclear, it is worth checking your key risk metrics. Processors rarely send notices without reason. Review your payout schedule, dispute ratios, and any recent account changes. A free scan can give you a clear snapshot of your current risk signals so you know where you stand.',
};

export function decodeEmail(text) {
    if (!text || !text.trim()) {
        return [fallbackResult];
    }

    const normalized = text.toLowerCase().replace(/\s+/g, ' ');

    const matches = categories
        .map((category) => {
            const matchCount = category.triggers.reduce((count, trigger) => {
                return count + (trigger.test(normalized) ? 1 : 0);
            }, 0);

            if (matchCount === 0) return null;

            return {
                id: category.id,
                label: category.label,
                matchCount,
                summary: category.summary,
                whatItMeans: category.whatItMeans,
                whyProcessorsSendThis: category.whyProcessorsSendThis,
                whatToCheckNow: category.whatToCheckNow,
                suggestedNextStep: category.suggestedNextStep,
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.matchCount - a.matchCount);

    if (matches.length === 0) {
        return [fallbackResult];
    }

    return matches;
}

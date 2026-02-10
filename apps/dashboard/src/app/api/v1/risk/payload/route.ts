import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';

/**
 * POST /api/v1/risk/payload
 * 
 * Analyzes transaction payload for risk signals.
 * Used for "No Site" onboarding path.
 */

interface PayloadRequest {
    amount: number;
    currency: string;
    payment_method: string;
    processor: string;
    merchant_country: string;
    customer_country: string;
    descriptor: string;
    category: string;
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    const userId = authResult;

    try {
        const payload: PayloadRequest = await request.json();

        // Validate required fields
        const required = ['amount', 'currency', 'payment_method', 'processor', 'merchant_country', 'customer_country', 'descriptor', 'category'];
        for (const field of required) {
            if (!payload[field as keyof PayloadRequest]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Real risk scoring logic
        const riskAnalysis = analyzePayloadRisk(payload);

        return NextResponse.json(riskAnalysis);
    } catch (error) {
        console.error('[Risk Payload] Error analyzing payload:', error);
        return NextResponse.json(
            { error: 'Failed to analyze payload' },
            { status: 500 }
        );
    }
}

function analyzePayloadRisk(payload: PayloadRequest) {
    let riskScore = 0;
    const findings: Array<{ title: string; description: string; severity: string; impact: number }> = [];

    // 1. High-value transaction risk
    if (payload.amount > 10000) {
        riskScore += 25;
        findings.push({
            title: 'High-value transaction',
            description: `Transaction amount of ${(payload.amount / 100).toFixed(2)} ${payload.currency} exceeds typical threshold.`,
            severity: 'high',
            impact: 25,
        });
    } else if (payload.amount > 5000) {
        riskScore += 15;
        findings.push({
            title: 'Elevated transaction value',
            description: `Transaction amount of ${(payload.amount / 100).toFixed(2)} ${payload.currency} may trigger additional review.`,
            severity: 'medium',
            impact: 15,
        });
    }

    // 2. Cross-border risk
    if (payload.merchant_country !== payload.customer_country) {
        riskScore += 20;
        findings.push({
            title: 'Cross-border transaction',
            description: `Merchant in ${payload.merchant_country}, customer in ${payload.customer_country}. Increases chargeback likelihood by 30%.`,
            severity: 'medium',
            impact: 20,
        });
    }

    // 3. Descriptor clarity
    if (payload.descriptor.length < 5 || !/[A-Z]/.test(payload.descriptor)) {
        riskScore += 15;
        findings.push({
            title: 'Unclear statement descriptor',
            description: `"${payload.descriptor}" may not be recognizable to customers, increasing dispute risk.`,
            severity: 'medium',
            impact: 15,
        });
    }

    // 4. High-risk category
    const highRiskCategories = ['crypto', 'gambling', 'adult', 'nutraceuticals'];
    if (highRiskCategories.includes(payload.category.toLowerCase())) {
        riskScore += 30;
        findings.push({
            title: 'High-risk merchant category',
            description: `Category "${payload.category}" has elevated chargeback rates and processor scrutiny.`,
            severity: 'high',
            impact: 30,
        });
    }

    // 5. Payment method risk
    if (payload.payment_method === 'ach' || payload.payment_method === 'bank_transfer') {
        riskScore += 10;
        findings.push({
            title: 'ACH/Bank transfer method',
            description: 'Longer settlement times and higher return rates compared to card payments.',
            severity: 'low',
            impact: 10,
        });
    }

    // 6. Currency mismatch
    if (payload.currency !== 'USD' && payload.merchant_country === 'US') {
        riskScore += 10;
        findings.push({
            title: 'Currency mismatch',
            description: `Processing ${payload.currency} from US merchant may incur conversion fees and delays.`,
            severity: 'low',
            impact: 10,
        });
    }

    // Cap risk score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine risk label
    let riskLabel = 'Low';
    if (riskScore >= 70) riskLabel = 'High';
    else if (riskScore >= 40) riskLabel = 'Medium';

    // Processor implication
    const processorImplication = getProcessorImplication(payload.processor, riskScore, findings);

    return {
        riskScore,
        riskLabel,
        findings: findings.sort((a, b) => b.impact - a.impact).slice(0, 5),
        processorImplication,
        metadata: {
            amount: payload.amount,
            currency: payload.currency,
            descriptor: payload.descriptor,
            category: payload.category,
        },
    };
}

function getProcessorImplication(processor: string, riskScore: number, findings: any[]) {
    const processorName = processor.charAt(0).toUpperCase() + processor.slice(1);

    if (riskScore >= 70) {
        return `${processorName} may require additional documentation or impose reserve requirements. Expect 2-3 business day review for approval.`;
    } else if (riskScore >= 40) {
        return `${processorName} will likely approve but may monitor transaction velocity. Consider implementing 3DS for card-not-present transactions.`;
    } else {
        return `${processorName} should approve without additional review. Standard processing times apply.`;
    }
}

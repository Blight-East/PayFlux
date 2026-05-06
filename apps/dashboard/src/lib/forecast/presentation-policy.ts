/**
 * V3.1 Presentation Policy Layer
 *
 * Governs the disclosure and visual framing of the unified risk model.
 * The model produces mathematical truth; this layer enforces how it can
 * be responsibly displayed to prevent metric manipulation and false determinism.
 */

export interface GovernanceInput {
    riskScore: number;
    confidenceBand: 'LOW' | 'MEDIUM' | 'HIGH';
    dataCompletenessScore: number;

    modeledProjections: {
        t30: number;
        t60: number;
        t90: number;
    };

    observedSignals: {
        pending_balance: number;
        dispute_count_30d: number;
        total_volume_30d: number;
    };
}

export interface RuleTrace {
    ruleId: string;
    inputSignals: Record<string, number | string>;
    outcome: string;
}

export interface BasePolicyProps {
    policyVersion: string;
    allowedPrecision: 'point' | 'range' | 'blur';
    showDrivers: boolean;
    showConfidenceBand: boolean;
    reasoning: string[];
    ruleTrace: RuleTrace[];
    isValid: boolean;
}

export type ObservePolicy = BasePolicyProps & {
    mode: 'observe';
    urgencyLevel: 0;
    showProjectionWindows: { t30: boolean; t60: boolean; t90: boolean };
    displayFormat: { t30: 'point' | 'range' | 'hidden'; t60: 'hidden'; t90: 'hidden' };
    uiFraming: { headlineStyle: 'neutral'; ctaIntensity: 'soft' };
};

export type WarnPolicy = BasePolicyProps & {
    mode: 'warn';
    urgencyLevel: 1;
    showProjectionWindows: { t30: boolean; t60: boolean; t90: boolean };
    displayFormat: { t30: 'point' | 'range' | 'hidden'; t60: 'locked'; t90: 'hidden' };
    uiFraming: { headlineStyle: 'warning'; ctaIntensity: 'standard' };
};

export type EscalatePolicy = BasePolicyProps & {
    mode: 'escalate';
    urgencyLevel: 2;
    showProjectionWindows: { t30: boolean; t60: boolean; t90: boolean };
    displayFormat: { t30: 'point' | 'range' | 'hidden'; t60: 'blurred'; t90: 'locked' };
    uiFraming: { headlineStyle: 'loss-framed'; ctaIntensity: 'high-pressure' };
};

export type CriticalPolicy = BasePolicyProps & {
    mode: 'critical';
    urgencyLevel: 3;
    showProjectionWindows: { t30: boolean; t60: boolean; t90: boolean };
    displayFormat: { t30: 'point' | 'range' | 'hidden'; t60: 'blurred'; t90: 'blurred' };
    uiFraming: { headlineStyle: 'critical'; ctaIntensity: 'high-pressure' };
};

export type PresentationPolicy = ObservePolicy | WarnPolicy | EscalatePolicy | CriticalPolicy;

function validateAndNormalizePolicy(policy: PresentationPolicy, input: GovernanceInput): PresentationPolicy {
    let violatesInvariant = false;
    let violationReason = '';

    // Hard Constraint 1: Precision Gate
    if (input.dataCompletenessScore < 0.5 && policy.allowedPrecision !== 'blur') {
        violatesInvariant = true;
        violationReason = 'completeness_gate_violated';
    }

    // Hard Constraint 2: Confidence Gate
    if (input.confidenceBand === 'LOW' && policy.allowedPrecision === 'point') {
        violatesInvariant = true;
        violationReason = 'confidence_gate_violated';
    }

    if (violatesInvariant) {
        policy.ruleTrace.push({
            ruleId: 'INVARIANT_VIOLATION_NORMALIZED',
            inputSignals: { completeness: input.dataCompletenessScore, confidence: input.confidenceBand },
            outcome: violationReason
        });
        policy.reasoning.push(`Runtime safety normalization triggered: ${violationReason}.`);

        // Fail Safe: Normalize to the most restricted state without crashing
        const normalizedPolicy: CriticalPolicy = {
            policyVersion: 'v3.2.0',
            mode: 'critical',
            urgencyLevel: 3,
            allowedPrecision: 'blur',
            showDrivers: true,
            showConfidenceBand: true,
            showProjectionWindows: { t30: true, t60: true, t90: true },
            displayFormat: { t30: 'range', t60: 'blurred', t90: 'blurred' },
            uiFraming: { headlineStyle: 'critical', ctaIntensity: 'high-pressure' },
            reasoning: policy.reasoning,
            ruleTrace: policy.ruleTrace,
            isValid: false, // Explicitly marks this payload as having breached invariants
        };
        return normalizedPolicy;
    }

    return { ...policy, isValid: true };
}

export function computePresentationPolicy(input: GovernanceInput): PresentationPolicy {
    const reasoning: string[] = [];
    const ruleTrace: RuleTrace[] = [];

    const trace = (ruleId: string, outcome: string, signals: Record<string, number | string>, reason: string) => {
        ruleTrace.push({ ruleId, inputSignals: signals, outcome });
        reasoning.push(reason);
    };

    // 1. Mode Classification
    let mode: PresentationPolicy['mode'] = 'critical';
    if (input.riskScore < 0.15 && input.dataCompletenessScore > 0.7) {
        mode = 'observe';
        trace('MODE_OBSERVE', mode, { r: input.riskScore, completeness: input.dataCompletenessScore }, 'Low risk and high data completeness.');
    } else if (input.riskScore < 0.35) {
        mode = 'warn';
        trace('MODE_WARN', mode, { r: input.riskScore }, 'Latent risk detected.');
    } else if (input.riskScore < 0.60) {
        mode = 'escalate';
        trace('MODE_ESCALATE', mode, { r: input.riskScore }, 'Elevated risk detected.');
    } else {
        trace('MODE_CRITICAL', mode, { r: input.riskScore }, 'Critical risk detected.');
    }

    // 2. Precision Rules (Anti-manipulation guard)
    let allowedPrecision: BasePolicyProps['allowedPrecision'] = 'point';
    if (input.dataCompletenessScore < 0.5) {
        allowedPrecision = 'blur';
        trace('PRECISION_BLUR', allowedPrecision, { completeness: input.dataCompletenessScore }, 'Severely incomplete data. Precision strictly bounded.');
    } else if (input.confidenceBand === 'LOW') {
        allowedPrecision = 'range';
        trace('PRECISION_RANGE', allowedPrecision, { confidence: input.confidenceBand }, 'Low confidence requires range disclosure.');
    } else {
        trace('PRECISION_POINT', allowedPrecision, { completeness: input.dataCompletenessScore, confidence: input.confidenceBand }, 'Adequate confidence for point-estimate or bounded range rendering.');
    }

    const t30DisplayFormat = allowedPrecision === 'blur' ? 'range' : allowedPrecision;

    // Build the strict mode-specific policy
    let rawPolicy: PresentationPolicy;

    if (mode === 'observe') {
        rawPolicy = {
            policyVersion: 'v3.2.0',
            mode: 'observe',
            urgencyLevel: 0,
            allowedPrecision,
            showProjectionWindows: { t30: true, t60: false, t90: false },
            displayFormat: { t30: t30DisplayFormat, t60: 'hidden', t90: 'hidden' },
            showDrivers: true,
            showConfidenceBand: true,
            uiFraming: { headlineStyle: 'neutral', ctaIntensity: 'soft' },
            reasoning,
            ruleTrace,
            isValid: true,
        };
    } else if (mode === 'warn') {
        rawPolicy = {
            policyVersion: 'v3.2.0',
            mode: 'warn',
            urgencyLevel: 1,
            allowedPrecision,
            showProjectionWindows: { t30: true, t60: true, t90: false },
            displayFormat: { t30: t30DisplayFormat, t60: 'locked', t90: 'hidden' },
            showDrivers: true,
            showConfidenceBand: true,
            uiFraming: { headlineStyle: 'warning', ctaIntensity: 'standard' },
            reasoning,
            ruleTrace,
            isValid: true,
        };
    } else if (mode === 'escalate') {
        rawPolicy = {
            policyVersion: 'v3.2.0',
            mode: 'escalate',
            urgencyLevel: 2,
            allowedPrecision,
            showProjectionWindows: { t30: true, t60: true, t90: true },
            displayFormat: { t30: t30DisplayFormat, t60: 'blurred', t90: 'locked' },
            showDrivers: true,
            showConfidenceBand: true,
            uiFraming: { headlineStyle: 'loss-framed', ctaIntensity: 'high-pressure' },
            reasoning,
            ruleTrace,
            isValid: true,
        };
    } else {
        rawPolicy = {
            policyVersion: 'v3.2.0',
            mode: 'critical',
            urgencyLevel: 3,
            allowedPrecision,
            showProjectionWindows: { t30: true, t60: true, t90: true },
            displayFormat: { t30: t30DisplayFormat, t60: 'blurred', t90: 'blurred' },
            showDrivers: true,
            showConfidenceBand: true,
            uiFraming: { headlineStyle: 'critical', ctaIntensity: 'high-pressure' },
            reasoning,
            ruleTrace,
            isValid: true,
        };
    }

    return validateAndNormalizePolicy(rawPolicy, input);
}

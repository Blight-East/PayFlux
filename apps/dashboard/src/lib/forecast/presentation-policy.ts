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

export interface PresentationPolicy {
    policyVersion: string;
    mode: 'observe' | 'warn' | 'escalate' | 'critical';
    allowedPrecision: 'point' | 'range' | 'blur';
    urgencyLevel: 0 | 1 | 2 | 3;

    showProjectionWindows: {
        t30: boolean;
        t60: boolean;
        t90: boolean;
    };

    displayFormat: {
        t30: 'point' | 'range' | 'hidden';
        t60: 'locked' | 'blurred' | 'hidden';
        t90: 'locked' | 'blurred' | 'hidden';
    };

    showDrivers: boolean;
    showConfidenceBand: boolean;

    uiFraming: {
        headlineStyle: 'neutral' | 'warning' | 'loss-framed' | 'critical';
        ctaIntensity: 'soft' | 'standard' | 'high-pressure';
    };

    reasoning: string[];
    ruleTrace: RuleTrace[];
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

    // Urgency level mapping
    const urgencyMap: Record<PresentationPolicy['mode'], 0 | 1 | 2 | 3> = {
        'observe': 0,
        'warn': 1,
        'escalate': 2,
        'critical': 3
    };
    const urgencyLevel = urgencyMap[mode];

    // 2. Precision Rules (Anti-manipulation guard)
    let allowedPrecision: PresentationPolicy['allowedPrecision'] = 'point';
    if (input.dataCompletenessScore < 0.5) {
        allowedPrecision = 'blur';
        trace('PRECISION_BLUR', allowedPrecision, { completeness: input.dataCompletenessScore }, 'Severely incomplete data. Precision strictly bounded.');
    } else if (input.confidenceBand === 'LOW') {
        allowedPrecision = 'range';
        trace('PRECISION_RANGE', allowedPrecision, { confidence: input.confidenceBand }, 'Low confidence requires range disclosure.');
    } else {
        trace('PRECISION_POINT', allowedPrecision, { completeness: input.dataCompletenessScore, confidence: input.confidenceBand }, 'Adequate confidence for point-estimate or bounded range rendering.');
    }

    // 3. Projection Disclosure Rules
    const displayFormat: PresentationPolicy['displayFormat'] = {
        t30: allowedPrecision === 'blur' ? 'range' : allowedPrecision, // t30 must never be strictly hidden, blur renders as range
        t60: 'hidden',
        t90: 'hidden'
    };
    
    // T+30 is always visible
    const showProjectionWindows = {
        t30: true,
        t60: false,
        t90: false
    };

    if (mode === 'observe') {
        displayFormat.t60 = 'hidden';
        displayFormat.t90 = 'hidden';
    } else if (mode === 'warn') {
        displayFormat.t60 = 'locked';
        displayFormat.t90 = 'hidden';
    } else if (mode === 'escalate') {
        displayFormat.t60 = 'blurred';
        displayFormat.t90 = 'locked';
    } else if (mode === 'critical') {
        displayFormat.t60 = 'blurred';
        displayFormat.t90 = 'blurred';
    }
    
    showProjectionWindows.t60 = displayFormat.t60 !== 'hidden';
    showProjectionWindows.t90 = displayFormat.t90 !== 'hidden';

    trace('DISCLOSURE_WINDOWS', 'applied', { mode }, `T60 format: ${displayFormat.t60}, T90 format: ${displayFormat.t90}`);

    // 4. UI Framing Logic
    let headlineStyle: PresentationPolicy['uiFraming']['headlineStyle'] = 'neutral';
    let ctaIntensity: PresentationPolicy['uiFraming']['ctaIntensity'] = 'soft';

    if (mode === 'observe') {
        headlineStyle = 'neutral';
        ctaIntensity = 'soft';
    } else if (mode === 'warn') {
        headlineStyle = 'warning';
        ctaIntensity = 'standard';
    } else if (mode === 'escalate') {
        headlineStyle = 'loss-framed';
        ctaIntensity = 'high-pressure';
    } else if (mode === 'critical') {
        headlineStyle = 'critical';
        ctaIntensity = 'high-pressure';
    }

    trace('FRAMING_APPLIED', `${headlineStyle}/${ctaIntensity}`, { mode }, 'UI presentation boundaries assigned.');

    return {
        policyVersion: 'v3.1.0',
        mode,
        allowedPrecision,
        urgencyLevel,
        showProjectionWindows,
        displayFormat,
        showDrivers: true, // Always show drivers
        showConfidenceBand: true, // Always expose confidence
        uiFraming: {
            headlineStyle,
            ctaIntensity
        },
        reasoning,
        ruleTrace
    };
}

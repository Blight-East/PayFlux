// ─────────────────────────────────────────────────────────────────────────────
// Aggregate Data Contract
//
// Mirrors the response from /api/v1/risk/forecast/aggregate.
// Shared across ModelAuthority and VarianceBand components.
// ─────────────────────────────────────────────────────────────────────────────

export interface AggregateData {
    modelVersion: string;
    activeVersions: string[];
    window: string;
    evaluatedMerchants: number;
    totalEvaluations: number;
    meetsSignificanceThreshold: boolean;
    thresholds: { minMerchants: number; minEvaluations: number };
    tierAccuracy: number | null;
    trendAccuracy: number | null;
    meanVarianceBps: number | null;
    medianVarianceBps: number | null;
    stdDevVarianceBps: number | null;
    versionStability: boolean;
    generatedAt: string;
}

import type { BaselineSnapshotRow, MonitoredEntityRow, ReserveProjectionRow } from './db/types';

export interface ScopedForecastResponse {
    merchantId: string;
    normalizedHost: string;
    currentRiskTier: number;
    trend: string;
    tierDelta: number;
    instabilitySignal: string;
    hasProjectionAccess: boolean;
    reserveProjections: Array<{
        windowDays: number;
        baseReserveRate: number;
        worstCaseReserveRate: number;
        projectedTrappedBps: number;
        worstCaseTrappedBps: number;
        projectedTrappedUSD?: number;
        worstCaseTrappedUSD?: number;
        riskBand: string;
    }>;
    recommendedInterventions: Array<{
        action: string;
        rationale: string;
        priority: 'critical' | 'high' | 'moderate' | 'low';
    }>;
    simulationDelta: {
        velocityReduction: number;
        exposureMultiplier: number;
        rateMultiplier: number;
        label: string;
    } | null;
    projectionBasis: Record<string, unknown> | null;
    volumeMode: 'bps_only' | 'bps_plus_usd';
    projectedAt: string;
    modelVersion: string;
}

export interface ProjectionHistoryResponse {
    merchantId: string;
    normalizedHost: string;
    totalRecords: number;
    accuracy: {
        totalProjections: number;
        tierPredictionAccuracy: number | null;
        trendPredictionAccuracy: number | null;
        meanReserveVarianceBps: number | null;
        evaluationWindowHours: number;
        versionStability: {
            currentVersion: string;
            uniqueVersions: string[];
            versionChangesInWindow: number;
            isStable: boolean;
        };
        records: unknown[];
    };
    records: Array<{
        artifact: {
            projectionId: string;
            schemaVersion: string;
            merchantId: string;
            normalizedHost: string;
            projectedAt: string;
            modelVersion: string;
            inputSnapshot: Record<string, unknown>;
            appliedConstants: Record<string, unknown>;
            windowOutputs: unknown[];
            interventionOutput: Record<string, unknown>;
            instabilitySignal: string;
            writeReason: 'state_transition' | 'daily_cadence';
        };
        integrity: {
            hash: string;
            signature: string | null;
            algorithm: string;
            signedAt: string;
        };
        verification: {
            hashValid: boolean;
            signatureValid: boolean | null;
        };
    }>;
    retrievedAt: string;
}

function toUpperRiskBand(value: string | null | undefined): string {
    return String(value ?? 'elevated').toUpperCase();
}

function hashStub(value: string): string {
    return `scoped_${value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`.padEnd(32, '0');
}

function withOptionalUsd(
    windows: Array<any>,
    monthlyTPV?: number
): ScopedForecastResponse['reserveProjections'] {
    if (monthlyTPV === undefined) {
        return windows;
    }

    return windows.map((window) => ({
        ...window,
        projectedTrappedUSD: Math.round(monthlyTPV * (Number(window.projectedTrappedBps ?? 0) / 10000)),
        worstCaseTrappedUSD: Math.round(monthlyTPV * (Number(window.worstCaseTrappedBps ?? 0) / 10000)),
    }));
}

export function buildScopedForecastResponse(args: {
    monitoredEntity: MonitoredEntityRow;
    baselineSnapshot: BaselineSnapshotRow;
    reserveProjection: ReserveProjectionRow;
    monthlyTPV?: number;
}): ScopedForecastResponse {
    const basis = (args.reserveProjection.projection_basis ?? {}) as Record<string, any>;
    const reserveProjections = Array.isArray(args.reserveProjection.reserve_projections)
        ? args.reserveProjection.reserve_projections as ScopedForecastResponse['reserveProjections']
        : [];
    const simulationDelta = (args.reserveProjection.simulation_delta ?? null) as ScopedForecastResponse['simulationDelta'];

    return {
        merchantId: args.monitoredEntity.id,
        normalizedHost: args.monitoredEntity.primary_host ?? 'unknown',
        currentRiskTier: args.reserveProjection.current_risk_tier,
        trend: args.reserveProjection.trend,
        tierDelta: args.reserveProjection.tier_delta,
        instabilitySignal: args.reserveProjection.instability_signal,
        hasProjectionAccess: true,
        reserveProjections: withOptionalUsd(reserveProjections, args.monthlyTPV),
        recommendedInterventions: Array.isArray(args.reserveProjection.recommended_interventions)
            ? args.reserveProjection.recommended_interventions as ScopedForecastResponse['recommendedInterventions']
            : [],
        simulationDelta,
        projectionBasis: basis,
        volumeMode: args.monthlyTPV !== undefined ? 'bps_plus_usd' : 'bps_only',
        projectedAt: args.reserveProjection.projected_at,
        modelVersion: args.reserveProjection.model_version,
    };
}

export function buildProjectionHistoryResponse(args: {
    monitoredEntity: MonitoredEntityRow;
    projections: ReserveProjectionRow[];
}): ProjectionHistoryResponse {
    const currentVersion = args.projections[0]?.model_version ?? 'unknown';
    const uniqueVersions = Array.from(new Set(args.projections.map((projection) => projection.model_version)));

    return {
        merchantId: args.monitoredEntity.id,
        normalizedHost: args.monitoredEntity.primary_host ?? 'unknown',
        totalRecords: args.projections.length,
        accuracy: {
            totalProjections: args.projections.length,
            tierPredictionAccuracy: null,
            trendPredictionAccuracy: null,
            meanReserveVarianceBps: null,
            evaluationWindowHours: 24,
            versionStability: {
                currentVersion,
                uniqueVersions,
                versionChangesInWindow: Math.max(0, uniqueVersions.length - 1),
                isStable: uniqueVersions.length <= 1,
            },
            records: [],
        },
        records: args.projections.map((projection) => {
            const basis = projection.projection_basis as Record<string, any>;
            const windows = Array.isArray(projection.reserve_projections) ? projection.reserve_projections : [];
            return {
                artifact: {
                    projectionId: projection.id,
                    schemaVersion: '2.0.0',
                    merchantId: args.monitoredEntity.id,
                    normalizedHost: args.monitoredEntity.primary_host ?? 'unknown',
                    projectedAt: projection.projected_at,
                    modelVersion: projection.model_version,
                    inputSnapshot: basis.inputs ?? {},
                    appliedConstants: basis.constants ?? {},
                    windowOutputs: windows,
                    interventionOutput: {
                        velocityReduction: (projection.simulation_delta as Record<string, unknown> | null)?.velocityReduction ?? null,
                        exposureMultiplier: (projection.simulation_delta as Record<string, unknown> | null)?.exposureMultiplier ?? null,
                        rateMultiplier: (projection.simulation_delta as Record<string, unknown> | null)?.rateMultiplier ?? null,
                        interventionCount: Array.isArray(projection.recommended_interventions) ? projection.recommended_interventions.length : 0,
                    },
                    instabilitySignal: projection.instability_signal,
                    writeReason: projection.activation_run_id ? 'state_transition' as const : 'daily_cadence' as const,
                },
                integrity: {
                    hash: hashStub(projection.id),
                    signature: null,
                    algorithm: 'db-scoped-record',
                    signedAt: projection.created_at,
                },
                verification: {
                    hashValid: true,
                    signatureValid: null,
                },
            };
        }),
        retrievedAt: new Date().toISOString(),
    };
}

export function buildBoardReport(args: {
    forecast: ScopedForecastResponse;
    history: ProjectionHistoryResponse;
}): Record<string, unknown> {
    const forecastBasis = (args.forecast.projectionBasis ?? {}) as Record<string, any>;

    return {
        reportType: 'BOARD_RESERVE_REPORT',
        reportVersion: '2.0.0',
        generatedAt: new Date().toISOString(),
        currentForecast: {
            modelVersion: args.forecast.modelVersion,
            merchantId: args.forecast.merchantId,
            normalizedHost: args.forecast.normalizedHost,
            projectedAt: args.forecast.projectedAt,
            inputSnapshot: forecastBasis.inputs ?? null,
            appliedConstants: forecastBasis.constants ?? null,
            projectedExposure: args.forecast.reserveProjections,
            instabilitySignal: args.forecast.instabilitySignal,
        },
        interventionDerivation: {
            interventionCount: args.forecast.recommendedInterventions.length,
            interventions: args.forecast.recommendedInterventions,
            simulationParameters: args.forecast.simulationDelta
                ? {
                    velocityReduction: args.forecast.simulationDelta.velocityReduction,
                    exposureMultiplier: args.forecast.simulationDelta.exposureMultiplier,
                    rateMultiplier: args.forecast.simulationDelta.rateMultiplier,
                }
                : null,
        },
        modelAccuracy: args.history.accuracy,
        projectionLedger: {
            totalRecords: args.history.totalRecords,
            records: args.history.records.map((record) => ({
                projectedAt: record.artifact.projectedAt,
                writeReason: record.artifact.writeReason,
                inputSnapshot: record.artifact.inputSnapshot,
                appliedConstants: record.artifact.appliedConstants,
                windowOutputs: record.artifact.windowOutputs,
                instabilitySignal: record.artifact.instabilitySignal,
                modelVersion: record.artifact.modelVersion,
                integrity: {
                    hash: record.integrity.hash,
                    signedAt: record.integrity.signedAt,
                },
                verification: record.verification,
            })),
        },
        integrityDeclaration: {
            statement: 'This report is built from workspace-scoped baseline and projection records persisted in the application database.',
            artifactHash: hashStub(args.forecast.merchantId + args.forecast.projectedAt),
            algorithm: 'db-scoped-record',
            signature: 'not_signed_in_phase_2',
            keyScope: 'Internal Application Database',
            verification: 'Deterministic',
        },
    };
}

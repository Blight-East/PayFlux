import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import { RiskIntelligence } from '@/lib/risk-infra';
import { ProjectionLedger } from '@/lib/projection-ledger';
import crypto from 'crypto';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/forecast/report?host=...&monthlyTPV=...
 *
 * Board-Grade Reserve Report — Unified Artifact
 *
 * Composes five sections into a single deterministic document:
 *   1. Current Reserve Forecast (present state)
 *   2. Intervention Derivation (deterministic advisory)
 *   3. Model Accuracy (temporal proof)
 *   4. Projection Ledger (append-only record)
 *   5. Integrity Declaration
 *
 * This endpoint returns structured JSON. The client renders it as
 * a print-native document. No styling dependencies. No interactivity.
 *
 * Gated: requires projection access (Pro+ only).
 */
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    if (!canAccess(workspace.tier, "reserve_projection")) {
        return NextResponse.json(
            { error: 'Board report requires Pro tier', code: 'UPGRADE_REQUIRED' },
            { status: 402 }
        );
    }

    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');

    if (!host) {
        return NextResponse.json(
            { error: 'Missing host parameter', code: 'INVALID_REQUEST' },
            { status: 400 }
        );
    }

    // Parse optional monthlyTPV
    let monthlyTPV: number | undefined;
    const rawTPV = searchParams.get('monthlyTPV');
    if (rawTPV !== null) {
        const parsed = Number(rawTPV);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1e10) {
            monthlyTPV = parsed;
        }
    }

    // Resolve live forecast data by calling the forecast endpoint internally
    const forecastUrl = new URL('/api/v1/risk/forecast', request.url);
    forecastUrl.searchParams.set('host', host);
    if (monthlyTPV) forecastUrl.searchParams.set('monthlyTPV', String(monthlyTPV));

    const forecastRes = await fetch(forecastUrl.toString(), {
        headers: { cookie: request.headers.get('cookie') || '' },
    });

    if (!forecastRes.ok) {
        return NextResponse.json(
            { error: 'Failed to resolve forecast data', code: 'FORECAST_UNAVAILABLE' },
            { status: forecastRes.status }
        );
    }

    const forecast = await forecastRes.json();

    // Resolve projection history + accuracy
    const snapshots = await RiskIntelligence.getAllSnapshots();
    const snapshot = snapshots.find(s => s.normalizedHost === host.toLowerCase());

    let historySection = null;
    let accuracySection = null;

    if (snapshot) {
        const history = await ProjectionLedger.getHistory(snapshot.merchantId, 50);
        const accuracy = ProjectionLedger.deriveAccuracy(history, {
            riskTier: snapshot.currentRiskTier,
            trend: snapshot.trend,
            tierDelta: snapshot.tierDeltaLast,
        });

        historySection = history.map(h => ({
            projectedAt: h.artifact.projectedAt,
            writeReason: h.artifact.writeReason,
            inputSnapshot: h.artifact.inputSnapshot,
            appliedConstants: h.artifact.appliedConstants,
            windowOutputs: h.artifact.windowOutputs,
            instabilitySignal: h.artifact.instabilitySignal,
            modelVersion: h.artifact.modelVersion,
            integrity: {
                hash: h.integrity.hash,
                signedAt: h.integrity.signedAt,
            },
            verification: h.verification,
        }));

        accuracySection = accuracy;
    }

    // Build integrity declaration
    const generatedAt = new Date().toISOString();
    const artifactPayload = JSON.stringify({
        forecast: forecast.projectionBasis,
        accuracy: accuracySection,
        generatedAt,
    });
    const artifactHash = crypto.createHash('sha256')
        .update(Buffer.from(artifactPayload, 'utf-8'))
        .digest('hex');

    const report = {
        reportType: 'BOARD_RESERVE_REPORT',
        reportVersion: '1.0.0',
        generatedAt,

        // Section 1: Current Reserve Forecast
        currentForecast: {
            modelVersion: forecast.modelVersion,
            merchantId: forecast.merchantId,
            normalizedHost: forecast.normalizedHost,
            projectedAt: forecast.projectedAt,
            inputSnapshot: forecast.projectionBasis?.inputs || null,
            appliedConstants: forecast.projectionBasis?.constants || null,
            projectedExposure: forecast.reserveProjections,
            instabilitySignal: forecast.instabilitySignal,
        },

        // Section 2: Intervention Derivation
        interventionDerivation: {
            interventionCount: forecast.recommendedInterventions?.length || 0,
            interventions: (forecast.recommendedInterventions || []).map((i: { action: string; rationale: string; priority: string; velocityReduction?: number }) => ({
                action: i.action,
                rationale: i.rationale,
                priority: i.priority,
                velocityReduction: i.velocityReduction || null,
            })),
            simulationParameters: forecast.simulationDelta ? {
                velocityReduction: forecast.simulationDelta.velocityReduction,
                exposureMultiplier: forecast.simulationDelta.exposureMultiplier,
                rateMultiplier: forecast.simulationDelta.rateMultiplier,
                derivationFormula: {
                    exposureMultiplier: '(1 - velocityReduction) ^ 1.5',
                    rateMultiplier: '(1 - velocityReduction) ^ 1.2',
                },
            } : null,
        },

        // Section 3: Model Accuracy
        modelAccuracy: accuracySection,

        // Section 4: Projection Ledger
        projectionLedger: {
            totalRecords: historySection?.length || 0,
            records: historySection || [],
        },

        // Section 5: Integrity Declaration
        integrityDeclaration: {
            statement: 'All projections are deterministically derived. All historical entries are append-only. Each record is SHA-256 hashed and HMAC-SHA256 signed at creation. Historical records are never modified post-signature.',
            artifactHash,
            algorithm: 'sha256',
            signature: 'HMAC-SHA256',
            keyScope: 'Internal System Credential',
            verification: 'Deterministic',
        },
    };

    return NextResponse.json(report, {
        headers: {
            'Cache-Control': 'no-store',
            'X-Report-Type': 'BOARD_RESERVE_REPORT',
        },
    });
}

'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirror API response, never recompute client-side
// ─────────────────────────────────────────────────────────────────────────────

interface AccuracyRecord {
    projectedAt: string;
    evaluatedAt: string;
    predictedTier: number;
    actualTier: number;
    tierVariance: number;
    tierAccurate: boolean;
    predictedTrend: string;
    actualTrend: string;
    trendAccurate: boolean;
    projectedReserveRate: number;
    actualReserveRate: number;
    reserveRateVarianceBps: number;
}

interface VersionStability {
    currentVersion: string;
    uniqueVersions: string[];
    versionChangesInWindow: number;
    isStable: boolean;
}

interface Accuracy {
    totalProjections: number;
    tierPredictionAccuracy: number | null;
    trendPredictionAccuracy: number | null;
    meanReserveVarianceBps: number | null;
    evaluationWindowHours: number;
    versionStability: VersionStability;
    records: AccuracyRecord[];
}

interface ProjectionArtifact {
    projectionId: string;
    schemaVersion: string;
    merchantId: string;
    normalizedHost: string;
    projectedAt: string;
    modelVersion: string;
    inputSnapshot: {
        riskTier: number;
        riskBand: string;
        trend: string;
        tierDelta: number;
        policySurface: { present: number; weak: number; missing: number };
    };
    appliedConstants: {
        baseReserveRate: number;
        trendMultiplier: number;
        projectedTier: number;
        projectedReserveRate: number;
        worstCaseReserveRate: number;
        reserveRateCeiling: number;
    };
    windowOutputs: {
        windowDays: number;
        projectedTrappedBps: number;
        worstCaseTrappedBps: number;
        projectedTrappedUSD?: number;
        worstCaseTrappedUSD?: number;
    }[];
    interventionOutput: {
        velocityReduction: number | null;
        exposureMultiplier: number | null;
        rateMultiplier: number | null;
        interventionCount: number;
    };
    instabilitySignal: string;
    writeReason: 'daily_cadence' | 'state_transition';
}

interface HistoryRecord {
    artifact: ProjectionArtifact;
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
}

interface HistoryResponse {
    merchantId: string;
    normalizedHost: string;
    totalRecords: number;
    accuracy: Accuracy;
    records: HistoryRecord[];
    retrievedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m} UTC`;
}

function formatRate(rate: number): string {
    return (rate * 100).toFixed(2) + '%';
}

function formatUSD(n: number): string {
    return '$' + n.toLocaleString('en-US');
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Accuracy Block
// ─────────────────────────────────────────────────────────────────────────────

function ModelAccuracy({ accuracy }: { accuracy: Accuracy }) {
    if (accuracy.tierPredictionAccuracy === null) {
        return (
            <div className="border border-gray-200 rounded-lg px-5 py-4">
                <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Forecast confidence</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 font-mono">
                    Not enough completed history yet. PayFlux needs at least 2 forecasts and a {accuracy.evaluationWindowHours}h evaluation window before it shows confidence data.
                </p>
            </div>
        );
    }

    const vs = accuracy.versionStability;

    return (
        <div className="border border-gray-200 rounded-lg px-5 py-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Recent forecast confidence</span>
                <span className="text-[10px] text-gray-400 font-mono">{accuracy.records.length} evaluated</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
                <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Risk level forecast</span>
                    <span className="text-lg font-mono font-bold text-gray-900">{accuracy.tierPredictionAccuracy}%</span>
                </div>
                <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Direction forecast</span>
                    <span className="text-lg font-mono font-bold text-gray-900">{accuracy.trendPredictionAccuracy}%</span>
                </div>
                <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Typical forecast error</span>
                    <span className="text-lg font-mono font-bold text-gray-900">
                        {accuracy.meanReserveVarianceBps !== null ? `±${(accuracy.meanReserveVarianceBps / 100).toFixed(2)}%` : '—'}
                    </span>
                </div>
                <div>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Evaluation window</span>
                    <span className="text-lg font-mono font-bold text-gray-900">{accuracy.evaluationWindowHours}h</span>
                </div>
            </div>
            {/* Version stability */}
            <div className="mt-3 pt-2 border-t border-gray-200 flex items-center space-x-4">
                <span className="text-[10px] text-gray-400 font-mono">Forecast model: {vs.currentVersion}</span>
                <span className={`text-[10px] font-mono ${vs.isStable ? 'text-emerald-500/60' : 'text-amber-500/60'}`}>
                    {vs.isStable ? '✓ Stable' : `${vs.versionChangesInWindow} version change${vs.versionChangesInWindow !== 1 ? 's' : ''} in window`}
                </span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger Entry — Individual projection record
// ─────────────────────────────────────────────────────────────────────────────

function LedgerEntry({ record, accuracyRecord }: { record: HistoryRecord; accuracyRecord?: AccuracyRecord }) {
    const [expanded, setExpanded] = useState(false);
    const { artifact, integrity, verification } = record;
    const input = artifact.inputSnapshot;
    const constants = artifact.appliedConstants;
    const primary = artifact.windowOutputs.find(w => w.windowDays === 90);

    const isVerified = verification.hashValid && (verification.signatureValid === null || verification.signatureValid);
    const triggerLabel = artifact.writeReason === 'state_transition' ? 'Risk change' : 'Daily check';

    return (
        <div className="relative pl-8">
            {/* Timeline dot + line */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${artifact.writeReason === 'state_transition' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                <div className="w-px flex-1 bg-gray-200 mt-1" />
            </div>

            <div className="pb-6">
                {/* Date + trigger */}
                <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-mono font-semibold text-gray-700">
                        {formatDate(artifact.projectedAt)}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                        {formatTime(artifact.projectedAt)}
                    </span>
                    <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${artifact.writeReason === 'state_transition'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}>
                        {triggerLabel}
                    </span>
                </div>

                {/* Projection data */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                    {/* Risk state */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Risk level at the time</span>
                            <span className="text-sm font-mono font-semibold text-gray-900">
                                Level {input.riskTier}
                                {input.tierDelta !== 0 && (
                                    <span className={input.tierDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
                                        {' '}{input.tierDelta > 0 ? '+' : ''}{input.tierDelta}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Direction</span>
                            <span className={`text-sm font-mono font-semibold ${input.trend === 'DEGRADING' ? 'text-red-400' : input.trend === 'IMPROVING' ? 'text-emerald-400' : 'text-gray-700'
                                }`}>{input.trend}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Estimated hold rate</span>
                            <span className="text-sm font-mono font-semibold text-gray-900">{formatRate(constants.worstCaseReserveRate)}</span>
                        </div>
                    </div>

                    {/* Primary window */}
                    {primary && (
                        <div className="border-t border-gray-200 pt-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Possible money held back in 90 days</span>
                            <div className="flex items-baseline space-x-3">
                                {primary.worstCaseTrappedUSD !== undefined ? (
                                    <span className="text-base font-mono font-bold text-gray-900">{formatUSD(primary.worstCaseTrappedUSD)}</span>
                                ) : (
                                    <span className="text-base font-mono font-bold text-gray-900">{(primary.worstCaseTrappedBps / 100).toFixed(1)}% <span className="text-xs font-normal text-gray-500">({primary.worstCaseTrappedBps} bps)</span></span>
                                )}
                                <span className="text-[10px] text-gray-400 font-mono">escalation scenario</span>
                            </div>
                        </div>
                    )}

                    {/* Verification badge */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-1.5">
                            {isVerified ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
                            ) : (
                                <XCircle className="w-3 h-3 text-red-400/60" />
                            )}
                            <span className={`text-[10px] font-mono ${isVerified ? 'text-emerald-500/60' : 'text-red-400/60'}`}>
                                {isVerified ? 'Signed and verified' : 'Verification issue'}
                            </span>
                        </div>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center space-x-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FileText className="w-3 h-3" />
                            <span>Audit details</span>
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </div>

                    {/* Integrity details (expandable) */}
                    {expanded && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1.5 text-[10px] font-mono text-gray-400">
                            <div className="flex justify-between">
                                <span>Hash:</span>
                                <span className="text-gray-500 truncate ml-4 max-w-[280px]">{integrity.hash}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Signature:</span>
                                <span className="text-gray-500 truncate ml-4 max-w-[280px]">{integrity.signature || 'DEGRADED'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Algorithm:</span>
                                <span className="text-gray-500">{integrity.algorithm}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Model:</span>
                                <span className="text-gray-500">{artifact.modelVersion}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Schema:</span>
                                <span className="text-gray-500">v{artifact.schemaVersion}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Hash valid:</span>
                                <span className={verification.hashValid ? 'text-emerald-500/80' : 'text-red-400/80'}>
                                    {verification.hashValid ? '✓' : '✗'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Signature valid:</span>
                                <span className={verification.signatureValid === null ? 'text-gray-400' : verification.signatureValid ? 'text-emerald-500/80' : 'text-red-400/80'}>
                                    {verification.signatureValid === null ? 'N/A' : verification.signatureValid ? '✓' : '✗'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Accuracy evaluation (if available) */}
                    {accuracyRecord && (
                        <div className={`border-t pt-2 ${accuracyRecord.tierAccurate ? 'border-gray-200' : 'border-red-500/20'}`}>
                            <div className="flex items-center space-x-2 mb-1">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider">Evaluated {formatDate(accuracyRecord.evaluatedAt)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Risk level forecast → actual</span>
                                    <span className={`text-xs font-mono font-semibold ${accuracyRecord.tierAccurate ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {accuracyRecord.predictedTier} → {accuracyRecord.actualTier}
                                        {' '}{accuracyRecord.tierAccurate ? '✓' : '✗'}
                                    </span>
                                    {accuracyRecord.tierVariance !== 0 && (
                                        <span className="text-[10px] font-mono text-gray-400 block">
                                            variance: {accuracyRecord.tierVariance > 0 ? '+' : ''}{accuracyRecord.tierVariance} tier{Math.abs(accuracyRecord.tierVariance) !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Direction forecast → actual</span>
                                    <span className={`text-xs font-mono font-semibold ${accuracyRecord.trendAccurate ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {accuracyRecord.predictedTrend} → {accuracyRecord.actualTrend}
                                        {' '}{accuracyRecord.trendAccurate ? '✓' : '✗'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Hold-rate forecast → actual</span>
                                    <span className="text-xs font-mono font-semibold text-gray-700">
                                        {formatRate(accuracyRecord.projectedReserveRate)} → {formatRate(accuracyRecord.actualReserveRate)}
                                    </span>
                                    <span className={`text-[10px] font-mono block ${Math.abs(accuracyRecord.reserveRateVarianceBps) <= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {accuracyRecord.reserveRateVarianceBps >= 0 ? '+' : ''}{(accuracyRecord.reserveRateVarianceBps / 100).toFixed(2)}% ({accuracyRecord.reserveRateVarianceBps} bps)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectionTimeline({ host }: { host: string | null }) {
    const [data, setData] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!host) {
            setLoading(false);
            return;
        }

        async function fetchHistory() {
            try {
                const res = await fetch(`/api/v1/risk/forecast/history?host=${encodeURIComponent(host!)}`);
                if (res.status === 402) {
                    setLoading(false);
                    return; // Not available for this tier
                }
                if (!res.ok) {
                    setError('Failed to load projection history');
                    setLoading(false);
                    return;
                }
                const json: HistoryResponse = await res.json();
                setData(json);
            } catch {
                setError('Failed to load projection history');
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, [host]);

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-100 rounded-lg" />
                <div className="h-32 bg-gray-100 rounded-lg" />
            </div>
        );
    }

    if (error || !data) return null;
    if (data.totalRecords === 0) {
        return (
            <div className="border border-gray-200 rounded-lg px-5 py-4 space-y-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Monitoring history</span>
                <p className="text-[11px] text-gray-400 font-mono leading-relaxed">
                    No history yet. This view fills in after the first saved forecast.
                </p>
            </div>
        );
    }

    // Build lookup: projectedAt → accuracyRecord for matching
    const accuracyByDate = new Map<string, AccuracyRecord>();
    for (const r of data.accuracy.records) {
        accuracyByDate.set(r.projectedAt, r);
    }

    return (
        <div className="space-y-4">
            <ModelAccuracy accuracy={data.accuracy} />

            <div className="space-y-1">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Monitoring history</span>
                    <span className="text-[10px] text-gray-400 font-mono">{data.totalRecords} record{data.totalRecords !== 1 ? 's' : ''}</span>
                </div>

                <div>
                    {data.records.map((record) => (
                        <LedgerEntry
                            key={record.artifact.projectionId}
                            record={record}
                            accuracyRecord={accuracyByDate.get(record.artifact.projectedAt)}
                        />
                    ))}
                </div>

                <div className="pt-2 pl-8">
                    <p className="text-[10px] text-gray-400 font-mono leading-relaxed">
                        Append-only signed history. Open audit details on any record if you need hashes, signatures, or version metadata.
                    </p>
                </div>
            </div>
        </div>
    );
}

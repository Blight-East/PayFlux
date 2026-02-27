'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, AlertTriangle, TrendingDown, TrendingUp, Minus, FileDown, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry — fire and forget, never blocks UI
// ─────────────────────────────────────────────────────────────────────────────

function track(event: string, properties?: Record<string, string>) {
    try {
        fetch('/api/v1/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, properties }),
        }).catch(() => { });
    } catch {
        // Never throw from telemetry
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors /api/v1/risk/forecast response)
// ─────────────────────────────────────────────────────────────────────────────

interface ReserveWindowProjection {
    windowDays: number;
    baseReserveRate: number;
    worstCaseReserveRate: number;
    projectedTrappedBps: number;
    worstCaseTrappedBps: number;
    projectedTrappedUSD?: number;
    worstCaseTrappedUSD?: number;
    riskBand: string;
}

interface Intervention {
    action: string;
    rationale: string;
    priority: 'critical' | 'high' | 'moderate' | 'low';
    velocityReduction?: number;
}

interface SimulationDelta {
    velocityReduction: number;
    exposureMultiplier: number;
    rateMultiplier: number;
    label: string;
}

interface ProjectionBasis {
    inputs: {
        riskTier: number;
        riskBand: string;
        trend: string;
        tierDelta: number;
        policySurface: { present: number; weak: number; missing: number };
    };
    constants: {
        baseReserveRate: number;
        trendMultiplier: number;
        projectedTier: number;
        projectedReserveRate: number;
        worstCaseReserveRate: number;
        reserveRateCeiling: number;
    };
    interventionBasis: {
        velocityReductionApplied: number | null;
        exposureMultiplier: number | null;
        rateMultiplier: number | null;
        derivationFormula: string;
    };
}

interface ForecastData {
    merchantId: string;
    normalizedHost: string;
    currentRiskTier: number;
    trend: string;
    tierDelta: number;
    reserveProjections: ReserveWindowProjection[];
    instabilitySignal: string;
    hasProjectionAccess: boolean;
    recommendedInterventions: Intervention[];
    simulationDelta: SimulationDelta | null;
    projectionBasis: ProjectionBasis | null;
    volumeMode: 'bps_only' | 'bps_plus_usd';
    projectedAt: string;
    modelVersion: string;
}

type PanelState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'no_data' }
    | { status: 'loaded'; data: ForecastData };

// ─────────────────────────────────────────────────────────────────────────────
// Instability Signal Config
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    NOMINAL: { label: 'Nominal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    RECOVERING: { label: 'Recovering', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    LATENT: { label: 'Latent', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    ELEVATED: { label: 'Elevated', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    ACCELERATING: { label: 'Accelerating', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

const TREND_ICONS: Record<string, typeof TrendingUp> = {
    DEGRADING: TrendingDown,
    IMPROVING: TrendingUp,
    STABLE: Minus,
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatting Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatUSD(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

function formatBps(bps: number): string {
    return `${(bps / 100).toFixed(1)}%`;
}

function formatRate(rate: number): string {
    return `${(rate * 100).toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

function InstabilityBadge({ signal }: { signal: string }) {
    const config = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.NOMINAL;
    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${config.bg} ${config.color} border ${config.border}`}>
            <Shield className="w-3 h-3 mr-1.5" />
            {config.label}
        </span>
    );
}

function WindowCard({ projection, isAccelerating, isPrimary, isSimulating, simulationDelta }: { projection: ReserveWindowProjection; isAccelerating: boolean; isPrimary: boolean; isSimulating?: boolean; simulationDelta?: SimulationDelta | null }) {
    const hasUSD = projection.projectedTrappedUSD !== undefined;
    const worstHighlightColor = isAccelerating ? 'text-red-400' : 'text-zinc-200';

    // Simulation multipliers — derived from intervention engine, not hardcoded
    const exposureMultiplier = (isSimulating && simulationDelta) ? simulationDelta.exposureMultiplier : 1;
    const rateMultiplier = (isSimulating && simulationDelta) ? simulationDelta.rateMultiplier : 1;

    const worstRate = projection.worstCaseReserveRate * rateMultiplier;
    const worstBps = projection.worstCaseTrappedBps * exposureMultiplier;
    const worstUSD = hasUSD ? projection.worstCaseTrappedUSD! * exposureMultiplier : undefined;

    // Primary emphasis gets a dynamic stroke based on simulation
    const borderClass = isPrimary
        ? (isSimulating ? 'border-emerald-500/50 ring-1 ring-emerald-500/20 bg-emerald-500/5' : 'border-zinc-700 ring-1 ring-zinc-700/50')
        : (isSimulating ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800');

    return (
        <div className={`bg-zinc-900/50 border ${borderClass} rounded-lg p-5 space-y-4 transition-all duration-300`}>
            {/* Window Header */}
            <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">{projection.windowDays}d</span>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Rolling Reserve</span>
            </div>

            {/* Rates — scenario labels reinforce trajectory modeling */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Base Scenario</span>
                    <span className="text-sm text-zinc-400">{formatRate(projection.baseReserveRate)}</span>
                </div>
                <div>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Escalation Scenario</span>
                    <div className="flex items-center space-x-2">
                        <span className={`text-sm font-semibold ${isSimulating ? 'text-emerald-400' : worstHighlightColor}`}>
                            {formatRate(worstRate)}
                        </span>
                        {isSimulating && (
                            <span className="text-[10px] text-zinc-600 line-through">{formatRate(projection.worstCaseReserveRate)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Separator */}
            <div className="border-t border-zinc-800" />

            {/* Trapped Exposure — USD values are the conversion driver, must feel weighty */}
            {hasUSD ? (
                <div className="space-y-3">
                    <div>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Capital At Risk</span>
                        <span className="text-2xl font-bold text-white">{formatUSD(projection.projectedTrappedUSD!)}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Escalation Trapped</span>
                        <div className="flex items-baseline space-x-2">
                            <span className={`text-2xl font-extrabold ${isSimulating ? 'text-emerald-400' : worstHighlightColor}`}>
                                {formatUSD(worstUSD!)}
                            </span>
                            {isSimulating && (
                                <span className="text-xs text-zinc-600 line-through">{formatUSD(projection.worstCaseTrappedUSD!)}</span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Capital At Risk</span>
                        <span className="text-xl font-bold text-white">{formatBps(projection.projectedTrappedBps)}</span>
                        <span className="text-[10px] text-zinc-600 ml-1">of monthly TPV</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Escalation Exposure</span>
                        <div className="flex items-baseline space-x-2">
                            <span className={`text-xl font-extrabold ${isSimulating ? 'text-emerald-400' : worstHighlightColor}`}>
                                {formatBps(worstBps)}
                            </span>
                            {isSimulating && (
                                <span className="text-xs text-zinc-600 line-through">{formatBps(projection.worstCaseTrappedBps)}</span>
                            )}
                        </div>
                        <span className="text-[10px] text-zinc-600 ml-1">of monthly TPV</span>
                    </div>
                </div>
            )}
        </div>
    );
}
const PRIORITY_STYLES: Record<string, { text: string; bg: string; border: string; dot: string }> = {
    critical: { text: 'text-red-400', bg: 'bg-red-500/5', border: 'border-red-500/20', dot: 'bg-red-500' },
    high: { text: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/20', dot: 'bg-orange-500' },
    moderate: { text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20', dot: 'bg-amber-500' },
    low: { text: 'text-zinc-400', bg: 'bg-zinc-800/30', border: 'border-zinc-800', dot: 'bg-zinc-600' },
};

function InterventionBlock({ interventions, isSimulating }: { interventions: Intervention[]; isSimulating?: boolean }) {
    return (
        <div className="border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">Recommended Intervention</h4>
                <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Advisory Only</span>
            </div>

            <div className="space-y-2.5">
                {interventions.map((intervention, i) => {
                    const style = PRIORITY_STYLES[intervention.priority] || PRIORITY_STYLES.moderate;
                    const isBeingSimulated = isSimulating && intervention.velocityReduction !== undefined && intervention.velocityReduction > 0;
                    const isDimmed = isSimulating && !isBeingSimulated;

                    return (
                        <div
                            key={i}
                            className={`p-3.5 rounded-lg border space-y-1.5 transition-all duration-300 ${isBeingSimulated
                                ? 'border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                                : isDimmed
                                    ? `${style.border} ${style.bg} opacity-40`
                                    : `${style.border} ${style.bg}`
                                }`}
                        >
                            <div className="flex items-center space-x-2.5">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isBeingSimulated ? 'bg-emerald-500' : style.dot}`} />
                                <span className={`text-xs font-semibold ${isBeingSimulated ? 'text-emerald-400' : style.text}`}>{intervention.action}</span>
                                <span className={`text-[9px] uppercase tracking-wider font-bold ml-auto ${isBeingSimulated ? 'text-emerald-400 opacity-60' : `${style.text} opacity-60`}`}>
                                    {isBeingSimulated ? 'simulating' : intervention.priority}
                                </span>
                            </div>
                            <p className={`text-[11px] leading-relaxed pl-4 ${isDimmed ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                {intervention.rationale}
                            </p>
                            {isBeingSimulated && (
                                <p className="text-[10px] text-emerald-500/60 pl-4 italic">
                                    Simulating this intervention&apos;s impact on reserve accumulation.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] text-zinc-700 leading-relaxed pt-1">
                Recommendations derived from current risk signal state. PayFlux does not modify processor configuration.
            </p>
        </div>
    );
}

function ForbiddenState() {
    return (
        <div className="border border-zinc-800 rounded-xl p-8 space-y-6">
            <div className="flex items-start space-x-4">
                <div className="p-3 bg-zinc-900 rounded-full flex-shrink-0">
                    <Lock className="w-5 h-5 text-zinc-600" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-200">Financial Modeling Locked</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                        Projection is unavailable in Diagnostic mode. Upgrade to Pro to model reserve holds
                        across T+90, T+120, and T+180 windows before processors escalate.
                    </p>
                </div>
            </div>

            {/* Value bullets */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-900/50 rounded-lg">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">90 / 120 / 180d</span>
                    <span className="text-xs text-zinc-400">Reserve windows</span>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-lg">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Base + Escalation</span>
                    <span className="text-xs text-zinc-400">Scenario modeling</span>
                </div>
                <div className="p-3 bg-zinc-900/50 rounded-lg">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">USD Exposure</span>
                    <span className="text-xs text-zinc-400">Dollar projections</span>
                </div>
            </div>

            {/* CTA */}
            <div className="text-center">
                <button
                    onClick={() => track('forecast_unlock_clicked')}
                    className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                    Unlock Operational Mode
                </button>
                <p className="text-[10px] text-zinc-700 mt-2">Required for reserve modeling</p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Modal — print-friendly artifact for sales enablement
// ─────────────────────────────────────────────────────────────────────────────

function ForecastExportModal({ data, onClose }: { data: ForecastData; onClose: () => void }) {
    const signalConfig = SIGNAL_CONFIG[data.instabilitySignal] || SIGNAL_CONFIG.NOMINAL;
    const hasUSD = data.volumeMode === 'bps_plus_usd';
    const primary = data.reserveProjections.find((p) => p.windowDays === 90);
    const projectedAt = new Date(data.projectedAt).toLocaleString();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop — hidden in print */}
            <div
                className="absolute inset-0 bg-black/70 print:hidden"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:mx-0 print:max-w-none">
                {/* Modal Controls — hidden in print */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
                    <span className="text-sm font-medium text-gray-600">Reserve Forecast Export</span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Print / Save PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Print Content */}
                <div className="p-8 space-y-8 text-gray-900" id="forecast-export-content">
                    {/* Header */}
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold text-gray-900">Reserve Exposure Forecast</h1>
                        <p className="text-sm text-gray-500">{data.normalizedHost}</p>
                    </div>

                    {/* Summary Row */}
                    <div className="grid grid-cols-3 gap-6 py-4 border-y border-gray-200">
                        <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Instability Signal</span>
                            <span className="text-sm font-semibold text-gray-900">{signalConfig.label}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Risk Tier</span>
                            <span className="text-sm font-semibold text-gray-900">
                                Tier {data.currentRiskTier}
                                {data.tierDelta !== 0 && (
                                    <span className={data.tierDelta > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                        {' '}{data.tierDelta > 0 ? '+' : ''}{data.tierDelta}
                                    </span>
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Trend</span>
                            <span className="text-sm font-semibold text-gray-900">{data.trend}</span>
                        </div>
                    </div>

                    {/* Primary Window — 90d highlighted */}
                    {primary && (
                        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">90-Day Reserve Window</span>
                                <span className="text-[10px] text-gray-400">Most probable hold period</span>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Base Scenario</span>
                                    <span className="text-lg font-bold text-gray-900">{formatRate(primary.baseReserveRate)}</span>
                                    {hasUSD && primary.projectedTrappedUSD !== undefined && (
                                        <span className="text-2xl font-bold text-gray-900 block mt-1">{formatUSD(primary.projectedTrappedUSD)}</span>
                                    )}
                                    {!hasUSD && (
                                        <span className="text-lg font-bold text-gray-900 block mt-1">
                                            {formatBps(primary.projectedTrappedBps)} <span className="text-xs font-normal text-gray-400">of TPV</span>
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Escalation Scenario</span>
                                    <span className="text-lg font-bold text-red-700">{formatRate(primary.worstCaseReserveRate)}</span>
                                    {hasUSD && primary.worstCaseTrappedUSD !== undefined && (
                                        <span className="text-2xl font-extrabold text-red-700 block mt-1">{formatUSD(primary.worstCaseTrappedUSD)}</span>
                                    )}
                                    {!hasUSD && (
                                        <span className="text-lg font-extrabold text-red-700 block mt-1">
                                            {formatBps(primary.worstCaseTrappedBps)} <span className="text-xs font-normal text-gray-400">of TPV</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* All Windows Table */}
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">All Reserve Windows</span>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 text-[10px] text-gray-400 uppercase tracking-wider font-medium">Window</th>
                                    <th className="text-right py-2 text-[10px] text-gray-400 uppercase tracking-wider font-medium">Base Rate</th>
                                    <th className="text-right py-2 text-[10px] text-gray-400 uppercase tracking-wider font-medium">Escalation Rate</th>
                                    {hasUSD && <th className="text-right py-2 text-[10px] text-gray-400 uppercase tracking-wider font-medium">Projected</th>}
                                    {hasUSD && <th className="text-right py-2 text-[10px] text-gray-400 uppercase tracking-wider font-medium">Escalation</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {data.reserveProjections.map((p) => (
                                    <tr key={p.windowDays} className={`border-b border-gray-100 ${p.windowDays === 90 ? 'bg-gray-50 font-semibold' : ''}`}>
                                        <td className="py-2.5 text-gray-900">{p.windowDays} days</td>
                                        <td className="py-2.5 text-right text-gray-700">{formatRate(p.baseReserveRate)}</td>
                                        <td className="py-2.5 text-right text-red-700">{formatRate(p.worstCaseReserveRate)}</td>
                                        {hasUSD && <td className="py-2.5 text-right text-gray-900">{p.projectedTrappedUSD !== undefined ? formatUSD(p.projectedTrappedUSD) : '—'}</td>}
                                        {hasUSD && <td className="py-2.5 text-right text-red-700 font-bold">{p.worstCaseTrappedUSD !== undefined ? formatUSD(p.worstCaseTrappedUSD) : '—'}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Projection Basis — Full Derivation Chain */}
                    {data.projectionBasis && (
                        <div className="space-y-4">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Projection Basis</span>

                            {/* Input Snapshot */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-3">Input Snapshot</span>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500 w-1/2">Risk Tier</td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">Tier {data.projectionBasis.inputs.riskTier} ({data.projectionBasis.inputs.riskBand})</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Trend</td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">{data.projectionBasis.inputs.trend}</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Tier Delta (last period)</td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">{data.projectionBasis.inputs.tierDelta > 0 ? '+' : ''}{data.projectionBasis.inputs.tierDelta}</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Policy Surface</td>
                                            <td className="py-1.5 text-right font-medium text-gray-900">
                                                {data.projectionBasis.inputs.policySurface.present} present, {data.projectionBasis.inputs.policySurface.weak} weak, {data.projectionBasis.inputs.policySurface.missing} missing
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Applied Constants */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-3">Applied Constants</span>
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500 w-1/2">Base Reserve Rate</td>
                                            <td className="py-1.5 text-right font-mono font-medium text-gray-900">{(data.projectionBasis.constants.baseReserveRate * 100).toFixed(2)}%</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Trend Multiplier</td>
                                            <td className="py-1.5 text-right font-mono font-medium text-gray-900">{data.projectionBasis.constants.trendMultiplier}×</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Projected Tier (if trend continues)</td>
                                            <td className="py-1.5 text-right font-mono font-medium text-gray-900">Tier {data.projectionBasis.constants.projectedTier}</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Projected Reserve Rate</td>
                                            <td className="py-1.5 text-right font-mono font-medium text-gray-900">{(data.projectionBasis.constants.projectedReserveRate * 100).toFixed(2)}%</td>
                                        </tr>
                                        <tr className="border-b border-gray-100">
                                            <td className="py-1.5 text-gray-500">Worst-Case Reserve Rate</td>
                                            <td className="py-1.5 text-right font-mono font-medium text-red-700">{(data.projectionBasis.constants.worstCaseReserveRate * 100).toFixed(2)}%</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1.5 text-gray-500">Rate Ceiling (hard cap)</td>
                                            <td className="py-1.5 text-right font-mono font-medium text-gray-900">{(data.projectionBasis.constants.reserveRateCeiling * 100).toFixed(0)}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Intervention Derivation */}
                            {data.projectionBasis.interventionBasis.velocityReductionApplied !== null && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-3">Intervention Derivation</span>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-1.5 text-gray-500 w-1/2">Velocity Reduction</td>
                                                <td className="py-1.5 text-right font-mono font-medium text-gray-900">{(data.projectionBasis.interventionBasis.velocityReductionApplied! * 100).toFixed(0)}%</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-1.5 text-gray-500">Exposure Multiplier</td>
                                                <td className="py-1.5 text-right font-mono font-medium text-gray-900">{data.projectionBasis.interventionBasis.exposureMultiplier}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100">
                                                <td className="py-1.5 text-gray-500">Rate Multiplier</td>
                                                <td className="py-1.5 text-right font-mono font-medium text-gray-900">{data.projectionBasis.interventionBasis.rateMultiplier}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1.5 text-gray-500">Formula</td>
                                                <td className="py-1.5 text-right font-mono text-[11px] text-gray-600">{data.projectionBasis.interventionBasis.derivationFormula}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span>Generated {projectedAt}</span>
                            <span>PayFlux deterministic reserve model ({data.modelVersion})</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            This forecast is a deterministic projection based on current risk signals and does not constitute
                            financial advice. Reserve rates are modeled estimates — actual processor behavior may differ.
                            Volume figures, if shown, were supplied by the user and are not stored or validated by PayFlux.
                        </p>
                        <p className="text-[10px] text-gray-300 pt-1">
                            payflux.dev
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ReserveForecastPanel({ host }: { host: string | null }) {
    const [state, setState] = useState<PanelState>({ status: 'idle' });
    const [volumeInput, setVolumeInput] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [simulateOptimization, setSimulateOptimization] = useState(false);

    const fetchForecast = useCallback(async (targetHost: string, monthlyTPV?: number) => {
        setState({ status: 'loading' });

        try {
            const params = new URLSearchParams({ host: targetHost });
            if (monthlyTPV !== undefined && monthlyTPV > 0) {
                params.set('monthlyTPV', String(monthlyTPV));
            }

            const res = await fetch(`/api/v1/risk/forecast?${params.toString()}`);

            if (res.status === 404) {
                setState({ status: 'no_data' });
                return;
            }

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setState({ status: 'error', message: body.error || `HTTP ${res.status}` });
                return;
            }

            const data: ForecastData = await res.json();
            setState({ status: 'loaded', data });
            track('forecast_panel_viewed', { host: targetHost, signal: data.instabilitySignal, tier: String(data.currentRiskTier) });
        } catch (err) {
            setState({ status: 'error', message: (err as Error).message });
        }
    }, []);

    // Fetch on mount when host is available
    useEffect(() => {
        if (host) {
            fetchForecast(host);
        }
    }, [host, fetchForecast]);

    // Handle volume input submission — guard against concurrent fetches
    const handleVolumeSubmit = () => {
        if (!host || state.status === 'loading') return;
        const parsed = Number(volumeInput.replace(/[,$\s]/g, ''));
        if (Number.isFinite(parsed) && parsed > 0) {
            track('forecast_tpv_entered', { host });
            fetchForecast(host, parsed);
        } else {
            // Re-fetch without TPV to clear USD fields
            fetchForecast(host);
        }
    };

    // No host yet — don't render
    if (!host) return null;

    // Loading
    if (state.status === 'loading') {
        return (
            <div className="border border-zinc-800 rounded-xl p-8">
                <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm text-zinc-500">Computing reserve projections...</span>
                </div>
            </div>
        );
    }

    // Error
    if (state.status === 'error') {
        return (
            <div className="border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                    <span className="text-sm text-red-400">Forecast unavailable</span>
                    <p className="text-xs text-red-400/60 mt-0.5">{state.message}</p>
                </div>
            </div>
        );
    }

    // No data
    if (state.status === 'no_data' || state.status === 'idle') {
        return null;
    }

    // Loaded — render forecast
    const { data } = state;
    const isAccelerating = data.instabilitySignal === 'ACCELERATING';
    const TrendIcon = TREND_ICONS[data.trend] || Minus;
    const trendColor = data.trend === 'DEGRADING' ? 'text-red-400' : data.trend === 'IMPROVING' ? 'text-emerald-400' : 'text-zinc-500';

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Capital At Risk
                    </h3>
                    <p className="text-xs text-zinc-600 mt-0.5">If current retry velocity remains unchanged.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-[10px] text-zinc-700">{data.modelVersion}</span>
                    <button
                        onClick={() => { track('forecast_export_clicked', { host: data.normalizedHost, volumeMode: data.volumeMode, simulated: String(simulateOptimization) }); setShowExport(true); }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium rounded-lg transition-colors"
                        title="Export forecast"
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Status Bar & Control Surface */}
            <div className="space-y-3">
                <div className={`p-4 rounded-xl border ${isAccelerating ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 bg-zinc-900/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <InstabilityBadge signal={data.instabilitySignal} />
                            <div className="flex items-center space-x-2 border-l border-zinc-800 pl-4">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Driver:</span>
                                <span className="text-xs font-medium text-zinc-300">Retry Velocity</span>
                                <TrendIcon className={`w-3.5 h-3.5 ml-1 ${trendColor}`} />
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-zinc-600 block">Risk Tier</span>
                            <span className="text-lg font-bold text-white">{data.currentRiskTier}</span>
                            {data.tierDelta !== 0 && (
                                <span className={`text-xs ml-1 ${data.tierDelta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {data.tierDelta > 0 ? '+' : ''}{data.tierDelta}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Consequence Layer (Gated) */}
                {data.hasProjectionAccess ? (
                    <>
                        {/* Simulation Control Surface */}
                        {data.simulationDelta && (
                            <div className="flex flex-col items-end space-y-2 mt-3">
                                <button
                                    onClick={() => {
                                        setSimulateOptimization(!simulateOptimization);
                                        if (!simulateOptimization) track('forecast_simulation_enabled', { host: data.normalizedHost });
                                    }}
                                    className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${simulateOptimization
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                                        }`}
                                >
                                    <TrendingDown className="w-4 h-4 mr-2" />
                                    {simulateOptimization ? data.simulationDelta.label.replace('Simulate', 'Simulating') : data.simulationDelta.label}
                                </button>
                                {simulateOptimization && (
                                    <p className="text-[10px] text-zinc-500 max-w-sm text-right leading-relaxed">
                                        Escalation penalty compounds non-linearly. A {Math.round(data.simulationDelta.velocityReduction * 100)}% velocity reduction reduces worst-case reserve accumulation by ~{Math.round((1 - data.simulationDelta.exposureMultiplier) * 100)}%.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Reserve Windows — 90d gets primary operational emphasis */}
                        <div className="grid grid-cols-3 gap-3 mt-6">
                            {data.reserveProjections.map((projection) => (
                                <WindowCard
                                    key={projection.windowDays}
                                    projection={{ ...projection, windowDays: `T+${projection.windowDays}` as any }}
                                    isAccelerating={isAccelerating}
                                    isPrimary={projection.windowDays === 90}
                                    isSimulating={simulateOptimization}
                                    simulationDelta={data.simulationDelta}
                                />
                            ))}
                        </div>

                        {/* Volume Input */}
                        <div className="border border-zinc-800 rounded-lg p-4 space-y-3 mt-6">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-zinc-500">
                                    {data.volumeMode === 'bps_plus_usd'
                                        ? 'Monthly volume applied'
                                        : 'Enter monthly volume to see dollar exposure'
                                    }
                                </label>
                                {data.volumeMode === 'bps_plus_usd' && (
                                    <span className="text-[10px] text-emerald-500/60 uppercase tracking-wider">USD Active</span>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm">$</span>
                                    <input
                                        type="text"
                                        value={volumeInput}
                                        onChange={(e) => setVolumeInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleVolumeSubmit(); }}
                                        placeholder="1,500,000"
                                        className="w-full pl-7 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                                    />
                                </div>
                                <button
                                    onClick={handleVolumeSubmit}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium rounded-lg transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                            <p className="text-[10px] text-zinc-700">Not stored. Not logged. Used for projection only.</p>
                        </div>
                    </>
                ) : (
                    <div className="mt-6">
                        <ForbiddenState />
                    </div>
                )}
            </div>

            {/* Recommended Intervention — action vector */}
            {data.hasProjectionAccess && data.recommendedInterventions.length > 0 && (
                <InterventionBlock interventions={data.recommendedInterventions} isSimulating={simulateOptimization} />
            )}


            {/* Model Integrity Annotation */}
            <div className="pt-6 mt-6 border-t border-zinc-900">
                <div className="font-mono text-[10px] text-zinc-600 space-y-1.5 leading-relaxed">
                    <p className="text-zinc-500 font-bold mb-2">MODEL INTEGRITY</p>
                    <p>Deterministic projection • {data.modelVersion}</p>
                    <p>Inputs: normalized risk tier, tier delta, monthly TPV</p>
                    <p>Base reserve capped at 25%</p>
                    <p>Escalation multiplier applied for behavioral instability</p>
                    <p>No stochastic modeling. No smoothing.</p>
                </div>
            </div>

            {/* Export Modal */}
            {showExport && (
                <ForecastExportModal data={data} onClose={() => setShowExport(false)} />
            )}
        </div>
    );
}

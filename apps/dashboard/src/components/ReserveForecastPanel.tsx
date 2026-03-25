'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, AlertTriangle, TrendingDown, TrendingUp, Minus, FileDown, X } from 'lucide-react';
import { useScanData } from '@/lib/use-scan-data';

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
    NOMINAL: { label: 'Low concern', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    RECOVERING: { label: 'Settling down', color: 'text-[#0A64BC]', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    LATENT: { label: 'Early warning', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    ELEVATED: { label: 'Elevated concern', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    ACCELERATING: { label: 'Risk rising quickly', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
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
    return `${(bps / 100).toFixed(2)}%`;
}

function formatRate(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
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
    const worstHighlightColor = isAccelerating ? 'text-red-400' : 'text-slate-200';

    // Simulation multipliers — derived from intervention engine, not hardcoded
    const exposureMultiplier = (isSimulating && simulationDelta) ? simulationDelta.exposureMultiplier : 1;
    const rateMultiplier = (isSimulating && simulationDelta) ? simulationDelta.rateMultiplier : 1;

    const worstRate = projection.worstCaseReserveRate * rateMultiplier;
    const worstBps = projection.worstCaseTrappedBps * exposureMultiplier;
    const worstUSD = hasUSD ? projection.worstCaseTrappedUSD! * exposureMultiplier : undefined;

    // Primary emphasis gets a dynamic stroke based on simulation
    const borderClass = isPrimary
        ? (isSimulating ? 'border-emerald-500/50 ring-1 ring-emerald-500/20 bg-emerald-500/5' : 'border-slate-700 ring-1 ring-slate-700/50')
        : (isSimulating ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800');

    return (
        <div className={`bg-slate-900/50 border ${borderClass} rounded-lg p-5 space-y-4 transition-all duration-300`}>
            {/* Window Header */}
            <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-white">{projection.windowDays}-day outlook</span>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider">{isPrimary ? 'Priority view' : 'Timeframe'}</span>
            </div>

            {hasUSD ? (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Likely case</span>
                        <div className="text-xl font-bold text-white">{formatUSD(projection.projectedTrappedUSD!)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRate(projection.baseReserveRate)}</div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Worst case</span>
                        <div className="flex items-baseline space-x-2">
                            <span className={`text-xl font-extrabold ${isSimulating ? 'text-emerald-400' : worstHighlightColor}`}>
                                {formatUSD(worstUSD!)}
                            </span>
                            {isSimulating && (
                                <span className="text-xs text-slate-600 line-through">{formatUSD(projection.worstCaseTrappedUSD!)}</span>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRate(worstRate)}</div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Likely case</span>
                        <div className="text-xl font-bold text-white">{formatBps(projection.projectedTrappedBps)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRate(projection.baseReserveRate)}</div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Worst case</span>
                        <div className="flex items-baseline space-x-2">
                            <span className={`text-xl font-extrabold ${isSimulating ? 'text-emerald-400' : worstHighlightColor}`}>
                                {formatBps(worstBps)}
                            </span>
                            {isSimulating && (
                                <span className="text-xs text-slate-600 line-through">{formatBps(projection.worstCaseTrappedBps)}</span>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatRate(worstRate)}</div>
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
    low: { text: 'text-slate-400', bg: 'bg-slate-800/30', border: 'border-slate-800', dot: 'bg-slate-600' },
};

function normalizeInterventionTitle(action: string): string {
    const plain = action
        .replace(/^Modeled impact suggests\s+/i, '')
        .replace(/^Modeled trajectory suggests\s+/i, '')
        .replace(/^Modeled risk weight suggests\s+/i, '')
        .replace(/^No structural changes modeled$/i, 'No urgent changes needed right now')
        .replace(/reducing retry attempts.*/i, 'Reduce repeated failed payments')
        .replace(/increasing backoff window.*/i, 'Add more time between retries')
        .replace(/monitoring Tier Delta.*/i, 'Monitor risk level changes')
        .replace(/adding .* missing policy.*/i, 'Add missing policy pages')
        .replace(/strengthening .* weak policy.*/i, 'Improve weak policy pages');
        
    return plain.charAt(0).toUpperCase() + plain.slice(1);
}

function normalizeRationale(rationale: string): string {
    return rationale
        .replace(/[Dd]egrading trend increases escalation probability/i, 'Risk is still rising, so processors may tighten faster if this continues')
        .replace(/[Ll]ower retry ceiling slows velocity accumulation/i, 'Reducing repeated failed payments can make your account look less risky')
        .replace(/[Ww]ider backoff reduces clustering signal in processor monitoring windows/i, 'Spacing out retries reduces the patterns processors flag as risky')
        .replace(/[Tt]ier moved \+\d+ in last evaluation period\.?\s*[Cc]onsecutive positive deltas trigger accelerated processor review/i, 'Your risk level moved up recently — consecutive increases can trigger faster processor action')
        .replace(/[Mm]issing compliance pages \(.*?\) are weighted negatively in processor risk scoring/i, 'Missing policy pages (refund, privacy, terms) count against you in processor reviews')
        .replace(/[Ww]eak policy pages \(.*?\) receive partial credit in stability scoring/i, 'Vague or incomplete policy pages only get partial credit when processors evaluate your site');
}

function InterventionBlock({ interventions, isSimulating }: { interventions: Intervention[]; isSimulating?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const visibleInterventions = expanded ? interventions : interventions.slice(0, 3);
    const hasMore = interventions.length > 3;

    return (
        <div className="border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Top actions to lower payout risk</h4>
                <span className="text-[10px] text-slate-700 uppercase tracking-wider">Suggested actions</span>
            </div>

            <div className="space-y-2.5">
                {visibleInterventions.map((intervention, i) => {
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
                                <span className={`text-xs font-semibold ${isBeingSimulated ? 'text-emerald-400' : style.text}`}>{normalizeInterventionTitle(intervention.action)}</span>
                                <span className={`text-[9px] uppercase tracking-wider font-bold ml-auto ${isBeingSimulated ? 'text-emerald-400 opacity-60' : `${style.text} opacity-60`}`}>
                                    {isBeingSimulated ? 'simulating' : intervention.priority}
                                </span>
                            </div>
                            <p className={`text-[11px] leading-relaxed pl-4 ${isDimmed ? 'text-slate-600' : 'text-slate-500'}`}>
                                {normalizeRationale(intervention.rationale)}
                            </p>
                            {isBeingSimulated && (
                                <p className="text-[10px] text-emerald-500/60 pl-4">
                                    Showing the estimated improvement if this change works.
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {hasMore && (
                <div className="pt-2 text-center">
                    <button onClick={() => setExpanded(!expanded)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                        {expanded ? 'Collapse recommendations' : `See all recommendations (${interventions.length})`}
                    </button>
                </div>
            )}

            <p className="text-[10px] text-slate-700 pt-1 text-center">
                These are recommendations only. PayFlux does not change processor settings for you.
            </p>
        </div>
    );
}

function ForbiddenState() {
    return (
        <div className="border border-slate-800 rounded-xl p-8 space-y-6">
            <div className="flex items-start space-x-4">
                <div className="p-3 bg-slate-900 rounded-full flex-shrink-0">
                    <Lock className="w-5 h-5 text-slate-600" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-200">Unlock the forward-looking view</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Pro shows how much money a processor may hold back over the next few weeks and what changes are most likely to reduce that risk.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Timeframes</span>
                    <span className="text-xs text-slate-400">30 / 60 / 90-day outlook</span>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Money impact</span>
                    <span className="text-xs text-slate-400">What could be held back if risk stays flat or gets worse</span>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-lg">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-1">Action plan</span>
                    <span className="text-xs text-slate-400">Which fixes to tackle first and how much they may help</span>
                </div>
            </div>

            <div className="text-center">
                <button
                    onClick={() => track('forecast_unlock_clicked')}
                    className="inline-flex items-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                >
                    Upgrade to Pro
                </button>
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
    const projectedAt = (() => {
        const d = new Date(data.projectedAt);
        const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        const day = d.getUTCDate();
        const h = String(d.getUTCHours()).padStart(2, '0');
        const m = String(d.getUTCMinutes()).padStart(2, '0');
        return `${month} ${day}, ${h}:${m} UTC`;
    })();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop — hidden in print */}
            <div
                className="absolute inset-0 bg-slate-950/70 print:hidden"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:mx-0 print:max-w-none">
                {/* Modal Controls — hidden in print */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 print:hidden">
                    <span className="text-sm font-medium text-gray-600">Reserve Exposure Report</span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Export</span>
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

                    {/* Primary Window — 90-day highlighted */}
                    {primary && (
                        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">90-Day Outlook</span>
                                <span className="text-[10px] text-gray-400">Primary Hold Period</span>
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
                                            {formatBps(primary.projectedTrappedBps)} <span className="text-xs font-normal text-gray-400">of volume</span>
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
                                            {formatBps(primary.worstCaseTrappedBps)} <span className="text-xs font-normal text-gray-400">of volume</span>
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
                                        <td className="py-2.5 text-gray-900">{p.windowDays}-day outlook</td>
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
                        <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                            Deterministic projection. Not financial advice. Modeled estimates — actual processor behavior may differ.
                            Volume figures client-supplied, not stored.
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
    const { scanData } = useScanData();
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
            <div className="border border-slate-800 rounded-xl p-8">
                <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-500">Loading payout forecast...</span>
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
                    <span className="text-sm text-red-400">Payout forecast unavailable</span>
                    <p className="text-xs text-red-400/60 mt-0.5 font-mono">{state.message}</p>
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
    const signalConfig = SIGNAL_CONFIG[data.instabilitySignal] || SIGNAL_CONFIG.NOMINAL;
    const TrendIcon = TREND_ICONS[data.trend] || Minus;
    const trendColor = data.trend === 'DEGRADING' ? 'text-red-400' : data.trend === 'IMPROVING' ? 'text-emerald-400' : 'text-slate-500';
    const nearTermWindow = data.reserveProjections.find((projection) => projection.windowDays === 30) ?? data.reserveProjections[0];
    const longWindow = data.reserveProjections.find((projection) => projection.windowDays === 90) ?? data.reserveProjections[data.reserveProjections.length - 1];

    const formatWindowImpact = (projection: ReserveWindowProjection | undefined) => {
        if (!projection) return '—';
        if (projection.worstCaseTrappedUSD !== undefined) return formatUSD(projection.worstCaseTrappedUSD);
        return formatBps(projection.worstCaseTrappedBps);
    };

    const summaryHeadline = (() => {
        if (isAccelerating || data.currentRiskTier >= 4) return 'Your processor may hold back part of your sales soon if this pattern continues.';
        if (data.currentRiskTier === 3 || data.instabilitySignal === 'ELEVATED' || data.instabilitySignal === 'LATENT') {
            return 'Your processor is showing early signs of concern.';
        }
        return 'Your current payout risk looks manageable, but PayFlux is still watching for changes.';
    })();

    const summaryBody = (() => {
        if (!nearTermWindow || !longWindow) return 'PayFlux is watching for the warning signs that usually show up before a processor changes payout behavior.';
        return `Within the next ${nearTermWindow.windowDays} days, as much as ${formatWindowImpact(nearTermWindow)} could be affected if processor concern rises. Over ${longWindow.windowDays} days, that could grow to ${formatWindowImpact(longWindow)}.`;
    })();

    const trendSummary = data.trend === 'DEGRADING'
        ? 'Risk is moving in the wrong direction right now.'
        : data.trend === 'IMPROVING'
            ? 'Risk is easing compared with the last check.'
            : 'Risk is not moving sharply right now.';

    const nextStepSummary = (() => {
        if (data.recommendedInterventions.length > 0) {
            return 'Start with the highest-priority fix below, then watch whether payout pressure eases on the next checks.';
        }
        if (isAccelerating || data.currentRiskTier >= 4) {
            return 'Keep a close eye on payouts and support signals now. PayFlux is watching for processor action.';
        }
        return 'Keep monitoring. There is no urgent action to take right now.';
    })();

    const driverCards = (() => {
        const findings = scanData?.data?.findings?.slice(0, 3).map((finding) => ({
            title: finding.title,
            body: finding.description,
        }));

        if (findings && findings.length > 0) return findings;

        const derived: Array<{ title: string; body: string }> = [];
        const policySurface = data.projectionBasis?.inputs.policySurface;

        if (policySurface?.missing && policySurface.missing > 0) {
            derived.push({
                title: 'Important policy pages are missing or hard to find.',
                body: '',
            });
        }
        if (policySurface?.weak && policySurface.weak > 0) {
            derived.push({
                title: 'Some customer-facing policies are too weak.',
                body: '',
            });
        }
        if (data.trend === 'DEGRADING') {
            derived.push({
                title: 'Recent signals suggest processor concern is rising.',
                body: '',
            });
        }
        if (data.tierDelta > 0) {
            derived.push({
                title: 'Your internal risk level moved up on the latest check.',
                body: '',
            });
        }
        if (derived.length === 0) {
            derived.push({
                title: 'No single issue is dominating right now.',
                body: '',
            });
        }

        return derived.slice(0, 3);
    })();

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className={`rounded-xl border p-6 ${isAccelerating ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800 bg-slate-900/30'}`}>
                    <div className="mb-6">
                        <h3 className="text-xl font-semibold tracking-tight text-white mb-2">
                            {summaryHeadline}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-300 max-w-3xl">
                            {summaryBody}
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current risk</p>
                            <div className="mt-2 mb-2">
                                <InstabilityBadge signal={data.instabilitySignal} />
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-400">{trendSummary}</p>
                        </div>
                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Possible {data.volumeMode === 'bps_plus_usd' ? 'money' : 'sales'} affected</p>
                            <p className="mt-1.5 text-xl font-bold text-white">{formatWindowImpact(longWindow)}</p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                                within {longWindow?.windowDays ?? 90} days if risk rises.
                            </p>
                        </div>
                        <div className="rounded-lg border border-slate-800/60 bg-slate-900/50 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Main reason</p>
                            <p className="mt-2 text-sm font-medium text-slate-200">{driverCards[0]?.title ?? 'No single dominating issue'}</p>
                        </div>
                    </div>
                </div>

                {data.hasProjectionAccess ? (
                    <>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Why this is happening</h4>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                {driverCards.map((driver) => (
                                    <div key={driver.title} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 flex items-center">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-3 flex-shrink-0" />
                                        <p className="text-sm text-slate-300">{driver.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                                        {nextStepSummary}
                                    </p>
                                </div>
                                {data.simulationDelta && (
                                    <div className="flex flex-col items-end space-y-2">
                                        <button
                                            onClick={() => {
                                                setSimulateOptimization(!simulateOptimization);
                                                if (!simulateOptimization) track('forecast_simulation_enabled', { host: data.normalizedHost });
                                            }}
                                            className={`flex items-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors border ${simulateOptimization
                                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                                                }`}
                                        >
                                            <TrendingDown className="w-4 h-4 mr-2" />
                                            {simulateOptimization ? 'Showing possible improvement' : 'Estimate the upside from the top fix'}
                                        </button>
                                        {simulateOptimization && (
                                            <p className="text-[10px] text-slate-500 max-w-sm text-right">
                                                If the highest-impact fix works, held-fund pressure could drop by about {Math.round((1 - data.simulationDelta.exposureMultiplier) * 100)}%.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {data.recommendedInterventions.length > 0 ? (
                                <div className="mt-4">
                                    <InterventionBlock interventions={data.recommendedInterventions} isSimulating={simulateOptimization} />
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                                    <p className="text-sm font-semibold text-white">No urgent changes are recommended right now</p>
                                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                                        PayFlux does not see one immediate action that stands out above the others. Keep monitoring payout behavior and customer-facing policy quality.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">How soon this could matter</h4>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                                    Use these views to estimate how much of your sales could be held back if processor concern stays flat or gets worse.
                                </p>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                {data.reserveProjections.map((projection) => (
                                    <WindowCard
                                        key={projection.windowDays}
                                        projection={projection}
                                        isAccelerating={isAccelerating}
                                        isPrimary={projection.windowDays === 90}
                                        isSimulating={simulateOptimization}
                                        simulationDelta={data.simulationDelta}
                                    />
                                ))}
                            </div>

                            <div className="border border-slate-800 rounded-lg p-4 space-y-3 mt-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-500">
                                        {data.volumeMode === 'bps_plus_usd'
                                            ? 'Monthly sales applied'
                                            : 'Add monthly sales to see dollar impact'
                                        }
                                    </label>
                                    {data.volumeMode === 'bps_plus_usd' && (
                                        <span className="text-[10px] text-emerald-500/60 uppercase tracking-wider">Dollar view active</span>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm">$</span>
                                        <input
                                            type="text"
                                            value={volumeInput}
                                            onChange={(e) => setVolumeInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleVolumeSubmit(); }}
                                            placeholder="1,500,000"
                                            className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
                                        />
                                    </div>
                                    <button
                                        onClick={handleVolumeSubmit}
                                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium rounded-lg transition-colors"
                                    >
                                        Show dollars
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-700">Optional. Used only for this estimate on this screen.</p>
                            </div>

                            <div className="mt-6 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Advanced detail</p>
                                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                                        Need a signed export or a deeper forecast breakdown? Use the advanced report and confidence pages.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { track('forecast_export_clicked', { host: data.normalizedHost, volumeMode: data.volumeMode, simulated: String(simulateOptimization) }); setShowExport(true); }}
                                    className="flex items-center space-x-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
                                    title="Export forecast"
                                >
                                    <FileDown className="h-3.5 w-3.5" />
                                    <span>Export advanced report</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="mt-6">
                        <ForbiddenState />
                    </div>
                )}
            </div>

            {/* Export Modal */}
            {showExport && (
                <ForecastExportModal data={data} onClose={() => setShowExport(false)} />
            )}
        </div>
    );
}

'use client';

import { useState, useRef } from 'react';
import { FileText, Printer, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Board-Grade Reserve Report
//
// Print-native. Non-interactive. Deterministic.
// Renders as monospace text. No color dependencies.
// Survives black-and-white printing without loss.
//
// Five sections:
//   1. Current Reserve Forecast
//   2. Intervention Derivation
//   3. Model Accuracy
//   4. Projection Ledger
//   5. Integrity Declaration
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function fmtRate(n: number): string { return (n * 100).toFixed(2) + '%'; }
function fmtUSD(n: number): string { return '$' + n.toLocaleString('en-US'); }
function fmtDate(iso: string): string {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
}
function fmtDateTime(iso: string): string {
    return iso.slice(0, 19).replace('T', ' ') + 'Z';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <div className="text-sm font-bold tracking-wider uppercase border-b border-current pb-1 mb-3">
                {title}
            </div>
            {children}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="flex justify-between py-0.5">
            <span>{label}</span>
            <span className="font-semibold">{value ?? '—'}</span>
        </div>
    );
}

function ReportBody({ data }: { data: any }) {
    const cf = data.currentForecast;
    const id = data.interventionDerivation;
    const ma = data.modelAccuracy;
    const pl = data.projectionLedger;
    const ig = data.integrityDeclaration;

    return (
        <div className="font-mono text-[11px] leading-relaxed text-black bg-white p-10 max-w-[800px] mx-auto print:p-0 print:max-w-none">
            {/* Header */}
            <div className="text-center mb-8 border-b-2 border-black pb-4">
                <div className="text-lg font-bold tracking-widest uppercase">
                    Reserve Forecast Report
                </div>
                <div className="text-xs mt-1 tracking-wider">
                    Board-Grade Artifact — Deterministic Derivation
                </div>
                <div className="text-xs mt-2">
                    Merchant: {cf.normalizedHost} &nbsp;|&nbsp; Generated: {fmtDateTime(data.generatedAt)}
                </div>
                <div className="text-xs">
                    Model: {cf.modelVersion} &nbsp;|&nbsp; Report Version: {data.reportVersion}
                </div>
            </div>

            {/* Section 1: Current Reserve Forecast */}
            <Section title="1. Current Reserve Forecast">
                {cf.inputSnapshot && (
                    <div className="mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider mb-1">Input Snapshot</div>
                        <Row label="Risk Tier" value={`${cf.inputSnapshot.riskTier} (${cf.inputSnapshot.riskBand})`} />
                        <Row label="Trend" value={cf.inputSnapshot.trend} />
                        <Row label="Tier Delta" value={cf.inputSnapshot.tierDelta > 0 ? `+${cf.inputSnapshot.tierDelta}` : cf.inputSnapshot.tierDelta} />
                        <Row label="Policy Surface" value={`${cf.inputSnapshot.policySurface.present}P / ${cf.inputSnapshot.policySurface.weak}W / ${cf.inputSnapshot.policySurface.missing}M`} />
                    </div>
                )}
                {cf.appliedConstants && (
                    <div className="mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider mb-1">Applied Constants</div>
                        <Row label="Base Reserve Rate" value={fmtRate(cf.appliedConstants.baseReserveRate)} />
                        <Row label="Trend Multiplier" value={`${cf.appliedConstants.trendMultiplier}×`} />
                        <Row label="Projected Tier" value={cf.appliedConstants.projectedTier} />
                        <Row label="Projected Reserve Rate" value={fmtRate(cf.appliedConstants.projectedReserveRate)} />
                        <Row label="Worst-Case Reserve Rate" value={fmtRate(cf.appliedConstants.worstCaseReserveRate)} />
                        <Row label="Rate Ceiling" value={fmtRate(cf.appliedConstants.reserveRateCeiling)} />
                    </div>
                )}
                <div className="mb-2">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1">Projected Capital Exposure</div>
                    {cf.projectedExposure?.map((w: any) => (
                        <div key={w.windowDays} className="flex justify-between py-0.5">
                            <span>T+{w.windowDays}</span>
                            <span>
                                {w.worstCaseTrappedUSD !== undefined
                                    ? `${fmtUSD(w.worstCaseTrappedUSD)} (${w.worstCaseTrappedBps} bps)`
                                    : `${w.worstCaseTrappedBps} bps`
                                }
                            </span>
                        </div>
                    ))}
                </div>
                <Row label="Instability Signal" value={cf.instabilitySignal} />
            </Section>

            {/* Section 2: Intervention Derivation */}
            <Section title="2. Intervention Derivation">
                <Row label="Interventions Derived" value={id.interventionCount} />
                {id.interventions?.map((i: any, idx: number) => (
                    <div key={idx} className="mt-2 pl-2 border-l-2 border-gray-400">
                        <Row label="Action" value={i.action} />
                        <Row label="Priority" value={i.priority?.toUpperCase()} />
                        <Row label="Velocity Reduction" value={i.velocityReduction ? fmtRate(i.velocityReduction) : '—'} />
                    </div>
                ))}
                {id.simulationParameters && (
                    <div className="mt-3">
                        <div className="text-xs font-semibold uppercase tracking-wider mb-1">Simulation Parameters</div>
                        <Row label="Velocity Reduction" value={fmtRate(id.simulationParameters.velocityReduction)} />
                        <Row label="Exposure Multiplier" value={id.simulationParameters.exposureMultiplier} />
                        <Row label="Rate Multiplier" value={id.simulationParameters.rateMultiplier} />
                        <div className="mt-1 text-[10px] text-gray-600">
                            Formula: exposureMultiplier = (1 - velocityReduction)^1.5 &nbsp;|&nbsp; rateMultiplier = (1 - velocityReduction)^1.2
                        </div>
                    </div>
                )}
            </Section>

            {/* Section 3: Model Accuracy */}
            <Section title="3. Model Accuracy">
                {ma ? (
                    <>
                        <Row label="Total Projections" value={ma.totalProjections} />
                        <Row label="Tier Forecast Accuracy" value={ma.tierPredictionAccuracy !== null ? `${ma.tierPredictionAccuracy}%` : 'Insufficient data'} />
                        <Row label="Trend Forecast Accuracy" value={ma.trendPredictionAccuracy !== null ? `${ma.trendPredictionAccuracy}%` : 'Insufficient data'} />
                        <Row label="Mean Reserve Variance" value={ma.meanReserveVarianceBps !== null ? `±${ma.meanReserveVarianceBps} bps` : 'Insufficient data'} />
                        <Row label="Evaluation Window" value={`${ma.evaluationWindowHours}h`} />
                        {ma.versionStability && (
                            <>
                                <Row label="Model Version" value={ma.versionStability.currentVersion} />
                                <Row label="Version Stability" value={ma.versionStability.isStable ? 'Stable (no changes in window)' : `${ma.versionStability.versionChangesInWindow} change(s) in window`} />
                            </>
                        )}
                        {ma.records?.length > 0 && (
                            <div className="mt-3">
                                <div className="text-xs font-semibold uppercase tracking-wider mb-1">Evaluation Records</div>
                                <table className="w-full text-[10px]">
                                    <thead>
                                        <tr className="border-b border-gray-400">
                                            <th className="text-left py-1">Projected</th>
                                            <th className="text-left py-1">Evaluated</th>
                                            <th className="text-center py-1">Tier</th>
                                            <th className="text-center py-1">Trend</th>
                                            <th className="text-right py-1">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ma.records.map((r: any, i: number) => (
                                            <tr key={i} className="border-b border-gray-200">
                                                <td className="py-0.5">{fmtDate(r.projectedAt)}</td>
                                                <td className="py-0.5">{fmtDate(r.evaluatedAt)}</td>
                                                <td className="text-center py-0.5">
                                                    {r.predictedTier}→{r.actualTier} {r.tierAccurate ? '✓' : '✗'}
                                                </td>
                                                <td className="text-center py-0.5">
                                                    {r.trendAccurate ? '✓' : '✗'}
                                                </td>
                                                <td className="text-right py-0.5">
                                                    {r.reserveRateVarianceBps >= 0 ? '+' : ''}{r.reserveRateVarianceBps} bps
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-gray-500">No projection history available for accuracy derivation.</div>
                )}
            </Section>

            {/* Section 4: Projection Ledger */}
            <Section title="4. Projection Ledger">
                <Row label="Total Records" value={pl.totalRecords} />
                {pl.records?.length > 0 && (
                    <div className="mt-2 space-y-3">
                        {pl.records.map((r: any, i: number) => (
                            <div key={i} className="border border-gray-300 p-2">
                                <div className="flex justify-between">
                                    <span>{fmtDateTime(r.projectedAt)}</span>
                                    <span className="uppercase text-[10px] tracking-wider">
                                        {r.writeReason === 'state_transition' ? 'STATE TRANSITION' : 'DAILY CADENCE'}
                                    </span>
                                </div>
                                <div className="mt-1">
                                    <Row label="Tier" value={`${r.inputSnapshot.riskTier} (${r.inputSnapshot.riskBand})`} />
                                    <Row label="Trend" value={r.inputSnapshot.trend} />
                                    <Row label="Reserve Rate" value={fmtRate(r.appliedConstants.worstCaseReserveRate)} />
                                    {r.windowOutputs?.find((w: any) => w.windowDays === 90) && (
                                        <Row
                                            label="Capital At Risk (T+90)"
                                            value={
                                                r.windowOutputs.find((w: any) => w.windowDays === 90).worstCaseTrappedUSD !== undefined
                                                    ? fmtUSD(r.windowOutputs.find((w: any) => w.windowDays === 90).worstCaseTrappedUSD)
                                                    : `${r.windowOutputs.find((w: any) => w.windowDays === 90).worstCaseTrappedBps} bps`
                                            }
                                        />
                                    )}
                                </div>
                                <div className="mt-1 text-[10px] text-gray-500 flex justify-between">
                                    <span>Hash: {r.integrity.hash.slice(0, 16)}…</span>
                                    <span>
                                        {r.verification.hashValid ? '✓ Hash' : '✗ Hash'}
                                        {' '}
                                        {r.verification.signatureValid === null ? '' : r.verification.signatureValid ? '✓ Sig' : '✗ Sig'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            {/* Section 5: Integrity Declaration */}
            <Section title="5. Integrity Declaration">
                <div className="border-2 border-black p-3">
                    <p className="mb-2">{ig.statement}</p>
                    <Row label="Artifact Hash" value={ig.artifactHash.slice(0, 32) + '…'} />
                    <Row label="Algorithm" value={ig.algorithm} />
                    <Row label="Signature" value={ig.signature} />
                    <Row label="Key Scope" value={ig.keyScope} />
                    <Row label="Verification" value={ig.verification} />
                    <Row label="Generated" value={fmtDateTime(data.generatedAt)} />
                </div>
            </Section>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-500 border-t border-gray-300 pt-3 mt-8">
                <p>This document is deterministically derived. All values are bounded projections, not certainties.</p>
                <p>No freeze-prevention guarantees are expressed or implied.</p>
                <p className="mt-1">PayFlux — Deterministic Reserve Projection Infrastructure</p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Trigger (Modal + Print)
// ─────────────────────────────────────────────────────────────────────────────

export default function BoardReserveReport({ host, monthlyTPV }: { host: string | null; monthlyTPV?: number }) {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    async function generate() {
        if (!host) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ host });
            if (monthlyTPV) params.set('monthlyTPV', String(monthlyTPV));
            const res = await fetch(`/api/v1/risk/forecast/report?${params}`);
            if (!res.ok) {
                setError('Failed to generate report');
                setLoading(false);
                return;
            }
            const json = await res.json();
            setData(json);
            setOpen(true);
        } catch {
            setError('Failed to generate report');
        } finally {
            setLoading(false);
        }
    }

    function handlePrint() {
        if (!printRef.current) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reserve Forecast Report</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        line-height: 1.6;
                        color: #000;
                        padding: 40px;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-bold { font-weight: bold; }
                    .font-semibold { font-weight: 600; }
                    .uppercase { text-transform: uppercase; }
                    .tracking-wider { letter-spacing: 0.05em; }
                    .tracking-widest { letter-spacing: 0.1em; }
                    .mb-1 { margin-bottom: 4px; }
                    .mb-2 { margin-bottom: 8px; }
                    .mb-3 { margin-bottom: 12px; }
                    .mb-8 { margin-bottom: 32px; }
                    .mt-1 { margin-top: 4px; }
                    .mt-2 { margin-top: 8px; }
                    .mt-3 { margin-top: 12px; }
                    .mt-8 { margin-top: 32px; }
                    .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
                    .py-1 { padding-top: 4px; padding-bottom: 4px; }
                    .p-2 { padding: 8px; }
                    .p-3 { padding: 12px; }
                    .pl-2 { padding-left: 8px; }
                    .pt-3 { padding-top: 12px; }
                    .pb-1 { padding-bottom: 4px; }
                    .pb-4 { padding-bottom: 16px; }
                    .text-lg { font-size: 18px; }
                    .text-sm { font-size: 13px; }
                    .text-xs { font-size: 10px; }
                    .section-title {
                        font-size: 13px;
                        font-weight: bold;
                        letter-spacing: 0.05em;
                        text-transform: uppercase;
                        border-bottom: 1px solid #000;
                        padding-bottom: 4px;
                        margin-bottom: 12px;
                    }
                    .row { display: flex; justify-content: space-between; padding: 2px 0; }
                    .ledger-entry { border: 1px solid #999; padding: 8px; margin-bottom: 12px; }
                    .integrity-box { border: 2px solid #000; padding: 12px; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 16px; margin-bottom: 32px; }
                    .footer { text-align: center; font-size: 10px; color: #666; border-top: 1px solid #999; padding-top: 12px; margin-top: 32px; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th, td { padding: 2px 4px; }
                    th { border-bottom: 1px solid #666; }
                    td { border-bottom: 1px solid #eee; }
                    .border-l { border-left: 2px solid #999; }
                    .hash-line { font-size: 10px; color: #666; display: flex; justify-content: space-between; margin-top: 4px; }
                    @media print {
                        body { padding: 20px; }
                        .ledger-entry { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>${printRef.current.innerHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    }

    return (
        <>
            <button
                onClick={generate}
                disabled={loading || !host}
                className="flex items-center space-x-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30"
            >
                <FileText className="w-3.5 h-3.5" />
                <span>{loading ? 'Generating…' : 'Generate Board Report'}</span>
            </button>

            {error && <span className="text-[10px] text-red-400 ml-2">{error}</span>}

            {open && data && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto bg-black/80 print:bg-white print:static print:p-0">
                    <div className="relative bg-white rounded-lg shadow-2xl max-w-[850px] w-full print:shadow-none print:rounded-none">
                        {/* Controls (hidden in print) */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 print:hidden">
                            <span className="text-xs font-mono text-gray-600 uppercase tracking-wider">Board Reserve Report</span>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center space-x-1 text-xs text-gray-600 hover:text-black transition-colors"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print / PDF</span>
                                </button>
                                <button
                                    onClick={() => { setOpen(false); setData(null); }}
                                    className="text-gray-400 hover:text-black transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Report body */}
                        <div ref={printRef}>
                            <ReportBody data={data} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

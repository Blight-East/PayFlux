"use client";

import { ActionDock } from '../../components/risk-ledger/ui/ActionDock';
import { SystemHealth } from '../../components/risk-ledger/dashboard/SystemHealth';
import { ActiveIncidents } from '../../components/risk-ledger/dashboard/ActiveIncidents';
import { ProcessorList } from '../../components/risk-ledger/dashboard/ProcessorList';
import { RiskFeed } from '../../components/risk-ledger/dashboard/RiskFeed';
import { BlastRadius } from '../../components/risk-ledger/dashboard/BlastRadius';
import { EvidenceHealthPanel } from '../../components/risk-ledger/dashboard/EvidenceHealthPanel';
import { EmptyState } from '../../components/risk-ledger/dashboard/EmptyState';
import { EventContextPanel } from '../../components/risk-ledger/dashboard/EventContextPanel';
import { useRiskFeed } from '../../hooks/useRiskFeed';
import { useState, useEffect } from 'react';
import { Zap, Download } from 'lucide-react';

export default function DashboardPage() {
    // Gating is handled by the Server Component wrapper (page.jsx)

    const { events, meta, isLoading } = useRiskFeed();
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [exportError, setExportError] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [lastExport, setLastExport] = useState(null);
    const [isUnavailable, setIsUnavailable] = useState(false);

    const handleExport = async () => {
        if (isUnavailable) return;

        setIsExporting(true);
        setExportError(false);
        try {
            const res = await fetch('/api/v1/evidence/export');

            // Hard 503 check (Key Missing)
            if (res.status === 503) {
                const data = await res.json().catch(() => ({}));
                if (data.error === "EVIDENCE_EXPORT_SIGNING_KEY_MISSING") {
                    setIsUnavailable(true);
                    setExportError(true);
                    setTimeout(() => setExportError(false), 2000);
                    return;
                }
            }

            // Fail-soft for 501 Not Implemented (or other errors)
            if (res.status === 501 || !res.ok) {
                setExportError(true);
                setLastExport({ status: 'error', time: new Date() });
                // Reset error state after 2 seconds
                setTimeout(() => setExportError(false), 2000);
                return;
            }

            const blob = await res.blob();
            // Parse for signature status (we need to peek at the JSON)
            const text = await blob.text();
            let isSigned = true;
            try {
                const data = JSON.parse(text);
                isSigned = data.payflux_export?.signature?.status !== 'DEGRADED';
            } catch (e) { }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payflux-evidence-export-${new Date().toISOString().replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            setLastExport({ status: 'success', time: new Date(), isSigned });
        } catch (e) {
            console.error('Export failed:', { type: 'UI_EXPORT_EXCEPTION' });
            setExportError(true);
            setLastExport({ status: 'error', time: new Date() });
            setTimeout(() => setExportError(false), 2000);
        } finally {
            setIsExporting(false);
        }
    };

    // Default selection to first event
    useEffect(() => {
        if (events.length > 0 && !selectedEventId) {
            setSelectedEventId(events[0].id);
        }
    }, [events, selectedEventId]);

    const hasEvents = events.length > 0;
    const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

    return (
        <div className="min-h-screen bg-mid text-white font-sans selection:bg-white/20 overflow-hidden flex flex-col">
            <div style={{
                position: 'fixed', bottom: 8, right: 8, zIndex: 99999,
                background: 'black', color: 'white', padding: '6px 10px',
                fontSize: 12, border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8, fontFamily: 'monospace'
            }}>
                DASHBOARD_V2_FINGERPRINT: v2-ledger
            </div>
            <header className="fixed top-0 left-0 right-0 h-10 bg-mid border-b border-white/10 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-200 font-semibold tracking-tight text-sm">
                        <Zap className="w-3.5 h-3.5 text-gray-400" />
                        <span>PayFlux</span>
                    </div>
                </div>
                {/* Evidence Export Action */}
                <div
                    className="flex items-center gap-3 cursor-help"
                    title={
                        isUnavailable ? "Unavailable — signing key not configured" :
                            lastExport
                                ? `Last export: ${lastExport.status === 'success' ? (lastExport.isSigned ? 'Success' : 'Unsigned (dev)') : 'Failed'} at ${lastExport.time.toLocaleTimeString()}`
                                : "Signed canonical evidence bundle"
                    }
                >
                    <button
                        onClick={handleExport}
                        disabled={isExporting || isUnavailable}
                        className={`px-3 py-1.5 text-[10px] font-mono border rounded transition-all duration-200 flex items-center gap-2 border-white/10 ${isExporting || isUnavailable ? 'text-zinc-500 bg-zinc-900/50' : 'text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white'} ${isExporting ? 'cursor-wait' : isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {isExporting ? (
                            <Download className="w-3 h-3 animate-pulse" />
                        ) : (
                            <Download className="w-3 h-3" />
                        )}
                        <span>{isExporting ? 'GENERATING...' : 'EVIDENCE EXPORT'}</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 pt-12 pb-10 px-4 flex flex-col gap-3 max-w-[1920px] mx-auto w-full h-screen">
                <div className="flex items-center justify-between px-1 min-h-[40px]">
                    <div>
                        {hasEvents ? (
                            <div className="flex flex-col">
                                <h1 className="text-sm font-medium text-white tracking-tight">Risk ledger active</h1>
                                <span className="text-[10px] text-subtle">First observable state change recorded.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col opacity-50">
                                <h1 className="text-sm font-medium text-white tracking-tight">Ledger standby</h1>
                                <span className="text-[10px] text-subtle">Awaiting signal acquisition...</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 h-full p-6 overflow-hidden border-t border-white/5">
                    {!hasEvents ? (
                        <div className="col-span-12 h-full flex items-center justify-center">
                            <EmptyState />
                        </div>
                    ) : (
                        <>
                            <div className="col-span-8 flex flex-col gap-6 h-full overflow-hidden">
                                <div className="flex-1 min-h-0 bg-void-surface border border-white/5 rounded-lg overflow-hidden flex flex-col">
                                    <RiskFeed
                                        events={events}
                                        isLoading={isLoading}
                                        selectedId={selectedEventId}
                                        onSelect={setSelectedEventId}
                                    />
                                </div>
                            </div>

                            <div className="col-span-4 flex flex-col gap-6 h-full overflow-y-auto">
                                <div className="h-1/3 min-h-[200px]">
                                    <EventContextPanel event={selectedEvent} credibility={meta?.credibility} />
                                </div>
                                <div className="flex-1">
                                    <EvidenceHealthPanel />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <div className="fixed bottom-0 left-0 right-0 h-8 bg-mid border-t border-white/10 flex items-center justify-between px-4 text-[10px] font-mono text-void-dim z-50">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${hasEvents ? 'bg-safe' : 'bg-void-dim'}`} />
                    <span>
                        {hasEvents
                            ? `Telemetry link established. ${events.length} event${events.length === 1 ? '' : 's'} recorded.`
                            : "Evidence channel idle."
                        }
                    </span>
                    {meta?.watermark && (
                        <>
                            <span className="text-white/10 mx-1">|</span>
                            <span>
                                Last verified: {meta.watermark.lastVerifiedAt
                                    ? new Date(meta.watermark.lastVerifiedAt).toLocaleTimeString()
                                    : "Not yet verified"}
                                {meta.watermark.seq ? ` (Seq: ${meta.watermark.seq})` : ''}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {meta?.credibility && (
                        <div
                            className="flex items-center gap-2 border-r border-white/10 pr-3 mr-1 cursor-help group relative"
                            title={meta.credibility.reasons?.join(', ') || 'No penalties applied'}
                        >
                            <span className="opacity-70">Credibility:</span>
                            <span className={meta.credibility.band === 'high' ? 'text-white' : meta.credibility.band === 'medium' ? 'text-warning' : 'text-subtle'}>
                                {meta.credibility.score ?? '--'} ({meta.credibility.band})
                            </span>
                        </div>
                    )}

                    {meta?.client?.transport && (
                        <span className="opacity-70">
                            Transport: {meta.client.transport.toUpperCase()}
                        </span>
                    )}
                    {meta?.client?.lastHeartbeat && (
                        <span className="opacity-70">
                            Heartbeat: {new Date(meta.client.lastHeartbeat).toLocaleTimeString()}
                        </span>
                    )}
                    {meta?.generatedAt ? `Sync: ${new Date(meta.generatedAt).toLocaleTimeString()}` : 'v2.0.0-beta'}
                </div>
            </div>
        </div>
    );
}

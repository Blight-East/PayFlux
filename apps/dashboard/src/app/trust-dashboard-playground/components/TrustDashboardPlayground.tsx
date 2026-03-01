'use client';

// DEMO ONLY — DELETE BEFORE PROD

import React from 'react';
import { SystemState, EventItem } from '../lib/types';
import { HEALTHY_EVENTS, VIOLATION_EVENTS } from '../lib/mockData';
import './styles.css';

export default function TrustDashboardPlayground() {
    const [systemState, setSystemState] = React.useState<SystemState>('HEALTHY');
    const [selectedEventId, setSelectedEventId] = React.useState<number | null>(null);
    const [showTcsBreakdown, setShowTcsBreakdown] = React.useState(false);

    const getEvents = () => {
        if (systemState === 'VIOLATION') return VIOLATION_EVENTS;
        if (systemState === 'OFFLINE') return [];
        return HEALTHY_EVENTS;
    };

    const currentEvents = getEvents();
    const selectedEvent = currentEvents.find(e => e.id === selectedEventId);

    const getTcs = () => {
        if (systemState === 'VIOLATION') return 12;
        if (systemState === 'OFFLINE') return 41;
        return 87;
    };

    const tcsValue = getTcs();
    const tcsColor = tcsValue > 80 ? 'text-[#10B981]' : tcsValue > 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]';
    const tcsBorder = tcsValue > 80 ? 'border-[#10B981]/20' : tcsValue > 50 ? 'border-[#F59E0B]/20' : 'border-[#EF4444]/20';

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-zinc-400 font-sans relative">

            {/* SCENARIO SWITCHER (Floating Lab) — DEMO ONLY */}
            <div className="absolute top-20 right-6 z-[60] bg-surface p-4 border border-border shadow-2xl mono text-[10px] space-y-3">
                <div className="text-zinc-500 uppercase font-bold border-b border-border pb-2">Simulation Control</div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => { setSystemState('HEALTHY'); setSelectedEventId(null); }}
                        className={`px-3 py-1.5 border ${systemState === 'HEALTHY' ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/5' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                        [ Scenario 1: Healthy ]
                    </button>
                    <button
                        onClick={() => { setSystemState('OFFLINE'); setSelectedEventId(null); }}
                        className={`px-3 py-1.5 border ${systemState === 'OFFLINE' ? 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/5' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                        [ Scenario 2: Offline ]
                    </button>
                    <button
                        onClick={() => { setSystemState('VIOLATION'); setSelectedEventId(null); }}
                        className={`px-3 py-1.5 border ${systemState === 'VIOLATION' ? 'border-[#EF4444] text-[#EF4444] bg-[#EF4444]/5' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                        [ Scenario 3: Violation ]
                    </button>
                </div>
            </div>

            {/* PERSISTENT HEADER */}
            <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 z-50 bg-background">
                <div className="flex items-center gap-8">
                    <div className="text-zinc-100 font-bold tracking-tighter text-xl">PAYFLUX</div>
                    <div className="flex items-center gap-2">
                        <div className={`severity-bullet ${systemState === 'HEALTHY' ? 'bg-[#10B981]' : systemState === 'OFFLINE' ? 'bg-[#F59E0B] animate-pulse' : 'bg-[#EF4444] animate-ping'}`} />
                        <span className={`text-[10px] uppercase font-bold tracking-widest ${systemState === 'HEALTHY' ? 'text-zinc-500' : systemState === 'OFFLINE' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                            System Health: {systemState === 'HEALTHY' ? 'Operational' : systemState === 'OFFLINE' ? 'Degraded' : 'CRITICAL VIOLATION'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    {/* DEMO ONLY — Board Report placeholder (no behavior) */}
                    <button
                        disabled
                        className="px-3 py-1.5 border border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed uppercase font-mono text-[10px] tracking-widest"
                        title="Coming soon — signed canonical evidence bundle"
                    >
                        Board Report
                    </button>
                    <div className="mono text-[11px] text-zinc-500">
                        LAST SYNC: <span className="text-zinc-300">{systemState === 'OFFLINE' ? '18m AGO' : '2s AGO'}</span>
                    </div>
                </div>
            </header>

            {/* PRIMARY ARCHITECTURE */}
            <main className="flex-1 flex overflow-hidden relative">
                {/* TRUST SURFACE (LEFT) */}
                <aside className="w-80 border-r border-border p-6 flex flex-col gap-8 bg-surface/30 shrink-0">
                    <section>
                        <h2 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-4 text-center">Telemetry Credibility</h2>
                        <div className="flex flex-col items-center">
                            <div className={`w-32 h-32 border-2 ${tcsBorder} rounded-none flex items-center justify-center mb-4 relative overflow-hidden transition-colors duration-500`}>
                                <div className={`absolute inset-0 ${tcsValue > 80 ? 'bg-[#10B981]/5' : tcsValue > 50 ? 'bg-[#F59E0B]/5' : 'bg-[#EF4444]/5'} animate-pulse`} />
                                <span className={`mono text-5xl font-bold ${tcsColor} relative z-10 transition-colors duration-500`}>{tcsValue}</span>
                            </div>
                            <div className={`text-sm font-bold ${tcsColor} mb-1 tracking-tight transition-colors duration-500 uppercase`}>
                                {tcsValue > 80 ? 'High Confidence' : tcsValue > 50 ? 'Medium Confidence' : 'Low Confidence'}
                            </div>
                            <div className="text-[10px] text-zinc-500 mb-4">Verified {systemState === 'OFFLINE' ? '11m ago' : '3m ago'}</div>
                            <button
                                onClick={() => setShowTcsBreakdown(!showTcsBreakdown)}
                                className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors border-b border-zinc-700 pb-0.5"
                            >
                                {showTcsBreakdown ? '[ Hide Breakdown ]' : '[ View Breakdown ]'}
                            </button>
                        </div>

                        {showTcsBreakdown && (
                            <div className="mt-6 border border-border bg-zinc-900/50 p-4 mono text-[10px] space-y-3">
                                <div className="uppercase font-bold text-zinc-500 border-b border-border pb-2">TCS Breakdown: {tcsValue} / 100</div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-zinc-400">✓ Plaid: Active</span>
                                        <span className="text-[#10B981] font-bold">+28</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={systemState === 'OFFLINE' ? 'text-[#EF4444]' : 'text-zinc-400'}>
                                            {systemState === 'OFFLINE' ? '⚠ Stripe: Offline' : '✓ Stripe: Active'}
                                        </span>
                                        <span className={systemState === 'OFFLINE' ? 'text-[#EF4444] font-bold' : 'text-[#10B981] font-bold'}>
                                            {systemState === 'OFFLINE' ? '+12' : '+25'}
                                        </span>
                                    </div>
                                    {systemState === 'VIOLATION' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[#EF4444] font-bold">⚠ Watermark Gap</span>
                                            <span className="text-[#EF4444] font-bold">-40</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
                                        <span className="text-zinc-100 uppercase">Total Score</span>
                                        <span className={`${tcsColor} font-bold`}>{tcsValue}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-4">Evidence Health</h2>
                        <div className="space-y-3 font-mono text-[11px]">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400 uppercase">Watermark Registry</span>
                                <span className={`${systemState === 'VIOLATION' ? 'text-[#EF4444]' : 'text-[#10B981]'} font-bold uppercase`}>
                                    {systemState === 'VIOLATION' ? 'Breached' : 'Stable'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400 uppercase">Source Entropy</span>
                                <span className={`${systemState === 'VIOLATION' ? 'text-[#EF4444]' : 'text-[#10B981]'} font-bold uppercase`}>
                                    {systemState === 'VIOLATION' ? 'Unstable' : 'Nominal'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400 uppercase">Processor Latency</span>
                                <span className={`${systemState === 'OFFLINE' ? 'text-[#EF4444]' : 'text-[#F59E0B]'} font-bold uppercase`}>
                                    {systemState === 'OFFLINE' ? 'SLA Breach' : '12ms (Degraded)'}
                                </span>
                            </div>
                        </div>
                    </section>
                </aside>

                {/* RISK LEDGER (CENTER/RIGHT) */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <section className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="sticky top-0 bg-background/90 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between z-20">
                            <h2 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Reserve History</h2>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                    <div className={`w-1.5 h-1.5 rounded-full ${systemState === 'OFFLINE' ? 'bg-zinc-700' : 'bg-[#10B981] animate-pulse'}`} />
                                    {systemState === 'OFFLINE' ? 'FEED STALLED' : 'LIVE FEED'}
                                </div>
                            </div>
                        </div>

                        {systemState === 'OFFLINE' ? (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-12 h-12 border border-[#F59E0B]/30 flex items-center justify-center mb-6">
                                    <span className="text-[#F59E0B] font-bold text-xl animate-pulse">!</span>
                                </div>
                                <h3 className="mono text-zinc-100 font-bold mb-2">⚠ NO DATA RECEIVED FOR 18 MINUTES</h3>
                                <div className="space-y-4 max-w-md mx-auto">
                                    <div className="mono text-[10px] text-zinc-500 space-y-1">
                                        <p>· STRIPE SOURCE: OFFLINE SINCE 14:09</p>
                                        <p>· LAST VERIFIED EVENT: 14:07:42</p>
                                    </div>
                                    <div className="p-4 bg-[#F59E0B]/5 border border-[#F59E0B]/20 text-xs text-zinc-300 leading-relaxed italic">
                                        &quot;TCS degraded to 41 (MEDIUM CONFIDENCE). Avoid financial decisions until recovery. Check status.stripe.com.&quot;
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30 mono text-[11px]">
                                {currentEvents.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedEventId(item.id === selectedEventId ? null : item.id)}
                                        className={`flex items-center gap-4 px-6 py-3 hover:bg-zinc-900/50 cursor-pointer transition-colors group ${selectedEventId === item.id ? 'bg-zinc-800/40 border-l-2 border-l-zinc-300' : ''}`}
                                    >
                                        <div className={`severity-bullet ${item.color}`} />
                                        <span className="w-24 text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase whitespace-nowrap">{item.time}</span>
                                        <span className={`w-16 font-bold ${item.sev === 'HIGH' ? 'text-[#EF4444]' : item.sev === 'MEDIUM' ? 'text-[#F59E0B]' : 'text-zinc-500'}`}>{item.sev}</span>
                                        <span className="flex-1 text-zinc-300 truncate">{item.event}</span>
                                        <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5">
                                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">TCS</span>
                                            <span className={`font-bold ${item.tcs > 80 ? 'text-[#10B981]' : item.tcs > 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>{item.tcs}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* CONTEXT PANEL (EXPANDABLE) */}
                    <div className={`absolute bottom-0 left-0 right-0 border-t border-border bg-surface transition-transform duration-300 ease-in-out z-30 flex flex-col ${selectedEventId ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'}`}>
                        <div
                            onClick={() => setSelectedEventId(null)}
                            className="h-10 px-6 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors shrink-0"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Context Panel</span>
                                {selectedEvent && (
                                    <div className="flex items-center gap-2 mono text-[10px]">
                                        <span className="text-zinc-600">|</span>
                                        <span className="text-zinc-400 uppercase">{selectedEvent.time}</span>
                                        <span className="text-zinc-600">—</span>
                                        <span className={`text-zinc-200 ${systemState === 'VIOLATION' && selectedEvent.id === 99 ? 'text-[#EF4444] font-bold' : ''}`}>
                                            {selectedEvent.event}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="mono text-[10px] text-zinc-500">
                                {selectedEvent ? '[ Click to Close ]' : '[ Select Event ]'}
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto min-h-[300px]">
                            {selectedEvent ? (
                                <div className="grid grid-cols-2 gap-8 h-full">
                                    {/* LEFT: Payload & Recommendations */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3">Event Metadata</h3>
                                            <pre className="bg-background border border-border p-4 mono text-[10px] text-zinc-400 overflow-x-auto">
                                                {selectedEvent.details?.payload || 'No additional metadata available.'}
                                            </pre>
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Internal Recommendation</h3>
                                            <div className={`p-4 border-l-2 ${selectedEvent.tcs < 30 ? 'border-l-[#EF4444] bg-[#EF4444]/5' : 'border-l-[#F59E0B] bg-[#F59E0B]/5'} text-xs text-zinc-200 leading-relaxed`}>
                                                {selectedEvent.details?.recommendation || 'Further forensic analysis required.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIGHT: Credibility Breakdown */}
                                    <div>
                                        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-3">Event Credibility: {selectedEvent.tcs} / 100</h3>
                                        <div className="border border-border bg-background divide-y divide-border mono text-[10px]">
                                            {selectedEvent.details?.breakdown ? (
                                                selectedEvent.details.breakdown.map((b, i) => (
                                                    <div key={i} className="px-4 py-2.5 flex justify-between items-center font-bold">
                                                        <span className={b.type === 'plus' ? 'text-zinc-300' : 'text-[#EF4444]'}>
                                                            {b.type === 'plus' ? '✓' : '⚠'} {b.label}
                                                        </span>
                                                        <span className={b.type === 'plus' ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                                                            {b.score}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-zinc-500 italic">No breakdown available for this score.</div>
                                            )}
                                            <div className="px-4 py-3 bg-zinc-900/50 flex justify-between items-center text-zinc-100">
                                                <span className="uppercase">Final Impact Score</span>
                                                <span className={`text-base font-bold underline decoration-2 underline-offset-4 ${selectedEvent.tcs < 30 ? 'decoration-[#EF4444]/50' : 'decoration-[#F59E0B]/50'}`}>
                                                    {selectedEvent.tcs}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 italic text-sm">
                                    Select a risk event from the ledger to view forensic evidence chain.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

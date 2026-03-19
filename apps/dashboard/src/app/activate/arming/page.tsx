'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ActivationConditions {
    paidTier: boolean;
    processorConnected: boolean;
    baselineGenerated: boolean;
    projectionExists: boolean;
    alertsArmed: boolean;
}

interface ActivationResponse {
    state: string;
    conditions: ActivationConditions;
    steps?: { step: string; status: string; detail?: string }[];
    meta?: {
        baselineRiskSurface?: {
            riskTier: number;
            riskBand: string;
            stabilityScore: number;
            trend: string;
        };
        latestProjection?: {
            riskTier: number;
            riskBand: string;
            reserveRate: number;
            windows: {
                t30: { trappedBps: number };
                t60: { trappedBps: number };
                t90: { trappedBps: number };
            };
            trend: string;
        };
    };
}

const STAGES = [
    { key: 'processorConnected', label: 'Connecting processor data', detail: 'Retrieving payment events from your Stripe account...' },
    { key: 'baselineGenerated', label: 'Calculating reserve sensitivity', detail: 'Analyzing failure patterns, retry pressure, geographic entropy...' },
    { key: 'projectionExists', label: 'Generating first projection', detail: 'Modeling reserve exposure across T+30, T+60, T+90 windows...' },
    { key: 'alertsArmed', label: 'Arming default alerts', detail: 'Setting up tier escalation, reserve spike, and trend monitors...' },
] as const;

export default function ArmingPage() {
    const router = useRouter();
    const [conditions, setConditions] = useState<ActivationConditions | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activationTriggered, setActivationTriggered] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    // Timer
    useEffect(() => {
        if (isComplete) return;
        const interval = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
        return () => clearInterval(interval);
    }, [isComplete]);

    // Trigger activation pipeline
    const triggerActivation = useCallback(async () => {
        if (activationTriggered) return;
        setActivationTriggered(true);
        try {
            const res = await fetch('/api/activation/run', { method: 'POST' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.state === 'paid_unconnected') {
                    // Not connected yet — redirect to /activate
                    router.replace('/activate');
                    return;
                }
            }
        } catch {
            // Will be caught by polling
        }
    }, [activationTriggered, router]);

    // Poll activation status
    useEffect(() => {
        let cancelled = false;

        async function poll() {
            try {
                const res = await fetch('/api/activation/run');
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data.state === 'not_paid') {
                        router.replace('/start');
                        return;
                    }
                    setError('Unable to check activation status.');
                    return;
                }
                const data: ActivationResponse = await res.json();
                if (cancelled) return;

                setConditions(data.conditions);

                if (data.state === 'paid_unconnected') {
                    router.replace('/activate');
                    return;
                }

                if (data.state === 'live_monitored') {
                    setIsComplete(true);
                    // Brief pause so user sees the final checkmarks
                    setTimeout(() => router.replace('/dashboard?activated=true'), 1500);
                    return;
                }

                // Trigger activation if not yet triggered and processor is connected
                if (data.conditions.processorConnected && !activationTriggered) {
                    triggerActivation();
                }

            } catch {
                if (!cancelled) setError('Connection issue. Retrying...');
            }
        }

        poll();
        const interval = setInterval(poll, 2000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [router, activationTriggered, triggerActivation]);

    const allComplete = conditions && STAGES.every(s => conditions[s.key as keyof ActivationConditions]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-auto">
                        {isComplete ? (
                            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        ) : (
                            <svg className="w-7 h-7 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        )}
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                        {isComplete ? 'Your workspace is live.' : 'Arming your workspace...'}
                    </h1>
                    <p className="text-sm text-slate-400">
                        {isComplete
                            ? 'Risk monitoring is now active for your payment stack.'
                            : 'PayFlux is analyzing your payment stack and building your risk baseline.'
                        }
                    </p>
                </div>

                {/* Progress stages */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                    {STAGES.map((stage, i) => {
                        const done = conditions?.[stage.key as keyof ActivationConditions] ?? false;
                        const prevDone = i === 0 ? true : (conditions?.[STAGES[i - 1].key as keyof ActivationConditions] ?? false);
                        const active = !done && prevDone;

                        return (
                            <div key={stage.key} className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {done ? (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    ) : active ? (
                                        <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-600'}`}>
                                        {stage.label}
                                    </p>
                                    {active && (
                                        <p className="text-xs text-slate-500 mt-0.5">{stage.detail}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Timeout fallback */}
                {!isComplete && elapsedSeconds > 90 && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-slate-300">
                            Still arming in the background. Your workspace will be fully live shortly.
                        </p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Enter dashboard (warming up)
                        </button>
                    </div>
                )}

                {/* Completion CTA */}
                {isComplete && (
                    <button
                        onClick={() => router.push('/dashboard?activated=true')}
                        className="w-full px-6 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition-all active:scale-[0.98] text-base"
                    >
                        Enter your workspace
                    </button>
                )}

                {/* Elapsed */}
                {!isComplete && (
                    <p className="text-center text-[10px] text-slate-600 uppercase tracking-wide">
                        {elapsedSeconds}s elapsed
                    </p>
                )}
            </div>
        </div>
    );
}

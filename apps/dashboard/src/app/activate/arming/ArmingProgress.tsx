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

interface BaselineRiskSurface {
    riskTier: number;
    riskBand: string;
    stabilityScore: number;
    trend: string;
}

interface LatestProjection {
    riskTier: number;
    riskBand: string;
    reserveRate: number;
    windows: {
        t30: { trappedBps: number };
        t60: { trappedBps: number };
        t90: { trappedBps: number };
    };
    trend: string;
}

interface ActivationResponse {
    state: string;
    conditions: ActivationConditions;
    steps?: { step: string; status: string; detail?: string }[];
    meta?: {
        baselineRiskSurface?: BaselineRiskSurface;
        latestProjection?: LatestProjection;
        baselineGeneratedAt?: string;
        firstProjectionAt?: string;
        alertPolicyArmedAt?: string;
        activationCompletedAt?: string;
    };
}

const STAGES = [
    { key: 'processorConnected', label: 'Pulling recent processor activity', detail: 'Retrieving the live payment and payout signals PayFlux needs to watch...' },
    { key: 'baselineGenerated', label: 'Learning your current payout risk', detail: 'Finding the warning signs most likely to raise processor concern...' },
    { key: 'projectionExists', label: 'Estimating what may happen next', detail: 'Calculating how much money could be held back over the next 30, 60, and 90 days...' },
    { key: 'alertsArmed', label: 'Turning on practical alerts', detail: 'Preparing alerts for held funds, slower payouts, and worsening account risk...' },
] as const;

const RISK_BAND_COLORS: Record<string, string> = {
    low: 'text-emerald-400',
    moderate: 'text-blue-400',
    elevated: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
    IMPROVING: { label: 'Improving', color: 'text-emerald-400' },
    STABLE: { label: 'Stable', color: 'text-slate-300' },
    DEGRADING: { label: 'Degrading', color: 'text-amber-400' },
};

/**
 * Client-side progress UI for the activation arming flow.
 *
 * IMPORTANT: This component must only be rendered by a server component
 * that has already verified auth + activation state. It does NOT perform
 * its own auth gate — that is the responsibility of the parent page.tsx.
 *
 * On completion, shows a baseline summary card with real activation data
 * before handing off to the dashboard. The customer sees the output of
 * every step they just watched.
 */
export default function ArmingProgress() {
    const router = useRouter();
    const [conditions, setConditions] = useState<ActivationConditions | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activationTriggered, setActivationTriggered] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [baseline, setBaseline] = useState<BaselineRiskSurface | null>(null);
    const [projection, setProjection] = useState<LatestProjection | null>(null);

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
                    // Capture the real baseline and projection data before marking complete
                    if (data.meta?.baselineRiskSurface) setBaseline(data.meta.baselineRiskSurface);
                    if (data.meta?.latestProjection) setProjection(data.meta.latestProjection);
                    setIsComplete(true);
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

    // ── Completion state: show baseline numbers ─────────────────────────────
    if (isComplete) {
        const band = baseline?.riskBand || projection?.riskBand || 'elevated';
        const trend = baseline?.trend || projection?.trend || 'STABLE';
        const trendInfo = TREND_LABELS[trend] || TREND_LABELS.STABLE;
        const bandColor = RISK_BAND_COLORS[band] || 'text-amber-400';
        const stability = baseline?.stabilityScore;
        const rate = projection?.reserveRate;
        const windows = projection?.windows;

        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="max-w-lg w-full space-y-6">

                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mx-auto">
                            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-semibold text-white tracking-tight">
                            Live monitoring is on.
                        </h1>
                        <p className="text-sm text-slate-400">
                            Here is the first live payout-risk view generated from your processor data.
                        </p>
                    </div>

                    {/* Baseline summary card */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">

                        {/* Risk surface header */}
                        <div className="px-6 pt-5 pb-4 border-b border-slate-800/60">
                            <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-4">
                                What PayFlux sees right now
                            </h2>
                            <div className="flex items-baseline justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Current payout risk</span>
                                    <p className={`text-3xl font-bold tabular-nums capitalize ${bandColor}`}>
                                        {band}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-sm font-medium ${trendInfo.color}`}>
                                        {trendInfo.label}
                                    </span>
                                    {stability !== undefined && (
                                        <p className="text-[10px] text-slate-600 mt-0.5">
                                            Current risk score {stability}/100
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Reserve projection */}
                        {rate !== undefined && windows && (
                            <div className="px-6 py-4 border-b border-slate-800/60">
                                <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">
                                    What could happen next
                                </h2>
                                <div className="flex items-baseline mb-3">
                                    <span className="text-2xl font-bold text-white tabular-nums">
                                        {(rate * 100).toFixed(1)}%
                                    </span>
                                    <span className="ml-1.5 text-xs text-slate-500">
                                        of monthly sales could be held if risk keeps rising
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-800/40 rounded-lg px-3 py-2.5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">30-day outlook</p>
                                        <p className="text-lg font-bold text-slate-200 tabular-nums mt-0.5">
                                            {(windows.t30.trappedBps / 100).toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-600">possible sales held back</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {windows.t30.trappedBps.toLocaleString()} bps
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/40 rounded-lg px-3 py-2.5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">60-day outlook</p>
                                        <p className="text-lg font-bold text-slate-200 tabular-nums mt-0.5">
                                            {(windows.t60.trappedBps / 100).toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-600">possible sales held back</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {windows.t60.trappedBps.toLocaleString()} bps
                                        </p>
                                    </div>
                                    <div className="bg-slate-800/40 rounded-lg px-3 py-2.5">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">90-day outlook</p>
                                        <p className="text-lg font-bold text-slate-200 tabular-nums mt-0.5">
                                            {(windows.t90.trappedBps / 100).toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-600">possible sales held back</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {windows.t90.trappedBps.toLocaleString()} bps
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Alerts armed */}
                        <div className="px-6 py-4">
                            <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2.5">
                                Alerts now turned on
                            </h2>
                            <div className="space-y-1.5">
                                {[
                                    'Money held back may jump sharply',
                                    'Payout risk moves up a level',
                                    'Risk direction turns worse',
                                    'Processor pressure moves outside the current range',
                                ].map((rule) => (
                                    <div key={rule} className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-400">{rule}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Primary CTA */}
                    <button
                        onClick={() => router.push('/dashboard?activated=true')}
                        className="w-full px-6 py-4 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition-all active:scale-[0.98] text-base"
                    >
                        Open dashboard
                    </button>

                    {/* Trust line */}
                    <p className="text-center text-[10px] text-slate-600 uppercase tracking-wide">
                        Live monitoring is now active
                    </p>
                </div>
            </div>
        );
    }

    // ── In-progress state: show arming stages ───────────────────────────────
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="max-w-lg w-full space-y-8">

                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-auto">
                        <svg className="w-7 h-7 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                        Getting PayFlux ready...
                    </h1>
                    <p className="text-sm text-slate-400">
                        PayFlux is reading your processor activity and building the first live view of what may happen to your payouts.
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
                {elapsedSeconds > 120 && (
                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-slate-300">
                            Setup is still finishing in the background. Your workspace should be fully live shortly.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setActivationTriggered(false);
                                    setElapsedSeconds(0);
                                    setError(null);
                                }}
                                className="flex-1 px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Retry
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex-1 px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Open dashboard
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-600 text-center">
                            If this persists, contact support at support@payflux.dev
                        </p>
                    </div>
                )}

                {/* Elapsed */}
                <p className="text-center text-[10px] text-slate-600 uppercase tracking-wide">
                    {elapsedSeconds}s elapsed
                </p>
            </div>
        </div>
    );
}

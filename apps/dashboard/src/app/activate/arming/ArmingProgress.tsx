'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

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
    latestActivationRun?: {
        id: string;
        status: string;
        failureCode?: string;
        failureDetail?: string;
    };
}

const STAGES = [
    { key: 'processorConnected', label: 'Pulling recent processor activity', detail: 'Retrieving the live payment and payout signals PayFlux needs to watch...' },
    { key: 'baselineGenerated', label: 'Learning your current payout risk', detail: 'Finding the warning signs most likely to raise processor concern...' },
    { key: 'projectionExists', label: 'Estimating what may happen next', detail: 'Calculating how much money could be held back over the next 30, 60, and 90 days...' },
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
function failureMessage(code?: string): string {
    switch (code) {
        case 'INSUFFICIENT_STRIPE_ACTIVITY':
            return 'PayFlux needs at least 10 charges and 2 payouts in the last 30 days to generate a baseline. Please try again once your Stripe account has more recent activity.';
        case 'PROCESSOR_ACCOUNT_NOT_READY':
            return 'Your Stripe account is not fully set up yet. Please check that charges and payouts are enabled in your Stripe Dashboard, then try again.';
        case 'MONITORED_ENTITY_HOST_REQUIRED':
            return 'Your Stripe account does not have a business URL set. Please add one in your Stripe Dashboard settings, then try again.';
        default:
            return 'Something went wrong during setup. You can retry below, or contact support at support@payflux.dev.';
    }
}

interface ArmingProgressProps {
    initialFailure?: { code?: string; detail?: string };
    allowInternalVerification?: boolean;
}

export default function ArmingProgress({ initialFailure, allowInternalVerification = false }: ArmingProgressProps) {
    const router = useRouter();
    const [conditions, setConditions] = useState<ActivationConditions | null>(null);
    const [failureCode, setFailureCode] = useState<string | null>(initialFailure?.code ?? null);
    const [error, setError] = useState<string | null>(
        initialFailure?.code && initialFailure.code !== 'INSUFFICIENT_STRIPE_ACTIVITY'
            ? failureMessage(initialFailure.code)
            : null
    );
    const [activationTriggered, setActivationTriggered] = useState(Boolean(initialFailure));
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [baseline, setBaseline] = useState<BaselineRiskSurface | null>(null);
    const [projection, setProjection] = useState<LatestProjection | null>(null);
    const [internalVerifying, setInternalVerifying] = useState(false);

    const armingViewedRef = useRef(false);

    // Emit activate_arming_viewed once on mount
    useEffect(() => {
        if (!armingViewedRef.current) {
            armingViewedRef.current = true;
            logOnboardingEventClient('activate_arming_viewed', { source_page: 'activate_arming' });
        }
    }, []);

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
                if (data.code === 'INSUFFICIENT_STRIPE_ACTIVITY') {
                    setFailureCode('INSUFFICIENT_STRIPE_ACTIVITY');
                    setError(null);
                    return;
                }
                if (data.code === 'PROCESSOR_ACCOUNT_NOT_READY') {
                    setFailureCode('PROCESSOR_ACCOUNT_NOT_READY');
                    setError('Your Stripe account is not fully set up yet. Please check that charges and payouts are enabled in your Stripe Dashboard, then try again.');
                    return;
                }
                if (data.code === 'MONITORED_ENTITY_HOST_REQUIRED') {
                    setFailureCode('MONITORED_ENTITY_HOST_REQUIRED');
                    setError(failureMessage(data.code));
                    return;
                }
            }
        } catch {
            // Will be caught by polling
        }
    }, [activationTriggered, router]);

    const runInternalVerification = useCallback(async () => {
        setInternalVerifying(true);
        try {
            const res = await fetch('/api/activation/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'internal_demo' }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Internal verification failed');
            }

            setFailureCode(null);
            setError(null);
            setActivationTriggered(true);
            setElapsedSeconds(0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Internal verification failed');
        } finally {
            setInternalVerifying(false);
        }
    }, []);

    // Poll activation status (skip when showing error — user must click retry)
    useEffect(() => {
        if (error) return;
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

                if (data.state === 'activation_failed') {
                    const code = data.latestActivationRun?.failureCode;
                    setFailureCode(code ?? null);
                    setError(code === 'INSUFFICIENT_STRIPE_ACTIVITY' ? null : failureMessage(code));
                    setActivationTriggered(true);
                    return;
                }

                if (data.state === 'awaiting_activity') {
                    setFailureCode('INSUFFICIENT_STRIPE_ACTIVITY');
                    setError(null);
                    setActivationTriggered(true);
                    return;
                }

                if (data.state === 'live_monitored') {
                    // Capture the real baseline and projection data before marking complete
                    if (data.meta?.baselineRiskSurface) setBaseline(data.meta.baselineRiskSurface);
                    if (data.meta?.latestProjection) setProjection(data.meta.latestProjection);
                    setFailureCode(null);
                    setError(null);
                    setIsComplete(true);
                    logOnboardingEventClient('arming_completed', {
                        source_page: 'activate_arming',
                        elapsed_seconds: elapsedSeconds,
                    });
                    return;
                }

                // Clear any previous error when activation is progressing
                if (error) setError(null);

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
    }, [router, activationTriggered, triggerActivation, error]);

    const isAwaitingActivity = failureCode === 'INSUFFICIENT_STRIPE_ACTIVITY' && !isComplete;

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

                        {/* Monitoring status */}
                        <div className="px-6 py-4">
                            <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2.5">
                                Monitoring records now created
                            </h2>
                            <div className="space-y-1.5">
                                {[
                                    'Baseline snapshot saved to the workspace',
                                    'First reserve projection saved to the workspace',
                                    'Future monitoring can build from these scoped records',
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

                {/* Error with retry */}
                {isAwaitingActivity && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-amber-300">
                            Stripe is connected, but PayFlux needs more recent live activity before it can generate your first real baseline.
                        </p>
                        <div className="space-y-1 text-xs text-slate-400">
                            <p>Required before live monitoring can arm:</p>
                            <p>- At least 10 recent charges in the last 30 days</p>
                            <p>- At least 2 recent payouts in the last 30 days</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                onClick={() => {
                                    setFailureCode(null);
                                    setError(null);
                                    setActivationTriggered(false);
                                    setElapsedSeconds(0);
                                }}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Check again
                            </button>
                            <button
                                onClick={() => router.push('/connectors')}
                                className="flex-1 px-4 py-2.5 text-sm font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Review Stripe connection
                            </button>
                        </div>
                        {allowInternalVerification ? (
                            <div className="pt-2 border-t border-amber-500/10 space-y-2">
                                <p className="text-[11px] uppercase tracking-widest text-slate-500">Internal operator tools</p>
                                <button
                                    onClick={runInternalVerification}
                                    disabled={internalVerifying}
                                    className="w-full px-4 py-2.5 text-sm font-medium bg-white text-slate-950 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60"
                                >
                                    {internalVerifying ? 'Running internal verification...' : 'Run internal verification demo'}
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
                        <p className="text-sm text-red-400">{error}</p>
                        <button
                            onClick={() => {
                                setFailureCode(null);
                                setError(null);
                                setActivationTriggered(false);
                                setElapsedSeconds(0);
                            }}
                            className="w-full px-4 py-2.5 text-sm font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Retry activation
                        </button>
                        {allowInternalVerification ? (
                            <button
                                onClick={runInternalVerification}
                                disabled={internalVerifying}
                                className="w-full px-4 py-2.5 text-sm font-medium bg-white text-slate-950 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60"
                            >
                                {internalVerifying ? 'Running internal verification...' : 'Run internal verification demo'}
                            </button>
                        ) : null}
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

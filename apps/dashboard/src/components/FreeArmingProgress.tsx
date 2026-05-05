'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type StageKey = 'baseline' | 'projecting' | 'ready' | 'failed';

interface StatusResponse {
    stage: 'connecting' | 'baseline' | 'projecting' | 'ready';
    startedAt?: string | null;
    failed?: boolean;
    failureCode?: string | null;
}

const STAGES: Array<{
    key: 'history' | 'anomalies' | 'scenarios';
    label: string;
    detail: string;
    minSeconds: number;
}> = [
    {
        key: 'history',
        label: 'Pulling payout history',
        detail: 'Reading the last 90 days of payouts, disputes, and balance movement.',
        minSeconds: 0,
    },
    {
        key: 'anomalies',
        label: 'Detecting anomaly clusters',
        detail: 'Scanning for the patterns processors flag — payout velocity shifts, dispute spikes, balance volatility.',
        minSeconds: 10,
    },
    {
        key: 'scenarios',
        label: 'Modelling reserve scenarios',
        detail: 'Projecting capital exposure across the next 30 days based on observed signals.',
        minSeconds: 25,
    },
];

/**
 * Free-tier activation progressive reveal.
 *
 * Polls /api/activation/free-status every 2s. Drives stage messaging from
 * BOTH the backend signal (real progress) AND a time-based fallback so the
 * UI always advances even if the backend lags. On `ready`, refreshes the
 * page so the dashboard re-renders with live data.
 *
 * Mirrors the paid-tier ArmingProgress UX without requiring paid-tier
 * activation status (which is gated to pro/enterprise).
 */
export default function FreeArmingProgress() {
    const router = useRouter();
    const startedAtRef = useRef<number>(Date.now());
    const [elapsedSec, setElapsedSec] = useState(0);
    const [backendStage, setBackendStage] = useState<StageKey>('baseline');
    const [failureCode, setFailureCode] = useState<string | null>(null);

    // Tick elapsed time every second for the time-based stage fallback.
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Poll status every 2s. Stop on terminal states.
    useEffect(() => {
        let cancelled = false;
        async function poll() {
            try {
                const res = await fetch('/api/activation/free-status', { cache: 'no-store' });
                if (!res.ok) return;
                const data: StatusResponse = await res.json();
                if (cancelled) return;
                if (data.stage === 'ready') {
                    setBackendStage('ready');
                    router.refresh();
                    return;
                }
                if (data.failed) {
                    setBackendStage('failed');
                    setFailureCode(data.failureCode ?? null);
                    return;
                }
                if (data.stage === 'projecting') setBackendStage('projecting');
                else if (data.stage === 'baseline') setBackendStage('baseline');
            } catch {
                // Transient network error — next tick will retry
            }
        }
        poll();
        const interval = setInterval(poll, 2000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [router]);

    // Time-based active stage. Always advances even if backend lags so the
    // UI never feels stuck on "step 1".
    const timeBasedActiveIndex = STAGES.reduce((acc, stage, idx) => {
        return elapsedSec >= stage.minSeconds ? idx : acc;
    }, 0);

    // Backend-driven active stage takes priority when it's further along.
    let backendActiveIndex = 0;
    if (backendStage === 'projecting') backendActiveIndex = 2;
    else if (backendStage === 'baseline') backendActiveIndex = 1;

    const activeIndex = Math.max(timeBasedActiveIndex, backendActiveIndex);

    if (backendStage === 'failed') {
        return (
            <div className="mx-auto max-w-2xl px-6 py-16">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-700">
                        Activation paused
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">
                        We couldn&apos;t generate your baseline automatically.
                    </h2>
                    <p className="mt-2 text-sm text-slate-700">
                        {failureCode === 'INSUFFICIENT_STRIPE_ACTIVITY'
                            ? 'PayFlux needs at least 10 charges and 2 payouts in the last 30 days to model your account. This is common for new or paused accounts. Email support@payflux.dev for manual activation.'
                            : 'Something went wrong during baseline generation. Email support@payflux.dev and we will activate your workspace manually.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl px-6 py-16">
            <div className="rounded-xl border border-slate-200 bg-white p-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Live monitoring activating
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    Reading your Stripe data and modelling the next 30 days.
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                    Typically 30–90 seconds. Read-only — no changes to your account.
                </p>

                <ol className="mt-8 space-y-5">
                    {STAGES.map((stage, idx) => {
                        const isDone = idx < activeIndex;
                        const isActive = idx === activeIndex;
                        return (
                            <li key={stage.key} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={
                                            isDone
                                                ? 'flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white'
                                                : isActive
                                                    ? 'flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-white'
                                                    : 'flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white'
                                        }
                                    >
                                        {isDone ? (
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : isActive ? (
                                            <span className="h-2 w-2 animate-pulse rounded-full bg-slate-900" />
                                        ) : null}
                                    </div>
                                    {idx < STAGES.length - 1 && (
                                        <div className={isDone ? 'mt-1 h-12 w-px bg-slate-900' : 'mt-1 h-12 w-px bg-slate-200'} />
                                    )}
                                </div>
                                <div className="pb-4">
                                    <p
                                        className={
                                            isDone || isActive
                                                ? 'text-sm font-medium text-slate-900'
                                                : 'text-sm font-medium text-slate-400'
                                        }
                                    >
                                        {stage.label}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">{stage.detail}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </div>
    );
}

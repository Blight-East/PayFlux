'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowRight, Clock3, TrendingUp, FileText } from 'lucide-react';
import ReserveForecastPanel from '@/components/ReserveForecastPanel';
import ProjectionTimeline from '@/components/ProjectionTimeline';
import BoardReserveReport from '@/components/BoardReserveReport';
import { DashboardComposition } from '@/components/dashboard/DashboardComposition';
import { logOnboardingEventClient } from '@/lib/onboarding-events';
import UpgradeModal from '@/components/UpgradeModal';
import ReturningUserBanner from '@/components/ReturningUserBanner';

interface ProjectionRootProps {
    tier: string;
    host: string | null;
    activationReady: boolean;
}

interface ForecastSummary {
    currentRiskTier: number;
    trend: string;
    tierDelta: number;
    instabilitySignal: string;
    projectedAt: string;
    reserveProjections: Array<{
        windowDays: number;
        worstCaseTrappedUSD?: number;
        worstCaseTrappedBps: number;
    }>;
    recommendedInterventions: Array<{
        action: string;
        rationale: string;
        priority: 'critical' | 'high' | 'moderate' | 'low';
    }>;
    projectionBasis: {
        inputs: {
            policySurface: { present: number; weak: number; missing: number };
        };
    } | null;
}

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

function signalLabel(signal?: string): string {
    switch (signal) {
        case 'ACCELERATING':
            return 'Critical';
        case 'ELEVATED':
            return 'Elevated';
        case 'LATENT':
            return 'Early warning';
        case 'RECOVERING':
            return 'Recovering';
        default:
            return 'Stable';
    }
}

function normalizeActionTitle(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('refund') || lower.includes('policy')) return 'Fix policy visibility';
    if (lower.includes('support') || lower.includes('contact')) return 'Improve support visibility';
    if (lower.includes('terms') || lower.includes('privacy')) return 'Add missing policy pages';
    if (lower.includes('decline') || lower.includes('retry')) return 'Reduce repeated failed payments';
    return title;
}

function normalizeActionDescription(title: string, description: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('decline') || lower.includes('retry')) {
        return 'Repeated failed payments can make processors look more closely at your account.';
    }
    if (lower.includes('refund') || lower.includes('policy')) {
        return 'Important policy pages are missing or hard for customers to find. This often leads to more disputes and money being held back.';
    }
    return description;
}

export default function ProjectionRoot({ tier, host, activationReady }: ProjectionRootProps) {
    const isFree = tier === 'free';
    const [forecast, setForecast] = useState<ForecastSummary | null>(null);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [fetchTimedOut, setFetchTimedOut] = useState(false);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [returningModalOpen, setReturningModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let timeout: NodeJS.Timeout;

        async function loadForecast() {
            if (!activationReady || !host) return;

            // Start a timeout — if forecast hasn't loaded in 8 seconds, show fallback
            timeout = setTimeout(() => {
                if (!cancelled && !forecast) {
                    setFetchTimedOut(true);
                    console.error('[PAYFLUX_FUNNEL] projection_fetch_timeout', { host });
                }
            }, 8000);

            try {
                const params = new URLSearchParams({ host });
                const response = await fetch(`/api/v1/risk/forecast?${params.toString()}`);
                if (!response.ok) {
                    console.error('[PAYFLUX_FUNNEL] projection_fetch_failed', { host, status: response.status });
                    if (!cancelled) setFetchFailed(true);
                    return;
                }
                const data = await response.json();
                if (!cancelled) {
                    setForecast(data);
                    setFetchFailed(false);
                    setFetchTimedOut(false);
                    console.log('[PAYFLUX_FUNNEL] projection_loaded', { host, riskTier: data.currentRiskTier, signal: data.instabilitySignal });
                    logOnboardingEventClient('projection_rendered', {
                        host,
                        risk_tier: data.currentRiskTier,
                        instability_signal: data.instabilitySignal,
                        trend: data.trend,
                    });
                }
            } catch (err) {
                console.error('[PAYFLUX_FUNNEL] projection_fetch_failed', { host, error: (err as Error).message });
                if (!cancelled) setFetchFailed(true);
            }
        }

        loadForecast();
        return () => { cancelled = true; clearTimeout(timeout); };
    }, [activationReady, host]);

    const actions = useMemo(() => {
        if (forecast?.recommendedInterventions?.length) {
            return forecast.recommendedInterventions.slice(0, 2).map((intervention, index) => ({
                title: normalizeActionTitle(intervention.action),
                description: normalizeActionDescription(intervention.action, intervention.rationale),
                riskLevel: index === 0 ? 'Top fix' : 'Suggested fix',
                impact: index === 0 ? 'Reduce payout risk' : 'Preventative',
                tone: intervention.priority === 'critical' || intervention.priority === 'high' ? 'warning' as const : 'neutral' as const,
                primaryAction: { label: 'See details', href: '#deep-dive' },
            }));
        }

        return [{
            title: 'Keep monitoring live payout risk',
            description: 'No single action is dominating right now. Keep the live view active and review the deeper forecast below if the processor trend worsens.',
            riskLevel: 'Monitoring',
            impact: 'No urgent fix',
            tone: 'healthy' as const,
            primaryAction: {
                label: 'Review deep dive',
                href: '#deep-dive',
            },
        }];
    }, [forecast?.recommendedInterventions]);

    const highRisk = (forecast?.currentRiskTier ?? 0) >= 4 || forecast?.instabilitySignal === 'ACCELERATING';
    const elevatedRisk = forecast?.instabilitySignal === 'ELEVATED' || forecast?.instabilitySignal === 'LATENT' || (forecast?.currentRiskTier ?? 0) >= 3;
    const statusBanner = highRisk || elevatedRisk
        ? {
            tone: 'warning' as const,
            title: `Action Required: ${Math.min(actions.length, 2)} item${Math.min(actions.length, 2) === 1 ? '' : 's'} need attention to reduce payout risk.`,
            body: 'Processor concern rose on the latest check. Review the top actions below.',
        }
        : {
            tone: 'healthy' as const,
            title: 'Live monitoring is active and no urgent payout warning is leading right now.',
            body: 'PayFlux is still watching for changes in held-fund risk, slower payouts, and account pressure.',
        };

    // Free tier sees only the 30-day window. T+60/T+90 are gated to Pro — this is the upsell hook.
    const visibleProjections = (forecast?.reserveProjections ?? []).filter(
        (projection) => !isFree || projection.windowDays <= 30
    );
    const longWindow = visibleProjections.find((projection) => projection.windowDays === 90)
        ?? visibleProjections[visibleProjections.length - 1];
    const fundsAtRisk = longWindow
        ? longWindow.worstCaseTrappedUSD !== undefined
            ? formatUSD(longWindow.worstCaseTrappedUSD)
            : formatBps(longWindow.worstCaseTrappedBps)
        : 'Estimate pending';

    const kpis = [
        {
            label: 'Capital at risk',
            value: forecast
                ? fundsAtRisk
                : fetchFailed
                    ? 'Analysis in progress'
                    : fetchTimedOut
                        ? 'Still analyzing…'
                        : 'Loading…',
            detail: longWindow
                ? `Worst case in ${longWindow.windowDays} days`
                : fetchFailed
                    ? 'Your projection will appear when analysis completes'
                    : 'Live forecast is updating',
            valueClassName: forecast && (highRisk || elevatedRisk) ? 'text-red-600' : undefined,
        },
        {
            label: 'Processor risk',
            value: forecast ? signalLabel(forecast.instabilitySignal) : (fetchFailed ? 'Pending' : 'Loading…'),
            detail: forecast?.trend === 'DEGRADING'
                ? 'Concern is rising'
                : forecast?.trend === 'IMPROVING'
                    ? 'Concern is easing'
                    : 'No sharp shift right now',
            detailClassName: forecast?.trend === 'DEGRADING' ? 'text-amber-600' : forecast?.trend === 'IMPROVING' ? 'text-emerald-600' : 'text-slate-500',
            valueClassName: highRisk ? 'text-red-600' : elevatedRisk ? 'text-amber-600' : 'text-slate-900',
            icon: elevatedRisk ? <TrendingUp className="h-4 w-4 text-amber-500" /> : undefined,
        },
        {
            label: 'Payout speed',
            value: forecast?.trend === 'DEGRADING' ? 'Under watch' : 'Stable',
            detail: forecast?.trend === 'DEGRADING' ? 'PayFlux is watching for slower payouts' : 'No slower payout signal leading now',
            detailClassName: forecast?.trend === 'DEGRADING' ? 'text-amber-600' : 'text-emerald-600',
        },
        {
            label: 'Monitoring',
            value: 'Active',
            detail: 'Live processor data connected',
            detailClassName: 'text-emerald-600',
            icon: (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
            ),
        },
    ];

    const signals = useMemo(() => {
        const derived: Array<{ title: string; detail: string; meta: string; tone: 'warning' | 'neutral' | 'info' }> = [];
        const policySurface = forecast?.projectionBasis?.inputs.policySurface;

        if (policySurface?.missing && policySurface.missing > 0) {
            derived.push({
                title: 'Important policy pages are missing or hard to find.',
                detail: 'This can make processors less comfortable with disputes, refunds, and customer communication.',
                meta: 'Derived from the latest processor risk check',
                tone: 'warning',
            });
        }
        if (policySurface?.weak && policySurface.weak > 0) {
            derived.push({
                title: 'Some customer-facing policies are too weak.',
                detail: 'Thin or vague policy pages get less credit when processors evaluate your site.',
                meta: 'Derived from the latest processor risk check',
                tone: 'neutral',
            });
        }
        if (forecast?.trend === 'DEGRADING') {
            derived.push({
                title: 'Processor concern rose on the latest check.',
                detail: 'If this trend continues, your processor may start holding back money sooner.',
                meta: `Latest check: ${new Date(forecast.projectedAt).toLocaleString()}`,
                tone: 'warning',
            });
        }
        if (derived.length === 0) {
            derived.push({
                title: 'No single issue is dominating right now.',
                detail: 'The live view is still active, but the current pattern does not point to one urgent driver.',
                meta: 'Live monitoring remains on',
                tone: 'info',
            });
        }

        return derived.slice(0, 3);
    }, [forecast]);

    const context = {
        changes: [
            {
                label: 'Latest shift',
                value: forecast
                    ? `${signalLabel(forecast.instabilitySignal)} risk on the latest processor check.`
                    : 'Live monitoring is active.',
                detail: host ? host : 'Primary monitored host',
            },
            {
                label: 'Current trend',
                value: forecast?.trend === 'DEGRADING'
                    ? 'Risk is moving in the wrong direction.'
                    : forecast?.trend === 'IMPROVING'
                        ? 'Risk is easing compared with the last check.'
                        : 'Risk is not moving sharply right now.',
            },
        ],
        recentChecks: [
            {
                label: 'Latest review',
                value: forecast?.projectedAt ? new Date(forecast.projectedAt).toLocaleString() : 'Forecast loading',
                detail: 'Live processor and site signals combined',
            },
            {
                label: 'Next review',
                value: 'Continuous monitoring',
                detail: 'PayFlux will update the lower deep-dive sections as new checks come in.',
            },
        ],
    };

    const lowerSection = (
        <div id="deep-dive" className="space-y-6">
            {/* Returning user banner — free tier only, once per session */}
            {isFree && (
                <ReturningUserBanner
                    onUpgradeClick={() => setReturningModalOpen(true)}
                    riskSignal={forecast?.instabilitySignal}
                />
            )}

            <ReserveForecastPanel host={host} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_20rem]">
                <div className="space-y-4">
                    <ProjectionTimeline host={host} />
                </div>

                <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900">Deep-dive tools</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Forecast confidence, signed exports, and system diagnostics stay available without taking over the top of the dashboard.
                        </p>
                        <div className="mt-4 space-y-2">
                            <Link
                                href="/dashboard/governance"
                                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 no-underline transition-colors hover:bg-slate-50"
                            >
                                Forecast confidence <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>
                            <Link
                                href="/dashboard/verify"
                                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 no-underline transition-colors hover:bg-slate-50"
                            >
                                Check export <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>
                            <Link
                                href="/dashboard/diagnostics"
                                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 no-underline transition-colors hover:bg-slate-50"
                            >
                                System status <ArrowRight className="h-4 w-4 text-slate-400" />
                            </Link>
                        </div>
                    </div>

                    {host && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Board-grade export</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Export a signed report when you need a portable artifact for internal review or processor conversations.
                            </p>
                            <div className="mt-4">
                                {isFree ? (
                                    <button
                                        onClick={() => {
                                            logOnboardingEventClient('upgrade_viewed', {
                                                trigger_type: 'export',
                                                risk_signal: forecast?.instabilitySignal,
                                            });
                                            setExportModalOpen(true);
                                        }}
                                        className="flex items-center space-x-1.5 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Reserve Report</span>
                                    </button>
                                ) : (
                                    <BoardReserveReport host={host} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
    <>
        <DashboardComposition
            title="Capital at Risk"
            subtitle="Forward-looking projection of funds your processor may hold back."
            headerSlot={(
                <UserButton
                    appearance={{
                        elements: {
                            userButtonAvatarBox: 'w-8 h-8',
                        },
                    }}
                />
            )}
            statusBanner={statusBanner}
            actions={actions}
            kpis={kpis}
            signals={signals}
            signalActionLabel=""
            signalActionDisabled={false}
            context={context}
            lowerSection={lowerSection}
        />

        {/* Export paywall modal — free tier */}
        <UpgradeModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            trigger="export"
            visibleRisk={forecast ? fundsAtRisk : undefined}
            riskSignal={forecast?.instabilitySignal as any}
            hasStripeConnection={true}
        />

        {/* Returning user modal */}
        <UpgradeModal
            open={returningModalOpen}
            onClose={() => setReturningModalOpen(false)}
            trigger="returning_user"
            visibleRisk={forecast ? fundsAtRisk : undefined}
            riskSignal={forecast?.instabilitySignal as any}
            hasStripeConnection={true}
        />
    </>
    );
}

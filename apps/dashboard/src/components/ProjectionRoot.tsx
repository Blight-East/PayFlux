'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowRight, Clock3, TrendingUp } from 'lucide-react';
import ReserveForecastPanel from '@/components/ReserveForecastPanel';
import ProjectionTimeline from '@/components/ProjectionTimeline';
import BoardReserveReport from '@/components/BoardReserveReport';
import { useScanData } from '@/lib/use-scan-data';
import { DashboardComposition } from '@/components/dashboard/DashboardComposition';

interface ProjectionRootProps {
    tier: string;
    host: string | null;
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

export default function ProjectionRoot({ tier, host }: ProjectionRootProps) {
    const isFree = tier === 'free';
    const { scanData } = useScanData();
    const [forecast, setForecast] = useState<ForecastSummary | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadForecast() {
            if (!host) return;
            try {
                const params = new URLSearchParams({ host });
                const response = await fetch(`/api/v1/risk/forecast?${params.toString()}`);
                if (!response.ok) return;
                const data = await response.json();
                if (!cancelled) setForecast(data);
            } catch {
                // non-fatal, the deep-dive panel still owns the full data experience
            }
        }

        loadForecast();
        return () => { cancelled = true; };
    }, [host]);

    const scanFindings = scanData?.data?.findings ?? [];
    const loweredRiskLabel = scanData?.data?.riskLabel?.toUpperCase();

    const actions = useMemo(() => {
        if (scanFindings.length > 0) {
            return scanFindings.slice(0, 2).map((finding, index) => ({
                title: normalizeActionTitle(finding.title),
                description: normalizeActionDescription(finding.title, finding.description),
                riskLevel: index === 0 ? 'Elevated risk' : 'Needs review',
                impact: index === 0 ? 'Operator priority' : 'Preventative',
                tone: index === 0 ? 'warning' as const : 'neutral' as const,
                primaryAction: { label: normalizeActionTitle(finding.title), disabled: true },
                secondaryAction: finding.title.toLowerCase().includes('refund') || finding.title.toLowerCase().includes('policy')
                    ? { label: 'Draft refund policy', disabled: true }
                    : undefined,
            }));
        }

        if (forecast?.recommendedInterventions?.length) {
            return forecast.recommendedInterventions.slice(0, 2).map((intervention, index) => ({
                title: normalizeActionTitle(intervention.action),
                description: normalizeActionDescription(intervention.action, intervention.rationale),
                riskLevel: index === 0 ? 'Top fix' : 'Suggested fix',
                impact: index === 0 ? 'Reduce payout risk' : 'Preventative',
                tone: intervention.priority === 'critical' || intervention.priority === 'high' ? 'warning' as const : 'neutral' as const,
                primaryAction: { label: normalizeActionTitle(intervention.action), disabled: true },
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
    }, [forecast?.recommendedInterventions, scanFindings]);

    const highRisk = loweredRiskLabel === 'HIGH' || loweredRiskLabel === 'CRITICAL' || (forecast?.currentRiskTier ?? 0) >= 4 || forecast?.instabilitySignal === 'ACCELERATING';
    const elevatedRisk = loweredRiskLabel === 'ELEVATED' || forecast?.instabilitySignal === 'ELEVATED' || forecast?.instabilitySignal === 'LATENT' || (forecast?.currentRiskTier ?? 0) >= 3;
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

    const longWindow = forecast?.reserveProjections?.find((projection) => projection.windowDays === 90)
        ?? forecast?.reserveProjections?.[forecast.reserveProjections.length - 1];
    const fundsAtRisk = longWindow
        ? longWindow.worstCaseTrappedUSD !== undefined
            ? formatUSD(longWindow.worstCaseTrappedUSD)
            : formatBps(longWindow.worstCaseTrappedBps)
        : 'Estimate pending';

    const kpis = [
        {
            label: 'Processor risk',
            value: forecast ? signalLabel(forecast.instabilitySignal) : (scanData?.data?.riskLabel ?? 'Loading...'),
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
            label: 'Funds at risk',
            value: fundsAtRisk,
            detail: longWindow ? `Possible impact in ${longWindow.windowDays} days` : 'Live forecast is updating below',
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
        const derivedFromScan = scanFindings.slice(0, 3).map((finding, index) => ({
            title: normalizeActionTitle(finding.title),
            detail: normalizeActionDescription(finding.title, finding.description),
            meta: index === 0 ? 'Latest scan and live view' : 'Current operator signal',
            tone: index === 0 ? 'warning' as const : 'neutral' as const,
        }));

        if (derivedFromScan.length > 0) return derivedFromScan;

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
    }, [forecast, scanFindings]);

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

                    {!isFree && host && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900">Board-grade export</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                Export a signed report when you need a portable artifact for internal review or processor conversations.
                            </p>
                            <div className="mt-4">
                                <BoardReserveReport host={host} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <DashboardComposition
            title="Dashboard"
            subtitle="PayFlux shows when your payment processor may start holding back money, slowing payouts, or escalating account risk, and what to do before it happens."
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
            signalActionLabel="Draft team update"
            signalActionDisabled
            context={context}
            lowerSection={lowerSection}
        />
    );
}

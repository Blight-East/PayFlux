'use client';

import { useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';
import { ArrowRight, Clock3, TrendingUp } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';
import { useScanData } from '@/lib/use-scan-data';
import Link from 'next/link';
import { DashboardComposition } from '@/components/dashboard/DashboardComposition';

interface DashboardFreePreviewProps {
    /** Workspace-attached scan context only. Never global shared scan state. */
    host: string | null;
    hasStripeConnection: boolean;
    onboardingStage: string;
}

function riskBandLabel(label?: string): { text: string; color: string; bgColor: string; borderColor: string } {
    const l = (label ?? '').toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') return { text: l, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    if (l === 'ELEVATED') return { text: 'ELEVATED', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
    if (l === 'MODERATE') return { text: 'MODERATE', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    return { text: 'LOW', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
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

export default function DashboardFreePreview({ host, hasStripeConnection, onboardingStage }: DashboardFreePreviewProps) {
    const { scanData } = useScanData();

    useEffect(() => {
        logOnboardingEventClient('dashboard_preview_viewed');
    }, []);

    // Stripe connected but activation hasn't completed yet → show analyzing state
    if (hasStripeConnection && (onboardingStage === 'connected_free')) {
        return (
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-6 px-6 py-24 md:px-8">
                <div className="flex items-center justify-center w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                    <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analyzing your Stripe data…</h1>
                    <p className="text-sm text-slate-600 max-w-md">
                        PayFlux is reading your payout history, dispute patterns, and balance velocity. Your first projection will appear shortly.
                    </p>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">This usually takes about a minute</p>
            </div>
        );
    }

    const score = scanData?.data?.stabilityScore ?? scanData?.data?.riskScore ?? null;
    const label = scanData?.data?.riskLabel ?? null;
    const findings = scanData?.data?.findings ?? [];
    const hasCompletedScan = onboardingStage !== 'none' || !!scanData;

    const riskBand = riskBandLabel(label ?? undefined);
    const hasIssues = findings.length > 0 && label && label.toUpperCase() !== 'LOW';

    const actionCards = hasCompletedScan
        ? (findings.length > 0 ? findings.slice(0, 2) : [{
            title: 'Connect live monitoring',
            description: 'A scan is useful, but live processor data is what shows whether payout risk is actually getting worse.',
            severity: 'medium',
        }]).map((finding, index) => ({
            title: normalizeActionTitle(finding.title),
            description: normalizeActionDescription(finding.title, finding.description),
            riskLevel: index === 0 && hasIssues ? 'Elevated risk' : 'Needs review',
            impact: index === 0 && hasIssues ? 'Cash-flow risk' : 'Preventative',
            tone: index === 0 && hasIssues ? 'warning' as const : 'neutral' as const,
            primaryAction: {
                label: normalizeActionTitle(finding.title),
                disabled: true,
            },
            secondaryAction: finding.title.toLowerCase().includes('refund') || finding.title.toLowerCase().includes('policy')
                ? { label: 'Draft refund policy', disabled: true }
                : undefined,
        }))
        : [{
            title: 'Connect Stripe to see your risk',
            description: 'Your forward-looking capital-at-risk projection starts when you connect Stripe read-only.',
            riskLevel: 'First step',
            impact: 'Projection',
            tone: 'neutral' as const,
            primaryAction: {
                label: 'Connect Stripe',
                href: '/connect',
                onClick: () => logOnboardingEventClient('connect_cta_clicked', { source: 'dashboard_actions' }),
            },
        }];

    const statusBanner = hasCompletedScan
        ? hasIssues
            ? {
                tone: 'warning' as const,
                title: `Action Required: ${Math.min(actionCards.length, 2)} item${Math.min(actionCards.length, 2) === 1 ? '' : 's'} need attention to reduce payout risk.`,
                body: 'Processor concern rose on the latest check. Review the top actions below.',
            }
            : {
                tone: 'healthy' as const,
                title: 'Monitoring looks calm right now.',
                body: 'No urgent payout warning is standing out from the latest scan, but PayFlux is still pointing you to the next useful step.',
            }
        : {
            tone: 'info' as const,
            title: 'Connect Stripe to see how much capital is at risk.',
            body: 'Your forward-looking projection starts when Stripe data is connected. Read-only — PayFlux cannot move funds.',
        };

    const kpis = [
        {
            label: 'Capital at risk',
            value: hasCompletedScan && hasIssues ? 'Needs live data' : 'Not estimated yet',
            detail: hasStripeConnection ? 'Shown in the forecast below' : 'Connect Stripe to unlock',
        },
        {
            label: 'Processor risk',
            value: hasCompletedScan ? riskBand.text : 'Unknown',
            detail: hasCompletedScan ? `Based on ${findings.length} signal${findings.length === 1 ? '' : 's'}` : 'Connect Stripe to analyze',
            valueClassName: hasCompletedScan ? riskBand.color : 'text-slate-500',
            icon: hasIssues ? <TrendingUp className="h-4 w-4 text-amber-500" /> : undefined,
        },
        {
            label: 'Payout speed',
            value: hasStripeConnection ? 'Watching live' : 'Not live yet',
            detail: hasStripeConnection ? 'Processor data connected' : 'Needs live processor data',
            detailClassName: hasStripeConnection ? 'text-emerald-600' : 'text-slate-500',
        },
        {
            label: 'Monitoring',
            value: hasStripeConnection ? 'Active' : 'Snapshot',
            detail: hasStripeConnection ? 'Live monitoring on' : 'One-time site check',
            detailClassName: hasStripeConnection ? 'text-emerald-600' : 'text-slate-500',
            icon: hasStripeConnection ? (
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
            ) : undefined,
        },
    ];

    const signals = hasCompletedScan
        ? (findings.length > 0 ? findings.slice(0, 3).map((finding, index) => ({
            title: normalizeActionTitle(finding.title),
            detail: normalizeActionDescription(finding.title, finding.description),
            meta: index === 0 ? 'Latest scan result' : 'Detected in the current snapshot',
            tone: index === 0 && hasIssues ? 'warning' as const : 'neutral' as const,
        })) : [{
            title: 'No urgent public warning sign is dominating right now.',
            detail: 'The scan did not find one issue that stands out above the others.',
            meta: 'Latest scan result',
            tone: 'info' as const,
        }])
        : [{
            title: 'No data available yet.',
            detail: 'Connect Stripe to see your forward-looking capital-at-risk projection.',
            meta: 'Waiting for Stripe connection',
            tone: 'info' as const,
        }];

    const context = {
        changes: hasCompletedScan ? [
            {
                label: 'Latest shift',
                value: hasIssues ? `${riskBand.text} risk is showing on the latest check.` : 'No urgent payout warning is leading the latest check.',
                detail: host ? host : 'Latest scan result',
            },
            {
                label: 'Current mode',
                value: hasStripeConnection ? 'Live processor monitoring is connected.' : 'You are still looking at a one-time snapshot.',
            },
        ] : [
            {
                label: 'Current state',
                value: 'No processor data connected yet.',
                detail: 'Connect Stripe to create your first forward-looking projection.',
            },
        ],
        recentChecks: [
            {
                label: 'Latest check',
                value: hasCompletedScan ? 'Snapshot available' : 'No checks yet',
                detail: host ? `Host: ${host}` : 'Run the workspace scan to populate this',
            },
            {
                label: 'Next review',
                value: hasStripeConnection ? 'Continuous monitoring' : 'Manual until connected',
                detail: hasStripeConnection ? 'PayFlux will keep watching automatically.' : 'Connect Stripe to turn on live monitoring.',
            },
        ],
    };

    const lowerSection = (
        <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Forecast and history</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Unlock forward-looking estimates, evidence history, and report exports once PayFlux has enough live data to move past the snapshot.
                        </p>
                    </div>
                    <Clock3 className="h-5 w-5 text-slate-400" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                        href={hasStripeConnection ? '/upgrade' : '/connect'}
                        onClick={() => {
                            if (hasStripeConnection) {
                                logOnboardingEventClient('upgrade_cta_clicked', { source: 'dashboard_deep_dive' });
                            } else {
                                logOnboardingEventClient('connect_cta_clicked', { source: 'dashboard_deep_dive' });
                            }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-[#08539e]"
                    >
                        {hasStripeConnection ? 'Unlock the forecast' : 'Connect Stripe'} <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Support tools</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    System status and diagnostics are available for when you need a deeper look.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                        href="/dashboard/diagnostics"
                        className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 no-underline transition-colors hover:bg-slate-50"
                    >
                        System status
                    </Link>

                </div>
            </div>
        </div>
    );

    return (
        <DashboardComposition
            title="Capital at Risk"
            subtitle={host ? `Forward-looking projection · ${host}` : 'Connect Stripe to see your forward-looking projection'}
            headerSlot={<UserButton appearance={{ elements: { userButtonAvatarBox: 'h-8 w-8' } }} />}
            statusBanner={statusBanner}
            actions={actionCards}
            kpis={kpis}
            signals={signals}
            signalActionLabel=""
            signalActionDisabled={false}
            context={context}
            lowerSection={lowerSection}
        />
    );
}

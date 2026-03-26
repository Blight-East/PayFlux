import type { ReactNode } from 'react';
import { StatusBanner } from './StatusBanner';
import { ActionCard } from './ActionCard';
import { KpiRow } from './KpiRow';
import { SignalList } from './SignalList';
import { ContextSidebar } from './ContextSidebar';

interface DashboardCompositionProps {
    title: string;
    subtitle: string;
    headerSlot?: ReactNode;
    statusBanner: {
        tone: 'warning' | 'healthy' | 'info';
        title: string;
        body: string;
    };
    actions: Array<Parameters<typeof ActionCard>[0]>;
    kpis: Array<Parameters<typeof KpiRow>[0]['items'][number]>;
    signals: Array<Parameters<typeof SignalList>[0]['signals'][number]>;
    signalActionLabel?: string;
    signalActionDisabled?: boolean;
    context: {
        changes: Array<Parameters<typeof ContextSidebar>[0]['changes'][number]>;
        recentChecks: Array<Parameters<typeof ContextSidebar>[0]['recentChecks'][number]>;
    };
    lowerSection?: ReactNode;
}

export function DashboardComposition({
    title,
    subtitle,
    headerSlot,
    statusBanner,
    actions,
    kpis,
    signals,
    signalActionLabel,
    signalActionDisabled,
    context,
    lowerSection,
}: DashboardCompositionProps) {
    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p>
                </div>
                {headerSlot}
            </div>

            <StatusBanner tone={statusBanner.tone} title={statusBanner.title} body={statusBanner.body} />

            <div className="flex flex-col gap-6 xl:flex-row">
                <div className="flex-1 space-y-8">
                    {actions.length > 0 && (
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">What to do first</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {actions.map((action) => (
                                    <ActionCard key={`${action.title}-${action.riskLevel}`} {...action} />
                                ))}
                            </div>
                        </section>
                    )}

                    <KpiRow items={kpis} />
                    <SignalList signals={signals} actionLabel={signalActionLabel} actionDisabled={signalActionDisabled} />
                </div>

                <aside className="w-full xl:w-80">
                    <ContextSidebar changes={context.changes} recentChecks={context.recentChecks} />
                </aside>
            </div>

            {lowerSection && (
                <section className="space-y-4 pt-8">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Deep dive</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            Forecast detail, history, exports, and supporting evidence live below the operator summary.
                        </p>
                    </div>
                    {lowerSection}
                </section>
            )}
        </div>
    );
}

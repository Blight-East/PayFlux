import { AlertTriangle, Info, Search } from 'lucide-react';

type SignalTone = 'warning' | 'neutral' | 'info';

interface SignalItem {
    title: string;
    detail?: string;
    meta?: string;
    tone?: SignalTone;
}

interface SignalListProps {
    signals: SignalItem[];
    actionLabel?: string;
    actionDisabled?: boolean;
}

const ICONS: Record<SignalTone, typeof AlertTriangle> = {
    warning: AlertTriangle,
    neutral: Search,
    info: Info,
};

const ICON_CLASSES: Record<SignalTone, string> = {
    warning: 'text-amber-500',
    neutral: 'text-slate-400',
    info: 'text-[#0A64BC]',
};

export function SignalList({ signals, actionLabel, actionDisabled = false }: SignalListProps) {
    if (signals.length === 0) return null;

    return (
        <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Why this is happening</h3>
                {actionLabel && (
                    <button
                        type="button"
                        disabled={actionDisabled}
                        aria-disabled={actionDisabled}
                        title={actionDisabled ? 'Not yet available' : undefined}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            actionDisabled
                                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                : 'bg-[#0A64BC]/10 text-[#0A64BC] hover:bg-[#0A64BC]/15 hover:text-[#08539e]'
                        }`}
                    >
                        <span>{actionLabel}</span>
                        {actionDisabled && (
                            <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                                Soon
                            </span>
                        )}
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <ul className="divide-y divide-slate-100">
                    {signals.map((signal) => {
                        const tone = signal.tone ?? 'neutral';
                        const Icon = ICONS[tone];
                        return (
                            <li key={`${signal.title}-${signal.meta ?? 'signal'}`} className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50">
                                <Icon className={`mt-0.5 h-5 w-5 ${ICON_CLASSES[tone]}`} />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900">{signal.title}</p>
                                    {signal.detail && <p className="mt-1 text-sm leading-relaxed text-slate-600">{signal.detail}</p>}
                                    {signal.meta && <p className="mt-1 text-xs text-slate-500">{signal.meta}</p>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

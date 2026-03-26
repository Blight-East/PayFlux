import Link from 'next/link';

type ActionTone = 'warning' | 'neutral' | 'healthy';

interface ActionButton {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
}

interface ActionCardProps {
    title: string;
    description: string;
    riskLevel: string;
    impact: string;
    tone?: ActionTone;
    primaryAction: ActionButton;
    secondaryAction?: ActionButton;
}

const TONE_STYLES: Record<ActionTone, { badge: string; dot: string; secondary: string }> = {
    warning: {
        badge: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
        secondary: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    },
    neutral: {
        badge: 'bg-slate-100 text-slate-600',
        dot: 'bg-slate-400',
        secondary: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    },
    healthy: {
        badge: 'bg-emerald-100 text-emerald-700',
        dot: 'bg-emerald-500',
        secondary: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    },
};

function ActionButtonLink({ action, primary }: { action: ActionButton; primary?: boolean }) {
    const isUnavailable = action.disabled || (!action.href && !action.onClick);
    const baseClass = primary
        ? 'bg-[#0A64BC] text-white hover:bg-[#08539e]'
        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
    const disabledClass = primary
        ? 'cursor-not-allowed bg-slate-200 text-slate-500 hover:bg-slate-200'
        : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-100';

    if (isUnavailable) {
        return (
            <button
                type="button"
                disabled
                aria-disabled="true"
                title="Not yet available"
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${disabledClass}`}
            >
                <span>{action.label}</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Soon
                </span>
            </button>
        );
    }

    if (action.href) {
        return (
            <Link
                href={action.href}
                onClick={action.onClick}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium no-underline transition-colors ${baseClass}`}
            >
                {action.label}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={action.onClick}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors ${baseClass}`}
        >
            {action.label}
        </button>
    );
}

export function ActionCard({
    title,
    description,
    riskLevel,
    impact,
    tone = 'warning',
    primaryAction,
    secondaryAction,
}: ActionCardProps) {
    const style = TONE_STYLES[tone];

    return (
        <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {riskLevel}
                </div>
                <span className="text-sm font-medium text-slate-500">{impact}</span>
            </div>

            <h4 className="text-base font-semibold text-slate-900">{title}</h4>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>

            <div className="mt-5 flex flex-wrap gap-2">
                <ActionButtonLink action={primaryAction} primary />
                {secondaryAction && (
                    secondaryAction.href ? (
                        <Link
                            href={secondaryAction.href}
                            onClick={secondaryAction.onClick}
                            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium no-underline transition-colors ${style.secondary}`}
                        >
                            {secondaryAction.label}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled={secondaryAction.disabled}
                            aria-disabled={secondaryAction.disabled}
                            title={secondaryAction.disabled ? 'Not yet available' : undefined}
                            onClick={secondaryAction.onClick}
                            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${secondaryAction.disabled ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-100' : style.secondary}`}
                        >
                            <span>{secondaryAction.label}</span>
                            {secondaryAction.disabled && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    Soon
                                </span>
                            )}
                        </button>
                    )
                )}
            </div>
        </div>
    );
}

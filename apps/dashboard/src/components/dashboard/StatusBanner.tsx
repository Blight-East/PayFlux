import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

type StatusTone = 'warning' | 'healthy' | 'info';

interface StatusBannerProps {
    tone: StatusTone;
    title: string;
    body: string;
}

const TONE_STYLES: Record<StatusTone, { wrapper: string; iconWrap: string; icon: string; title: string; body: string; Icon: typeof AlertTriangle }> = {
    warning: {
        wrapper: 'border border-amber-200 bg-amber-50',
        iconWrap: 'bg-amber-100',
        icon: 'text-amber-600',
        title: 'text-amber-900',
        body: 'text-amber-700',
        Icon: AlertTriangle,
    },
    healthy: {
        wrapper: 'border border-emerald-200 bg-emerald-50',
        iconWrap: 'bg-emerald-100',
        icon: 'text-emerald-600',
        title: 'text-emerald-900',
        body: 'text-emerald-700',
        Icon: CheckCircle2,
    },
    info: {
        wrapper: 'border border-slate-200 bg-white',
        iconWrap: 'bg-slate-100',
        icon: 'text-slate-600',
        title: 'text-slate-900',
        body: 'text-slate-600',
        Icon: Info,
    },
};

export function StatusBanner({ tone, title, body }: StatusBannerProps) {
    const style = TONE_STYLES[tone];
    const Icon = style.Icon;

    return (
        <div className={`rounded-xl p-4 sm:p-5 ${style.wrapper}`}>
            <div className="flex items-start gap-4">
                <div className={`mt-0.5 rounded-full p-2 ${style.iconWrap}`}>
                    <Icon className={`h-5 w-5 ${style.icon}`} />
                </div>
                <div className="min-w-0">
                    <h2 className={`text-base font-semibold ${style.title}`}>{title}</h2>
                    <p className={`mt-1 text-sm leading-relaxed ${style.body}`}>{body}</p>
                </div>
            </div>
        </div>
    );
}

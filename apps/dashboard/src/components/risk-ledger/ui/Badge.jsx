import { clsx } from 'clsx';

export function Badge({ children, variant = "neutral", className }) {
    const variants = {
        neutral: "bg-surface text-muted border-white/5",
        operational: "bg-safe/10 text-safe border-safe/20",
        degraded: "bg-warning/10 text-warning border-warning/20",
        down: "bg-danger/10 text-danger border-danger/20",
        info: "bg-info/10 text-info border-info/20"
    };

    return (
        <span className={clsx(
            "inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-medium border",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
}

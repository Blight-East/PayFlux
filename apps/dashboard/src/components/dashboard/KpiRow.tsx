import type { ReactNode } from 'react';

interface KpiItem {
    label: string;
    value: string;
    detail?: string;
    icon?: ReactNode;
    valueClassName?: string;
    detailClassName?: string;
}

export function KpiRow({ items }: { items: KpiItem[] }) {
    if (items.length === 0) return null;

    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900">Current status</h3>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {items.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">{item.label}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xl font-bold text-slate-900 ${item.valueClassName ?? ''}`}>{item.value}</span>
                            {item.icon}
                        </div>
                        {item.detail && (
                            <p className={`mt-1 text-xs ${item.detailClassName ?? 'text-slate-500'}`}>{item.detail}</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

import { Clock3, History } from 'lucide-react';

interface ContextEntry {
    label?: string;
    value: string;
    detail?: string;
}

interface ContextSidebarProps {
    changes: ContextEntry[];
    recentChecks: ContextEntry[];
}

function ContextCard({
    title,
    icon: Icon,
    items,
}: {
    title: string;
    icon: typeof History;
    items: ContextEntry[];
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Icon className="h-4 w-4 text-slate-500" />
                {title}
            </h3>
            <div className="mt-4 space-y-4">
                {items.map((item, idx) => (
                    <div key={`${title}-${idx}`}>
                        {item.label && <p className="text-xs text-slate-500">{item.label}</p>}
                        <p className="mt-1 text-sm font-medium text-slate-900">{item.value}</p>
                        {item.detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.detail}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ContextSidebar({ changes, recentChecks }: ContextSidebarProps) {
    return (
        <div className="space-y-6">
            <ContextCard title="What changed" icon={History} items={changes} />
            <ContextCard title="Recent checks" icon={Clock3} items={recentChecks} />
        </div>
    );
}

import Link from 'next/link';

export default function DocCTA({ topic, slug }: { topic: string; slug: string }) {
    const scanHref = `/scan?ref=docs&topic=${encodeURIComponent(slug || 'index')}`;

    return (
        <aside
            aria-label="Run this on your own data"
            className="mt-16 mb-8 rounded-xl border border-slate-200 bg-slate-50 px-8 py-8"
        >
            <p className="text-[11px] uppercase tracking-widest text-slate-400">
                Run on your data
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
                See &ldquo;{topic}&rdquo; on your own processor.
            </h2>
            <p className="mt-2 max-w-prose text-sm text-slate-600">
                Connect Stripe in 90 seconds. Read-only. Free to start. We project
                the next 30/60/90 days of capital exposure from the same signals
                your acquirer is reading.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
                <Link
                    href={scanHref}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                    Run scan
                </Link>
                <Link
                    href="/app/posture"
                    className="inline-flex items-center rounded-lg border border-slate-900 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
                >
                    See demo data
                </Link>
            </div>
        </aside>
    );
}

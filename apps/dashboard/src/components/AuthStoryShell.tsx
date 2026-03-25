import Link from 'next/link';

interface AuthStoryShellProps {
    title: string;
    body: string;
    children: React.ReactNode;
    secondaryCtaLabel?: string;
    secondaryCtaHref?: string;
}

const OPERATOR_QUESTIONS = [
    {
        title: 'What is happening?',
        body: 'PayFlux shows when your payment processor may start holding back money, slowing payouts, or escalating account risk.',
    },
    {
        title: 'Why does it matter?',
        body: 'Processors usually move before a merchant sees the cash-flow damage. By then, part of your sales may already be trapped.',
    },
    {
        title: 'What should I do next?',
        body: 'Start with a simple check, connect live processor data, and then work through the highest-impact fixes before payouts are hit.',
    },
];

export default function AuthStoryShell({
    title,
    body,
    children,
    secondaryCtaLabel,
    secondaryCtaHref,
}: AuthStoryShellProps) {
    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
                <section className="space-y-8">
                    <div className="space-y-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/80">
                            Processor Early Warning
                        </p>
                        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                            {title}
                        </h1>
                        <p className="max-w-2xl text-base leading-relaxed text-slate-300">
                            {body}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {OPERATOR_QUESTIONS.map((item) => (
                            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
                        <p className="text-sm font-medium text-slate-100">What PayFlux helps you prevent</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            Unexpected reserve requirements, slower payouts, account reviews, and the scramble to explain processor behavior after cash flow is already under pressure.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                            <span>Money held back</span>
                            <span className="text-slate-700">·</span>
                            <span>Slower payouts</span>
                            <span className="text-slate-700">·</span>
                            <span>Rising account risk</span>
                            <span className="text-slate-700">·</span>
                            <span>Clear next actions</span>
                        </div>
                        {secondaryCtaHref && secondaryCtaLabel && (
                            <Link
                                href={secondaryCtaHref}
                                className="mt-5 inline-flex items-center text-sm font-medium text-amber-400 no-underline transition-colors hover:text-amber-300"
                            >
                                {secondaryCtaLabel}
                            </Link>
                        )}
                    </div>
                </section>

                <section className="flex justify-center lg:justify-end">
                    <div className="w-full max-w-md">
                        {children}
                    </div>
                </section>
            </div>
        </div>
    );
}

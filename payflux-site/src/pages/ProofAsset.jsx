import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, DollarSign, Eye, FileText, ShieldCheck } from 'lucide-react';
import Footer from '../components/Footer';

const proofBlocks = [
    {
        icon: Eye,
        title: 'What changed',
        body: 'Payout timing drifted, reserve pressure appeared, and account-review language started clustering. That combination is the signal, not any one alert by itself.',
    },
    {
        icon: DollarSign,
        title: 'Why it matters',
        body: 'If a merchant is moving tens of thousands each month, a payout freeze, rolling reserve, or review escalation can easily put materially more cash at risk than $499.',
    },
    {
        icon: ShieldCheck,
        title: 'What to do next',
        body: 'The value is not just seeing the risk. It is understanding whether the pressure is getting worse and what action matters first: stabilize the current processor, prepare an alternative, or tighten the risk posture immediately.',
    },
];

const objections = [
    'This only matters if it protects materially more cash than it costs.',
    'This has to feel like operator guidance, not another dashboard.',
    'The buyer has to trust that the signal is tied to real processor behavior, not generic business noise.',
];

const ProofAsset = () => {
    useEffect(() => {
        document.title = 'Illustrative Proof Asset | PayFlux';
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">
            <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/[0.06] h-16">
                <div className="max-w-[1080px] mx-auto px-8 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 no-underline">
                        <div className="w-7 h-7 bg-[#0A64BC] rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-white">PayFlux</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link to="/pricing" className="text-[13px] text-slate-500 hover:text-white transition-colors no-underline">
                            Pricing
                        </Link>
                        <Link to="/" className="text-[13px] text-slate-500 hover:text-white transition-colors no-underline">
                            Home
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-[1080px] mx-auto px-8 pt-32 pb-20">
                <section className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] items-start">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#0A64BC]/30 bg-[#0A64BC]/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#8fc5ff]">
                            <FileText className="w-3.5 h-3.5" />
                            Illustrative Proof Asset
                        </div>
                        <h1 className="mt-6 text-4xl md:text-5xl font-semibold tracking-tight text-white">
                            What a Merchant Needs to Believe Before Paying for PayFlux
                        </h1>
                        <p className="mt-6 text-lg leading-relaxed text-slate-300">
                            A merchant under payout delay or reserve pressure is not buying software. They are deciding whether this can help them avoid a larger cash problem. This page shows the kind of proof PayFlux has to deliver.
                        </p>

                        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-white">Important</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                        This is an illustrative operator brief, not customer data. The goal is to show the shape of the evidence and decision-making a merchant would expect before trusting PayFlux with a live problem.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 space-y-4">
                            {proofBlocks.map(({ icon: Icon, title, body }) => (
                                <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-[#0A64BC]">
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-white">{title}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.38)]">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div>
                                <p className="text-sm font-semibold text-white">Illustrative Merchant Brief</p>
                                <p className="mt-1 text-sm text-slate-400">How PayFlux should frame a live processor-pressure case</p>
                            </div>
                            <span className="inline-flex rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300">
                                Rising Risk
                            </span>
                        </div>

                        <div className="mt-6 grid gap-4">
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                <p className="text-sm font-medium text-slate-400">Processor Pressure Summary</p>
                                <p className="mt-2 text-xl font-semibold text-white">Payout timing drift + reserve pressure + review risk</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                    Three related signals are clustering. The merchant does not just need visibility. They need to know whether this is stabilizing or getting worse.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                    <p className="text-sm font-medium text-slate-400">Before</p>
                                    <p className="mt-2 text-base font-semibold text-white">Merchant is reacting to symptoms</p>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-500">
                                        <li>Payout timing feels inconsistent</li>
                                        <li>Reserve/review language is confusing</li>
                                        <li>No clear read on whether the problem is escalating</li>
                                    </ul>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                    <p className="text-sm font-medium text-slate-400">After</p>
                                    <p className="mt-2 text-base font-semibold text-white">Merchant has an operator-ready read</p>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-500">
                                        <li>What changed</li>
                                        <li>Why it matters for cash flow</li>
                                        <li>What to do first this week</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                <p className="text-sm font-medium text-slate-400">Cash-Impact Frame</p>
                                <p className="mt-2 text-base font-semibold text-white">The decision is simple: does this protect more than $499?</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                    If one payout delay, reserve escalation, or processor review can trap materially more cash than the monthly cost, the merchant will treat PayFlux as protection instead of another tool expense.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                <p className="text-sm font-medium text-slate-400">What the merchant needs next</p>
                                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                    <li>1. Confirm whether the issue is payout delay, reserve pressure, or review escalation</li>
                                    <li>2. Decide whether to stabilize the current processor or prepare an alternative</li>
                                    <li>3. Move into live monitoring if the issue is active enough to need ongoing visibility</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-20 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
                        <p className="text-sm font-semibold text-slate-400">Common Objections</p>
                        <div className="mt-6 space-y-4">
                            {objections.map((item) => (
                                <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm leading-relaxed text-slate-300">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
                        <p className="text-sm font-semibold text-slate-400">What this proof asset is supposed to do</p>
                        <div className="mt-6 grid gap-4">
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                <p className="text-base font-semibold text-white">Reduce trust friction</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                    The merchant should feel that PayFlux understands real processor pressure, not just generic business analytics.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                <p className="text-base font-semibold text-white">Translate visibility into action</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                    The output should always answer: what changed, why it matters, and what to do next.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                <p className="text-base font-semibold text-white">Make the economics obvious</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                    The merchant has to believe the avoided downside can easily outweigh the monthly cost.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                            <a
                                href="https://app.payflux.dev/start"
                                className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-6 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#08539e]"
                            >
                                Run a Free Scan
                            </a>
                            <Link
                                to="/pricing"
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-white no-underline transition-colors hover:border-slate-600 hover:bg-slate-900"
                            >
                                See Pricing
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default ProofAsset;

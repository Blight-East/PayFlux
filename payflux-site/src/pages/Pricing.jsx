import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Pricing = () => {
    useEffect(() => {
        document.title = 'Pricing | PayFlux';
        const link = document.querySelector("link[rel='canonical']") || document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', 'https://payflux.dev/pricing');
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans selection:bg-indigo-500/30">
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl h-16">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-slate-600 rounded-sm" />
                        <span className="text-white font-bold tracking-tight text-xl">PayFlux</span>
                    </Link>
                    <Link to="/" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">
                        ← Back to Home
                    </Link>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
                <div className="mb-20 text-center">
                    <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">Pricing</h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Unlock depth, not access. Every account detects risk signals.
                        Pro accounts quantify trapped capital.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-20">
                    {/* FREE */}
                    <div className="flex flex-col border border-white/5 p-10 rounded-sm">
                        <div className="mb-10">
                            <h3 className="text-white font-semibold mb-2">Free</h3>
                            <div className="text-3xl font-bold text-white mb-6">$0</div>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>Risk scan</li>
                                <li>Signal detection</li>
                                <li>Instability classification</li>
                                <li>Trajectory summary</li>
                                <li>Projection preview (no USD exposure)</li>
                            </ul>
                        </div>
                        <div className="mt-auto">
                            <a
                                href="https://app.payflux.dev/risk"
                                className="block text-center w-full py-4 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                            >
                                Run Free Scan
                            </a>
                        </div>
                    </div>

                    {/* PRO */}
                    <div className="flex flex-col border border-white/20 p-10 rounded-sm">
                        <div className="mb-10">
                            <h3 className="text-white font-semibold mb-2">Pro</h3>
                            <div className="text-3xl font-bold text-white mb-6">
                                $499<span className="text-sm text-zinc-400"> / month</span>
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>Everything in Free</li>
                                <li>Deterministic reserve projection (30–180 day windows)</li>
                                <li>Base + Escalation scenarios</li>
                                <li>USD exposure modeling</li>
                                <li>Full export artifact (PDF)</li>
                                <li>Projection archive</li>
                            </ul>
                            <div className="text-xs text-zinc-500 mt-6">
                                One avoided reserve escalation offsets multiple years of subscription cost.
                            </div>
                        </div>
                        <div className="mt-auto">
                            <a
                                href="https://app.payflux.dev/upgrade"
                                className="block text-center w-full py-4 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                            >
                                Start Pro
                            </a>
                        </div>
                    </div>

                    {/* ENTERPRISE */}
                    <div className="flex flex-col border border-white/5 p-10 rounded-sm">
                        <div className="mb-10">
                            <h3 className="text-white font-semibold mb-2">Enterprise</h3>
                            <div className="text-3xl font-bold text-white mb-6">Contact Sales</div>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>Everything in Pro</li>
                                <li>Custom reserve windows</li>
                                <li>API access</li>
                                <li>Portfolio-level reporting</li>
                                <li>Dedicated onboarding</li>
                                <li>SLA support</li>
                            </ul>
                        </div>
                        <div className="mt-auto">
                            <Link
                                to="/#contact"
                                className="block text-center w-full py-4 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                            >
                                Talk to Sales
                            </Link>
                        </div>
                    </div>
                </div>

                <section className="max-w-3xl mx-auto border-t border-white/5 pt-16">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-8">Billing & Policies</h2>
                    <ul className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                        <li className="flex items-start gap-3">
                            <span className="text-zinc-600">•</span>
                            All prices in USD
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-zinc-600">•</span>
                            Pro billing is monthly subscription
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-zinc-600">•</span>
                            Taxes may apply depending on jurisdiction
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-zinc-600">•</span>
                            Refund terms are described in our <Link to="/refunds" className="text-white hover:underline">Refund Policy</Link>
                        </li>
                    </ul>
                    <div className="flex gap-6 mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link to="/refunds" className="hover:text-white transition-colors">Refund</Link>
                        <Link to="/pricing" className="text-white transition-colors">Pricing</Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Pricing;

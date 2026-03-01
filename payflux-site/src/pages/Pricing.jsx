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
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 h-16">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-900 rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-slate-900">PayFlux</span>
                    </Link>
                    <Link to="/" className="text-[13px] text-slate-400 hover:text-slate-900 transition-colors">
                        &larr; Back
                    </Link>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
                <div className="mb-16 text-center">
                    <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4">Pricing</h1>
                    <p className="text-lg text-slate-500">
                        Three tiers. No opacity.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 items-stretch mb-20">
                    {/* FREE */}
                    <div className="flex flex-col bg-white border border-slate-200 rounded-lg p-8">
                        <div className="mb-8">
                            <div className="text-base font-semibold text-slate-900 mb-1">Free</div>
                            <div className="text-[13px] text-slate-400 mb-4">Diagnostic mode</div>
                            <div className="text-3xl font-semibold text-slate-900 tabular-nums">$0</div>
                        </div>
                        <ul className="space-y-3 text-[13px] text-slate-600 flex-1">
                            <li>Risk tier visibility</li>
                            <li>Trend and instability signals</li>
                            <li className="text-slate-300">No projection modeling</li>
                            <li className="text-slate-300">No intervention derivation</li>
                            <li className="text-slate-300">No ledger exports</li>
                        </ul>
                        <div className="mt-8">
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center w-full py-3 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                Access Dashboard
                            </a>
                        </div>
                    </div>

                    {/* PRO */}
                    <div className="flex flex-col bg-white border border-slate-900 rounded-lg p-8">
                        <div className="mb-8">
                            <div className="text-base font-semibold text-slate-900 mb-1">Pro</div>
                            <div className="text-[13px] text-slate-400 mb-4">Full instrument</div>
                            <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                                $499<span className="text-sm font-normal text-slate-400"> / month</span>
                            </div>
                        </div>
                        <ul className="space-y-3 text-[13px] text-slate-600 flex-1">
                            <li>Full projection engine (T+90)</li>
                            <li>Intervention modeling</li>
                            <li>Signed projection ledger</li>
                            <li>Board reserve report</li>
                            <li>Rolling model accuracy</li>
                        </ul>
                        <div className="mt-8">
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center w-full py-3 bg-slate-900 text-white text-[13px] font-medium rounded-md hover:bg-slate-800 transition-colors"
                            >
                                Start Pro
                            </a>
                        </div>
                    </div>

                    {/* ENTERPRISE */}
                    <div className="flex flex-col bg-white border border-slate-200 rounded-lg p-8">
                        <div className="mb-8">
                            <div className="text-base font-semibold text-slate-900 mb-1">Enterprise</div>
                            <div className="text-[13px] text-slate-400 mb-4">Custom</div>
                            <div className="text-3xl font-semibold text-slate-900">Contact Sales</div>
                        </div>
                        <ul className="space-y-3 text-[13px] text-slate-600 flex-1">
                            <li>Higher throughput</li>
                            <li>Bulk exports</li>
                            <li>Multi-merchant aggregation</li>
                            <li>Processor attestation readiness</li>
                        </ul>
                        <div className="mt-8">
                            <Link
                                to="/#contact"
                                className="block text-center w-full py-3 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                Talk to Sales
                            </Link>
                        </div>
                    </div>
                </div>

                <section className="max-w-3xl mx-auto border-t border-slate-100 pt-12">
                    <h2 className="text-[13px] text-slate-400 font-medium mb-6">Billing & Policies</h2>
                    <ul className="space-y-3 text-slate-500 text-[13px] leading-relaxed">
                        <li className="flex items-start gap-3">
                            <span className="text-slate-300 mt-0.5">&middot;</span>
                            All prices in USD
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-slate-300 mt-0.5">&middot;</span>
                            Pro billing is monthly subscription
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-slate-300 mt-0.5">&middot;</span>
                            Taxes may apply depending on jurisdiction
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-slate-300 mt-0.5">&middot;</span>
                            Refund terms are described in our <Link to="/refunds" className="text-slate-900 hover:underline">Refund Policy</Link>
                        </li>
                    </ul>
                    <div className="flex gap-6 mt-8 text-[13px] text-slate-400">
                        <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                        <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                        <Link to="/refunds" className="hover:text-slate-900 transition-colors">Refunds</Link>
                        <Link to="/pricing" className="text-slate-900">Pricing</Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Pricing;

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const DASHBOARD_URL = 'https://app.payflux.dev/dashboard';
const APP_PRICING_URL = 'https://app.payflux.dev/pricing';

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
        <div className="min-h-screen font-sans bg-slate-950">
            <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/[0.06] h-16">
                <div className="max-w-[960px] mx-auto px-8 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#0A64BC] rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-white">PayFlux</span>
                    </Link>
                    <Link to="/" className="text-[13px] text-slate-500 hover:text-white transition-colors">
                        Back
                    </Link>
                </div>
            </nav>

            <main className="bg-white bg-engineering">
                <div className="max-w-[960px] mx-auto px-8 pt-32 pb-20">
                    <div className="mb-16 text-center">
                        <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight mb-4">Pricing</h1>
                        <p className="text-lg text-slate-500">
                            Start with a free snapshot. Upgrade when you need live monitoring and earlier warnings.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6 items-stretch mb-20">
                        {/* FREE */}
                        <div className="flex flex-col bg-white border border-slate-200 rounded-lg p-8 h-full hover:border-slate-300 transition-colors">
                            <div className="mb-8">
                                <div className="text-xl font-bold text-slate-900 mb-1">Free</div>
                                <div className="text-sm text-slate-500 mb-6">One-time snapshot</div>
                                <div className="font-mono text-4xl font-bold text-slate-900 text-numeric">$0</div>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-600 flex-1">
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> One-time processor risk snapshot</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Visible warning signs and instability signals</li>
                                <li className="flex items-start gap-3 text-slate-400"><span className="mt-0.5 opacity-50">&bull;</span> No live processor monitoring</li>
                                <li className="flex items-start gap-3 text-slate-400"><span className="mt-0.5 opacity-50">&bull;</span> No ongoing early-warning tracking</li>
                                <li className="flex items-start gap-3 text-slate-400"><span className="mt-0.5 opacity-50">&bull;</span> No deeper forecast or exports</li>
                            </ul>
                            <div className="mt-8">
                                <a
                                    href={DASHBOARD_URL}
                                    className="block text-center w-full py-3 border border-slate-300 text-slate-900 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                                >
                                    Get Started
                                </a>
                            </div>
                        </div>

                        {/* PRO */}
                        <div className="flex flex-col bg-white border-2 border-slate-900 rounded-lg p-8 h-full">
                            <div className="mb-8">
                                <div className="text-xl font-bold text-slate-900 mb-1">Pro</div>
                                <div className="text-sm text-slate-500 mb-6">Live monitoring</div>
                                <div className="font-mono text-4xl font-bold text-slate-900 text-numeric">
                                    $499<span className="text-sm text-slate-500 font-sans font-normal"> / month</span>
                                </div>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-900 font-medium flex-1">
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Live processor monitoring</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Earlier warnings for payout delays, held funds, and rising account pressure</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Forward-looking forecast and what-changed visibility</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Exportable evidence and operator-ready records</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Guidance on what to fix before cash flow gets squeezed</li>
                            </ul>
                            <div className="mt-8">
                                <a
                                    href={APP_PRICING_URL}
                                    className="block text-center w-full py-3 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
                                >
                                    Start Pro
                                </a>
                            </div>
                        </div>

                        {/* ENTERPRISE */}
                        <div className="flex flex-col bg-white border border-slate-200 rounded-lg p-8 h-full hover:border-slate-300 transition-colors">
                            <div className="mb-8">
                                <div className="text-xl font-bold text-slate-900 mb-1">Enterprise</div>
                                <div className="text-sm text-slate-500 mb-6">Custom rollout</div>
                                <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">Contact Sales</div>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-600 flex-1">
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Multi-merchant monitoring and reporting</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Higher throughput and custom exports</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Custom rollout for larger payment operations</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Support for more complex processor workflows</li>
                            </ul>
                            <div className="mt-8">
                                <Link
                                    to="/#contact"
                                    className="block text-center w-full py-3 border border-slate-300 text-slate-900 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
                                >
                                    Contact
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
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Pricing;

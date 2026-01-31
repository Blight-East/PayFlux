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
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Pricing</h1>
                    <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">
                        Transparent pricing for teams that need provable operational integrity.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-20">
                    {/* Tier 1: PILOT */}
                    <div className="flex flex-col bg-white/[0.02] border border-white/5 p-10 rounded-sm">
                        <div className="mb-10 text-center border-b border-white/5 pb-10">
                            <h3 className="text-[11px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-4">PILOT</h3>
                            <p className="text-white font-bold text-xl mb-4 italic tracking-tight">"Do we have proof of degradation?"</p>
                            <p className="text-[14px] text-slate-400 leading-relaxed font-medium">
                                Designed for teams seeking to establish high-confidence operational baselines and support institutional reviews.
                            </p>
                        </div>
                        <div className="pt-2 text-center mt-auto">
                            <div className="text-[15px] font-black text-white uppercase tracking-widest mb-8">$5,000 / 90 days</div>
                            <button onClick={() => window.location.href = '/#start-pilot'} className="w-full py-4 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">Start Pilot</button>
                        </div>
                    </div>

                    {/* Tier 2: GROWTH */}
                    <div className="flex flex-col bg-[#0d1117] border border-indigo-500/40 p-10 rounded-sm relative shadow-2xl z-10">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm">Recommended</div>
                        <div className="mb-10 text-center border-b border-white/5 pb-10">
                            <h3 className="text-[11px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-4">GROWTH</h3>
                            <p className="text-white font-bold text-xl mb-4 italic tracking-tight">"Are we operating safely?"</p>
                            <p className="text-[14px] text-slate-400 leading-relaxed font-semibold">
                                Designed for teams seeking to establish high-confidence operational baselines and support institutional reviews.
                            </p>
                        </div>
                        <div className="pt-2 text-center mt-auto">
                            <div className="text-[15px] font-black text-white uppercase tracking-widest mb-8">$2,500 / month</div>
                            <button className="w-full py-4 bg-indigo-600 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">Move to Growth</button>
                        </div>
                    </div>

                    {/* Tier 3: SCALE */}
                    <div className="flex flex-col bg-white/[0.02] border border-white/5 p-10 rounded-sm">
                        <div className="mb-10 text-center border-b border-white/5 pb-10">
                            <h3 className="text-[11px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-4">SCALE</h3>
                            <p className="text-white font-bold text-xl mb-4 italic tracking-tight">"Can we withstand scrutiny?"</p>
                            <p className="text-[14px] text-slate-400 leading-relaxed font-medium">
                                Designed for teams seeking to establish high-confidence operational baselines and support institutional reviews.
                            </p>
                        </div>
                        <div className="pt-2 text-center mt-auto">
                            <div className="text-[15px] font-black text-white uppercase tracking-widest mb-8">$7,500 / month</div>
                            <button className="w-full py-4 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all">Contact Sales</button>
                        </div>
                    </div>
                </div>

                <section className="max-w-3xl mx-auto border-t border-white/5 pt-16">
                    <h2 className="text-[11px] uppercase tracking-[0.2em] text-indigo-400 font-bold mb-8">Billing & Policies</h2>
                    <ul className="space-y-4 text-slate-400 text-sm leading-relaxed font-medium">
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500">•</span>
                            All prices in USD
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500">•</span>
                            Billing is subscription-based
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500">•</span>
                            Taxes may apply depending on jurisdiction
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500">•</span>
                            Refund terms are described in our Refund Policy
                        </li>
                    </ul>
                    <div className="flex gap-6 mt-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
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

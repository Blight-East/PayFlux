import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Cancel = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">
            <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/[0.06] h-16">
                <div className="max-w-[960px] mx-auto px-8 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#0A64BC] rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-white">PayFlux</span>
                    </Link>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto px-8 pt-40 pb-32 text-center">
                <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center mx-auto mb-8">
                    <span className="font-mono text-xl font-bold text-slate-500">&times;</span>
                </div>

                <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-medium mb-4">
                    Payment Not Completed
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                    No charges applied.
                </h1>

                <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto">
                    Your payment was not completed and no charges were made. You can return to pricing to try again when you're ready.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/pricing"
                        className="px-8 py-3 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors text-center"
                    >
                        View Pricing
                    </Link>
                    <Link
                        to="/"
                        className="px-8 py-3 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors text-center"
                    >
                        Back to Home
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Cancel;

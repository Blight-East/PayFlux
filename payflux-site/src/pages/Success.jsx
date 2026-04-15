import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Footer from '../components/Footer';

const Success = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

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
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center mx-auto mb-8">
                    <Lock className="w-7 h-7 text-emerald-400" />
                </div>

                <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-400 font-medium mb-4">
                    Subscription Activated
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                    You're in.
                </h1>

                <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-lg mx-auto">
                    Your PayFlux Pro subscription is now active. Full projection engine, intervention modeling, and signed ledger access are ready.
                </p>

                {sessionId && (
                    <div className="mb-10 inline-block bg-slate-900 border border-slate-800 px-4 py-2 rounded-md">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Session </span>
                        <span className="text-[10px] font-mono text-slate-400">{sessionId.slice(0, 20)}...</span>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="https://app.payflux.dev/dashboard"
                        className="px-8 py-3 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors text-center"
                    >
                        Access Dashboard
                    </a>
                    <Link
                        to="/"
                        className="px-8 py-3 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors text-center"
                    >
                        Back to Home
                    </Link>
                </div>
            </main>

            <Footer variant="dark" />
        </div>
    );
};

export default Success;

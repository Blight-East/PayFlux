import React, { useState } from 'react';
import {
    ArrowRight,
    Activity,
    Eye,
    Cpu,
    BarChart4,
    Terminal,
    Check,
    X,
    FileText,
    Lock,
    ChevronDown,
    Menu,
    FileCode2
} from 'lucide-react';
import Footer from '../components/Footer';

const Home = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-slate-800 selection:text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="text-white font-semibold text-xl tracking-tight flex items-center gap-2">
                            <div className="w-5 h-5 bg-white rounded-[4px] relative overflow-hidden">
                                <div className="absolute inset-0 bg-slate-900 translate-y-2 translate-x-2 rounded-tl-[4px]"></div>
                            </div>
                            PayFlux
                        </div>
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
                            <a href="#instrument" className="hover:text-white transition-colors">Instrument</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4">
                        <a
                            href="https://app.payflux.dev/dashboard"
                            className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/5"
                        >
                            Access Dashboard
                        </a>
                    </div>
                    <button
                        className="md:hidden text-slate-400 hover:text-white"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-800 bg-slate-950 px-6 py-4 space-y-4">
                        <a href="#how-it-works" className="block text-sm font-medium text-slate-400 hover:text-white">How it works</a>
                        <a href="#instrument" className="block text-sm font-medium text-slate-400 hover:text-white">Instrument</a>
                        <a href="#pricing" className="block text-sm font-medium text-slate-400 hover:text-white">Pricing</a>
                        <a
                            href="https://app.payflux.dev/dashboard"
                            className="block w-full text-center text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/5"
                        >
                            Access Dashboard
                        </a>
                    </div>
                )}
            </nav>

            <main className="pt-16 pb-32 space-y-0">
                {/* Hero Section */}
                <section className="min-h-[92vh] flex items-center">
                  <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full">
                    <div className="space-y-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-wider">
                                <Activity className="w-3 h-3 text-emerald-400" />
                                DETERMINISTIC RESERVE PROJECTION INFRASTRUCTURE
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.1]">
                                Rolling reserves don't surprise you.<br />
                                <span className="text-slate-500">They build.</span>
                            </h1>
                            <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                                Model reserve exposure before processors escalate. Measure projection accuracy over time. Export signed reports for leadership. Understand capital impact before it compounds.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="text-sm font-medium text-slate-950 bg-white hover:bg-slate-200 px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                            >
                                Access Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </a>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4 text-slate-400" />
                                View Board Report Sample
                            </a>
                        </div>
                    </div>

                    {/* Hero Visual - Code Based Terminal */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl rounded-full"></div>
                        <div className="relative bg-[#0F0F0F] border border-slate-800 rounded-2xl p-10 shadow-2xl font-mono">
                            <div className="flex items-center justify-between mb-10">
                                <div className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <Terminal className="w-4 h-4" />
                                    EXAMPLE OUTPUT
                                </div>
                                <div className="text-xs text-slate-500 border border-slate-800 px-2 py-1 rounded bg-slate-900/50">
                                    reserve-v1.0.0
                                </div>
                            </div>

                            <div className="space-y-1 mb-8">
                                <div className="text-sm text-slate-400 uppercase tracking-wider">CAPITAL AT RISK</div>
                                <div className="text-5xl text-white tracking-tight">$184,200</div>
                                <div className="text-sm text-red-400 flex items-center gap-2 pt-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    Trend: Degrading
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <span className="text-slate-400">T+30</span>
                                    <span className="text-white">$61,400</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <span className="text-slate-400">T+60</span>
                                    <span className="text-white">$122,800</span>
                                </div>
                                <div className="flex items-center justify-between pb-1">
                                    <span className="text-slate-400">T+90</span>
                                    <span className="text-white">$184,200</span>
                                </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">MODEL ACCURACY</div>
                                <div className="text-sm text-slate-300">Measured after statistical threshold</div>
                                <div className="mt-3 flex gap-1">
                                    {[...Array(24)].map((_, i) => (
                                        <div key={i} className={`h-6 flex-1 rounded-sm ${i > 18 ? 'bg-slate-800' : 'bg-emerald-500/80'}`}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                </section>

                {/* Problem Section */}
                <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:pt-20 md:pb-40">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
                            Processors escalate. Reserves compound.
                            <br />
                            <span className="text-slate-500">Capital gets trapped before visibility exists.</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="relative overflow-hidden bg-slate-900/30 border border-slate-800/50 p-10 rounded-2xl group min-h-[240px] flex flex-col justify-end">
                            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                                <img src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=2064&auto=format&fit=crop" alt="" className="w-full h-full object-cover mix-blend-luminosity" />
                            </div>
                            <div className="relative z-10">
                                <div className="text-5xl font-light text-slate-700 mb-8 group-hover:text-slate-500 transition-colors">01</div>
                                <h3 className="text-lg text-white font-medium leading-relaxed">Reserve increases are retrospective. You learn after the hold.</h3>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-slate-900/30 border border-slate-800/50 p-10 rounded-2xl group min-h-[240px] flex flex-col justify-end">
                            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                                <img src="https://images.unsplash.com/photo-1618044733300-9472054094ee?q=80&w=2071&auto=format&fit=crop" alt="" className="w-full h-full object-cover mix-blend-luminosity" />
                            </div>
                            <div className="relative z-10">
                                <div className="text-5xl font-light text-slate-700 mb-8 group-hover:text-slate-500 transition-colors">02</div>
                                <h3 className="text-lg text-white font-medium leading-relaxed">Retry behavior compounds escalation without visible thresholds.</h3>
                            </div>
                        </div>

                        <div className="relative overflow-hidden bg-slate-900/30 border border-slate-800/50 p-10 rounded-2xl group min-h-[240px] flex flex-col justify-end">
                            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                                <img src="https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2070&auto=format&fit=crop" alt="" className="w-full h-full object-cover mix-blend-luminosity" />
                            </div>
                            <div className="relative z-10">
                                <div className="text-5xl font-light text-slate-700 mb-8 group-hover:text-slate-500 transition-colors">03</div>
                                <h3 className="text-lg text-white font-medium leading-relaxed">Capital gets trapped before anyone in finance can see it coming.</h3>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works - Vertical Layout */}
                <section id="how-it-works" className="max-w-7xl mx-auto px-6 border-t border-slate-800/50 pt-20 pb-20 md:pt-40 md:pb-40">
                    <div className="mb-24">
                        <div className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-4">HOW IT WORKS</div>
                        <h2 className="text-4xl font-semibold text-white tracking-tight">Observe. Model. Measure.</h2>
                    </div>

                    <div className="space-y-24 relative before:absolute before:inset-0 before:ml-[27px] md:before:ml-[39px] before:-translate-x-px md:before:translate-x-0 before:h-full before:w-[2px] before:bg-slate-800">
                        {/* Observe */}
                        <div className="relative flex gap-6 md:gap-12 items-start">
                            <div className="relative z-10 w-14 h-14 md:w-20 md:h-20 shrink-0 bg-slate-950 border-2 border-slate-800 rounded-full flex items-center justify-center text-xl md:text-2xl font-light text-slate-500">
                                01
                            </div>
                            <div className="pt-2 md:pt-5 space-y-5">
                                <h3 className="text-2xl text-white font-medium flex items-center gap-3">
                                    <Eye className="w-6 h-6 text-slate-500" />
                                    Observe
                                </h3>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                                    PayFlux connects to your processor and observes risk signals — dispute velocity, chargeback ratios, policy surface gaps. No data leaves your environment.
                                </p>
                            </div>
                        </div>

                        {/* Model */}
                        <div className="relative flex gap-6 md:gap-12 items-start">
                            <div className="relative z-10 w-14 h-14 md:w-20 md:h-20 shrink-0 bg-slate-950 border-2 border-slate-800 rounded-full flex items-center justify-center text-xl md:text-2xl font-light text-slate-500">
                                02
                            </div>
                            <div className="pt-2 md:pt-5 space-y-5">
                                <h3 className="text-2xl text-white font-medium flex items-center gap-3">
                                    <Cpu className="w-6 h-6 text-slate-500" />
                                    Model
                                </h3>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                                    Deterministic projection engine models capital exposure at T+30, T+60, and T+90. Hard-capped reserve math. No stochastic layers. Every output is reproducible.
                                </p>
                            </div>
                        </div>

                        {/* Measure */}
                        <div className="relative flex gap-6 md:gap-12 items-start">
                            <div className="relative z-10 w-14 h-14 md:w-20 md:h-20 shrink-0 bg-slate-950 border-2 border-slate-800 rounded-full flex items-center justify-center text-xl md:text-2xl font-light text-slate-500">
                                03
                            </div>
                            <div className="pt-2 md:pt-5 space-y-5">
                                <h3 className="text-2xl text-white font-medium flex items-center gap-3">
                                    <BarChart4 className="w-6 h-6 text-slate-500" />
                                    Measure
                                </h3>
                                <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
                                    Every projection is evaluated against actual outcomes. Rolling accuracy metrics — tier prediction, trend prediction, reserve variance — build trust through measurement.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* The Instrument */}
                <section id="instrument" className="bg-slate-900/20 py-20 md:py-40 border-y border-slate-800/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                            <div className="max-w-2xl space-y-6">
                                <div className="text-sm font-mono text-slate-500 uppercase tracking-wider">THE INSTRUMENT</div>
                                <h2 className="text-4xl font-semibold text-white tracking-tight">What you actually see</h2>
                                <p className="text-lg text-slate-400 leading-relaxed">
                                    A single surface that answers five questions: How much capital is at risk. Where it is trending. What to do about it. How accurate the system has been. How to export it for leadership.
                                </p>
                            </div>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-lg transition-colors inline-flex items-center gap-2 self-start md:self-auto"
                            >
                                See the dashboard
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>

                        {/* Cinematic Dashboard */}
                        <div className="relative w-full h-64 md:h-[420px] rounded-2xl overflow-hidden border border-slate-800 mb-20 group">
                            <img
                                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                                alt="Data Dashboard Interface"
                                className="w-full h-full object-cover opacity-30 mix-blend-luminosity group-hover:scale-105 group-hover:opacity-50 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-sm">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    LIVE PROJECTION SURFACE
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { title: "Risk Tier & Trend", desc: "Current position and direction" },
                                { title: "T+30 / T+60 / T+90 Exposure", desc: "Capital at risk by projection window" },
                                { title: "Intervention Modeling", desc: "Behavior changes and their reserve impact" },
                                { title: "Model Accuracy", desc: "Tier, trend, and variance over time" },
                                { title: "Reserve History", desc: "Signed, append-only projection ledger" },
                                { title: "Board Report", desc: "Deterministic export for leadership review" },
                            ].map((item, i) => (
                                <div key={i} className="bg-slate-950 border border-slate-800 p-8 rounded-xl hover:border-slate-700 transition-colors">
                                    <h4 className="text-white font-medium mb-3">{item.title}</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Export Section - Side by Side Grid */}
                <section className="max-w-7xl mx-auto px-6 py-20 md:py-40 grid lg:grid-cols-2 gap-16 md:gap-20 items-center">
                    <div className="order-2 lg:order-1 bg-white text-black p-10 rounded-2xl shadow-xl border border-slate-200 font-mono text-sm relative overflow-hidden">
                        {/* Watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] font-bold text-slate-100 -rotate-12 pointer-events-none select-none">
                            EXPORT
                        </div>

                        <div className="relative z-10">
                            <div className="border-b border-slate-200 pb-6 mb-6">
                                <div className="text-xs text-slate-500 uppercase mb-1">EXAMPLE OUTPUT</div>
                                <h3 className="text-2xl font-bold tracking-tight mb-2">PAYFLUX<br />RESERVE FORECAST REPORT</h3>
                                <div className="text-slate-600">Board-Grade Artifact — Deterministic Derivation</div>
                                <div className="mt-4 text-xs bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200">ID: r_591a2b</div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-500">T+30 EXPOSURE</span>
                                    <span className="font-semibold text-lg">$61,400</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-500">T+60 EXPOSURE</span>
                                    <span className="font-semibold text-lg">$122,800</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-500">T+90 EXPOSURE</span>
                                    <span className="font-semibold text-lg">$184,200</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <FileCode2 className="w-4 h-4" />
                                    reserve-v1.0.0
                                </div>
                                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                                    <Lock className="w-3 h-3" />
                                    HMAC-SHA256 SIGNED
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2 space-y-10">
                        <div className="space-y-6">
                            <div className="text-sm font-mono text-slate-500 uppercase tracking-wider">EXPORT</div>
                            <h2 className="text-4xl font-semibold text-white tracking-tight">Board-ready reserve forecast</h2>
                            <p className="text-lg text-slate-400 leading-relaxed">
                                A document that survives outside the product. Deterministic, signed, printable.
                            </p>
                        </div>

                        <div className="space-y-8">
                            {[
                                { title: "Deterministic derivation", desc: "Every output is reproducible from the same inputs. No hidden weights." },
                                { title: "Signed ledger entries", desc: "Append-only. HMAC-SHA256 signed at creation to prevent tampering." },
                                { title: "Applied constants", desc: "Reserve ceiling, decay rate, thresholds — explicit and auditable in the payload." },
                                { title: "Integrity declaration", desc: "Model version, timestamp, and full derivation chain included in every export." },
                            ].map((feature, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="mt-1">
                                        <Check className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-medium">{feature.title}</h4>
                                        <p className="text-slate-400 text-sm mt-1">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing Section - Dark Cards */}
                <section id="pricing" className="max-w-7xl mx-auto px-6 pt-20 pb-20 md:pt-40 md:pb-40 border-t border-slate-800/50">
                    <div className="text-center max-w-2xl mx-auto mb-20 space-y-6">
                        <div className="text-sm font-mono text-slate-500 uppercase tracking-wider">PRICING</div>
                        <h2 className="text-4xl font-semibold text-white tracking-tight">Three tiers. No opacity.</h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Free Tier */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 flex flex-col relative overflow-hidden">
                            <div className="mb-10">
                                <h3 className="text-2xl text-white font-semibold mb-2">Free</h3>
                                <div className="text-slate-400 text-sm mb-6">Diagnostic mode</div>
                                <div className="text-4xl text-white font-light tracking-tight">$0</div>
                            </div>
                            <div className="space-y-4 mb-8 flex-grow">
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    <span>Risk tier visibility</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    <span>Trend and instability signals</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>No projection modeling</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>No intervention derivation</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-600">
                                    <X className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>No ledger exports</span>
                                </div>
                            </div>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block w-full text-center text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 py-3 rounded-lg transition-colors"
                            >
                                Access Dashboard
                            </a>
                        </div>

                        {/* Pro Tier */}
                        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-10 flex flex-col relative overflow-hidden shadow-[0_0_40px_-15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                            <div className="mb-10">
                                <h3 className="text-2xl text-white font-semibold mb-2">Pro</h3>
                                <div className="text-emerald-400 text-sm mb-6">Full instrument</div>
                                <div className="text-4xl text-white font-light tracking-tight flex items-baseline gap-2">
                                    $499 <span className="text-lg text-slate-500 font-normal">/ month</span>
                                </div>
                            </div>
                            <div className="space-y-4 mb-8 flex-grow">
                                <div className="flex items-start gap-3 text-sm text-white">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Full projection engine (T+90)</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-white">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Intervention modeling</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-white">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Signed projection ledger</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-white">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Board reserve report</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-white">
                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>Rolling model accuracy</span>
                                </div>
                            </div>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block w-full text-center text-sm font-medium text-slate-950 bg-white hover:bg-slate-200 py-3 rounded-lg transition-colors"
                            >
                                Start Pro
                            </a>
                        </div>

                        {/* Enterprise Tier */}
                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 flex flex-col relative overflow-hidden">
                            <div className="mb-10">
                                <h3 className="text-2xl text-white font-semibold mb-2">Enterprise</h3>
                                <div className="text-slate-400 text-sm mb-6">Custom</div>
                                <div className="text-4xl text-white font-light tracking-tight">Contact Sales</div>
                            </div>
                            <div className="space-y-4 mb-8 flex-grow">
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    <span>Higher throughput</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    <span>Bulk exports</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    <span>Multi-merchant aggregation</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm text-slate-300">
                                    <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                    <span>Processor attestation readiness</span>
                                </div>
                            </div>
                            <a
                                href="#contact"
                                className="block w-full text-center text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 py-3 rounded-lg transition-colors"
                            >
                                Talk to Sales
                            </a>
                        </div>
                    </div>
                </section>

                {/* Bottom CTA */}
                <section id="contact" className="max-w-7xl mx-auto px-6 pb-16 md:pb-32">
                    <div className="relative border border-slate-800 rounded-2xl p-10 lg:p-16 overflow-hidden bg-slate-950">
                        {/* Server Texture Layer */}
                        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
                            <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2034&auto=format&fit=crop" alt="" className="w-full h-full object-cover mix-blend-luminosity" />
                        </div>
                        {/* Fade Layer */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90 pointer-events-none"></div>

                        <div className="relative z-10 max-w-3xl mb-16">
                            <p className="text-slate-400 text-lg mb-4">
                                PayFlux observes signals. It does not modify payment flow. <br className="hidden sm:block" />
                                <span className="text-white">No routing changes. No approval logic. No added latency.</span>
                            </p>
                            <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">
                                Quantify reserve exposure <br className="hidden md:block" />before processors do.
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 relative z-10">
                            <div className="bg-slate-950/60 backdrop-blur-sm border border-slate-800 p-10 rounded-xl flex flex-col justify-between items-start gap-8">
                                <div>
                                    <h3 className="text-xl text-white font-medium mb-2">Self-serve</h3>
                                    <p className="text-slate-400">Access the dashboard directly. Free tier available.</p>
                                </div>
                                <a
                                    href="https://app.payflux.dev/dashboard"
                                    className="text-sm font-medium text-slate-950 bg-white hover:bg-slate-200 px-6 py-3 rounded-lg transition-colors"
                                >
                                    Access Dashboard
                                </a>
                            </div>

                            <div className="bg-slate-950/60 backdrop-blur-sm border border-slate-800 p-10 rounded-xl flex flex-col justify-between items-start gap-8">
                                <div className="w-full">
                                    <h3 className="text-xl text-white font-medium mb-3">Enterprise</h3>
                                    <p className="text-slate-400 mb-8">Higher throughput, bulk exports, and processor attestation readiness.</p>
                                    <form
                                        name="enterprise-contact"
                                        method="POST"
                                        action="/"
                                        data-netlify="true"
                                        data-netlify-honeypot="bot-field"
                                        className="space-y-3"
                                    >
                                        <input type="hidden" name="form-name" value="enterprise-contact" />
                                        <p className="hidden">
                                            <label>Don't fill this out: <input name="bot-field" /></label>
                                        </p>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            placeholder="name@company.com"
                                            className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600"
                                        />
                                        <input
                                            type="text"
                                            name="company"
                                            placeholder="Company"
                                            className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600"
                                        />
                                        <label className="text-xs text-slate-500 uppercase tracking-wider font-mono block">Monthly volume</label>
                                        <div className="relative">
                                            <select
                                                name="monthlyVolume"
                                                defaultValue=""
                                                className="w-full bg-slate-900 border border-slate-800 text-white text-sm rounded-lg px-4 py-3 appearance-none focus:outline-none focus:border-slate-600 transition-colors cursor-pointer"
                                            >
                                                <option value="" disabled>Select volume</option>
                                                <option value="<100k">&lt; $100k</option>
                                                <option value="100k-1m">$100k–$1M</option>
                                                <option value="1m-10m">$1M–$10M</option>
                                                <option value="10m+">$10M+</option>
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 py-3 rounded-lg transition-colors"
                                        >
                                            Contact Sales
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Home;

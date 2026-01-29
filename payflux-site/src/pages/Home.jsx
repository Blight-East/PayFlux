import React, { useState } from 'react';
import { Shield, Eye, BarChart3, Lock, History, Layers, ChevronRight, Activity, Zap, Sparkles, Terminal, FileText, Loader2 } from 'lucide-react';
import Footer from '../components/Footer';

const Home = () => {
    // Gemini Simulation State
    const [selectedAnomaly, setSelectedAnomaly] = useState("");
    const [aiAnalysis, setAiAnalysis] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const anomalies = [
        { id: "soft_decline_spike", label: "40% Spike in Soft Declines (Insuff. Funds)", context: "May signal a retry storm or shifts in traffic profile." },
        { id: "auth_latency", label: "Elevated Auth Latency (>3000ms)", context: "Can precede possible routing degradation or approval-rate anomalies." },
        { id: "velocity_shift", label: "Abnormal Transaction Velocity Shift", context: "May trigger processor risk models and potential volume caps." },
        { id: "mcc_mismatch", label: "High Volume of MCC-Inconsistent Traffic", context: "May lead to immediate processor scrutiny and possible reserves/holds." }
    ];

    /**
     * Simulation fallback for demo purposes
     * When backend is not available, generates realistic PayFlux analysis
     */
    const simulateAnalysis = (label) => {
        const templates = {
            "40% Spike in Soft Declines (Insuff. Funds)": `PROBABLE PROCESSOR PERSPECTIVE:\nRisk systems are likely mapping this pattern to a high-velocity retry storm. This triggers "Abnormal Activity" flags, often leading to temporary auth suppression to prevent potential issuer-side blocklisting.\n\nEVIDENCE NARRATIVE:\n"The observed shift in decline rates is a direct result of a localized marketing event targeting existing customers. Telemetry confirms low fraud-intent; retry intensity is being throttled internally to align with standard processor models."`,
            "Elevated Auth Latency (>3000ms)": `PROBABLE PROCESSOR PERSPECTIVE:\nExtended latency is being interpreted as potential routing degradation. This often leads to silent routing shifts toward more conservative (but expensive) rails to maintain approval stability.\n\nEVIDENCE NARRATIVE:\n"Observed latency spikes have been identified within specific regional routing pathways. Operational controls have been engaged to prioritize approval-rate stability over cost-optimization for the current window."`,
            "Abnormal Transaction Velocity Shift": `PROBABLE PROCESSOR PERSPECTIVE:\nSudden velocity shifts are commonly associated with card-testing or bot attacks. Processor risk models may engage auto-caps on traffic to protect their downstream banking partners.\n\nEVIDENCE NARRATIVE:\n"A planned volume expansion has shifted baseline transaction velocity. Real-time observability confirms valid user sessions; current risk posture is compliant with historical growth projections."`,
            "High Volume of MCC-Inconsistent Traffic": `PROBABLE PROCESSOR PERSPECTIVE:\nInconsistent MCC traffic leads to immediate classification as "High Risk Traffic." This is a primary driver for rolling reserves or fund holds to mitigate misclassification liability.\n\nEVIDENCE NARRATIVE:\n"Telemetry signals have captured an increase in cross-category purchases. Historical transaction integrity remains within high-confidence bounds; operational records are available for audit review."`
        };
        return templates[label] || "Telemetry signal analyzed. Risk posture stable.";
    };

    const runAnalysis = async () => {
        if (!selectedAnomaly) return;
        setIsAnalyzing(true);
        setError(null);
        setAiAnalysis("");

        try {
            // Try to hit the real backend proxy
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ anomaly: selectedAnomaly })
            });

            if (!response.ok) throw new Error('API Unavailable');

            const data = await response.json();
            setAiAnalysis(data.analysis);
            setIsAnalyzing(false);
        } catch (err) {
            // FALLBACK: If no server is found, simulate the response so the UI works
            console.warn("Backend proxy not found. Running in simulation mode.");
            setTimeout(() => {
                setAiAnalysis(simulateAnalysis(selectedAnomaly));
                setIsAnalyzing(false);
            }, 1500); // Simulate network delay
        }
    };

    const pilotMailto = "mailto:pilot@payflux.com?subject=PayFlux%20Pilot%20Request";

    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans selection:bg-indigo-500/30 bg-grid">
            {/* NAVIGATION */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl h-16">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-slate-600 rounded-sm" />
                        <span className="text-white font-bold tracking-tight text-xl">PayFlux</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        <a href="#logic" className="hover:text-white transition-colors">Infrastructure</a>
                        <a href="#intelligence" className="hover:text-white transition-colors">Intelligence</a>
                        <a href="#levels" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#safety" className="hover:text-white transition-colors">Safety</a>
                    </div>
                    <button onClick={() => document.getElementById('levels').scrollIntoView({ behavior: 'smooth' })} className="text-[10px] uppercase tracking-[0.2em] font-bold text-white border border-white/10 px-5 py-2 hover:bg-white hover:text-black transition-all">Start Pilot</button>
                </div>
            </nav>

            {/* HERO (FOCUS ANCHOR) */}
            <section className="relative pb-32" style={{ paddingTop: '240px' }}>
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-10">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Infrastructure Layer
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter leading-[1.1] mb-8">
                            Payment systems<br /><span className="text-slate-500">don’t collapse—they erode.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 leading-relaxed mb-14 max-w-2xl mx-auto font-medium">
                            Risk accumulates quietly. Processors see pattern degradation long before merchants do. PayFlux surfaces reality early, so you can document control and prepare for scrutiny if it occurs.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button onClick={() => document.getElementById('intelligence').scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-10 py-5 bg-white text-black font-extrabold rounded-sm hover:bg-slate-200 transition-all uppercase tracking-widest text-[11px]">Simulate Intelligence ✨</button>
                            <button onClick={() => document.getElementById('levels').scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto px-10 py-5 border border-white/20 text-white font-extrabold rounded-sm hover:bg-white/5 transition-all uppercase tracking-widest text-[11px]">View Control Levels</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* PROBLEM FRAMING */}
            <section className="py-32 border-t border-white/5 bg-[#0a0c10]/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-3xl mb-16">
                        <h2 className="text-[11px] uppercase tracking-[0.3em] text-indigo-500 font-bold mb-6">Risk Telemetry</h2>
                        <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-8">
                            By the time revenue is affected, the decision has already been made.
                        </h3>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-2xl">
                            Individual failures are noise. Patterns are the signal. Retry storms, approval-rate degradation, and soft declines are the primary inputs into your processor's risk model.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            { title: "Retry Storms", desc: "Unchecked retries that signal elevated intensity to risk systems." },
                            { title: "Approval degradation", desc: "Unexpected drops reflecting issuer behavior or risk controls." },
                            { title: "Routing Shifts", desc: "Changes in outcomes that reduce performance over time." },
                            { title: "Performance Penalties", desc: "Degradation in approval quality hard to see in dashboards." }
                        ].map((item, i) => (
                            <div key={i} className="p-10 bg-white/[0.02] infra-border rounded-sm">
                                <h3 className="text-white font-bold mb-4 tracking-tight text-lg">{item.title}</h3>
                                <p className="text-[14px] text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SIGNAL INTELLIGENCE (PRIMARY INTERACTION) */}
            <section id="intelligence" className="py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-2xl mb-16">
                        <h2 className="text-[11px] uppercase tracking-[0.3em] text-indigo-500 font-bold mb-6">Signal Intelligence ✨</h2>
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-8">See the Risk Team’s Read</h3>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            Most operators only see failures. We help you see how patterns are commonly interpreted in risk reviews.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-16 items-start">
                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                {anomalies.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => setSelectedAnomaly(a.label)}
                                        className={`w-full text-left p-8 border transition-all rounded-sm min-h-[120px] flex flex-col justify-center ${selectedAnomaly === a.label ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[12px] font-bold text-white uppercase tracking-wider">{a.label}</span>
                                            {selectedAnomaly === a.label && <Sparkles size={14} className="text-indigo-400" />}
                                        </div>
                                        <p className="text-[12px] text-slate-500 italic leading-relaxed">{a.context}</p>
                                    </button>
                                ))}
                            </div>
                            <button disabled={!selectedAnomaly || isAnalyzing} onClick={runAnalysis} className="w-full py-5 bg-indigo-600 text-white font-extrabold rounded-sm hover:bg-indigo-500 disabled:opacity-50 transition-all uppercase tracking-[0.2em] text-[11px]">
                                {isAnalyzing ? "Analyzing Infrastructure..." : "Run Signal Analysis ✨"}
                            </button>
                        </div>
                        <div className="relative border border-white/15 bg-[#0c0e12] rounded-sm h-[560px] flex flex-col shadow-2xl">
                            <div className="border-b border-white/5 p-5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex gap-2.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-800" /><div className="w-2.5 h-2.5 rounded-full bg-slate-800" /><div className="w-2.5 h-2.5 rounded-full bg-slate-800" /></div>
                                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Telemetry-v2.5</span>
                            </div>
                            <div className="p-10 font-mono text-[13px] overflow-y-auto h-full">
                                {!aiAnalysis && !isAnalyzing && <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-8"><Terminal size={48} strokeWidth={1} /><p className="uppercase tracking-widest text-[10px] font-bold">Select telemetry to begin process</p></div>}
                                {isAnalyzing && <div className="space-y-6 pt-4"><div className="h-2 w-3/4 bg-slate-800 animate-pulse rounded" /><div className="h-2 w-1/2 bg-slate-800 animate-pulse rounded" /><div className="h-2 w-5/6 bg-slate-800 animate-pulse rounded" /></div>}
                                {aiAnalysis && <div className="whitespace-pre-wrap text-slate-300 animate-in leading-relaxed">{aiAnalysis}</div>}
                            </div>
                            {aiAnalysis && (
                                <div className="mt-auto border-t border-white/5 p-5 bg-white/[0.02] flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                        <FileText size={12} /> Narrative draft ready
                                    </div>
                                    <button className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest border border-indigo-500/20 px-4 py-1.5 rounded-sm">
                                        Preserve (soon)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* INFRASTRUCTURE / LOGIC */}
            <section id="logic" className="py-32 bg-[#0c0e12]/30 border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-16">
                        <h2 className="text-[10px] uppercase tracking-[0.3em] text-indigo-500 font-bold mb-6">Engineering Logic</h2>
                        <h3 className="text-3xl font-bold text-white tracking-tight">Built for durable historical records.</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-8 infra-border"><Activity size={24} /></div>
                            <h3 className="text-white font-bold text-lg mb-4 uppercase tracking-wider">Real-time Metering</h3>
                            <p className="text-slate-500 text-[14px] leading-relaxed max-w-xs mx-auto">Passive observation of every transaction signal, creating high-resolution maps without interference.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-8 infra-border"><History size={24} /></div>
                            <h3 className="text-white font-bold text-lg mb-4 uppercase tracking-wider">Durable Records</h3>
                            <p className="text-slate-500 text-[14px] leading-relaxed max-w-xs mx-auto">Historical ledgers designed for incident review, governance, and professional partner conversations.</p>
                        </div>
                        <div className="text-center">
                            <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-8 infra-border"><Layers size={24} /></div>
                            <h3 className="text-white font-bold text-lg mb-4 uppercase tracking-wider">Snapshot Integrity</h3>
                            <p className="text-slate-500 text-[14px] leading-relaxed max-w-xs mx-auto">Point-in-time captures of your risk posture, allowing separation between live signals and long-term records.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* LEVELS OF CONTROL (PRICING) */}
            <section id="levels" className="py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-20">
                        <h2 className="text-[11px] uppercase tracking-[0.3em] text-indigo-500 font-bold mb-6">Progression Model</h2>
                        <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-8">Choose Your Level of Control</h3>
                        <p className="text-slate-500 max-w-xl font-medium leading-relaxed">Different stages of payment volume require a different risk posture. Align your infrastructure with maturity.</p>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-8 items-stretch pt-8">
                        <div className="flex flex-col bg-white/[0.02] infra-border p-10 rounded-sm">
                            <div className="mb-10 text-center border-b border-white/5 pb-10">
                                <h3 className="text-[11px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-4">Pilot</h3>
                                <p className="text-white font-bold text-xl mb-2 italic tracking-tight">"Do we have proof of degradation?"</p>
                            </div>
                            <p className="text-[14px] text-slate-400 mb-10 flex-grow text-center leading-relaxed font-medium">Designed to prove value and earn trust. Surface early signals without commitment.</p>
                            <div className="pt-10 border-t border-white/5 text-center">
                                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-8">Pilot fee: $5,000 / 90 days</div>
                                <button className="w-full py-5 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">Start Pilot</button>
                            </div>
                        </div>
                        <div className="flex flex-col bg-[#0d1117] border border-indigo-500/40 p-10 rounded-sm relative shadow-2xl z-10">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-sm">Recommended</div>
                            <div className="mb-10 text-center border-b border-white/5 pb-10">
                                <h3 className="text-[11px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-4">Growth</h3>
                                <p className="text-white font-bold text-xl mb-2 italic tracking-tight">"Are we operating safely?"</p>
                            </div>
                            <p className="text-[14px] text-slate-400 mb-10 flex-grow text-center leading-relaxed font-semibold">Gain credibility with processing partners. Move from awareness to control.</p>
                            <div className="pt-10 border-t border-white/5 text-center">
                                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-8">Coverage: $2,500 / month</div>
                                <button className="w-full py-5 bg-indigo-600 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">Move to Growth</button>
                            </div>
                        </div>
                        <div className="flex flex-col bg-white/[0.02] infra-border p-10 rounded-sm">
                            <div className="mb-10 text-center border-b border-white/5 pb-10">
                                <h3 className="text-[11px] uppercase tracking-[0.3em] text-indigo-400 font-black mb-4">Scale</h3>
                                <p className="text-white font-bold text-xl mb-2 italic tracking-tight">"Can we withstand scrutiny?"</p>
                            </div>
                            <p className="text-[14px] text-slate-400 mb-10 flex-grow text-center leading-relaxed font-medium">Quiet confidence for high-volume environments. Built for institutional leverage.</p>
                            <div className="pt-10 border-t border-white/5 text-center">
                                <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-8">Coverage: $7,500 / month</div>
                                <button className="w-full py-5 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all">Talk to Us</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SAFETY SECTION (TRUST SEAL) */}
            <section id="safety" className="py-32 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="max-w-4xl mx-auto bg-[#0c0e12] border border-white/10 p-16 md:p-24 rounded-sm text-center shadow-3xl">
                        <Shield className="mx-auto text-indigo-500 mb-10" size={48} strokeWidth={1} />
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight leading-tight">Built for Production Rigor</h2>
                        <p className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] mb-16 max-w-2xl mx-auto">
                            PayFlux is observability-only: it does not route payments, approve/decline transactions, or change processor decisions.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-16 text-left border-t border-white/5 pt-16">
                            <div className="space-y-4">
                                <h4 className="text-white font-bold uppercase tracking-widest text-[11px]">Observability-Only</h4>
                                <p className="text-[14px] text-slate-500 leading-relaxed font-medium">PayFlux sits outside the critical path and never block payments or introduce latency.</p>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-white font-bold uppercase tracking-widest text-[11px]">Audit Ready</h4>
                                <p className="text-[14px] text-slate-500 leading-relaxed font-medium">Architected for regulated environments where internal governance is expected.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;

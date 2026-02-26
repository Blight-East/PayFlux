import React from 'react';
import { Shield } from 'lucide-react';
import Footer from '../components/Footer';

const Home = () => {
    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans selection:bg-indigo-500/30 bg-grid overflow-x-hidden">
            {/* NAVIGATION */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl h-16">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-slate-600 rounded-sm" />
                        <span className="text-white font-bold tracking-tight text-xl">PayFlux</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        <a href="#signals" className="hover:text-white transition-colors">Signals</a>
                        <a href="#projection" className="hover:text-white transition-colors">Projection</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#trust" className="hover:text-white transition-colors">Trust</a>
                    </div>
                    <button onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })} className="text-[10px] uppercase tracking-[0.2em] font-bold text-white border border-white/10 px-5 py-2 hover:bg-white hover:text-black transition-all">Get Started</button>
                </div>
            </nav>

            {/* HERO */}
            <section className="relative pb-32" style={{ paddingTop: '200px' }}>
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-6">
                        <span className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 font-semibold">
                            Deterministic Reserve Infrastructure
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-semibold text-white leading-tight mb-6">
                        Rolling reserves don't surprise you.<br />They build.
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-16">
                        PayFlux projects reserve exposure 30–180 days ahead.<br className="hidden md:block" />
                        Deterministic. Auditable. Before processors escalate.
                    </p>

                    {/* Example Output Block */}
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 mb-4">
                            Projected Reserve Exposure
                        </div>
                        <div className="text-6xl md:text-7xl font-bold text-white mb-4">
                            $247,843
                        </div>
                        <div className="text-sm text-zinc-500">
                            120-day deterministic window — Example output from a Pro account
                        </div>
                        <div className="text-xs text-zinc-600 mt-3">
                            Based on observed slope, acceleration, and instability metrics.
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="https://app.payflux.dev/risk"
                            className="px-8 py-4 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                        >
                            Run a Free Risk Scan
                        </a>
                        <a
                            href="#pricing"
                            className="px-8 py-4 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                        >
                            View Pricing
                        </a>
                    </div>
                </div>
            </section>

            {/* SIGNAL LAYER */}
            <section id="signals" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Signal Layer
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Reserve exposure begins with degradation signals.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            Retry intensity. Approval shifts. Routing instability. Velocity constraints.
                            These patterns precede processor escalation. PayFlux captures them
                            — and feeds them into a deterministic trajectory model.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Retry Intensity</h3>
                            <p className="text-zinc-400 text-sm">
                                Repeated authorization attempts across declining approvals.
                                Indicates increasing processor scrutiny.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Approval Degradation</h3>
                            <p className="text-zinc-400 text-sm">
                                Week-over-week decline in authorization rates.
                                Signals rising internal risk thresholds.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Routing Shifts</h3>
                            <p className="text-zinc-400 text-sm">
                                Changes in gateway behavior or fallback patterns.
                                Often precede reserve enforcement.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Velocity Constraints</h3>
                            <p className="text-zinc-400 text-sm">
                                Sudden throttling of volume or settlement timing.
                                Early indicator of liquidity pressure.
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-16 text-zinc-500 text-sm">
                        These signals are not the outcome. They are inputs to the trajectory model.
                    </div>
                </div>
            </section>

            {/* TRAJECTORY ANALYSIS */}
            <section id="trajectory" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Trajectory Analysis
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Signals tell you what happened.<br />Trajectory tells you what's building.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            PayFlux converts raw degradation signals into directional metrics
                            that measure how quickly risk is evolving — and whether escalation pressure is forming.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Slope</h3>
                            <p className="text-zinc-400 text-sm">
                                Is risk increasing or decreasing?
                                Measures the rate of change in signal intensity over time.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Acceleration</h3>
                            <p className="text-zinc-400 text-sm">
                                Is risk increasing faster than before?
                                Measures whether degradation is compounding.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Instability</h3>
                            <p className="text-zinc-400 text-sm">
                                Is behavior becoming unpredictable?
                                Measures variance and sudden directional shifts.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">Trend</h3>
                            <p className="text-zinc-400 text-sm">
                                Where is the system heading?
                                Projects directional bias based on current trajectory.
                            </p>
                        </div>
                    </div>

                    <div className="text-center mt-16 text-zinc-500 text-sm">
                        Trajectory converts signal behavior into directional pressure.<br />
                        Projection converts directional pressure into capital exposure.
                    </div>
                </div>
            </section>

            {/* RESERVE PROJECTION ENGINE */}
            <section id="projection" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Reserve Projection Engine
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Know how much capital is building inside your reserve window.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            PayFlux converts risk trajectory into deterministic reserve exposure across rolling 30–180 day windows.
                            No machine learning. No black box scoring. Repeatable math.
                        </p>
                    </div>

                    {/* Dominant Projection Block */}
                    <div className="mb-20">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 mb-4">
                            Projected Reserve Exposure
                        </div>
                        <div className="text-6xl md:text-7xl font-bold text-white mb-4">
                            $247,843
                        </div>
                        <div className="text-sm text-zinc-500">
                            120-day deterministic window — Example output from a Pro account
                        </div>
                        <div className="text-xs text-zinc-600 mt-3">
                            Calculated from observed slope, acceleration, and instability metrics.
                        </div>
                    </div>

                    {/* Window Grid */}
                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        <div className="border border-white/5 p-6">
                            <div className="text-sm text-zinc-400 mb-2">90-Day Window</div>
                            <div className="text-white text-sm mb-1">Base Scenario: 8.2%</div>
                            <div className="text-white text-sm mb-3">Escalation Scenario: 12.5%</div>
                            <div className="text-white font-semibold">$164,210 projected exposure</div>
                        </div>
                        <div className="border border-white/20 p-6">
                            <div className="text-sm text-zinc-400 mb-2">120-Day Window</div>
                            <div className="text-white text-sm mb-1">Base Scenario: 10.4%</div>
                            <div className="text-white text-sm mb-3">Escalation Scenario: 15.1%</div>
                            <div className="text-white font-semibold">$247,843 projected exposure</div>
                        </div>
                        <div className="border border-white/5 p-6">
                            <div className="text-sm text-zinc-400 mb-2">180-Day Window</div>
                            <div className="text-white text-sm mb-1">Base Scenario: 13.7%</div>
                            <div className="text-white text-sm mb-3">Escalation Scenario: 19.8%</div>
                            <div className="text-white font-semibold">$392,104 projected exposure</div>
                        </div>
                    </div>

                    <div className="text-center mt-16 text-zinc-500 text-sm">
                        Projection does not change processor behavior.
                        It quantifies the capital impact of current trajectory.
                    </div>

                    <div className="mt-16 flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="https://app.payflux.dev/risk"
                            className="px-8 py-4 bg-white text-black text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-slate-200 transition-all"
                        >
                            Run a Free Risk Scan
                        </a>
                        <a
                            href="#pricing"
                            className="px-8 py-4 border border-white/20 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 transition-all"
                        >
                            Quantify Trapped Capital
                        </a>
                    </div>
                </div>
            </section>

            {/* EXPORT ARTIFACT */}
            <section id="artifact" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Export Artifact
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            The document your stakeholders actually need.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            Projection is useful internally. Exported projection moves decisions.
                        </p>
                    </div>

                    {/* PDF Preview — replace with export-preview.png when available */}
                    <div className="mb-20 flex justify-center">
                        <div className="bg-white text-black p-10 w-full max-w-3xl shadow-lg text-left">
                            <div className="text-sm font-semibold mb-4">
                                Reserve Exposure Forecast
                            </div>
                            <div className="text-2xl font-bold mb-6">
                                $247,843 — 120-Day Window
                            </div>
                            <div className="text-sm mb-2">
                                Base Scenario: 10.4%
                            </div>
                            <div className="text-sm mb-6">
                                Escalation Scenario: 15.1%
                            </div>
                            <div className="text-xs text-zinc-500">
                                Model: reserve-v1.0.0 • Timestamped • Deterministic
                            </div>
                            <div className="text-xs text-zinc-400 mt-2">
                                payflux.dev
                            </div>
                        </div>
                    </div>

                    {/* Supporting Strip */}
                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Deterministic Model Stamp
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Each export includes model version and timestamp.
                                Repeatable. Verifiable.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Auditable Record
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Point-in-time snapshot of risk trajectory and exposure.
                                Suitable for internal review.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Non-Invasive Posture
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Does not influence routing, approvals, or settlement.
                                Quantifies impact without touching payment flow.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Pricing
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Unlock depth, not access.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            Every account detects risk signals.
                            Pro accounts quantify trapped capital.
                            Enterprise accounts operationalize projection at scale.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        {/* FREE */}
                        <div className="border border-white/5 p-8">
                            <div className="text-white font-semibold mb-2">Free</div>
                            <div className="text-3xl font-bold text-white mb-6">$0</div>
                            <ul className="space-y-3 text-sm text-zinc-400 mb-8">
                                <li>Risk scan</li>
                                <li>Signal detection</li>
                                <li>Instability classification</li>
                                <li>Trajectory summary</li>
                                <li>Projection preview (no USD exposure)</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/risk"
                                className="block text-center px-6 py-3 border border-white/20 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 transition-all"
                            >
                                Run Free Scan
                            </a>
                        </div>

                        {/* PRO */}
                        <div className="border border-white/20 p-8">
                            <div className="text-white font-semibold mb-2">Pro</div>
                            <div className="text-3xl font-bold text-white mb-6">
                                $499<span className="text-sm text-zinc-400"> / month</span>
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-400 mb-6">
                                <li>Everything in Free</li>
                                <li>Deterministic reserve projection (30–180 day windows)</li>
                                <li>Base + Escalation scenarios</li>
                                <li>USD exposure modeling</li>
                                <li>Full export artifact (PDF)</li>
                                <li>Projection archive</li>
                            </ul>
                            <div className="text-xs text-zinc-500 mb-8">
                                One avoided reserve escalation offsets multiple years of subscription cost.
                            </div>
                            <a
                                href="https://app.payflux.dev/upgrade"
                                className="block text-center px-6 py-3 bg-white text-black text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-slate-200 transition-all"
                            >
                                Start Pro
                            </a>
                        </div>

                        {/* ENTERPRISE */}
                        <div className="border border-white/5 p-8">
                            <div className="text-white font-semibold mb-2">Enterprise</div>
                            <div className="text-3xl font-bold text-white mb-6">Contact Sales</div>
                            <ul className="space-y-3 text-sm text-zinc-400 mb-8">
                                <li>Everything in Pro</li>
                                <li>Custom reserve windows</li>
                                <li>API access</li>
                                <li>Portfolio-level reporting</li>
                                <li>Dedicated onboarding</li>
                                <li>SLA support</li>
                            </ul>
                            <a
                                href="#contact"
                                className="block text-center px-6 py-3 border border-white/20 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 transition-all"
                            >
                                Talk to Sales
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUST */}
            <section id="trust" className="py-32 border-t border-white/5">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="flex justify-center mb-6">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Trust
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Non-invasive by design.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            PayFlux does not route payments, approve transactions, or alter settlement behavior.
                            It observes degradation signals and projects capital exposure — without touching the payment path.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Non-Invasive Architecture
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Runs outside authorization and settlement flow.
                                No routing changes. No approval logic. No added latency.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Audit-Ready Output
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Each projection includes model version and timestamp.
                                Deterministic calculations are repeatable and verifiable.
                            </p>
                        </div>
                    </div>

                    <div className="mt-16 text-zinc-500 text-sm">
                        Projection quantifies impact.<br />
                        Your infrastructure remains sovereign.
                    </div>
                </div>
            </section>
            {/* GET STARTED */}
            <section id="contact" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Get Started
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Quantify reserve exposure before processors do.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Self-Serve */}
                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-3">Self-Serve</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Run a free risk scan or start a Pro subscription.
                                No sales call required.
                            </p>
                            <a
                                href="https://app.payflux.dev/risk"
                                className="inline-block px-8 py-4 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                            >
                                Open Dashboard
                            </a>
                        </div>

                        {/* Enterprise */}
                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-3">Enterprise</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Custom reserve windows, API access, and portfolio-level reporting.
                            </p>
                            <form
                                name="enterprise-contact"
                                method="POST"
                                action="/"
                                data-netlify="true"
                                data-netlify-honeypot="bot-field"
                                className="space-y-4"
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
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3 text-white text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                />
                                <input
                                    type="text"
                                    name="company"
                                    placeholder="Company"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3 text-white text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                />
                                <select
                                    name="monthlyVolume"
                                    defaultValue=""
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-sm px-4 py-3 text-zinc-400 text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                >
                                    <option value="" disabled>Monthly volume</option>
                                    <option value="<100k">&lt; $100k</option>
                                    <option value="100k-1m">$100k–$1M</option>
                                    <option value="1m-10m">$1M–$10M</option>
                                    <option value="10m+">$10M+</option>
                                </select>
                                <textarea
                                    name="goal"
                                    rows="3"
                                    placeholder="What are you trying to quantify?"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3 text-white text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                />
                                <button
                                    type="submit"
                                    className="w-full py-3 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                                >
                                    Contact Sales
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="text-center mt-16 text-zinc-500 text-sm">
                        Rolling reserves build. Projection makes them visible.
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;

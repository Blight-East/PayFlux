import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Terms = () => {
    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans">
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

            <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
                <div className="mb-12 border-b border-white/5 pb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Terms of Service</h1>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                        Effective Date: January 28, 2026
                    </p>
                </div>

                <div className="space-y-12 text-slate-400 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">1. Access to Services</h2>
                        <p className="mb-4">
                            By verifying your account and integrating with the PayFlux API, you agree to these Terms of Service.
                            PayFlux provides observability infrastructure designed to surface risk signals from your existing payment processor data.
                        </p>
                        <p className="p-4 bg-white/5 border border-white/10 rounded-sm text-slate-300 text-sm">
                            <strong>Note:</strong> PayFlux is an analytics and monitoring layer. We do not process payments, hold funds, or interact with banking networks directly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">2. Account Eligibility</h2>
                        <p>
                            You must represent a legal business entity to use PayFlux. You are responsible for maintaining the security of your API keys and dashboard credentials.
                            Any activity occurring under your authenticated session is your responsibility.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">3. Acceptable Use</h2>
                        <p>
                            PayFlux is designed for operational observability. You agree not to:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-indigo-500">
                            <li>Use provided signals to circumvent fraud controls of your payment processor.</li>
                            <li>Reverse engineer the detection logic or risk models.</li>
                            <li> resell or redistribute the raw telemetry data.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">4. No Guarantees</h2>
                        <p>
                            <strong>The Service is provided "as is".</strong> PayFlux provides telemetry based on probabilistic models. We do not guarantee:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-indigo-500">
                            <li>That all risk events will be detected.</li>
                            <li>That processor actions (such as holds or reserves) will be prevented.</li>
                            <li>That your merchant accounts will remain in good standing with your provider.</li>
                        </ul>
                        <p className="mt-4">
                            Decisions made by your payment processor are independent of PayFlux signals.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">5. Billing and Cancellation</h2>
                        <p>
                            Subscription fees are billed in advance on a monthly or quarterly basis as selected.
                            You may cancel your subscription at any time via the dashboard. Cancellation will stop future billing; standard refund policies apply (see Refund Policy).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">6. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, PayFlux shall not be liable for indirect, incidental, special, consequential, or punitive damages,
                            including loss of profits, data, or goodwill, resulting from your use of the service or any payment processor actions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">7. Contact</h2>
                        <p>
                            For legal inquiries: <a href="mailto:legal@payflux.dev" className="text-indigo-400 hover:text-white transition-colors">legal@payflux.dev</a>
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Terms;

import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Refunds = () => {
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
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Refund Policy</h1>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                        Effective Date: January 28, 2026
                    </p>
                </div>

                <div className="space-y-12 text-slate-400 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">1. Subscription Policy</h2>
                        <p>
                            PayFlux is a B2B infrastructure service. Subscriptions are billed in advance for the access period (monthly or quarterly).
                            <strong>Generally, all fees are non-refundable.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">2. Case-by-Case Exceptions</h2>
                        <p>
                            We understand that operational circumstances change. We may, at our sole discretion, offer refunds on a case-by-case basis if:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-indigo-500">
                            <li>You mistakenly subscribed to a plan incompatible with your payment processor.</li>
                            <li>Service unavailability exceeded our SLA thresholds significantly (for Enterprise plans).</li>
                            <li>A cancellation request was made prior to renewal but processed late due to our system error.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">3. Cancellation</h2>
                        <p>
                            You may cancel your subscription at any time via the dashboard. Cancellation takes effect at the end of the current billing cycle.
                            You will retain access to historical data and dashboards until the end of the paid period.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">4. Dispute Resolution</h2>
                        <p>
                            If you believe a billing error has occurred, please contact support before initiating a dispute with your bank.
                            We prioritize resolving legitimate billing inquiries promptly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">5. Contact</h2>
                        <p>
                            To request a refund review: <a href="mailto:billing@payflux.dev" className="text-indigo-400 hover:text-white transition-colors">billing@payflux.dev</a>
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Refunds;

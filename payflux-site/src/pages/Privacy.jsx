import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Privacy = () => {
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
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">Privacy Policy</h1>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                        Effective Date: January 28, 2026
                    </p>
                </div>

                <div className="space-y-12 text-slate-400 leading-relaxed font-medium">
                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">1. Data Collection</h2>
                        <p className="mb-4">
                            PayFlux processes data required to provide operational observability. This includes:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-indigo-500">
                            <li><strong>Webhook Payloads:</strong> Metadata sent by your payment processor (e.g., Stripe, Adyen) including transaction status, error codes, and decline reasons.</li>
                            <li><strong>Account Information:</strong> Business details, email addresses, and team member capabilities.</li>
                            <li><strong>Usage Logs:</strong> Interactions with the PayFlux dashboard and API for security and improvements.</li>
                        </ul>
                    </section>

                    <section className="p-6 bg-red-950/10 border border-red-500/20 rounded-sm">
                        <h2 className="text-red-400 font-bold text-lg mb-2">Sensitive Payment Data</h2>
                        <p className="text-red-200/80 text-sm">
                            PayFlux <strong>does not</strong> collect, store, or process full Primary Account Numbers (PAN) or CVV codes.
                            We rely solely on tokenized references or potential "last-4" digits provided in standard processor webhook events.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">2. How We Use Data</h2>
                        <p>
                            We use the collected data to:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-indigo-500">
                            <li>Analyze transaction patterns for decline anomalies and retry loops.</li>
                            <li>Generate incident reports and audit logs for your internal governance.</li>
                            <li>Maintain the stability and security of our infrastructure.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">3. Data Retention</h2>
                        <p>
                            We retain webhook telemetry for the duration of your active subscription to provide historical analysis.
                            Upon account termination, data is deleted or anonymized in accordance with our standard data lifecycle policies, typically within 30 days.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">4. Third-Party Sharing</h2>
                        <p>
                            We do not sell your data. We share data only with:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 marker:text-indigo-500">
                            <li><strong>Infrastructure Providers:</strong> Cloud hosting and database services (e.g., AWS, Supabase) strictly for service delivery.</li>
                            <li><strong>Legal Authorities:</strong> If compelled by subpoena or valid legal process.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-white font-bold text-xl mb-4">5. Contact</h2>
                        <p>
                            For privacy concerns: <a href="mailto:privacy@payflux.dev" className="text-indigo-400 hover:text-white transition-colors">privacy@payflux.dev</a>
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Privacy;

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-zinc-400 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
                <p className="text-sm text-zinc-500 mb-8">Last updated: January 16, 2026</p>

                <div className="space-y-8 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Agreement</h2>
                        <p>
                            By accessing or using PayFlux, you agree to these Terms of Service. If you do not agree,
                            do not use the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">What PayFlux Does</h2>
                        <p className="mb-3">
                            PayFlux is an observability tool that surfaces operational context about payment activity.
                            <strong className="text-zinc-300"> PayFlux does not process, approve, decline, or settle payments.</strong>
                        </p>
                        <p>
                            PayFlux analyzes webhook data from payment processors to detect patterns that may indicate
                            operational issues. It provides signals and warnings; it does not control or modify payment outcomes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Accounts and Authorized Use</h2>
                        <p className="mb-2">You are responsible for:</p>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Maintaining the security of your API keys and credentials</li>
                            <li>All activity that occurs under your account</li>
                            <li>Ensuring you have proper authorization to connect payment processor accounts</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Acceptable Use</h2>
                        <p className="mb-2">You agree not to:</p>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Use the service for any unlawful purpose</li>
                            <li>Attempt to reverse engineer, decompile, or disassemble the service</li>
                            <li>Interfere with or disrupt the service or servers</li>
                            <li>Share your account credentials with unauthorized parties</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Data Handling</h2>
                        <p className="mb-3">
                            PayFlux processes webhook metadata from your payment processor. We practice data minimization
                            and do not require or request full card numbers (PAN) or CVV codes.
                        </p>
                        <p className="mb-2">
                            <strong className="text-zinc-300">You are responsible for:</strong>
                        </p>
                        <ul className="list-disc ml-6 space-y-1 mb-3">
                            <li>Not sending PayFlux sensitive cardholder data beyond last-4 digits</li>
                            <li>Configuring your webhook payloads to exclude full card numbers, CVV, or other restricted data</li>
                            <li>Ensuring compliance with applicable data protection regulations in your jurisdiction</li>
                        </ul>
                        <p>
                            PayFlux retains event data for operational purposes. See our Privacy Policy for details.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Disclaimers</h2>
                        <p className="mb-3">
                            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                            PayFlux provides observability signals, not guarantees.
                        </p>
                        <p className="mb-2">We do not warrant that:</p>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>The service will detect all operational issues</li>
                            <li>Warnings or signals will be accurate, complete, or timely</li>
                            <li>The service will be uninterrupted or error-free</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Limitation of Liability</h2>
                        <p className="mb-3">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PAYFLUX SHALL NOT BE LIABLE FOR ANY INDIRECT,
                            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
                            LOSS OF REVENUE, PROFITS, OR DATA.
                        </p>
                        <p>
                            PayFlux is an observability tool. You remain responsible for monitoring and managing
                            your payment systems.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Changes to Terms</h2>
                        <p>
                            We may update these terms from time to time. Continued use of the service after changes
                            constitutes acceptance of the updated terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
                        <p>
                            For questions about these Terms of Service, contact us at{' '}
                            <a href="mailto:hello@payflux.dev" className="text-blue-400 hover:text-blue-300 underline">
                                hello@payflux.dev
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}

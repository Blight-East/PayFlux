export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-zinc-400 p-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
                <p className="text-sm text-zinc-500 mb-8">Last updated: January 16, 2026</p>

                <div className="space-y-8 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">What We Collect</h2>
                        <p className="mb-2">PayFlux collects the following information:</p>
                        <ul className="list-disc ml-6 space-y-1 mb-3">
                            <li>Account authentication tokens and session cookies</li>
                            <li>Webhook payload metadata from your payment processor (transaction IDs, amounts, status codes, timestamps, last-4 card digits)</li>
                            <li>Basic usage telemetry (API requests, feature usage)</li>
                            <li>IP addresses and browser information for security purposes</li>
                        </ul>
                        <p>
                            Data is collected when you configure PayFlux to receive webhooks from your payment processor.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">What We Do NOT Collect</h2>
                        <p className="mb-2">
                            <strong className="text-zinc-300">PayFlux does not collect:</strong>
                        </p>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Full card numbers (PAN)</li>
                            <li>CVV or security codes</li>
                            <li>Cardholder names or billing addresses (unless included in processor webhooks)</li>
                        </ul>
                        <p className="mt-3">
                            You are responsible for configuring your webhook payloads to exclude sensitive cardholder data
                            beyond what is necessary for operational observability.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">How We Use Data</h2>
                        <p className="mb-2">We use collected data to:</p>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Provide PayFlux observability features (pattern detection, warnings, dashboards)</li>
                            <li>Debug and improve the service</li>
                            <li>Monitor for security threats and prevent abuse</li>
                            <li>Communicate with you about your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Data Retention</h2>
                        <p>
                            We retain event data and logs only as long as needed for operational purposes and security
                            monitoring. Session data is cleared when you log out or your session expires.
                        </p>
                        <p className="mt-3">
                            Raw webhook events are subject to time-based retention limits configured by your deployment.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Sharing and Disclosure</h2>
                        <p className="mb-2">We may share your data with:</p>
                        <ul className="list-disc ml-6 space-y-1 mb-3">
                            <li>Service providers who help us operate PayFlux (hosting, analytics)</li>
                            <li>Law enforcement or regulatory authorities if required by law</li>
                        </ul>
                        <p>
                            We do not sell your data to third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Security</h2>
                        <p>
                            We implement reasonable administrative, technical, and physical safeguards to protect your data.
                            However, no system is completely secure. You are responsible for securing your API keys and credentials.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Your Choices</h2>
                        <p>
                            You may request deletion of your account and associated data by contacting us. Note that we may
                            retain certain data for legal or security purposes after account deletion.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
                        <p>
                            For privacy questions or data requests, contact us at{' '}
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

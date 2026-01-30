'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ProcessorType = 'stripe' | 'generic_webhook';

export default function ConnectProcessorPage() {
    const [processor, setProcessor] = useState<ProcessorType>('stripe');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [errors, setErrors] = useState<{ webhook?: string; api?: string }>({});
    const router = useRouter();

    // Persist processor selection to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('payflux_setup_processor', processor);
    }, [processor]);

    const validateWebhookSecret = (value: string) => {
        if (!value) return 'Webhook signing secret is required';
        if (processor === 'stripe' && !value.startsWith('whsec_')) return 'Must start with whsec_';
        if (value.length < 20) return 'Secret appears too short';
        return null;
    };

    const validateApiKey = (value: string) => {
        if (!value) return null; // Optional
        if (processor === 'stripe' && !value.startsWith('sk_')) return 'Must start with sk_test_ or sk_live_';
        return null;
    };

    const handleContinue = () => {
        const webhookError = validateWebhookSecret(webhookSecret);
        const apiError = validateApiKey(apiKey);

        if (webhookError || apiError) {
            setErrors({ webhook: webhookError || undefined, api: apiError || undefined });
            return;
        }

        // Store credentials in sessionStorage (browser only, never server)
        sessionStorage.setItem('setup_webhook_secret', webhookSecret);
        if (apiKey) sessionStorage.setItem('setup_api_key', apiKey);

        router.push('/setup/tier');
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center space-x-2 text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                    <span className="text-blue-400">Step 1</span>
                    <span>→</span>
                    <span>Connect Processor</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Connect Your Processor</h2>
                <p className="text-zinc-500 text-sm mt-1">Choose your processor and enter credentials. These are used locally only.</p>
            </div>

            {/* Processor Selection Dropdown */}
            <div className="mb-6">
                <label htmlFor="processor-select" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Processor
                </label>
                <select
                    id="processor-select"
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value as ProcessorType)}
                    className="w-full bg-black border border-zinc-800 rounded px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                    <option value="stripe">Stripe (Recommended)</option>
                    <option value="generic_webhook">Generic Webhook (Beta)</option>
                </select>
            </div>

            {/* Generic Webhook Helper Panel */}
            {processor === 'generic_webhook' && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-5 mb-6">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Generic Webhook (Beta)</h4>
                    <p className="text-sm text-zinc-500 mb-3">
                        For processors such as Paddle, Braintree, Square, Adyen, Checkout.com, and others. We'll map your webhook payloads into PayFlux's normalized event schema so you can surface warnings and operational signals.
                    </p>
                    <p className="text-[10px] text-zinc-600 italic">
                        PayFlux surfaces operational context; it does not block payments.
                    </p>
                </div>
            )}

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-6">
                {processor === 'stripe' ? (
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4 pb-4 border-b border-zinc-800">
                            <div className="w-12 h-12 bg-white rounded flex items-center justify-center font-bold text-black italic text-xl">S</div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Stripe</h3>
                                <p className="text-xs text-zinc-500">Secure automated connection via Stripe Connect</p>
                            </div>
                        </div>

                        <div className="py-4">
                            <button
                                onClick={() => window.location.href = '/api/stripe/connect'}
                                className="w-full bg-[#635BFF] hover:bg-[#5851E5] text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-lg"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13.911 10.112v-2.022l2.253.303v1.719l-2.253-.3zm-2.253-.303v2.022l-2.253-.303v-1.719l2.253.3zm2.253 4.044v2.022l-2.253-.303v-1.719l2.253.3zm-2.253 0v-2.022l2.253.303v1.719l-2.253-.3z" opacity=".2" />
                                    <path d="M13.911 14.156v1.719l-2.253-.3v-2.022l2.253.303v2l-2.253-.3zm0-4.044v1.719l-2.253-.3v-2.022l2.253.303v2l-2.253-.3zm-4.506.606v1.719l2.253-.3v-2.022l-2.253.303v2l2.253-.3zm4.506 3.438v1.719l2.253-.3v-2.022l-2.253.303v2l2.253-.3zm2.253-1.415V13.36l2.253.3v1.719l-2.253-.303v-1l2.253.3zm2.253-1l-2.253-.303v-2.022l2.253.303v1l2.253-.303v1.719l-2.253-.3zm-11.265.909l2.253-.303v-2.022l-2.253.303v1l-2.253-.303v1.719l2.253-.3v-1zm4.506-4.953l2.253-.303v-2.022l-2.253.303v1l-2.253-.303v1.719l2.253-.3v-1z" fill="currentColor" />
                                </svg>
                                <span>Connect with Stripe</span>
                            </button>
                            <p className="mt-4 text-[10px] text-zinc-500 text-center leading-relaxed">
                                You will be redirected to Stripe to authorize PayFlux. <br />
                                No credentials are ever shared or stored on our servers.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-4 pb-4 border-b border-zinc-800">
                            <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center font-bold text-white text-xl">W</div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Manual Webhook</h3>
                                <p className="text-xs text-zinc-500">Traditional signature-based verification</p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="webhook-secret" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                                Webhook Signing Secret <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="webhook-secret"
                                type="password"
                                className={`w-full bg-black border rounded px-3 py-2 text-white text-sm focus:outline-none transition-colors ${errors.webhook ? 'border-red-500' : 'border-zinc-800 focus:border-blue-500'
                                    }`}
                                placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={webhookSecret}
                                onChange={(e) => {
                                    setWebhookSecret(e.target.value);
                                    setErrors({ ...errors, webhook: undefined });
                                }}
                            />
                            {errors.webhook && <p className="mt-1 text-xs text-red-500">{errors.webhook}</p>}
                        </div>

                        <div>
                            <label htmlFor="api-key" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                                API Key <span className="text-zinc-600">(optional)</span>
                            </label>
                            <input
                                id="api-key"
                                type="password"
                                className={`w-full bg-black border rounded px-3 py-2 text-white text-sm focus:outline-none transition-colors ${errors.api ? 'border-red-500' : 'border-zinc-800 focus:border-blue-500'
                                    }`}
                                placeholder="sk_test_..."
                                value={apiKey}
                                onChange={(e) => {
                                    setApiKey(e.target.value);
                                    setErrors({ ...errors, api: undefined });
                                }}
                            />
                        </div>
                    </>
                )}

                <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4 mt-4">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Security Notice</h4>
                    <ul className="text-[10px] text-zinc-500 space-y-1">
                        <li>• Connections are established using industry-standard OAuth 2.0</li>
                        <li>• Tokens are stored securely and never exposed in the UI</li>
                        <li>• PayFlux only requests read_write permissions for event management</li>
                    </ul>
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleContinue}
                    className="px-6 py-2.5 bg-white text-black font-bold rounded text-sm hover:bg-zinc-200 transition-colors"
                >
                    Continue →
                </button>
            </div>
        </div>
    );
}

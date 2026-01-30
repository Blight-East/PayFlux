'use client';

import { useState, useEffect } from 'react';

export default function ConnectorsPage() {
    const [signingSecret, setSigningSecret] = useState('');
    const [label, setLabel] = useState('Primary Stripe Account');
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [lastEvent, setLastEvent] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchConfig() {
            try {
                const res = await fetch('/api/connectors/stripe');
                if (res.ok) {
                    const data = await res.json();
                    setSigningSecret(data.signingSecret || '');
                    setLabel(data.label || 'Primary Stripe Account');
                    setStatus(data.signingSecret ? 'connected' : 'disconnected');
                } else {
                    setStatus('disconnected');
                }
            } catch (err) {
                setStatus('disconnected');
            }
        }

        async function fetchStatus() {
            try {
                const res = await fetch('/api/status');
                if (res.ok) {
                    const data = await res.json();
                    setLastEvent(data.lastEventAt || null);
                }
            } catch (err) { }
        }

        fetchConfig();
        fetchStatus();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/connectors/stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signingSecret, label }),
            });
            if (res.ok) {
                setStatus('connected');
                alert('Config saved successfully');
            }
        } catch (err) {
            alert('Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    const sendTestEvent = async () => {
        try {
            const res = await fetch('/api/webhooks/stripe/test', {
                method: 'POST',
            });
            if (res.ok) {
                alert('Test event sent. Check dashboard for updates.');
            } else {
                alert('Failed to send test event');
            }
        } catch (err) {
            alert('Error sending test event');
        }
    };

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Processors & Connectors</h2>
                <p className="text-zinc-500 text-sm mt-1">Configure how PayFlux receives events from your payment processors.</p>
            </div>

            <div className="grid gap-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white rounded flex items-center justify-center font-bold text-black italic">S</div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Stripe</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-zinc-600'}`}></div>
                                    <span className="text-xs text-zinc-400 capitalize">{status}</span>
                                </div>
                            </div>
                        </div>
                        {status === 'connected' && (
                            <button
                                onClick={sendTestEvent}
                                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded hover:text-white transition-colors"
                            >
                                Send Test Event
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label htmlFor="signing-secret" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                                Stripe Signing Secret (whsec_...)
                            </label>
                            <input
                                id="signing-secret"
                                type="password"
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={signingSecret}
                                onChange={(e) => setSigningSecret(e.target.value)}
                            />
                            <p className="mt-1.5 text-[10px] text-zinc-600">
                                You can find this in your Stripe Dashboard under Developers {'>'} Webhooks after adding the endpoint below.
                            </p>
                        </div>

                        <div>
                            <label htmlFor="account-label" className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                                Account Label
                            </label>
                            <input
                                id="account-label"
                                type="text"
                                className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="e.g. Primary Production Account"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 flex justify-between items-center">
                            <div className="text-[10px] text-zinc-500">
                                {lastEvent ? `Last event received: ${new Date(lastEvent).toLocaleString()}` : 'No events received yet'}
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-white text-black font-bold py-2 px-6 rounded text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 border-dashed rounded-lg p-6">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Webhook Endpoint</h4>
                    <div className="flex items-center space-x-2 bg-black border border-zinc-900 rounded p-3">
                        <code className="text-blue-400 text-xs flex-1">https://app.payflux.dev/api/webhooks/stripe</code>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText('https://app.payflux.dev/api/webhooks/stripe');
                                alert('Copied to clipboard');
                            }}
                            className="text-[10px] bg-zinc-900 text-zinc-400 px-2 py-1 rounded hover:text-white"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="mt-3 text-[10px] text-zinc-600 leading-relaxed">
                        Paste this URL into the Stripe Dashboard to start receiving events. Ensure you select the
                        <code className="bg-zinc-900 px-1 mx-1 text-zinc-400">payment_intent.payment_failed</code> and
                        <code className="bg-zinc-900 px-1 mx-1 text-zinc-400">payment_intent.succeeded</code> events.
                    </p>
                </div>
            </div>
        </div>
    );
}

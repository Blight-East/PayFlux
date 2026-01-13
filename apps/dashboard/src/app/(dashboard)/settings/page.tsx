'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [inboundEnabled, setInboundEnabled] = useState(true);
    const [outboundEnabled, setOutboundEnabled] = useState(true);

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">System Settings</h2>
                <p className="text-zinc-500 text-sm mt-1">Global configuration and feature flags for the PayFlux control plane.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Subscription & Tiers</h3>
                    <div className="flex items-center justify-between p-4 bg-black border border-zinc-900 rounded">
                        <div>
                            <p className="text-blue-400 font-bold text-lg tracking-tight">Tier 2 <span className="text-zinc-600 font-normal text-sm ml-2">Enterprise</span></p>
                            <p className="text-xs text-zinc-500 mt-1">Full access to Pilot warnings dashboard and outcome annotations.</p>
                        </div>
                        <div className="text-xs text-zinc-400">
                            Renews: <span className="text-white">Monthly</span>
                        </div>
                    </div>
                    <div className="mt-6 flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        <span className="text-xs text-zinc-500 font-medium">Pilot Mode Enabled</span>
                    </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Local Control Flags</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-white">Disable inbound webhooks</p>
                                <p className="text-xs text-zinc-500">Stop processing events from all configured processors.</p>
                            </div>
                            <button
                                onClick={() => setInboundEnabled(!inboundEnabled)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${inboundEnabled ? 'bg-zinc-700' : 'bg-red-900'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${inboundEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-white">Disable outbound alerts</p>
                                <p className="text-xs text-zinc-500">Suppress all notifications and Slack/PagerDuty integration.</p>
                            </div>
                            <button
                                onClick={() => setOutboundEnabled(!outboundEnabled)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${outboundEnabled ? 'bg-zinc-700' : 'bg-red-900'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${outboundEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                    <p className="mt-8 text-[10px] text-zinc-600 leading-relaxed max-w-xl">
                        Note: These toggles only affect the control-plane routing layer. They do not modify the core PayFlux scoring
                        engine or internal verification logic. All changes are local to this instance.
                    </p>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
                    <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Danger Zone</h3>
                    <p className="text-xs text-zinc-500 mb-6">Permanently delete all workspace data and disconnect all connectors.</p>
                    <button className="px-4 py-2 bg-red-900/20 border border-red-500/30 text-red-500 text-xs font-bold rounded hover:bg-red-900/40 transition-colors">
                        Destroy Workspace
                    </button>
                </div>
            </div>
        </div>
    );
}

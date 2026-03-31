'use client';

import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/nextjs';

interface Warning {
    warning_id: string;
    processor: string;
    risk_band: string;
    risk_score: number;
    processed_at: string;
    outcome_observed: boolean;
    outcome_type: string;
}

interface AuthDenials {
    missing_key: number;
    revoked_key: number;
    invalid_key: number;
}

export default function DiagnosticsPage() {
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);
    const [authDenials, setAuthDenials] = useState<AuthDenials | null>(null);
    const [prometheusAvailable, setPrometheusAvailable] = useState(true);

    useEffect(() => {
        async function fetchWarnings() {
            try {
                const res = await fetch('/api/proxy/pilot/warnings');
                if (res.ok) {
                    const data = await res.json();
                    setWarnings(data || []);
                }
            } catch (err) {
                console.error('Failed to fetch warnings', err);
            } finally {
                setLoading(false);
            }
        }
        fetchWarnings();
    }, []);

    useEffect(() => {
        async function fetchAuthDenials() {
            try {
                const res = await fetch('/api/metrics/auth-denials');
                if (res.ok) {
                    const data = await res.json();
                    if (data.available) {
                        setAuthDenials(data.denials);
                    } else {
                        setPrometheusAvailable(false);
                    }
                } else {
                    setPrometheusAvailable(false);
                }
            } catch {
                setPrometheusAvailable(false);
            }
        }
        fetchAuthDenials();
        const interval = setInterval(fetchAuthDenials, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 tracking-tight">System Status</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5">Supporting infrastructure signals and internal warning logs</p>
                </div>
                <UserButton
                    appearance={{
                        elements: {
                            userButtonAvatarBox: "w-8 h-8"
                        }
                    }}
                />
            </div>

            <div className="space-y-6">
                {/* Auth Denials Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Auth Denials (last 15m)</h4>
                    {!prometheusAvailable ? (
                        <div className="text-[10px] text-gray-400 italic">
                            Prometheus not configured. Set PROMETHEUS_URL to view breakdown.
                        </div>
                    ) : authDenials ? (
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Missing Key</div>
                                <div className="text-lg font-bold text-gray-500 font-mono">{authDenials.missing_key}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Revoked Key</div>
                                <div className="text-lg font-bold text-red-500/70 font-mono">{authDenials.revoked_key}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Invalid Key</div>
                                <div className="text-lg font-bold text-orange-500/70 font-mono">{authDenials.invalid_key}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px] text-gray-400 italic">Loading...</div>
                    )}
                </div>

                {/* Event Log / Warnings Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Log</h4>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-400 font-medium">
                            <tr>
                                <th className="px-5 py-3 text-[10px] uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-[10px] uppercase tracking-wider">Processor</th>
                                <th className="px-5 py-3 text-[10px] uppercase tracking-wider">Risk Band</th>
                                <th className="px-5 py-3 text-[10px] uppercase tracking-wider">Score</th>
                                <th className="px-5 py-3 text-[10px] uppercase tracking-wider">Processed At</th>
                                <th className="px-5 py-3 text-[10px] uppercase tracking-wider">Outcome</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400 italic text-xs">
                                        Loading event log...
                                    </td>
                                </tr>
                            ) : warnings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-gray-400 italic text-xs">
                                        No events detected in the last 24 hours.
                                    </td>
                                </tr>
                            ) : (
                                warnings.map((w) => (
                                    <tr key={w.warning_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center space-x-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${w.outcome_observed ? 'bg-gray-300' : 'bg-red-500 animate-pulse'}`}></div>
                                                <span className="text-[10px] font-medium text-gray-500">
                                                    {w.outcome_observed ? 'Resolved' : 'Active'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 font-medium text-gray-500 uppercase tracking-wider text-[10px]">{w.processor}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${w.risk_band === 'critical' ? 'bg-red-500/10 text-red-500/70 border border-red-500/20' :
                                                w.risk_band === 'high' ? 'bg-orange-500/10 text-orange-500/70 border border-orange-500/20' :
                                                    'bg-gray-100 text-gray-500 border border-gray-300'
                                                }`}>
                                                {w.risk_band}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-[11px] text-gray-500">{(w.risk_score || 0).toFixed(4)}</td>
                                        <td className="px-5 py-3 text-[11px] text-gray-400 font-mono">{new Date(w.processed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })} UTC</td>
                                        <td className="px-5 py-3">
                                            {w.outcome_observed ? (
                                                <span className="text-[11px] text-emerald-500/60 font-medium">✓ {w.outcome_type}</span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400 italic">Needs review</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* System Health */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System Health</h4>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs text-gray-500">System Online</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

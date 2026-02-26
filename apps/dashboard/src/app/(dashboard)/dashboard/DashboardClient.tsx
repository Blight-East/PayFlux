'use client';

import { useState, useEffect } from 'react';

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

interface ReserveProjection {
    shock_probability: number;
    expected_reserve_percent: number;
    projected_reserve_hold: number;
    acceleration: number;
    instability_index: number;
    confidence_low: number;
    confidence_high: number;
}

import { UserButton } from '@clerk/nextjs';

export default function DashboardClient({ tier }: { tier: string }) {
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [loading, setLoading] = useState(true);
    const [authDenials, setAuthDenials] = useState<AuthDenials | null>(null);
    const [reserveForecast, setReserveForecast] = useState<ReserveProjection | null>(null);
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
        const interval = setInterval(fetchAuthDenials, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        async function fetchRiskForecast() {
            try {
                const res = await fetch('/api/proxy/api/v1/risk/forecast');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.reserve_projection) {
                        setReserveForecast(data.reserve_projection);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch risk forecast', err);
            }
        }
        fetchRiskForecast();
    }, []);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Warnings Dashboard</h2>
                    <p className="text-zinc-500 text-sm mt-1">Risk signals from PayFlux core.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <button className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold rounded hover:bg-zinc-800 transition-colors">
                        Export JSON
                    </button>
                    <UserButton
                        appearance={{
                            elements: {
                                userButtonAvatarBox: "w-8 h-8"
                            }
                        }}
                    />
                </div>
            </div>

            {/* Hero Panel: Deterministic Projection */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-8 relative overflow-hidden mb-8 shadow-2xl">
                {/* Tier Gate Overlay */}
                {tier === 'free' && (
                    <div className="absolute inset-0 z-10 bg-black/85 backdrop-blur-[3px] flex flex-col items-center justify-center border border-zinc-800/80 rounded-xl">
                        <div className="w-14 h-14 rounded-full bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                            <span className="text-xl text-zinc-500">🔒</span>
                        </div>
                        <div className="text-xs font-black tracking-[0.2em] uppercase text-zinc-500 mb-2">Pro Feature</div>
                        <h4 className="text-white text-xl font-bold mb-2 tracking-tight">Deterministic Projection Locked</h4>
                        <p className="text-zinc-400 text-sm text-center max-w-[340px] leading-relaxed">
                            Upgrade to Pro to view true 90-day reserve forecasts, capital hold requirements, and systemic instability metrics.
                        </p>
                    </div>
                )}

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Reserve Forecast
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">Real-time projection of required capital reserves.</p>
                    </div>
                    {reserveForecast && (
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Instability Index</div>
                            <div className="text-sm text-zinc-300 font-mono bg-zinc-900/50 px-3 py-1 rounded border border-zinc-800/80">
                                {reserveForecast.instability_index > 0 ? reserveForecast.instability_index.toFixed(4) : "0.0000"}
                            </div>
                        </div>
                    )}
                </div>

                {reserveForecast ? (
                    <>
                        <div className="grid grid-cols-12 gap-8 mb-8">
                            <div className="col-span-4 border-r border-zinc-800/50 pr-8">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Shock Probability</div>
                                <div className={`text-6xl font-black font-mono tracking-tighter ${reserveForecast.shock_probability > 0.8 ? 'text-red-500' :
                                    reserveForecast.shock_probability > 0.5 ? 'text-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.1)]' :
                                        reserveForecast.shock_probability > 0.2 ? 'text-yellow-500' : 'text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                                    }`}>
                                    {(reserveForecast.shock_probability * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-zinc-600 mt-2">Likelihood of 2σ variance event</div>
                            </div>
                            <div className="col-span-8">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Expected Maximum Hold</div>
                                <div className="flex flex-col">
                                    <span className="text-6xl font-black text-white font-mono tracking-tighter">
                                        <span className="text-zinc-500 font-medium mr-1">$</span>
                                        {reserveForecast.projected_reserve_hold.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <div className="flex items-center gap-3 mt-3">
                                        <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400">
                                            95% CI Range
                                        </span>
                                        <span className="text-sm text-zinc-500 font-mono">
                                            ${reserveForecast.confidence_low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-zinc-700 mx-2">—</span>
                                            ${reserveForecast.confidence_high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 90-Day Visualization (Heavy) */}
                        <div className="pt-6 border-t border-zinc-800/50">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">90-Day Liability Projection Window</span>
                                <span className="text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">T+90 Days Locked</span>
                            </div>
                            <div className="relative h-4 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                                <div className="h-full bg-emerald-600/90 w-1/3 border-r border-emerald-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]"></div>
                                <div className="h-full bg-emerald-500/40 w-1/3 border-r border-emerald-400/30"></div>
                                <div className="h-full bg-emerald-500/10 w-1/3"></div>
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                                <span className="text-[10px] font-mono font-medium text-zinc-500">Today</span>
                                <span className="text-[10px] font-mono font-medium text-zinc-500">Day 30</span>
                                <span className="text-[10px] font-mono font-medium text-zinc-500">Day 60</span>
                                <span className="text-[10px] font-mono font-bold text-emerald-500 shadow-emerald-500/50">Day 90 Maturity</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-zinc-500 italic py-8 text-center border border-dashed border-zinc-800 rounded-lg">Computing deterministic projection...</div>
                )}
            </div>

            {/* Secondary Metrics & Logs */}
            <div className="grid grid-cols-1 mb-6">
                {/* Auth Denials Card */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-sm font-bold text-white mb-4">Auth Denials (last 15m)</h3>
                    {!prometheusAvailable ? (
                        <div className="text-xs text-zinc-500 italic">
                            Prometheus not configured. Set PROMETHEUS_URL to view breakdown.
                        </div>
                    ) : authDenials ? (
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Missing Key</div>
                                <div className="text-2xl font-bold text-white font-mono">{authDenials.missing_key}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Revoked Key</div>
                                <div className="text-2xl font-bold text-red-500 font-mono">{authDenials.revoked_key}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Invalid Key</div>
                                <div className="text-2xl font-bold text-orange-500 font-mono">{authDenials.invalid_key}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-500 italic">Loading...</div>
                    )}
                </div>


            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-black border-b border-zinc-800 text-zinc-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Processor</th>
                            <th className="px-6 py-4">Risk Band</th>
                            <th className="px-6 py-4">Score</th>
                            <th className="px-6 py-4">Processed At</th>
                            <th className="px-6 py-4">Outcome</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">
                                    Loading warnings...
                                </td>
                            </tr>
                        ) : warnings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic">
                                    No warnings detected in the last 24 hours.
                                </td>
                            </tr>
                        ) : (
                            warnings.map((w) => (
                                <tr key={w.warning_id} className="hover:bg-zinc-800/30 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-2 h-2 rounded-full ${w.outcome_observed ? 'bg-zinc-600' : 'bg-red-500 animate-pulse'}`}></div>
                                            <span className="text-xs font-medium text-zinc-300">
                                                {w.outcome_observed ? 'Resolved' : 'Active'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white uppercase tracking-wider text-[10px]">{w.processor}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${w.risk_band === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                            w.risk_band === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                                'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                            }`}>
                                            {w.risk_band}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">{(w.risk_score || 0).toFixed(4)}</td>
                                    <td className="px-6 py-4 text-xs text-zinc-500">{new Date(w.processed_at).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {w.outcome_observed ? (
                                            <span className="text-xs text-green-500 font-medium">✓ {w.outcome_type}</span>
                                        ) : (
                                            <span className="text-xs text-zinc-600 italic">Needs review</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

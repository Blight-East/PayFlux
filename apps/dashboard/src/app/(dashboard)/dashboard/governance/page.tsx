'use client';

export default function GovernancePage() {
    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Forecast Confidence & Model Details</h1>
                <p className="text-gray-500 text-sm mt-1 font-mono">Versioned disclosures, validation methodology, and change history for PayFlux forecasts.</p>
            </div>

            {/* Current Model Version */}
            <section className="mb-16">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Current Model</div>
                <div className="border border-gray-200 rounded-xl px-6 py-6">
                    <div className="grid grid-cols-4 gap-6">
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Version</div>
                            <div className="text-lg font-mono font-bold text-gray-900">reserve-v1.0.0</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Status</div>
                            <div className="text-lg font-mono font-bold text-emerald-500">Active</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Effective</div>
                            <div className="text-lg font-mono font-bold text-gray-700">2026-01-15</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Ledger Schema</div>
                            <div className="text-lg font-mono font-bold text-gray-700">1.0.0</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Change Log */}
            <section className="mb-16">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Change Log</div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 font-medium">
                            <tr>
                                <th className="px-6 py-3">Version</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            <tr>
                                <td className="px-6 py-3 font-mono text-gray-900">reserve-v1.0.0</td>
                                <td className="px-6 py-3 font-mono text-gray-500">2026-01-15</td>
                                <td className="px-6 py-3">
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Initial</span>
                                </td>
                                <td className="px-6 py-3 text-gray-500">
                                    Deterministic reserve projection engine. Tier-based reserve rate mapping, trend-adjusted worst-case modeling, intervention simulation.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-[10px] text-gray-400 font-mono">
                    All version transitions are recorded in the projection ledger. Historical projections retain the model version active at time of computation.
                </p>
            </section>

            {/* Model Disclosure */}
            <section className="mb-16">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Model Disclosure</div>
                <div className="border border-gray-200 rounded-xl px-6 py-6 space-y-8">
                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Purpose</div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            PayFlux reserve-v1.0.0 projects reserve capital exposure at 30-day, 60-day, and 90-day windows based on current risk tier, trend direction, and processing volume. The model is deterministic — identical inputs always produce identical outputs.
                        </p>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Inputs</div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Risk Tier', desc: 'Integer 1–5, derived from composite risk scoring' },
                                { label: 'Trend', desc: 'DEGRADING | STABLE | IMPROVING' },
                                { label: 'Tier Delta', desc: 'Rate of tier change over evaluation window' },
                                { label: 'Monthly TPV', desc: 'Total processing volume (USD), capped at $10B' },
                                { label: 'Policy Surface', desc: 'Count of present, weak, and missing policy signals' },
                                { label: 'Velocity Signals', desc: 'Dispute and chargeback velocity indicators' },
                            ].map((input, i) => (
                                <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                    <div className="text-[10px] font-mono font-bold text-gray-700 mb-1">{input.label}</div>
                                    <div className="text-[10px] text-gray-500">{input.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Applied Constants</div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="text-gray-500 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Tier</th>
                                        <th className="px-4 py-2 text-left">Band</th>
                                        <th className="px-4 py-2 text-right">Reserve Rate</th>
                                        <th className="px-4 py-2 text-right">Trend Multiplier (Degrading)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 font-mono">
                                    <tr><td className="px-4 py-2 text-gray-500">1</td><td className="px-4 py-2 text-gray-500">Low</td><td className="px-4 py-2 text-right text-gray-700">0.00%</td><td className="px-4 py-2 text-right text-gray-700">1.5×</td></tr>
                                    <tr><td className="px-4 py-2 text-gray-500">2</td><td className="px-4 py-2 text-gray-500">Moderate</td><td className="px-4 py-2 text-right text-gray-700">5.00%</td><td className="px-4 py-2 text-right text-gray-700">1.5×</td></tr>
                                    <tr><td className="px-4 py-2 text-gray-500">3</td><td className="px-4 py-2 text-gray-500">Elevated</td><td className="px-4 py-2 text-right text-gray-700">10.00%</td><td className="px-4 py-2 text-right text-gray-700">1.5×</td></tr>
                                    <tr><td className="px-4 py-2 text-gray-500">4</td><td className="px-4 py-2 text-gray-500">High</td><td className="px-4 py-2 text-right text-gray-700">15.00%</td><td className="px-4 py-2 text-right text-gray-700">1.5×</td></tr>
                                    <tr><td className="px-4 py-2 text-gray-500">5</td><td className="px-4 py-2 text-gray-500">Critical</td><td className="px-4 py-2 text-right text-gray-700">25.00%</td><td className="px-4 py-2 text-right text-gray-700">1.5×</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Derivation</div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-[11px] text-gray-500 space-y-1">
                            <div>baseReserveRate = RESERVE_RATE_BY_TIER[currentTier]</div>
                            <div>worstCaseRate = min(baseRate × trendMultiplier, reserveRateCeiling)</div>
                            <div>projectedTrappedBps = baseReserveRate × 10000</div>
                            <div>projectedTrappedUSD = monthlyTPV × baseReserveRate × (windowDays / 30)</div>
                            <div className="text-gray-400 pt-2">Intervention: exposureMultiplier = (1 - velocityReduction) ^ 1.5</div>
                            <div className="text-gray-400">Intervention: rateMultiplier = (1 - velocityReduction) ^ 1.2</div>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Limitations</div>
                        <ul className="text-xs text-gray-500 space-y-2 leading-relaxed">
                            <li className="flex gap-2"><span className="text-gray-400 mt-0.5">·</span> Projections are estimates based on observed processor behavior. Actual reserve actions are at processor discretion.</li>
                            <li className="flex gap-2"><span className="text-gray-400 mt-0.5">·</span> The model does not account for processor-specific contractual terms or negotiated thresholds.</li>
                            <li className="flex gap-2"><span className="text-gray-400 mt-0.5">·</span> Tier-to-rate mapping is based on industry-observed ranges, not processor-disclosed formulas.</li>
                            <li className="flex gap-2"><span className="text-gray-400 mt-0.5">·</span> Intervention modeling assumes linear velocity reduction. Actual behavioral changes may be non-linear.</li>
                            <li className="flex gap-2"><span className="text-gray-400 mt-0.5">·</span> USD projections require monthly TPV input. Without TPV, projections are shown as percentages of volume.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Validation Methodology */}
            <section className="mb-16">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Validation Methodology</div>
                <div className="border border-gray-200 rounded-xl px-6 py-6 space-y-8">
                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Evaluation Window</div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-4">
                            Model accuracy is computed over an 8-week rolling window. Each projection is compared against the actual risk tier and trend observed at the projected time horizon. Evaluations require a minimum 6-hour gap between consecutive snapshots to prevent intra-day false negatives.
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Window</div>
                                <div className="text-lg font-mono font-bold text-gray-700">8 Weeks</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Min Gap</div>
                                <div className="text-lg font-mono font-bold text-gray-700">6 Hours</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cadence</div>
                                <div className="text-lg font-mono font-bold text-gray-700">Daily</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Significance Thresholds</div>
                        <p className="text-xs text-gray-500 leading-relaxed mb-4">
                            Accuracy metrics are only published when statistical significance thresholds are met. Below threshold, the system reports evaluation progress but withholds accuracy claims.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Minimum Merchants</div>
                                <div className="text-2xl font-mono font-bold text-gray-700">5</div>
                                <div className="text-[10px] text-gray-400 mt-1">Distinct merchants with projection history</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Minimum Evaluations</div>
                                <div className="text-2xl font-mono font-bold text-gray-700">20</div>
                                <div className="text-[10px] text-gray-400 mt-1">Total projection-vs-actual comparisons</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Accuracy Metrics</div>
                        <div className="space-y-3">
                            {[
                                { metric: 'Tier Prediction', desc: 'Percentage of projections where the projected risk tier matched the actual tier at evaluation time.' },
                                { metric: 'Trend Prediction', desc: 'Percentage of projections where the projected trend direction (DEGRADING, STABLE, IMPROVING) matched the actual trend at evaluation time.' },
                                { metric: 'Mean Variance', desc: 'Average absolute difference (in basis points) between projected and actual reserve exposure.' },
                                { metric: 'Median Variance', desc: 'Median absolute difference (in basis points). Less sensitive to outliers than mean.' },
                                { metric: 'Std Dev Variance', desc: 'Standard deviation of variance distribution. Measures prediction consistency.' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-40 shrink-0 text-[10px] font-mono font-bold text-gray-700 pt-0.5">{item.metric}</div>
                                    <div className="text-[10px] text-gray-500 leading-relaxed">{item.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-bold text-gray-900 mb-3">Version Stability</div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Version stability tracks whether all merchants are evaluated against the same model version within the accuracy window. If multiple model versions are active simultaneously, the system flags instability. Accuracy metrics during version transitions should be interpreted with the transition context — mixed-version windows may show accuracy artifacts unrelated to model quality.
                        </p>
                    </div>
                </div>
            </section>

            {/* Data Handling */}
            <section className="mb-16">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Data Handling</div>
                <div className="border border-gray-200 rounded-xl px-6 py-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-xs font-bold text-gray-900 mb-2">Observed</div>
                            <ul className="text-[10px] text-gray-500 space-y-1.5">
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Dispute velocity</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Chargeback ratios</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Policy surface coverage</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Risk tier transitions</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Processing volume (if provided)</li>
                            </ul>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-gray-900 mb-2">Not Observed</div>
                            <ul className="text-[10px] text-gray-500 space-y-1.5">
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Cardholder PII</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Card numbers or PANs</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Transaction amounts (individual)</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Customer identities</li>
                                <li className="flex gap-2"><span className="text-gray-400">·</span> Approval/decline decisions</li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                        <div className="text-xs font-bold text-gray-900 mb-2">Ledger Integrity</div>
                        <ul className="text-[10px] text-gray-500 space-y-1.5">
                            <li className="flex gap-2"><span className="text-gray-400">·</span> Projection artifacts are append-only. Never mutated after creation.</li>
                            <li className="flex gap-2"><span className="text-gray-400">·</span> Each artifact is SHA-256 hashed and HMAC-SHA256 signed at write time.</li>
                            <li className="flex gap-2"><span className="text-gray-400">·</span> Accuracy metrics are derived at read-time from immutable ledger entries.</li>
                            <li className="flex gap-2"><span className="text-gray-400">·</span> Aggregate accuracy never exposes individual merchant data, names, or TPV.</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="text-[10px] text-gray-400 font-mono">
                This disclosure is generated from the active model configuration. Constants and thresholds reflect the current production deployment.
            </div>
        </div>
    );
}

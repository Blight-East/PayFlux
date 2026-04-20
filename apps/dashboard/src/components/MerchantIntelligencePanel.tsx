'use client';

import { useEffect, useState } from 'react';

type Cluster = {
    id: number;
    cluster_label: string;
    industry: string;
    merchant_count: number;
    risk_score: number;
};

type DiscoveryMerchant = {
    merchant_id: number;
    canonical_name: string;
    domain: string | null;
    risk_score: number;
    signal_count: number;
    last_seen_at: string | null;
};

type MerchantIntelligenceSummary = {
    available: boolean;
    reason?: string;
    generated_at: string;
    new_merchants_detected: number;
    high_risk_clusters: number;
    top_emerging_processors: string[];
    merchant_graph_size: number;
    merchant_relationship_count: number;
    top_clusters: Cluster[];
    merchant_discovery_feed: DiscoveryMerchant[];
};

const EMPTY_SUMMARY: MerchantIntelligenceSummary = {
    available: false,
    generated_at: new Date(0).toISOString(),
    new_merchants_detected: 0,
    high_risk_clusters: 0,
    top_emerging_processors: [],
    merchant_graph_size: 0,
    merchant_relationship_count: 0,
    top_clusters: [],
    merchant_discovery_feed: [],
};

export default function MerchantIntelligencePanel() {
    const [summary, setSummary] = useState<MerchantIntelligenceSummary>(EMPTY_SUMMARY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadSummary() {
            try {
                const response = await fetch('/api/v1/merchant-intelligence', {
                    cache: 'no-store',
                });
                if (!response.ok) {
                    throw new Error(`Request failed with ${response.status}`);
                }
                const payload = await response.json();
                if (!cancelled) {
                    setSummary(payload);
                }
            } catch (error) {
                if (!cancelled) {
                    setSummary({
                        ...EMPTY_SUMMARY,
                        reason: (error as Error).message,
                    });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadSummary();
        const interval = setInterval(loadSummary, 60000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="pf-panel rounded-[1.8rem] p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-[11px] text-[var(--pf-muted)] uppercase tracking-[0.2em] font-bold">Market Snapshot</h3>
                    <p className="mt-2 text-sm text-[var(--pf-text-soft)]">
                        A broader summary of merchants and processors when this data source is turned on.
                    </p>
                </div>
                <div className="text-right">
                        <div className="text-[11px] uppercase tracking-wider text-[var(--pf-muted)]">Updated</div>
                    <div className="text-sm text-[var(--pf-text-soft)]">
                        {loading ? 'Loading...' : new Date(summary.generated_at).toLocaleString()}
                    </div>
                </div>
            </div>

            {!summary.available && !loading ? (
                <div className="text-sm text-[var(--pf-text-soft)] italic">
                    {summary.reason || 'Merchant intelligence summary is not available yet.'}
                </div>
            ) : null}

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric label="Profiles" value={summary.merchant_graph_size} />
                <Metric label="New Merchants" value={summary.new_merchants_detected} />
                <Metric label="Risk Groups" value={summary.high_risk_clusters} />
                <Metric label="Connections" value={summary.merchant_relationship_count} />
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
                <div className="overflow-hidden rounded-[1.35rem] border border-[var(--pf-line)]">
                    <div className="border-b border-[var(--pf-line)] px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--pf-muted)]">
                        Recently Found
                    </div>
                    <div className="divide-y divide-[var(--pf-line-soft)]">
                        {summary.merchant_discovery_feed.length === 0 ? (
                            <div className="px-4 py-5 text-sm text-[var(--pf-text-soft)] italic">
                                No merchant discoveries yet.
                            </div>
                        ) : (
                            summary.merchant_discovery_feed.slice(0, 4).map((merchant) => (
                                <div key={merchant.merchant_id} className="px-5 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-zinc-300 font-medium">{merchant.canonical_name}</div>
                                            <div className="text-sm text-[var(--pf-text-soft)]">
                                                {merchant.domain || 'Domain pending'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                                <div className="text-[11px] uppercase tracking-wider text-[var(--pf-muted)]">Score</div>
                                            <div className="text-sm font-mono text-orange-400/80">
                                                {merchant.risk_score.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-[1.35rem] border border-[var(--pf-line)] p-5">
                        <div className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider font-bold mb-3">
                            New Processor Activity
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {summary.top_emerging_processors.length === 0 ? (
                                <span className="text-sm text-[var(--pf-text-soft)] italic">No new processor movement detected.</span>
                            ) : (
                                summary.top_emerging_processors.slice(0, 4).map((processor) => (
                                    <span
                                        key={processor}
                                        className="px-2.5 py-1.5 rounded-full border border-zinc-700/60 bg-zinc-950 text-[12px] uppercase tracking-wider text-[var(--pf-text-soft)]"
                                    >
                                        {processor}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-[var(--pf-line)] p-5">
                        <div className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider font-bold mb-3">
                            Higher-Risk Groups
                        </div>
                        <div className="space-y-3">
                            {summary.top_clusters.length === 0 ? (
                                <div className="text-sm text-[var(--pf-text-soft)] italic">No clusters available yet.</div>
                            ) : (
                                summary.top_clusters.slice(0, 3).map((cluster) => (
                                    <div key={cluster.id} className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm text-zinc-300">{cluster.cluster_label}</div>
                                            <div className="text-sm text-[var(--pf-text-soft)]">
                                                {cluster.merchant_count} merchants
                                            </div>
                                        </div>
                                        <div className="text-sm font-mono text-red-400/80">
                                            {cluster.risk_score.toFixed(1)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-[1.2rem] border border-[var(--pf-line)] bg-zinc-950/28 p-4">
            <div className="mb-2 text-[12px] uppercase tracking-wider text-[var(--pf-muted)]">{label}</div>
            <div className="text-[1.7rem] font-mono tracking-[-0.03em] text-zinc-200">{value}</div>
        </div>
    );
}

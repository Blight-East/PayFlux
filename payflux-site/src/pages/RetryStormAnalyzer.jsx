import React, { useState } from 'react';
import {
    BarChart3,
    Zap,
    FileJson,
    Download,
    Mail,
    Info,
    Loader2,
    Shield
} from 'lucide-react';

/**
 * SEVERE RETRY STORM DATASET
 * Triggers HIGH risk (10.7x amplification)
 * Window: 9.4 minutes
 */
const SAMPLE_JSON = {
    "metadata": {
        "generated_at": new Date().toISOString(),
        "source": "payment_gateway_webhook_logs",
        "note": "9.4-minute sample showing severe retry amplification"
    },
    "events": [
        // Transaction 1: 15 retry attempts
        { "id": "evt_001", "timestamp": "2024-05-20T10:15:00Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_002", "timestamp": "2024-05-20T10:15:03Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_003", "timestamp": "2024-05-20T10:15:06Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_004", "timestamp": "2024-05-20T10:15:09Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_005", "timestamp": "2024-05-20T10:15:12Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_006", "timestamp": "2024-05-20T10:15:15Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_007", "timestamp": "2024-05-20T10:15:18Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_008", "timestamp": "2024-05-20T10:15:21Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_009", "timestamp": "2024-05-20T10:15:24Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_010", "timestamp": "2024-05-20T10:15:27Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_011", "timestamp": "2024-05-20T10:15:30Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_012", "timestamp": "2024-05-20T10:15:33Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_013", "timestamp": "2024-05-20T10:15:36Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_014", "timestamp": "2024-05-20T10:15:39Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },
        { "id": "evt_015", "timestamp": "2024-05-20T10:15:42Z", "transaction_id": "txn_001", "customer_id": "cus_8821", "error_code": "insufficient_funds", "amount": 2999 },

        // Transaction 2: 12 retry attempts
        { "id": "evt_016", "timestamp": "2024-05-20T10:16:00Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_017", "timestamp": "2024-05-20T10:16:03Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_018", "timestamp": "2024-05-20T10:16:06Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_019", "timestamp": "2024-05-20T10:16:09Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_020", "timestamp": "2024-05-20T10:16:12Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_021", "timestamp": "2024-05-20T10:16:15Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_022", "timestamp": "2024-05-20T10:16:18Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_023", "timestamp": "2024-05-20T10:16:21Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_024", "timestamp": "2024-05-20T10:16:24Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_025", "timestamp": "2024-05-20T10:16:27Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_026", "timestamp": "2024-05-20T10:16:30Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },
        { "id": "evt_027", "timestamp": "2024-05-20T10:16:33Z", "transaction_id": "txn_002", "customer_id": "cus_9902", "error_code": "card_declined", "amount": 4500 },

        // Transaction 3: 10 retry attempts
        { "id": "evt_028", "timestamp": "2024-05-20T10:17:00Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_029", "timestamp": "2024-05-20T10:17:03Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_030", "timestamp": "2024-05-20T10:17:06Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_031", "timestamp": "2024-05-20T10:17:09Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_032", "timestamp": "2024-05-20T10:17:12Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_033", "timestamp": "2024-05-20T10:17:15Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_034", "timestamp": "2024-05-20T10:17:18Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_035", "timestamp": "2024-05-20T10:17:21Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_036", "timestamp": "2024-05-20T10:17:24Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },
        { "id": "evt_037", "timestamp": "2024-05-20T10:17:27Z", "transaction_id": "txn_003", "customer_id": "cus_4410", "error_code": "expired_card", "amount": 1200 },

        // Generated high-density data
        ...Array.from({ length: 70 }, (_, i) => ({
            "id": `evt_gen_${i}`,
            "timestamp": new Date(1716190680000 + (i * 3000)).toISOString(),
            "transaction_id": `txn_gen_${Math.floor(i / 10)}`,
            "customer_id": `cus_gen_${Math.floor(i / 10)}`,
            "error_code": "card_declined",
            "amount": 5000
        }))
    ]
};

// COST MODEL CONSTANTS
const DEFAULT_COST_PER_ATTEMPT_USD = 2.50;
const DEFAULT_PROJECTION_HORIZON_DAYS = 30;
const SECONDS_IN_DAY = 24 * 60 * 60;

const roundCurrency = (amount) => Math.round(amount * 100) / 100;

const calculateWindowDuration = (events) => {
    if (!events || events.length === 0) return 0;
    const timestamps = events
        .map(e => new Date(e.timestamp || e.created * 1000).getTime())
        .filter(t => !isNaN(t));
    if (!timestamps.length) return 0;
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    return Math.max((maxTime - minTime) / 1000, 60);
};

const calculateCostMetrics = (redundantCalls, windowDurationSeconds) => {
    const windowWasteUsd = roundCurrency(redundantCalls * DEFAULT_COST_PER_ATTEMPT_USD);
    const secondsInProjection = DEFAULT_PROJECTION_HORIZON_DAYS * SECONDS_IN_DAY;
    const scaleFactor = windowDurationSeconds > 0 ? secondsInProjection / windowDurationSeconds : 0;
    const monthlyProjectionUsd = roundCurrency(windowWasteUsd * scaleFactor);

    return {
        windowWasteUsd,
        monthlyProjectionUsd,
        windowDurationSeconds,
        windowDurationMinutes: roundCurrency(windowDurationSeconds / 60),
        costPerAttemptUsd: DEFAULT_COST_PER_ATTEMPT_USD,
        projectionHorizonDays: DEFAULT_PROJECTION_HORIZON_DAYS,
        scaleFactor: Math.round(scaleFactor)
    };
};

const generateInterpretation = (data) => {
    const { amplificationRatio, riskLevel, maxClusterSize, maxClusterStart } = data;
    const baselineRatio = 1.5;
    const multiplier = (amplificationRatio / baselineRatio).toFixed(1);

    let summary = '';
    let riskExplanation = '';
    let causes = [];
    let impacts = [];

    if (riskLevel === 'HIGH') {
        summary = `Your system generated ${amplificationRatio.toFixed(1)} attempts per failed transaction. This is ${multiplier}x higher than stable retry behavior (${baselineRatio}x).`;
        riskExplanation = 'Classified as HIGH risk due to amplification >4x and significant clustered burst behavior.';
        causes = ['Issuer decline loops', 'Network timeout cascades', 'Static webhook retry policies', 'Queue backlogs'];
        impacts = ['Processor throttling risk', 'Authorization rate degradation', 'Excessive operational risk', 'Compliance flags'];
    } else if (riskLevel === 'MEDIUM') {
        summary = `Your system shows moderate retry amplification at ${amplificationRatio.toFixed(1)}x. Monitor for upward trends.`;
        riskExplanation = 'Classified as MEDIUM risk due to amplification between 2-4x.';
        causes = ['Temporary instability', 'Insufficient retry delays', 'Partial delivery failures'];
        impacts = ['Increased call volume', 'Cost inefficiency', 'Approaching monitoring thresholds'];
    } else {
        summary = `Retry behavior appears stable (${amplificationRatio.toFixed(1)}x). Backoff and failure handling are effective.`;
        riskExplanation = 'Classified as LOW risk due to amplification <2x.';
        causes = ['Exponential backoff', 'Circuit breakers', 'Healthy response times'];
        impacts = ['Minimal fee overhead', 'Clean risk profile', 'Efficient resolution'];
    }

    let clusterInfo = maxClusterSize > 10
        ? ` Largest burst: ${maxClusterSize} retries in 30s at ${maxClusterStart?.toLocaleTimeString()}.`
        : '';

    return { summary: summary + clusterInfo, riskExplanation, causes, impacts };
};

const processEvents = (events) => {
    const transactionMap = {};
    const timestampMap = [];

    events.forEach(ev => {
        const tid = ev.transaction_id || ev.payment_intent_id || ev.charge_id || ev.id;
        const rawTs = ev.timestamp || (ev.created ? ev.created * 1000 : null);
        const timestamp = rawTs ? new Date(rawTs) : new Date();

        if (isNaN(timestamp.getTime())) return;

        if (!transactionMap[tid]) {
            transactionMap[tid] = { attempts: 0, firstSeen: timestamp, errorCode: ev.error_code || 'unknown' };
        }
        transactionMap[tid].attempts++;
        timestampMap.push({ timestamp: timestamp.getTime(), transactionId: tid });
    });

    if (timestampMap.length === 0) throw new Error("No valid timestamps found.");

    const uniqueTransactions = Object.keys(transactionMap).length;
    const totalAttempts = events.length;
    const amplificationRatio = uniqueTransactions > 0 ? (totalAttempts / uniqueTransactions) : 0;
    const redundantCalls = Object.values(transactionMap).reduce((sum, txn) => sum + (txn.attempts - 1), 0);

    const windowDurationSeconds = calculateWindowDuration(events);
    const costMetrics = calculateCostMetrics(redundantCalls, windowDurationSeconds);

    const CLUSTER_WINDOW_MS = 30 * 1000;
    const sorted = timestampMap.sort((a, b) => a.timestamp - b.timestamp);
    let maxClusterSize = 0, maxClusterStart = null;

    for (let i = 0; i < sorted.length; i++) {
        const end = sorted[i].timestamp + CLUSTER_WINDOW_MS;
        let size = 0;
        for (let j = i; j < sorted.length && sorted[j].timestamp <= end; j++) size++;
        if (size > maxClusterSize) {
            maxClusterSize = size;
            maxClusterStart = new Date(sorted[i].timestamp);
        }
    }

    const risk = amplificationRatio >= 4 ? 'HIGH' : amplificationRatio >= 2 ? 'MEDIUM' : 'LOW';
    const timelineData = Object.entries(sorted.reduce((acc, item) => {
        const b = new Date(item.timestamp).toISOString().substring(0, 16);
        acc[b] = (acc[b] || 0) + 1;
        return acc;
    }, {})).map(([time, count]) => ({ time: time.substring(11), fullTime: time, count })).sort((a, b) => a.fullTime.localeCompare(b.fullTime));

    const interpretation = generateInterpretation({ amplificationRatio, riskLevel: risk, maxClusterSize, maxClusterStart });

    return {
        ratio: amplificationRatio.toFixed(2),
        clusterSize: maxClusterSize,
        redundantCalls,
        windowWasteUsd: costMetrics.windowWasteUsd,
        monthlyProjectionUsd: costMetrics.monthlyProjectionUsd,
        windowDurationMinutes: costMetrics.windowDurationMinutes,
        costPerAttemptUsd: costMetrics.costPerAttemptUsd,
        projectionHorizonDays: costMetrics.projectionHorizonDays,
        scaleFactor: costMetrics.scaleFactor,
        risk,
        timeline: timelineData,
        interpretation,
        metadata: { uniqueTransactions, totalAttempts, windowDurationSeconds }
    };
};

const downloadJSONReport = (results) => {
    const report = { generatedAt: new Date().toISOString(), analysis: results };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `retry-storm-analysis-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

const MetricCard = ({ label, value, caption, highlight }) => (
    <div
        className={`relative overflow-hidden rounded-xl border bg-slate-950/5 p-4 sm:p-5 transition-colors ${highlight
            ? "border-red-400/50 bg-red-500/5"
            : "border-slate-800/40"
            }`}
    >
        <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {label}
            </span>
            {highlight && (
                <Zap size={12} className="text-red-500/70" />
            )}
        </div>
        <div className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">
            <span className="font-mono">{value}</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            {caption}
        </p>
    </div>
);

const TimelineChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    const maxCount = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="relative flex h-56 w-full items-end gap-[3px] px-3">
            <div className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-between pb-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-full border-t border-slate-800/60 border-dashed" />
                ))}
            </div>
            {data.map((item, idx) => {
                const height = (item.count / maxCount) * 100;
                const isBurst = item.count > 15;
                return (
                    <div
                        key={idx}
                        className="group relative z-10 flex h-full flex-1 flex-col items-center justify-end"
                    >
                        <div
                            className={`w-full rounded-t-[2px] transition-colors ${isBurst
                                ? "bg-red-500/80 group-hover:bg-red-400"
                                : "bg-sky-500/70 group-hover:bg-sky-400"
                                }`}
                            style={{ height: `${height}%` }}
                        />
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 hidden -translate-x-1/2 translate-y-2 rounded-md border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-[10px] leading-snug text-slate-100 shadow-lg group-hover:block">
                            <div className="font-semibold text-slate-400">{item.time}</div>
                            <div className="font-mono">{item.count} attempts</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const RetryStormAnalyzer = () => {
    const [inputData, setInputData] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleAnalyze = () => {
        if (!inputData.trim()) return setError("Input buffer is empty.");
        setIsAnalyzing(true);
        setError(null);
        setTimeout(() => {
            try {
                const data = JSON.parse(inputData);
                const events = Array.isArray(data) ? data : data.events || [];
                if (!events.length) throw new Error("No events found.");
                setResults(processEvents(events));
                setIsAnalyzing(false);
            } catch (err) {
                setError(err.message || "Invalid JSON format.");
                setIsAnalyzing(false);
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 antialiased">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,255,0.12)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(148,163,184,0.12)_0,_transparent_50%)]" />
            <div className="relative z-10 flex min-h-screen flex-col">
                <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-950">
                                <BarChart3 size={18} className="text-slate-200" />
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    Retry Storm Analyzer
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    PayFlux risk instrumentation
                                </div>
                            </div>
                        </div>
                        <div className="hidden items-center gap-3 text-[10px] font-medium text-slate-400 sm:flex">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Runs locally
                            </div>
                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                            <span>Zero data retention</span>
                        </div>
                    </div>
                </header>
                <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-10">
                    <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-xl space-y-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                                Retry amplification diagnostics
                            </h1>
                            <p className="text-sm leading-relaxed text-slate-400">
                                Analyze gateway event streams for retry storms, window waste, and systemic exposure using the same primitives used in production payment risk tooling.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1">
                                <Shield size={12} className="text-emerald-400" />
                                <span className="uppercase tracking-[0.18em]">Local-only</span>
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                <span className="uppercase tracking-[0.18em]">Experimental instrument</span>
                            </div>
                        </div>
                    </section>
                    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                        <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/70">
                            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <FileJson size={14} className="text-slate-300" />
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Input event buffer
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-500">
                                    JSON · webhook or log export
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col gap-3 p-4">
                                <textarea
                                    value={inputData}
                                    onChange={(e) => setInputData(e.target.value)}
                                    className="min-h-[220px] w-full resize-none rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-3 font-mono text-[11px] leading-relaxed text-slate-100 outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                    placeholder='{ "events": [...] }'
                                />
                                {error && (
                                    <div className="flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-950/60 px-3 py-2.5 text-[11px] text-red-200">
                                        <Info size={14} className="mt-[1px] shrink-0 text-red-300" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <div className="mt-2 flex flex-col gap-3 border-t border-slate-800 pt-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="max-w-sm leading-relaxed">
                                        Parsing and analysis run entirely in-browser. No data is transmitted to PayFlux or external services.
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setInputData(JSON.stringify(SAMPLE_JSON, null, 2))}
                                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-900"
                                        >
                                            Load sample dataset
                                        </button>
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={isAnalyzing}
                                            className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 hover:bg-slate-200 disabled:opacity-60"
                                        >
                                            {isAnalyzing ? (
                                                <Loader2 size={14} className="animate-spin text-slate-700" />
                                            ) : (
                                                <Zap size={14} className="text-slate-900" />
                                            )}
                                            <span>Run analysis</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {results && (
                            <aside className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Snapshot classification
                                    </span>
                                    <div
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${results.risk === 'HIGH'
                                            ? "border-red-500/60 bg-red-950/60 text-red-200"
                                            : results.risk === 'MEDIUM'
                                                ? "border-amber-400/70 bg-amber-950/50 text-amber-100"
                                                : "border-emerald-400/70 bg-emerald-950/50 text-emerald-100"
                                            }`}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        <span>Risk: {results.risk}</span>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <MetricCard
                                        label="Amplification"
                                        value={`${results.ratio}x`}
                                        caption="Observed attempts per failed transaction."
                                    />
                                    <MetricCard
                                        label="Redundant calls"
                                        value={results.redundantCalls.toLocaleString()}
                                        caption="Excess attempts beyond first failure in window."
                                    />
                                    <MetricCard
                                        label="Peak burst"
                                        value={results.clusterSize}
                                        caption="Max attempts within a 30s cluster."
                                    />
                                </div>
                                <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
                                    <span className="font-semibold text-slate-300">Methodology.</span>{" "}
                                    Cost and exposure are linear projections over a {results.projectionHorizonDays}-day horizon using a unit cost of ${results.costPerAttemptUsd.toFixed(2)} per redundant attempt. Intended for operational diagnostics, not financial forecasting.
                                </div>
                            </aside>
                        )}
                    </section>
                    {results && (
                        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            Theoretical 30-day exposure
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Extrapolated cost if the observed storm profile persists unmitigated.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-semibold tracking-tight text-slate-50 sm:text-2xl">
                                            <span className="font-mono">
                                                ${results.monthlyProjectionUsd.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">
                                            Window waste: ${results.windowWasteUsd.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-slate-800/70 bg-slate-950/80 p-3 text-[11px] text-slate-400">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Observation window
                                        </div>
                                        <div className="mt-1 font-mono text-sm text-slate-50">
                                            {results.windowDurationMinutes} min
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800/70 bg-slate-950/80 p-3 text-[11px] text-slate-400">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Scale factor
                                        </div>
                                        <div className="mt-1 font-mono text-sm text-slate-50">
                                            {results.scaleFactor.toLocaleString()}×
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-slate-800/70 bg-slate-950/80 p-3 text-[11px] text-slate-400">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Horizon
                                        </div>
                                        <div className="mt-1 font-mono text-sm text-slate-50">
                                            {results.projectionHorizonDays} days
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        Interpretation
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                        Heuristic classification
                                    </span>
                                </div>
                                <p className="text-[13px] leading-relaxed text-slate-200">
                                    {results.interpretation.summary}
                                </p>
                                <div className="rounded-lg border border-slate-800/80 bg-slate-950/90 p-3 text-[11px] text-slate-400">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Risk rationale
                                    </div>
                                    <p className="mt-1 italic text-slate-300">
                                        {results.interpretation.riskExplanation}
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Probable drivers
                                        </div>
                                        <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                                            {results.interpretation.causes.map((c, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            Operational impacts
                                        </div>
                                        <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                                            {results.interpretation.impacts.map((c, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                    <span>
                                        Unique transactions:{" "}
                                        <span className="font-mono text-slate-200">
                                            {results.metadata.uniqueTransactions}
                                        </span>
                                    </span>
                                    <span>
                                        Total attempts:{" "}
                                        <span className="font-mono text-slate-200">
                                            {results.metadata.totalAttempts}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}
                    {results && (
                        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            Attempts over time
                                        </div>
                                        <p className="mt-1 text-[11px] text-slate-500">
                                            Relative density of retry activity within the analyzed window.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-3 rounded-full bg-red-500/80" />
                                            <span>Burst</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-1.5 w-3 rounded-full bg-sky-500/70" />
                                            <span>Baseline</span>
                                        </div>
                                    </div>
                                </div>
                                <TimelineChart data={results.timeline} />
                                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-500">
                                    <span>
                                        Start:{" "}
                                        <span className="font-mono text-slate-200">
                                            {results.timeline[0]?.time}
                                        </span>
                                    </span>
                                    <span>
                                        End:{" "}
                                        <span className="font-mono text-slate-200">
                                            {results.timeline[results.timeline.length - 1]?.time}
                                        </span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        Export
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                        For incident review and governance
                                    </span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-400">
                                    Persist this snapshot for runbooks, incident reviews, or to compare with future windows as you adjust retry policies and circuit-breaking behavior.
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => downloadJSONReport(results)}
                                        className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] font-medium text-slate-100 hover:bg-slate-900"
                                    >
                                        <Download size={14} className="text-slate-200" />
                                        <span>Download JSON report</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-md border border-slate-800 px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-slate-900"
                                    >
                                        <Mail size={14} className="text-slate-400" />
                                        <span>Copy summary</span>
                                    </button>
                                </div>
                                <div className="mt-2 flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-[11px] text-slate-500">
                                    <Info size={13} className="mt-[2px] text-slate-500" />
                                    <p>
                                        Results are descriptive only. Observability surfaces exposure; it does not override processor or network controls.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export default RetryStormAnalyzer;

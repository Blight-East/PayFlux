import React, { useState } from 'react';
import {
    BarChart3,
    Zap,
    FileJson,
    Download,
    Mail,
    Info,
    Loader2
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
        className={`rounded-xl p-4 border ${highlight
            ? "bg-red-50 border-red-400 text-red-900 shadow-sm"
            : "bg-white border-gray-200 text-gray-900 hover:shadow-md"
            } transition-all`}
    >
        <div className="text-sm font-medium uppercase tracking-wide opacity-70">
            {label}
        </div>

        <div className={`text-3xl font-bold mt-1 ${highlight ? "text-red-700 font-mono" : "font-mono"}`}>
            {value}
        </div>

        <div className="text-xs mt-1 opacity-70">
            {caption}
        </div>

        {highlight && (
            <div className="mt-2 text-[10px] font-semibold text-red-700 uppercase tracking-tighter">
                HIGH RISK — sustained retry behavior can trigger processor controls
            </div>
        )}
    </div>
);

const TimelineChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="w-full h-[240px] flex items-end gap-1 px-2 border-b border-slate-200">
            {data.map((item, idx) => {
                const height = (item.count / maxCount) * 100;
                return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div
                            className={`w-full transition-all rounded-t-sm ${item.count > 15 ? 'bg-red-500' : 'bg-blue-500'} group-hover:opacity-80`}
                            style={{ height: `${height}%` }}
                        >
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded whitespace-nowrap z-50">
                                {item.time}: {item.count} attempts
                            </div>
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
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100">
            {/* HERO / AUTHORITY STRIP */}
            <div className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
                <header className="max-w-6xl mx-auto px-6 md:px-12 py-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        PayFlux Diagnostic Tools
                    </div>
                    <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">Retry Storm Analyzer</h1>
                    <p className="mt-2 text-slate-600 max-w-2xl">
                        Detect retry amplification, wasted attempts, and processor exposure in minutes.
                        <span className="font-semibold text-slate-700"> Runs locally.</span> No uploads. No data storage.
                    </p>
                </header>
            </div>

            <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-10">
                {/* INPUT */}
                <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden max-w-5xl mx-auto">
                    <div className="bg-slate-50/50 px-5 py-3 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <FileJson size={14} /> JSON Event Input
                    </div>
                    <div className="p-6">
                        <textarea
                            value={inputData}
                            onChange={(e) => setInputData(e.target.value)}
                            className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
                            placeholder='{ "events": [...] }'
                        />
                        {error && <div className="mt-3 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">{error}</div>}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                            <div className="text-xs text-slate-500 flex items-start gap-2">
                                <Info size={14} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="font-bold uppercase tracking-widest text-[10px] text-slate-400">Privacy</div>
                                    <div className="mt-1">
                                        Analysis happens locally in-browser. <span className="font-semibold">No data storage</span>.
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                                <button
                                    onClick={() => setInputData(JSON.stringify(SAMPLE_JSON, null, 2))}
                                    className="text-xs font-black text-blue-700 uppercase tracking-wider hover:underline self-start sm:self-auto"
                                >
                                    Load Storm Sample
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-lg font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
                                >
                                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                    Run Diagnostic
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {results && (
                    <div className="space-y-10">
                        {/* RESULTS HEADER */}
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-center justify-between gap-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 flex items-center gap-2">
                                    <BarChart3 size={16} /> Analysis Dashboard
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${results.risk === 'HIGH'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : results.risk === 'MEDIUM'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                    Risk: {results.risk}
                                </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                                This dashboard separates <span className="font-semibold text-slate-700">Observed Window Waste</span> from{" "}
                                <span className="font-semibold text-slate-700">Theoretical 30-Day Exposure</span> to show both the immediate burn and the systemic risk.
                            </p>
                        </div>

                        {/* METRICS GROUP 1: OBSERVED */}
                        <div className="max-w-5xl mx-auto space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                Observed in sample window
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard label="Amp Ratio" value={`${results.ratio}x`} caption="Attempts generated per failure" />
                                <MetricCard label="Redundant Calls" value={results.redundantCalls.toLocaleString()} caption="Wasted attempts in sample" />
                                <MetricCard
                                    label="Observed Window Waste"
                                    value={`$${results.windowWasteUsd.toFixed(2)}`}
                                    caption="Redundant attempts × infrastructure + processor risk cost"
                                />
                            </div>
                        </div>

                        {/* EXPOSURE CALLOUT (FULL WIDTH) */}
                        <div className="max-w-5xl mx-auto">
                            <div className={`rounded-2xl border p-6 md:p-7 shadow-sm bg-gradient-to-b ${results.monthlyProjectionUsd > 5000
                                ? 'from-red-50 to-white border-red-200'
                                : 'from-slate-50 to-white border-slate-200'
                                }`}>
                                <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 flex items-center gap-2">
                                            <span className={`inline-block h-2 w-2 rounded-full ${results.monthlyProjectionUsd > 5000 ? 'bg-red-500' : 'bg-slate-400'}`} />
                                            Systemic exposure (if unchecked)
                                        </div>
                                        <div className={`mt-2 text-4xl md:text-5xl font-black tracking-tight ${results.monthlyProjectionUsd > 5000 ? 'text-red-700' : 'text-slate-900'
                                            }`}>
                                            ${results.monthlyProjectionUsd.toLocaleString()}
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 max-w-2xl">
                                            Projected exposure if this retry behavior persists for{" "}
                                            <span className="font-semibold text-slate-700">30 days</span> at ${results.costPerAttemptUsd.toFixed(2)} per redundant attempt.
                                        </div>
                                        {results.monthlyProjectionUsd > 5000 && (
                                            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-100 text-red-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                                                HIGH RISK — sustained retry behavior can trigger processor controls
                                            </div>
                                        )}
                                    </div>

                                    {/* SECONDARY METRIC */}
                                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projection model</div>
                                        <div className="mt-2">
                                            Extrapolated from <span className="font-semibold">{results.windowDurationMinutes}m</span> sample to 30 days
                                        </div>
                                        <div className="mt-1">
                                            Scale factor: <span className="font-semibold">{results.scaleFactor.toLocaleString()}×</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* METRICS GROUP 2: BURST */}
                        <div className="max-w-5xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard label="Peak Burst" value={results.clusterSize} caption="Events in 30s window" />
                            </div>
                        </div>

                        {/* (kept) Small disclosure block for auditors */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 text-[11px] text-slate-500 flex items-start gap-2 max-w-5xl mx-auto">
                            <Info size={14} className="mt-0.5 flex-shrink-0" />
                            <p>
                                <strong>Disclosure:</strong> Exposure is a linear extrapolation from the sample window (no seasonality, no counter-measures). Use it as a
                                directional risk indicator, not a forecast.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Retry Density Timeline</h4>
                                        <div className="mt-2 flex items-center gap-3 text-[10px] font-bold text-slate-500">
                                            <span className="inline-flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-red-500" /> Storm behavior (burst)
                                            </span>
                                            <span className="inline-flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-blue-500" /> Background retries
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[240px] flex flex-col">
                                    <TimelineChart data={results.timeline} />
                                    <div className="flex justify-between mt-2 px-2">
                                        <span className="text-[10px] text-slate-400">{results.timeline[0]?.time}</span>
                                        <span className="text-[10px] text-slate-400">{results.timeline[Math.floor(results.timeline.length / 2)]?.time}</span>
                                        <span className="text-[10px] text-slate-400">{results.timeline[results.timeline.length - 1]?.time}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 rounded-xl p-6 shadow-lg text-xs leading-relaxed space-y-4 border border-slate-800">
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                    Automated risk interpretation
                                </div>
                                <h4 className="text-white font-black uppercase tracking-widest">Interpretation</h4>
                                <p className="text-white font-medium">{results.interpretation.summary}</p>
                                <div className="pt-3 border-t border-slate-700">
                                    <span className="text-white font-bold block mb-1 uppercase tracking-tighter">Why {results.risk}?</span>
                                    <p className="opacity-80">{results.interpretation.riskExplanation}</p>
                                </div>
                                <div>
                                    <span className="text-white font-black block mb-1 uppercase tracking-tighter text-[10px]">Likely Causes</span>
                                    <ul className="list-disc list-inside opacity-70 space-y-1">
                                        {results.interpretation.causes.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <span className="text-white font-black block mb-1 uppercase tracking-tighter text-[10px]">Systemic Impact</span>
                                    <ul className="list-disc list-inside opacity-70 space-y-1">
                                        {results.interpretation.impacts.map((imp, i) => <li key={i}>{imp}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* CTA PANEL */}
                        <div className="max-w-5xl mx-auto">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Next step</div>
                                        <div className="mt-2 text-lg font-black text-slate-900">Monitor retry amplification before processors do.</div>
                                        <div className="mt-1 text-sm text-slate-600">
                                            Export results for stakeholders or get weekly health alerts to catch storms early.
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-sm transition-all"
                                        >
                                            <Mail size={14} /> Get Weekly Health Alerts
                                        </button>
                                        <button
                                            onClick={() => downloadJSONReport(results)}
                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-lg font-black text-xs uppercase tracking-widest hover:border-slate-300 shadow-sm transition-all"
                                        >
                                            <Download size={14} /> Download JSON Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-6 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">
                                PayFlux Infrastructure Diagnostics
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RetryStormAnalyzer;

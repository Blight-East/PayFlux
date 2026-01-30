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
        className={`relative group overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${highlight
            ? "bg-red-50/50 border-red-200 text-red-900 shadow-[0_4px_20px_rgba(239,68,68,0.08)]"
            : "bg-white border-slate-200 text-slate-900 hover:border-slate-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            }`}
    >
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex justify-between items-center">
            {label}
            {highlight && <Zap size={10} className="text-red-500" />}
        </div>

        <div className={`text-3xl font-black mt-1 tracking-tighter ${highlight ? "text-red-700" : "text-slate-900"}`}>
            <span className="font-mono">{value}</span>
        </div>

        <div className="text-[11px] mt-4 text-slate-500 leading-relaxed font-medium">
            {caption}
        </div>

        {highlight && (
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap size={40} />
            </div>
        )}
    </div>
);

const TimelineChart = ({ data }) => {
    if (!data || data.length === 0) return null;
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="relative w-full h-[240px] flex items-end gap-1.5 px-4">
            {/* Grid Lines */}
            <div className="absolute inset-0 z-0 flex flex-col justify-between pointer-events-none pb-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-full border-t border-slate-100/80 border-dashed" />
                ))}
            </div>

            {data.map((item, idx) => {
                const height = (item.count / maxCount) * 100;
                return (
                    <div key={idx} className="relative z-10 flex-1 flex flex-col items-center group h-full justify-end">
                        <div
                            className={`w-full transition-all duration-300 rounded-t-[3px] ${item.count > 15
                                ? 'bg-red-500 group-hover:bg-red-600'
                                : 'bg-indigo-500 group-hover:bg-indigo-600'
                                } group-hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.5)]`}
                            style={{ height: `${height}%` }}
                        >
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-2.5 rounded-lg whitespace-nowrap z-50 shadow-xl border border-white/10">
                                <span className="font-bold text-slate-400 block mb-1 uppercase tracking-widest">{item.time}</span>
                                <span className="text-sm font-mono">{item.count} attempts</span>
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
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-indigo-100/80 font-sans antialiased">
            {/* BACKGROUND MESH ACCENT */}
            <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute top-[5%] right-[-5%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full shadow-2xl"></div>
                <div className="absolute top-0 w-full h-full opacity-[0.03]" style={{ backgroundImage: `radial-gradient(#6366f1 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }}></div>
            </div>

            {/* HERO / AUTHORITY STRIP */}
            <div className="relative z-10 border-b border-slate-200/60 bg-white/40 backdrop-blur-sm">
                <header className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 shadow-sm transition-all hover:border-slate-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            PayFlux Diagnostic Infrastructure
                        </div>
                        <h1 className="mt-8 text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[0.9]">
                            Retry Storm <span className="text-slate-400">Analyzer.</span>
                        </h1>
                        <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl font-medium leading-relaxed">
                            A technical diagnostic instrument to detect retry amplification, systemic waste, and processor exposure in minutes.
                        </p>
                        <div className="mt-8 flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">
                            <span className="flex items-center gap-2"><Shield size={12} className="text-emerald-500" /> Runs Locally</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className="flex items-center gap-2">Zero Data Retention</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className="flex items-center gap-2">No Uploads</span>
                        </div>
                    </div>
                </header>
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 space-y-24">
                {/* INPUT SECTION */}
                <section className="bg-white border border-slate-200 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden max-w-5xl mx-auto">
                    <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        JSON Event Stream
                    </div>
                    <div className="p-8 md:p-10">
                        <textarea
                            value={inputData}
                            onChange={(e) => setInputData(e.target.value)}
                            className="w-full h-72 p-6 bg-slate-50/50 border border-slate-200 rounded-2xl font-mono text-[13px] leading-relaxed outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/40 transition-all placeholder:text-slate-300"
                            placeholder='{ "events": [...] }'
                        />
                        {error && (
                            <div className="mt-6 p-4 bg-red-50 text-red-600 text-[13px] rounded-xl border border-red-100 flex items-center gap-3 font-medium">
                                <Info size={16} /> {error}
                            </div>
                        )}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                            <div className="text-xs text-slate-500 leading-relaxed font-medium">
                                <div className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 mb-2">Privacy & Context</div>
                                Analysis is performed locally in-memory. <span className="font-bold text-slate-900 underline decoration-indigo-200 underline-offset-2">No data is transmitted</span> to PayFlux servers or stored permanently.
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                                <button
                                    onClick={() => setInputData(JSON.stringify(SAMPLE_JSON, null, 2))}
                                    className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors py-2 px-4"
                                >
                                    Load Storm Sample
                                </button>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 active:scale-95"
                                >
                                    {isAnalyzing ? <Loader2 size={16} className="animate-spin text-white/50" /> : <Zap size={14} />}
                                    Run Diagnostic
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {results && (
                    <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* RESULTS HEADER */}
                        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500 flex items-center gap-3">
                                    <BarChart3 size={16} strokeWidth={2.5} /> Live Diagnostic Summary
                                </h3>
                                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                                    Separating <span className="text-slate-900 font-bold">Observed Window Waste</span> from systemic exposure.
                                </p>
                            </div>
                            <div className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.25em] border-2 shadow-sm ${results.risk === 'HIGH'
                                ? 'bg-red-50 text-red-700 border-red-100'
                                : results.risk === 'MEDIUM'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}>
                                Risk Class: {results.risk}
                            </div>
                        </div>

                        {/* INSTRUMENT PANEL GRID */}
                        <div className="max-w-5xl mx-auto space-y-12">
                            {/* EXPOSURE CALLOUT (MOST IMPORTANT) */}
                            <div className={`group relative rounded-[32px] border p-8 md:p-12 shadow-2xl transition-all ${results.monthlyProjectionUsd > 5000
                                ? 'bg-[#0F172A] border-red-500/20'
                                : 'bg-white border-slate-200'
                                }`}>
                                <div className="flex flex-col md:flex-row items-start justify-between gap-10">
                                    <div className="flex-grow">
                                        <div className={`text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-3 mb-6 ${results.monthlyProjectionUsd > 5000 ? 'text-red-400' : 'text-indigo-500'}`}>
                                            <span className={`h-2.5 w-2.5 rounded-full ${results.monthlyProjectionUsd > 5000 ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-indigo-500'}`} />
                                            Systemic 30-Day Exposure
                                        </div>
                                        <div className={`text-6xl md:text-8xl font-black tracking-tighter mb-6 ${results.monthlyProjectionUsd > 5000 ? 'text-white' : 'text-slate-900'}`}>
                                            <span className="font-mono">${results.monthlyProjectionUsd.toLocaleString()}</span>
                                        </div>
                                        <p className={`text-sm md:text-base leading-relaxed max-w-xl font-medium ${results.monthlyProjectionUsd > 5000 ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Projected operational burn if this retry behavior persists. Calculated at <span className={results.monthlyProjectionUsd > 5000 ? 'text-white' : 'text-slate-900'}>${results.costPerAttemptUsd.toFixed(2)}</span> unit cost per redundant attempt.
                                        </p>
                                        {results.monthlyProjectionUsd > 5000 && (
                                            <div className="mt-8 inline-flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-inner">
                                                <Zap size={14} /> Immediate Governance Recommended
                                            </div>
                                        )}
                                    </div>

                                    <div className={`rounded-2xl border p-6 min-w-[240px] space-y-4 ${results.monthlyProjectionUsd > 5000 ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-60">Sample Physics</div>
                                        <div className="space-y-4 pt-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[11px] font-bold ${results.monthlyProjectionUsd > 5000 ? 'text-slate-300' : 'text-slate-600'}`}>Window</span>
                                                <span className={`text-xs font-mono font-bold ${results.monthlyProjectionUsd > 5000 ? 'text-white' : 'text-slate-900'}`}>{results.windowDurationMinutes}m</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[11px] font-bold ${results.monthlyProjectionUsd > 5000 ? 'text-slate-300' : 'text-slate-600'}`}>Scale Factor</span>
                                                <span className={`text-xs font-mono font-bold ${results.monthlyProjectionUsd > 5000 ? 'text-white' : 'text-slate-900'}`}>{results.scaleFactor.toLocaleString()}×</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECONDARY METRICS GROUP */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <MetricCard label="Amplification" value={`${results.ratio}x`} caption="Total attempts generated per individual failure incident." />
                                <MetricCard label="Redundant Calls" value={results.redundantCalls.toLocaleString()} caption="Total wasted infrastructure calls within observed window." />
                                <MetricCard label="Peak Burst" value={results.clusterSize} caption="Maximum event density observed in a 30s window." />
                            </div>
                        </div>

                        {/* DISCLOSURE */}
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-[11px] text-slate-500 flex items-start gap-4 font-medium leading-relaxed">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-400"><Info size={16} /></div>
                                <p>
                                    <span className="font-bold text-slate-900 uppercase tracking-tighter mr-2">Methodology Note:</span>
                                    Exposure is a directional linear extrapolation. It does not account for seasonality, circuit-breaking countermeasures, or processor-side throttling. Use this as a diagnostic indicator for internal governance, not a financial forecast.
                                </p>
                            </div>
                        </div>

                        {/* TIMELINE & INTERPRETATION */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-5xl mx-auto">
                            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[32px] p-10 shadow-sm overflow-hidden flex flex-col">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">Density Timeline</h4>
                                        <div className="mt-4 flex items-center gap-6 text-[10px] font-black tracking-widest text-slate-400">
                                            <span className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" /> Burst Phase
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" /> Stable
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-grow flex flex-col min-h-[300px]">
                                    <TimelineChart data={results.timeline} />
                                    <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between px-6 text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                                        <span>Start: {results.timeline[0]?.time}</span>
                                        <span>Mid-Window</span>
                                        <span>End: {results.timeline[results.timeline.length - 1]?.time}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-10 shadow-2xl flex flex-col space-y-10 overflow-hidden relative">
                                {/* SUBTLE GRABBER */}
                                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>

                                <div className="space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">Heuristic Engine</div>
                                    <h4 className="text-xl font-black text-white tracking-tight uppercase">Interpretation</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium pt-2">{results.interpretation.summary}</p>
                                </div>

                                <div className="space-y-4 py-8 border-y border-slate-800">
                                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Classification logic</div>
                                    <h5 className="text-white font-bold text-xs uppercase tracking-widest">Why {results.risk}?</h5>
                                    <p className="text-[13px] text-slate-400 leading-relaxed italic">{results.interpretation.riskExplanation}</p>
                                </div>

                                <div className="space-y-6 pt-2">
                                    <div>
                                        <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Probable Vectors</h6>
                                        <ul className="space-y-3">
                                            {results.interpretation.causes.map((c, i) => (
                                                <li key={i} className="flex gap-3 text-[13px] text-slate-300">
                                                    <span className="text-indigo-500 mt-1">•</span>
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA PANEL */}
                        <div className="max-w-5xl mx-auto">
                            <div className="relative group rounded-[40px] border border-slate-200 bg-white p-10 md:p-14 shadow-[0_10px_50px_rgba(0,0,0,0.03)] overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 blur-[100px] rounded-full pointer-events-none group-hover:bg-indigo-100/50 transition-colors duration-700"></div>

                                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12">
                                    <div className="max-w-2xl">
                                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-6 flex items-center gap-3">
                                            <span className="h-1 w-8 bg-indigo-500 rounded-full" /> Proactive Governance
                                        </div>
                                        <h4 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-[1.05]">
                                            Monitor retry amplification <span className="text-slate-400 text-2xl md:text-3xl font-bold block mt-2 tracking-tight">Before processors do.</span>
                                        </h4>
                                        <p className="mt-8 text-lg text-slate-500 font-medium leading-relaxed">
                                            Export results for institutional stakeholders or subscribe to health alerts to catch storms before they trigger risk models.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-5">
                                        <button
                                            className="group flex items-center justify-center gap-4 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all hover:-translate-y-1 active:scale-95 whitespace-nowrap"
                                        >
                                            <Mail size={16} /> Get Health Alerts
                                        </button>
                                        <button
                                            onClick={() => downloadJSONReport(results)}
                                            className="flex items-center justify-center gap-4 px-10 py-5 bg-white border border-slate-200 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-300 transition-all hover:shadow-lg active:scale-95 whitespace-nowrap"
                                        >
                                            <Download size={16} className="text-slate-400" /> Export JSON Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-12 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] opacity-60">
                                Engineering diagnostics for durable payment infrastructure
                            </p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default RetryStormAnalyzer;

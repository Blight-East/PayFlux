import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Shield, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';
import { logMarketingEvent, buildScanUrl } from '../lib/tracking';
import {
    calculatePayoutDelay,
    formatCurrency,
    generateInterpretation,
    generateOperationalImpact,
} from '../lib/payoutDelayLogic';

const SOURCE_PAGE = 'payout_delay_cost_calculator';
const TOOL_NAME = 'payout_delay_calculator';

const RELATED_PAGES = [
    { to: '/tools/reserve-impact-calculator', label: 'Reserve Impact Calculator' },
    { to: '/tools/processor-warning-email-decoder', label: 'Processor Warning Email Decoder' },
    { to: '/processor-risk-intelligence', label: 'How Processors Evaluate Merchant Risk' },
    { to: '/reliability', label: 'Reliability' },
    { to: '/security', label: 'Security' },
];

function salesBand(v) {
    if (v <= 1000) return 'under_1k';
    if (v <= 5000) return '1k_5k';
    if (v <= 10000) return '5k_10k';
    if (v <= 50000) return '10k_50k';
    return 'over_50k';
}

function delayBand(d) {
    if (d <= 1) return '1_day';
    if (d <= 3) return '2_3_days';
    if (d <= 5) return '4_5_days';
    return 'over_5_days';
}

const PayoutDelayCostCalculator = () => {
    const [dailySales, setDailySales] = useState('');
    const [normalTiming, setNormalTiming] = useState('');
    const [delayedTiming, setDelayedTiming] = useState('');
    const [weeklyPayroll, setWeeklyPayroll] = useState('');
    const [weeklyInventory, setWeeklyInventory] = useState('');
    const [weeklyAdSpend, setWeeklyAdSpend] = useState('');
    const [results, setResults] = useState(null);
    const [hasCalculated, setHasCalculated] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = 'Payout Delay Cost Calculator – PayFlux';
        const link =
            document.querySelector("link[rel='canonical']") ||
            document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute(
            'href',
            'https://payflux.dev/tools/payout-delay-cost-calculator'
        );
        if (!link.parentNode) document.head.appendChild(link);

        logMarketingEvent('tool_page_viewed', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
        });

        return () => {
            if (link.parentNode) link.parentNode.removeChild(link);
        };
    }, []);

    const handleCalculate = () => {
        setError('');

        logMarketingEvent('tool_calculation_submitted', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
        });

        const sales = parseFloat(dailySales);
        const normal = parseFloat(normalTiming);
        const delayed = parseFloat(delayedTiming);

        if (!sales || sales <= 0) {
            setError('Enter an average daily sales amount greater than zero.');
            return;
        }
        if (normal == null || isNaN(normal) || normal < 0) {
            setError('Enter your normal payout timing (e.g. 2 for T+2).');
            return;
        }
        if (!delayed || delayed <= 0) {
            setError('Enter the delayed payout timing (e.g. 5 for T+5).');
            return;
        }
        if (delayed <= normal) {
            setError('Delayed timing must be greater than normal timing.');
            return;
        }

        const calc = calculatePayoutDelay({
            dailySales: sales,
            normalTiming: normal,
            delayedTiming: delayed,
            weeklyPayroll: parseFloat(weeklyPayroll) || 0,
            weeklyInventory: parseFloat(weeklyInventory) || 0,
            weeklyAdSpend: parseFloat(weeklyAdSpend) || 0,
        });

        setResults(calc);
        setHasCalculated(true);

        const delayDays = delayed - normal;
        logMarketingEvent('tool_calculation_completed', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
            sales_band: salesBand(sales),
            delay_band: delayBand(delayDays),
            has_obligations: (parseFloat(weeklyPayroll) || parseFloat(weeklyInventory) || parseFloat(weeklyAdSpend)) ? 'yes' : 'no',
        });
    };

    const handleScanClick = (cta) => {
        logMarketingEvent('tool_scan_cta_clicked', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
            cta,
            destination: 'https://app.payflux.dev/scan',
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 antialiased">
            <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,255,0.12)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(148,163,184,0.12)_0,_transparent_50%)]" />

            <div className="relative z-10 flex min-h-screen flex-col">
                {/* Nav */}
                <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
                    <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-950">
                                <Clock size={18} className="text-slate-200" />
                            </div>
                            <div>
                                <Link
                                    to="/"
                                    className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    PayFlux
                                </Link>
                                <div className="text-[11px] text-slate-500">
                                    Payout Delay Cost Calculator
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                            <div className="hidden items-center gap-2 sm:flex">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Runs locally
                            </div>
                            <a
                                href="https://app.payflux.dev"
                                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[11px] font-medium text-slate-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-900 transition-colors"
                            >
                                Dashboard
                            </a>
                        </div>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-10">
                    {/* Hero */}
                    <section className="max-w-2xl space-y-4">
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                            Payout Delay Cost Calculator
                        </h1>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Estimate how much cash a payout slowdown could hold up — and what
                            that means for your weekly obligations and operating cushion.
                        </p>
                        <p className="text-xs leading-relaxed text-slate-500">
                            Everything runs in your browser. No data leaves your device.
                        </p>
                    </section>

                    {/* Calculator form */}
                    <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/70">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-slate-300" />
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Payout inputs
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-5 p-5 sm:grid-cols-3">
                            {/* Daily sales */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Average Daily Sales ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={dailySales}
                                    onChange={(e) => setDailySales(e.target.value)}
                                    placeholder="10000"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>

                            {/* Normal timing */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Normal Payout Timing (T+)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={normalTiming}
                                    onChange={(e) => setNormalTiming(e.target.value)}
                                    placeholder="2"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>

                            {/* Delayed timing */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Delayed Payout Timing (T+)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={delayedTiming}
                                    onChange={(e) => setDelayedTiming(e.target.value)}
                                    placeholder="5"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>
                        </div>

                        {/* Optional obligations */}
                        <div className="border-t border-slate-800/60 px-5 py-3">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Weekly obligations
                                <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-600">(optional)</span>
                            </span>
                        </div>
                        <div className="grid gap-5 px-5 pb-5 sm:grid-cols-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Weekly Payroll ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={weeklyPayroll}
                                    onChange={(e) => setWeeklyPayroll(e.target.value)}
                                    placeholder="15000"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Weekly Inventory / Vendors ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={weeklyInventory}
                                    onChange={(e) => setWeeklyInventory(e.target.value)}
                                    placeholder="8000"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Weekly Ad Spend ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={weeklyAdSpend}
                                    onChange={(e) => setWeeklyAdSpend(e.target.value)}
                                    placeholder="3000"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-950/60 px-3 py-2.5 text-[11px] text-red-200">
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4">
                            <p className="max-w-sm text-[11px] leading-relaxed text-slate-500">
                                Payout timing is expressed in business days (T+N). Actual
                                settlement mechanics vary by processor.
                            </p>
                            <button
                                onClick={handleCalculate}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#0A64BC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#08539e]"
                            >
                                Calculate Impact
                            </button>
                        </div>
                    </section>

                    {/* Results */}
                    {hasCalculated && results && (
                        <section className="flex flex-col gap-6 animate-in">
                            {/* Metric cards */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <MetricCard
                                    label="Estimated Cash Delayed"
                                    value={formatCurrency(results.cashDelayed)}
                                    caption={`${results.delayDays} extra day${results.delayDays !== 1 ? 's' : ''} of sales revenue sitting in transit`}
                                    highlight
                                />
                                <MetricCard
                                    label="Additional Days Waiting"
                                    value={`${results.delayDays} day${results.delayDays !== 1 ? 's' : ''}`}
                                    caption={`From T+${results.normalTiming} to T+${results.delayedTiming}`}
                                />
                                <MetricCard
                                    label="Daily Sales Volume"
                                    value={formatCurrency(results.dailySales)}
                                    caption="Average daily revenue used in this estimate"
                                />
                            </div>

                            {/* Obligation comparisons */}
                            {results.obligations.length > 0 && (
                                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-5">
                                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        How the Delay Compares to Your Obligations
                                    </h3>
                                    <div className="flex flex-col gap-3">
                                        {results.obligations.map((ob, i) => (
                                            <div key={i} className="flex flex-col gap-1 rounded-lg border border-slate-800/40 bg-slate-950/30 px-4 py-3">
                                                <div className="flex items-baseline justify-between">
                                                    <span className="text-xs font-medium text-slate-300">{ob.label}</span>
                                                    <span className="font-mono text-sm font-semibold text-slate-100">{formatCurrency(ob.amount)}/wk</span>
                                                </div>
                                                <p className="text-[11px] leading-relaxed text-slate-400">{ob.coverage}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Plain-English explanation */}
                            <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 px-5 py-5">
                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    What This Means
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {generateInterpretation(results).map((line, i) => (
                                        <p key={i} className="text-sm leading-relaxed text-slate-300">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Operational impact */}
                            <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-5">
                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    What This Can Mean Operationally
                                </h3>
                                <ul className="ml-4 flex flex-col gap-2 list-disc">
                                    {generateOperationalImpact(results).map((item, i) => (
                                        <li key={i} className="text-sm leading-relaxed text-slate-300">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Suggested next step */}
                            <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-5">
                                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Suggested Next Step
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-300">
                                    A payout slowdown on its own may be temporary. What matters is
                                    whether it is an isolated change or part of a broader pattern —
                                    reserves increasing, documentation requests arriving, or dispute
                                    ratios climbing at the same time. A free scan can show you where
                                    your risk signals stand right now so you know whether this delay
                                    is likely to stay, get worse, or resolve.
                                </p>
                            </div>

                            {/* Scan CTA */}
                            <div className="mt-2 flex flex-col items-center gap-4 rounded-xl border border-[#0A64BC]/30 bg-[#0A64BC]/5 px-6 py-8 text-center">
                                <Shield size={28} className="text-[#0A64BC]" />
                                <h3 className="text-lg font-semibold text-slate-50">
                                    Check your risk signals with a free scan
                                </h3>
                                <p className="max-w-md text-sm text-slate-400">
                                    A free scan checks your key processor risk indicators and shows
                                    you whether this payout delay is likely part of a broader pattern.
                                </p>
                                <a
                                    href={buildScanUrl(SOURCE_PAGE, 'calculator_result_cta')}
                                    onClick={() => handleScanClick('calculator_result_cta')}
                                    className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-7 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#08539e]"
                                >
                                    Run a Free Scan
                                </a>
                            </div>
                        </section>
                    )}

                    {/* Related pages */}
                    <section className="border-t border-slate-800/60 pt-8">
                        <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Related reading
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {RELATED_PAGES.map((page) => (
                                <Link
                                    key={page.to}
                                    to={page.to}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800/60 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
                                >
                                    {page.label}
                                    <ChevronRight size={14} className="text-slate-600" />
                                </Link>
                            ))}
                        </div>
                    </section>
                </main>

                <Footer />
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, caption, highlight }) => (
    <div
        className={`relative overflow-hidden rounded-xl border bg-slate-950/5 p-4 sm:p-5 transition-colors ${
            highlight ? 'border-sky-500/40 bg-sky-500/5' : 'border-slate-800/40'
        }`}
    >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
        </span>
        <div className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">
            <span className="font-mono">{value}</span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{caption}</p>
    </div>
);

export default PayoutDelayCostCalculator;

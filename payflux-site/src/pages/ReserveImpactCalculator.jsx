import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Shield, ChevronRight } from 'lucide-react';
import Footer from '../components/Footer';
import { logMarketingEvent, buildScanUrl } from '../lib/tracking';
import {
    calculateReserveImpact,
    formatCurrency,
    generateInterpretation,
    generateOperationalImpact,
} from '../lib/calculatorLogic';

const SOURCE_PAGE = 'reserve_impact_calculator';
const TOOL_NAME = 'reserve_calculator';

const RELATED_PAGES = [
    { to: '/tools/processor-warning-email-decoder', label: 'Processor Warning Email Decoder' },
    { to: '/processor-risk-intelligence', label: 'How Processors Evaluate Merchant Risk' },
    { to: '/deterministic-risk-scoring', label: 'Deterministic Risk Scoring' },
    { to: '/reliability', label: 'Reliability' },
    { to: '/security', label: 'Security' },
];

/**
 * Classify input into a band for telemetry without logging raw values.
 */
function volumeBand(v) {
    if (v <= 10000) return 'under_10k';
    if (v <= 50000) return '10k_50k';
    if (v <= 250000) return '50k_250k';
    if (v <= 1000000) return '250k_1m';
    return 'over_1m';
}

function reserveBand(p) {
    if (p <= 5) return '0_5';
    if (p <= 10) return '5_10';
    if (p <= 15) return '10_15';
    return 'over_15';
}

const ReserveImpactCalculator = () => {
    const [monthlyVolume, setMonthlyVolume] = useState('');
    const [reservePercent, setReservePercent] = useState('');
    const [duration, setDuration] = useState('');
    const [durationUnit, setDurationUnit] = useState('months');
    const [payoutCadence, setPayoutCadence] = useState('');
    const [results, setResults] = useState(null);
    const [hasCalculated, setHasCalculated] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.title = 'Reserve Impact Calculator – PayFlux';
        const link =
            document.querySelector("link[rel='canonical']") ||
            document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute(
            'href',
            'https://payflux.dev/tools/reserve-impact-calculator'
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

        const vol = parseFloat(monthlyVolume);
        const pct = parseFloat(reservePercent);
        const dur = parseFloat(duration);

        if (!vol || vol <= 0) {
            setError('Enter a monthly processing volume greater than zero.');
            return;
        }
        if (!pct || pct <= 0 || pct > 100) {
            setError('Enter a reserve percentage between 0 and 100.');
            return;
        }
        if (!dur || dur <= 0) {
            setError('Enter a reserve duration greater than zero.');
            return;
        }

        const calc = calculateReserveImpact({
            monthlyVolume: vol,
            reservePercent: pct,
            duration: dur,
            durationUnit,
            payoutCadence,
        });

        setResults(calc);
        setHasCalculated(true);

        logMarketingEvent('tool_calculation_completed', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
            volume_band: volumeBand(vol),
            reserve_band: reserveBand(pct),
            duration_unit: durationUnit,
            has_payout_cadence: payoutCadence ? 'yes' : 'no',
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
                                <Calculator size={18} className="text-slate-200" />
                            </div>
                            <div>
                                <Link
                                    to="/"
                                    className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    PayFlux
                                </Link>
                                <div className="text-[11px] text-slate-500">
                                    Reserve Impact Calculator
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
                            Reserve Impact Calculator
                        </h1>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Estimate how much cash a processor reserve or funds hold could tie
                            up and what that means for your operating cash flow.
                        </p>
                        <p className="text-xs leading-relaxed text-slate-500">
                            Everything runs in your browser. No data leaves your device.
                        </p>
                    </section>

                    {/* Calculator form */}
                    <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/70">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Calculator size={14} className="text-slate-300" />
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Reserve inputs
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-5 p-5 sm:grid-cols-2">
                            {/* Monthly volume */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Monthly Processing Volume ($)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={monthlyVolume}
                                    onChange={(e) => setMonthlyVolume(e.target.value)}
                                    placeholder="100000"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>

                            {/* Reserve percentage */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Reserve Percentage (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={reservePercent}
                                    onChange={(e) => setReservePercent(e.target.value)}
                                    placeholder="10"
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                />
                            </div>

                            {/* Duration + unit */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Reserve Duration
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        placeholder="6"
                                        className="flex-1 rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                    />
                                    <select
                                        value={durationUnit}
                                        onChange={(e) => setDurationUnit(e.target.value)}
                                        className="rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                    >
                                        <option value="months">Months</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                            </div>

                            {/* Payout cadence (optional) */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-slate-400">
                                    Average Payout Cadence
                                    <span className="ml-1 text-slate-600">(optional)</span>
                                </label>
                                <select
                                    value={payoutCadence}
                                    onChange={(e) => setPayoutCadence(e.target.value)}
                                    className="rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                >
                                    <option value="">— Select —</option>
                                    <option value="daily">Daily</option>
                                    <option value="every_2_days">Every 2 days</option>
                                    <option value="weekly">Weekly</option>
                                </select>
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
                                Estimates use a 30-day month assumption. Actual reserve
                                mechanics vary by processor.
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
                                    label="Estimated Funds Tied Up"
                                    value={formatCurrency(results.totalTiedUp)}
                                    caption={`Over a ${results.durationInMonths <= 1 ? Math.round(results.durationInDays) + '-day' : Math.round(results.durationInMonths) + '-month'} hold period`}
                                    highlight
                                />
                                <MetricCard
                                    label="Held Per Month"
                                    value={formatCurrency(results.heldPerMonth)}
                                    caption={`${results.reservePercent}% of ${formatCurrency(results.monthlyVolume)} monthly volume`}
                                />
                                <MetricCard
                                    label="Share of Monthly Volume"
                                    value={`${results.reserveShareOfVolume.toFixed(1)}%`}
                                    caption="Total reserve as a proportion of one month's processing"
                                />
                            </div>

                            {/* Payout cadence card */}
                            {results.payoutCycleLabel && (
                                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-4">
                                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        Per Payout Cycle
                                    </h4>
                                    <p className="text-sm leading-relaxed text-slate-300">
                                        With payouts every {results.payoutCycleLabel}, roughly{' '}
                                        <span className="font-semibold text-slate-100">
                                            {formatCurrency(results.heldPerPayoutCycle)}
                                        </span>{' '}
                                        per cycle goes to the reserve instead of your bank account.
                                    </p>
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
                                    A reserve on its own is a standard processor risk measure. What matters is
                                    whether it is stable or getting worse — and whether other signals like payout
                                    delays, documentation requests, or rising disputes are appearing alongside it.
                                    A free scan can show you where your risk signals stand right now so you know
                                    whether this reserve is likely to stay, grow, or resolve.
                                </p>
                            </div>

                            {/* Scan CTA */}
                            <div className="mt-2 flex flex-col items-center gap-4 rounded-xl border border-[#0A64BC]/30 bg-[#0A64BC]/5 px-6 py-8 text-center">
                                <Shield size={28} className="text-[#0A64BC]" />
                                <h3 className="text-lg font-semibold text-slate-50">
                                    See where your risk signals stand right now
                                </h3>
                                <p className="max-w-md text-sm text-slate-400">
                                    A free scan checks your key processor risk indicators and shows
                                    you whether your reserve is likely part of a broader pattern.
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

export default ReserveImpactCalculator;

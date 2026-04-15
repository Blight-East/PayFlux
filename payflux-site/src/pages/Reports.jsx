import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Footer from '../components/Footer';

const API_BASE = 'https://api.payflux.dev';

const riskColors = {
    critical: 'text-red-400 border-red-500/30 bg-red-500/[0.08]',
    high: 'text-[#E0923F] border-[#BC620A]/40 bg-[#BC620A]/[0.08]',
    medium: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/[0.06]',
    low: 'text-slate-400 border-white/10 bg-white/[0.03]',
};

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'Intelligence Desk | PayFlux';

        fetch(`${API_BASE}/intelligence/reports`)
            .then(res => res.json())
            .then(data => {
                setReports(data.reports || []);
                setLoading(false);
            })
            .catch(() => {
                setError('Unable to load filings');
                setLoading(false);
            });
    }, []);

    const formatFilingDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}\u2013${String(d.getMonth() + 1).padStart(2, '0')}\u2013${String(d.getDate()).padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-[#0A0B0E] font-sans text-[#A1A7B3] selection:bg-[#0A64BC]/30 selection:text-white">
            {/* ————— NAV ————— */}
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#0A0B0E]/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-6 md:px-8">
                    <Link to="/" className="flex items-center gap-2.5 no-underline">
                        <span className="block h-5 w-5 bg-[#0A64BC]" aria-hidden />
                        <span className="text-[15px] font-semibold tracking-tight text-white">PayFlux</span>
                        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872] md:inline">
                            Intelligence Desk
                        </span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link
                            to="/"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#636872] no-underline hover:text-white"
                        >
                            Home
                        </Link>
                        <Link
                            to="/pricing"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#636872] no-underline hover:text-white"
                        >
                            Pricing
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-[960px] px-6 pt-28 pb-24 md:px-8 md:pt-32">
                {/* ————— HEADER ————— */}
                <div className="mb-14">
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A64BC]">
                        Intelligence Desk
                    </div>
                    <h1 className="mt-4 text-[32px] font-semibold tracking-tight leading-[1.1] text-white md:text-[40px]">
                        Filings
                    </h1>
                    <p className="mt-5 max-w-[620px] text-[15px] leading-relaxed text-[#A1A7B3]">
                        Automated market intelligence derived from real-time payment processor distress signals. Each filing is a record: what changed, why it matters, what to do next. Refreshed every six hours.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.06] pt-6">
                        <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Cadence</div>
                            <div className="mt-1.5 font-mono text-[14px] text-white tabular-nums">06h</div>
                        </div>
                        <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">On File</div>
                            <div className="mt-1.5 font-mono text-[14px] text-white tabular-nums">
                                {loading ? '—' : String(reports.length).padStart(2, '0')}
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Source</div>
                            <div className="mt-1.5 font-mono text-[14px] text-white">Stripe · Adyen · Braintree</div>
                        </div>
                    </div>
                </div>

                {/* ————— STATE: LOADING ————— */}
                {loading && (
                    <div className="border-t border-white/[0.06] py-24 text-center">
                        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#636872]">
                            Loading filings…
                        </div>
                    </div>
                )}

                {/* ————— STATE: ERROR ————— */}
                {error && (
                    <div className="border-t border-white/[0.06] py-24 text-center">
                        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#BC620A]">
                            {error}
                        </div>
                    </div>
                )}

                {/* ————— STATE: EMPTY ————— */}
                {!loading && !error && reports.length === 0 && (
                    <div className="border-t border-white/[0.06] py-24 text-center">
                        <FileText className="mx-auto mb-5 h-8 w-8 text-[#636872]" />
                        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-white">
                            No filings on record
                        </div>
                        <div className="mt-3 text-[13px] text-[#636872]">
                            Filings are published when material distress patterns emerge.
                        </div>
                    </div>
                )}

                {/* ————— FILING TABLE ————— */}
                {!loading && !error && reports.length > 0 && (
                    <div className="border-t border-white/[0.10]">
                        <div className="hidden grid-cols-[120px_1fr_120px_120px] gap-6 border-b border-white/[0.06] py-3 md:grid">
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Filed</div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Title</div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Processor</div>
                            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-right text-[#636872]">Severity</div>
                        </div>

                        <div>
                            {reports.map((report) => (
                                <Link
                                    key={report.slug}
                                    to={`/reports/${report.slug}`}
                                    className="filing-row group block border-b border-white/[0.06] no-underline"
                                >
                                    <article className="grid grid-cols-1 gap-3 px-1 py-5 md:grid-cols-[120px_1fr_120px_120px] md:items-baseline md:gap-6">
                                        {/* Date */}
                                        <div className="font-mono text-[12px] tracking-[0.05em] text-[#636872] tabular-nums md:text-[13px]">
                                            {formatFilingDate(report.created_at)}
                                        </div>

                                        {/* Title + deck */}
                                        <div>
                                            <h2 className="text-[15px] font-medium leading-snug text-white transition-colors group-hover:text-[#0A64BC] md:text-[16px]">
                                                {report.title}
                                            </h2>
                                            {report.executive_summary && (
                                                <p className="mt-1 text-[13px] leading-relaxed text-[#636872] line-clamp-1">
                                                    {report.executive_summary}
                                                </p>
                                            )}
                                            {report.industry && (
                                                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">
                                                    {report.industry}
                                                </div>
                                            )}
                                        </div>

                                        {/* Processor */}
                                        <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#A1A7B3] md:text-[12px]">
                                            {report.processor || '—'}
                                        </div>

                                        {/* Severity */}
                                        <div className="md:text-right">
                                            {report.risk_level ? (
                                                <span className={`severity-pill ${riskColors[report.risk_level] || riskColors.low}`}>
                                                    {report.risk_level}
                                                </span>
                                            ) : (
                                                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#636872]">—</span>
                                            )}
                                        </div>
                                    </article>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer variant="dark" />
        </div>
    );
};

export default Reports;

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';

const API_BASE = 'https://api.payflux.dev';

const riskColors = {
    critical: 'text-red-400 border-red-500/30 bg-red-500/[0.08]',
    high: 'text-[#E0923F] border-[#BC620A]/40 bg-[#BC620A]/[0.08]',
    medium: 'text-yellow-300 border-yellow-500/30 bg-yellow-500/[0.06]',
    low: 'text-slate-400 border-white/10 bg-white/[0.03]',
};

const ReportDetail = () => {
    const { slug } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`${API_BASE}/intelligence/reports/${slug}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError('Filing not found');
                } else {
                    setReport(data.report);
                    document.title = `${data.report.title} | PayFlux Intelligence Desk`;
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Unable to load filing');
                setLoading(false);
            });
    }, [slug]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}\u2013${String(d.getMonth() + 1).padStart(2, '0')}\u2013${String(d.getDate()).padStart(2, '0')}`;
    };

    const renderContent = (content) => {
        if (!content) return null;
        const sections = content.split(/^## /m).filter(Boolean);

        return sections.map((section, i) => {
            const lines = section.split('\n');
            const heading = lines[0].trim();
            const body = lines.slice(1).join('\n').trim();

            return (
                <section key={i} className="mb-14">
                    <div className="dateline mb-4 text-[#0A64BC]">
                        {heading}
                    </div>
                    <div className="text-[16px] leading-[1.75] text-[#D4D7DE] whitespace-pre-line">
                        {body}
                    </div>
                </section>
            );
        });
    };

    const navBar = (
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
                        to="/reports"
                        className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#636872] no-underline hover:text-white"
                    >
                        All filings
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
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0B0E] font-sans text-[#A1A7B3]">
                {navBar}
                <main className="mx-auto max-w-[720px] px-6 pt-40 md:px-8">
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#636872]">
                        Loading filing…
                    </div>
                </main>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-[#0A0B0E] font-sans text-[#A1A7B3]">
                {navBar}
                <main className="mx-auto max-w-[720px] px-6 pt-40 md:px-8">
                    <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#BC620A]">
                        {error || 'Filing not found'}
                    </div>
                    <Link
                        to="/reports"
                        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A64BC] no-underline hover:text-white"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        Back to filings
                    </Link>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0B0E] font-sans text-[#A1A7B3]">
            {navBar}

            <main className="mx-auto max-w-[720px] px-6 pt-28 pb-24 md:px-8 md:pt-32">
                {/* Back link */}
                <Link
                    to="/reports"
                    className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#636872] no-underline transition-colors hover:text-white"
                >
                    <ArrowLeft className="h-3 w-3" />
                    All filings
                </Link>

                {/* ————— MASTHEAD ————— */}
                <header className="mt-10 border-t border-white/[0.06] pt-10">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="dateline text-[#0A64BC]">PayFlux Filing</span>
                        <span className="h-3 w-px bg-white/10" />
                        <span className="dateline text-[#636872] tabular-nums">
                            {formatDate(report.created_at)}
                        </span>
                    </div>

                    <h1 className="mt-6 text-[32px] font-semibold leading-[1.1] tracking-tight text-white md:text-[42px]">
                        {report.title}
                    </h1>

                    {/* Filing metadata table */}
                    <dl className="mt-10 grid gap-x-8 gap-y-5 border-y border-white/[0.06] py-6 md:grid-cols-4">
                        <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Severity</dt>
                            <dd className="mt-2">
                                {report.risk_level ? (
                                    <span className={`severity-pill ${riskColors[report.risk_level] || riskColors.low}`}>
                                        {report.risk_level}
                                    </span>
                                ) : (
                                    <span className="font-mono text-[12px] text-[#636872]">—</span>
                                )}
                            </dd>
                        </div>
                        {report.processor && (
                            <div>
                                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Processor</dt>
                                <dd className="mt-2 font-mono text-[13px] text-white">{report.processor}</dd>
                            </div>
                        )}
                        {report.industry && (
                            <div>
                                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Industry</dt>
                                <dd className="mt-2 font-mono text-[13px] text-white">{report.industry}</dd>
                            </div>
                        )}
                        {report.cluster_size && (
                            <div>
                                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872]">Signals</dt>
                                <dd className="mt-2 font-mono text-[13px] text-white tabular-nums">
                                    {report.cluster_size}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {report.executive_summary && (
                        <div className="mt-10 border-l-2 border-[#0A64BC] pl-6">
                            <div className="dateline mb-3 text-[#636872]">Lede</div>
                            <p className="text-[18px] leading-[1.7] text-white">
                                {report.executive_summary}
                            </p>
                        </div>
                    )}
                </header>

                {/* ————— BODY ————— */}
                <article className="mt-16 editorial-drop">
                    {renderContent(report.content)}
                </article>

                {/* ————— COLOPHON / CTA ————— */}
                <div className="mt-16 border-t border-white/[0.06] pt-10">
                    <div className="dateline text-[#0A64BC]">
                        Protect Your Revenue
                    </div>
                    <h3 className="mt-4 text-[24px] font-semibold leading-tight text-white">
                        PayFlux files these records for your merchant account, too.
                    </h3>
                    <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-[#A1A7B3]">
                        Connect Stripe read-only. Observe payout cadence, reserve pressure, and account-review signals. Receive a filing when something moves — before it hits your cash flow.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link
                            to="/pricing"
                            className="inline-flex items-center justify-center rounded-md bg-[#0A64BC] px-6 py-3 text-[14px] font-medium text-white no-underline transition-colors hover:bg-[#08539E]"
                        >
                            View pricing
                        </Link>
                        <Link
                            to="/reports"
                            className="inline-flex items-center justify-center rounded-md border border-white/[0.12] px-6 py-3 text-[14px] font-medium text-white no-underline transition-colors hover:border-white/[0.24]"
                        >
                            Read more filings
                        </Link>
                    </div>
                </div>

                {/* ————— FOOT TAG ————— */}
                <div className="mt-14 flex items-center justify-between border-t border-white/[0.06] pt-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#636872]">
                        PayFlux Intelligence Desk &middot; Automated Market Analysis
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#636872] tabular-nums">
                        {formatDate(report.created_at)}
                    </div>
                </div>
            </main>

            <Footer variant="dark" />
        </div>
    );
};

export default ReportDetail;

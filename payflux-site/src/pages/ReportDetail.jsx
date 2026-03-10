import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import Footer from '../components/Footer';

const API_BASE = 'https://api.payflux.dev';

const riskColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
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
                    setError('Report not found');
                } else {
                    setReport(data.report);
                    document.title = `${data.report.title} | PayFlux Intelligence`;
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Unable to load report');
                setLoading(false);
            });
    }, [slug]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const renderContent = (content) => {
        if (!content) return null;

        // Split content into sections by ## headings
        const sections = content.split(/^## /m).filter(Boolean);

        return sections.map((section, i) => {
            const lines = section.split('\n');
            const heading = lines[0].trim();
            const body = lines.slice(1).join('\n').trim();

            return (
                <div key={i} className="mb-10">
                    <h2 className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-medium mb-4 pb-2 border-b border-slate-800">
                        {heading}
                    </h2>
                    <div className="text-[15px] text-slate-300 leading-[1.8] whitespace-pre-line">
                        {body}
                    </div>
                </div>
            );
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-300 font-sans flex items-center justify-center">
                <div className="text-slate-500 text-sm">Loading report...</div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">
                <div className="max-w-[960px] mx-auto px-8 pt-40 text-center">
                    <div className="text-slate-400 text-lg mb-4">{error || 'Report not found'}</div>
                    <Link to="/reports" className="text-[#0A64BC] hover:underline text-sm">
                        ← Back to Reports
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">
            <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/[0.06] h-16">
                <div className="max-w-[960px] mx-auto px-8 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#0A64BC] rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-white">PayFlux</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link to="/reports" className="text-[13px] text-slate-500 hover:text-white transition-colors">
                            All Reports
                        </Link>
                        <Link to="/pricing" className="text-[13px] text-slate-500 hover:text-white transition-colors">
                            Pricing
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-[720px] mx-auto px-8 pt-32 pb-20">
                <Link
                    to="/reports"
                    className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-white transition-colors mb-8"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Reports
                </Link>

                {/* Report header */}
                <header className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        {report.risk_level && (
                            <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border ${riskColors[report.risk_level] || riskColors.low}`}>
                                {report.risk_level} severity
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6 leading-tight">
                        {report.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mb-6">
                        <span>{formatDate(report.created_at)}</span>
                        {report.processor && (
                            <>
                                <span className="text-slate-700">|</span>
                                <span>Processor: {report.processor}</span>
                            </>
                        )}
                        {report.industry && (
                            <>
                                <span className="text-slate-700">|</span>
                                <span>Industry: {report.industry}</span>
                            </>
                        )}
                        {report.cluster_size && (
                            <>
                                <span className="text-slate-700">|</span>
                                <span>{report.cluster_size} signals analyzed</span>
                            </>
                        )}
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-600 font-medium">
                        PayFlux Intelligence — Automated Market Analysis
                    </div>
                </header>

                {/* Report content */}
                <article className="border-t border-slate-800 pt-10">
                    {renderContent(report.content)}
                </article>

                {/* CTA */}
                <div className="mt-16 border border-slate-800 rounded-lg p-8 text-center">
                    <Shield className="w-8 h-8 text-[#0A64BC] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Protect your revenue</h3>
                    <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                        PayFlux provides deterministic reserve projections so you can anticipate processor actions before they happen.
                    </p>
                    <Link
                        to="/pricing"
                        className="inline-block px-6 py-2.5 bg-white text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        View Pricing
                    </Link>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ReportDetail;

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertTriangle, TrendingUp } from 'lucide-react';
import Footer from '../components/Footer';

const API_BASE = 'https://api.payflux.dev';

const riskColors = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = 'Intelligence Reports | PayFlux';

        fetch(`${API_BASE}/intelligence/reports`)
            .then(res => res.json())
            .then(data => {
                setReports(data.reports || []);
                setLoading(false);
            })
            .catch(err => {
                setError('Unable to load reports');
                setLoading(false);
            });
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans">
            <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/[0.06] h-16">
                <div className="max-w-[960px] mx-auto px-8 h-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#0A64BC] rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-white">PayFlux</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link to="/pricing" className="text-[13px] text-slate-500 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        <Link to="/" className="text-[13px] text-slate-500 hover:text-white transition-colors">
                            Home
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-[960px] mx-auto px-8 pt-32 pb-20">
                <div className="mb-16">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-[#0A64BC] font-medium mb-4">
                        Merchant Intelligence
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                        Intelligence Reports
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl">
                        AI-generated market intelligence reports derived from real-time payment processor distress signals. Updated every 6 hours.
                    </p>
                </div>

                {loading && (
                    <div className="text-center py-20">
                        <div className="text-slate-500 text-sm">Loading reports...</div>
                    </div>
                )}

                {error && (
                    <div className="text-center py-20">
                        <div className="text-red-400 text-sm">{error}</div>
                    </div>
                )}

                {!loading && !error && reports.length === 0 && (
                    <div className="text-center py-20 border border-slate-800 rounded-lg">
                        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                        <div className="text-slate-400 text-sm mb-2">No reports published yet</div>
                        <div className="text-slate-600 text-xs">Reports are generated automatically when significant distress patterns emerge.</div>
                    </div>
                )}

                <div className="space-y-4">
                    {reports.map((report) => (
                        <Link
                            key={report.slug}
                            to={`/reports/${report.slug}`}
                            className="block group"
                        >
                            <article className="border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex items-center gap-3">
                                        {report.risk_level && (
                                            <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded border ${riskColors[report.risk_level] || riskColors.low}`}>
                                                {report.risk_level}
                                            </span>
                                        )}
                                        {report.processor && (
                                            <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                                {report.processor}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-600 whitespace-nowrap">
                                        {formatDate(report.created_at)}
                                    </span>
                                </div>

                                <h2 className="text-lg font-semibold text-white group-hover:text-[#0A64BC] transition-colors mb-2">
                                    {report.title}
                                </h2>

                                {report.executive_summary && (
                                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                                        {report.executive_summary}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 mt-4">
                                    {report.cluster_size && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                            <TrendingUp className="w-3 h-3" />
                                            {report.cluster_size} signals
                                        </div>
                                    )}
                                    {report.industry && (
                                        <div className="text-[11px] text-slate-500">
                                            {report.industry}
                                        </div>
                                    )}
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Reports;

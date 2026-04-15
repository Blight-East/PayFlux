import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import Footer from '../components/Footer';
import { logMarketingEvent, buildScanUrl } from '../lib/tracking';
import { decodeEmail } from '../lib/decoderRules';

const SOURCE_PAGE = 'processor_warning_email_decoder';
const TOOL_NAME = 'email_decoder';

const RELATED_PAGES = [
    { to: '/processor-risk-intelligence', label: 'How Processors Evaluate Merchant Risk' },
    { to: '/reliability', label: 'Reliability' },
    { to: '/security', label: 'Security' },
    { to: '/deterministic-risk-scoring', label: 'Deterministic Risk Scoring' },
    { to: '/auditability', label: 'Auditability' },
];

const ProcessorWarningEmailDecoder = () => {
    const [inputText, setInputText] = useState('');
    const [results, setResults] = useState(null);
    const [hasDecoded, setHasDecoded] = useState(false);
    const [expandedSecondary, setExpandedSecondary] = useState({});

    useEffect(() => {
        document.title = 'Processor Warning Email Decoder – PayFlux';
        const link =
            document.querySelector("link[rel='canonical']") ||
            document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute(
            'href',
            'https://payflux.dev/tools/processor-warning-email-decoder'
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

    const handleDecode = () => {
        logMarketingEvent('tool_decode_submitted', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
        });

        const matched = decodeEmail(inputText);
        setResults(matched);
        setHasDecoded(true);
        setExpandedSecondary({});

        logMarketingEvent('tool_decode_completed', {
            source_page: SOURCE_PAGE,
            tool_name: TOOL_NAME,
            matched_categories: matched.map((m) => m.id).join(','),
            result_type:
                matched.length === 1 && matched[0].id === 'generic_concern'
                    ? 'fallback'
                    : matched.length === 1
                      ? 'single'
                      : 'multi',
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

    const toggleSecondary = (id) => {
        setExpandedSecondary((prev) => ({ ...prev, [id]: !prev[id] }));
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
                                <Mail size={18} className="text-slate-200" />
                            </div>
                            <div>
                                <Link
                                    to="/"
                                    className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    PayFlux
                                </Link>
                                <div className="text-[11px] text-slate-500">
                                    Processor Warning Decoder
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
                            Processor Warning Email Decoder
                        </h1>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Paste a warning email from your payment processor and get a
                            plain-English breakdown of what it means, why they sent it, and
                            what to do next.
                        </p>
                        <p className="text-xs leading-relaxed text-slate-500">
                            Everything runs in your browser. No data leaves your device.
                        </p>
                    </section>

                    {/* Input */}
                    <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/70">
                        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Mail size={14} className="text-slate-300" />
                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Processor email
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                Paste the full email or the key paragraphs
                            </span>
                        </div>
                        <div className="flex flex-col gap-3 p-4">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="min-h-[200px] w-full resize-y rounded-lg border border-slate-800 bg-slate-950/90 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
                                placeholder="Dear Merchant, We are writing to inform you that a rolling reserve of 10% has been applied to your account effective immediately. This action has been taken as a result of elevated chargeback activity observed over the past 60 days..."
                            />
                            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                                <p className="max-w-sm text-[11px] leading-relaxed text-slate-500">
                                    Analysis runs entirely in-browser. No data is sent to
                                    PayFlux or any external service.
                                </p>
                                <button
                                    onClick={handleDecode}
                                    className="inline-flex items-center gap-2 rounded-lg bg-[#0A64BC] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#08539e]"
                                >
                                    Decode This Email
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Results */}
                    {hasDecoded && results && (
                        <section className="flex flex-col gap-6 animate-in">
                            <h2 className="text-lg font-semibold tracking-tight text-slate-50">
                                {results.length === 1 && results[0].id === 'generic_concern'
                                    ? 'Analysis'
                                    : results.length === 1
                                      ? 'Detected Signal'
                                      : `Detected Signals (${results.length})`}
                            </h2>

                            {/* Primary result */}
                            <ResultCard result={results[0]} isPrimary />

                            {/* Secondary results */}
                            {results.length > 1 && (
                                <div className="flex flex-col gap-3">
                                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Additional signals detected
                                    </h3>
                                    {results.slice(1).map((r) => (
                                        <div
                                            key={r.id}
                                            className="rounded-xl border border-slate-800/60 bg-slate-900/40"
                                        >
                                            <button
                                                onClick={() => toggleSecondary(r.id)}
                                                className="flex w-full items-center justify-between px-5 py-4 text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                                                        {r.matchCount}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-200">
                                                        {r.label}
                                                    </span>
                                                </div>
                                                {expandedSecondary[r.id] ? (
                                                    <ChevronUp size={16} className="text-slate-500" />
                                                ) : (
                                                    <ChevronDown size={16} className="text-slate-500" />
                                                )}
                                            </button>
                                            {expandedSecondary[r.id] && (
                                                <div className="border-t border-slate-800/40 px-5 pb-5">
                                                    <ResultContent result={r} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Scan CTA */}
                            <div className="mt-4 flex flex-col items-center gap-4 rounded-xl border border-[#0A64BC]/30 bg-[#0A64BC]/5 px-6 py-8 text-center">
                                <Shield size={28} className="text-[#0A64BC]" />
                                <h3 className="text-lg font-semibold text-slate-50">
                                    See where your risk signals stand right now
                                </h3>
                                <p className="max-w-md text-sm text-slate-400">
                                    A free scan checks your key processor risk indicators and shows
                                    you what your processor is likely seeing on your account.
                                </p>
                                <a
                                    href={buildScanUrl(SOURCE_PAGE, 'decoder_result_cta')}
                                    onClick={() => handleScanClick('decoder_result_cta')}
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
                                    className="rounded-lg border border-slate-800/60 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
                                >
                                    {page.label}
                                </Link>
                            ))}
                        </div>
                    </section>
                </main>

                <Footer variant="dark" />
            </div>
        </div>
    );
};

const ResultCard = ({ result, isPrimary }) => (
    <div
        className={`rounded-xl border bg-slate-900/50 ${
            isPrimary ? 'border-slate-700/80' : 'border-slate-800/40'
        }`}
    >
        <div className="flex items-center gap-3 border-b border-slate-800/40 px-5 py-4">
            {isPrimary && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A64BC]/20 text-[10px] font-bold text-[#0A64BC]">
                    {result.matchCount || '—'}
                </span>
            )}
            <h3 className="text-base font-semibold text-slate-50">{result.label}</h3>
        </div>
        <div className="px-5 pb-5">
            <ResultContent result={result} />
        </div>
    </div>
);

const ResultContent = ({ result }) => (
    <div className="flex flex-col gap-5 pt-4">
        <ResultSection title="Summary">{result.summary}</ResultSection>
        <ResultSection title="What This Usually Means">
            {result.whatItMeans}
        </ResultSection>
        <ResultSection title="Why Processors Send This">
            {result.whyProcessorsSendThis}
        </ResultSection>
        <ResultSection title="What To Check Right Now">
            {Array.isArray(result.whatToCheckNow) ? (
                <ul className="ml-4 flex flex-col gap-1.5 list-disc">
                    {result.whatToCheckNow.map((item, i) => (
                        <li key={i} className="text-sm leading-relaxed text-slate-300">
                            {item}
                        </li>
                    ))}
                </ul>
            ) : (
                result.whatToCheckNow
            )}
        </ResultSection>
        <ResultSection title="Suggested Next Step">
            {result.suggestedNextStep}
        </ResultSection>
    </div>
);

const ResultSection = ({ title, children }) => (
    <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {title}
        </h4>
        {typeof children === 'string' ? (
            <p className="text-sm leading-relaxed text-slate-300">{children}</p>
        ) : (
            children
        )}
    </div>
);

export default ProcessorWarningEmailDecoder;

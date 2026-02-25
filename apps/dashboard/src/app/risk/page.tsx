'use client';

import { useState, useMemo } from 'react';
import ReserveForecastPanel from '@/components/ReserveForecastPanel';
import {
    Shield,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Loader2,
    ExternalLink,
    TrendingUp,
    TrendingDown,
    Minus,
    FileText,
    Lock,
    RefreshCw,
    Phone,
    ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RiskLabel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
type ComplianceStatus = 'Present' | 'Weak' | 'Missing';

interface BreakdownNode {
    name: string;
    stabilityPoints: number;
    score: number;
    max: number;
}

interface Driver {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    evidence: string;
    weight: number;
}

interface RiskAnalysis {
    url: string;
    analyzedAt: string;
    industry: string;
    processor: string;
    riskTier: number;
    riskLabel: RiskLabel;
    stabilityScore: number;
    scoreBreakdown: BreakdownNode[];
    policies: Record<string, { status: ComplianceStatus; matches: number }>;
    narrative: {
        summary: string;
        drivers: Driver[];
        recommendations: string[];
    };
    meta: {
        aiProvider: 'gemini' | 'fallback';
        processingTimeMs: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRIES = [
    'SaaS / Software',
    'E-commerce (Physical Goods)',
    'Digital Products / Info-business',
    'Subscription Services',
    'Professional Services / Consulting',
    'Health & Supplements',
    'Agency / Marketing',
    'High-Ticket Coaching',
] as const;

const PROCESSORS = [
    'Stripe',
    'PayPal',
    'Paddle',
    'Adyen',
    'Square',
    'Authorize.net',
] as const;

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    MODERATE: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    ELEVATED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    // Tier mapping
    '1': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    '2': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    '3': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    '4': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    '5': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function RiskBadge({ label }: { label: RiskLabel }) {
    const colors = RISK_COLORS[label] || RISK_COLORS.MODERATE;
    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}
        >
            <Shield className="w-3 h-3 mr-1.5" />
            {label} Risk
        </span>
    );
}

function StabilityGauge({ score }: { score: number }) {
    const getColor = () => {
        if (score >= 80) return 'from-emerald-500 to-emerald-400';
        if (score >= 60) return 'from-blue-500 to-blue-400';
        if (score >= 40) return 'from-amber-500 to-amber-400';
        if (score >= 20) return 'from-orange-500 to-orange-400';
        return 'from-red-500 to-red-400';
    };

    return (
        <div className="relative">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Stability Score</span>
                <span className="text-2xl font-bold text-white">{score}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-500`}
                    style={{ width: `${score}%` }}
                />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
                <span>0</span>
                <span>100</span>
            </div>
        </div>
    );
}

function ScoreCard({ node }: { node: BreakdownNode }) {
    const percentage = node.max > 0 ? (node.stabilityPoints / node.max) * 100 : 0;
    const isGood = percentage >= 70;

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">{node.name}</span>
                <span className={`text-sm font-medium ${isGood ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {node.stabilityPoints}/{node.max}
                </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${isGood ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function PolicyCard({ name, policy }: { name: string; policy: { status: ComplianceStatus; matches: number } }) {
    const key = name.toLowerCase();

    // Heuristic icon mapping
    let Icon = FileText;
    if (key.includes('term')) Icon = FileText;
    else if (key.includes('priv')) Icon = Lock;
    else if (key.includes('refund') || key.includes('return')) Icon = RefreshCw;
    else if (key.includes('contact') || key.includes('support')) Icon = Phone;

    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    const statusConfig: Record<ComplianceStatus, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
        Present: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        Weak: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        Missing: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    };

    const config = statusConfig[policy.status];
    const StatusIcon = config.icon;

    return (
        <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div>
                    <span className="text-sm text-zinc-300 block">{displayName}</span>
                    <span className="text-[10px] text-zinc-500">matches: {policy.matches}</span>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>{policy.status}</span>
            </div>
        </div>
    );
}

function DriverCard({ driver }: { driver: Driver }) {
    const impactConfig = {
        positive: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        negative: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
        neutral: { icon: Minus, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    };

    const config = impactConfig[driver.impact];
    const ImpactIcon = config.icon;

    return (
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded ${config.bg}`}>
                        <ImpactIcon className={`w-3 h-3 ${config.color}`} />
                    </div>
                    <span className="text-sm font-medium text-white">{driver.factor}</span>
                </div>
                <span className="text-xs text-zinc-500">Weight: {driver.weight}/10</span>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2">&ldquo;{driver.evidence}&rdquo;</p>
        </div>
    );
}

function LoadingSimulation({ stage }: { stage: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-zinc-800 rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-2">
                <p className="text-sm font-medium text-white">{stage}</p>
                <p className="text-xs text-zinc-500">This may take up to 30 seconds</p>
            </div>
        </div>
    );
}

function ReportView({ analysis }: { analysis: RiskAnalysis }) {
    const colors = RISK_COLORS[String(analysis.riskTier)] || RISK_COLORS[analysis.riskLabel] || RISK_COLORS.MODERATE;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                        <RiskBadge label={analysis.riskLabel} />
                        <span className="text-xs text-zinc-500">Tier {analysis.riskTier}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-white">{analysis.url}</h2>
                    <div className="flex items-center space-x-4 text-xs text-zinc-500">
                        <span>{analysis.industry}</span>
                        <span>•</span>
                        <span>{analysis.processor}</span>
                        <span>•</span>
                        <span>{new Date(analysis.analyzedAt).toLocaleString()}</span>
                    </div>
                </div>
                <a
                    href={analysis.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                    <span>Visit</span>
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Stability Score & Interpretation */}
            <div className={`p-6 rounded-xl border ${colors.border} ${colors.bg} space-y-6`}>
                <StabilityGauge score={analysis.stabilityScore} />

                <div className="pt-4 border-t border-zinc-800/50">
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Interpretation</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">{analysis.narrative.summary}</p>
                </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                    Score Breakdown
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {analysis.scoreBreakdown.map((node) => (
                        <ScoreCard key={node.name} node={node} />
                    ))}
                </div>
            </div>

            {/* Compliance (Policies) */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                    Compliance
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(analysis.policies).map(([name, policy]) => (
                        <PolicyCard key={name} name={name} policy={policy} />
                    ))}
                </div>
            </div>

            {/* Drivers & Action Plan */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        Risk Drivers
                    </h3>
                </div>

                <div className="grid gap-3">
                    {analysis.narrative.drivers.map((driver, i) => (
                        <DriverCard key={i} driver={driver} />
                    ))}
                </div>

                {analysis.narrative.recommendations.length > 0 && (
                    <div className="space-y-3 mt-6">
                        <h4 className="text-xs font-medium text-zinc-500">Action Plan</h4>
                        <ul className="space-y-2">
                            {analysis.narrative.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start space-x-2 text-sm text-zinc-400">
                                    <ChevronRight className="w-4 h-4 mt-0.5 text-blue-400 flex-shrink-0" />
                                    <span>{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Meta */}
            <div className="text-xs text-zinc-600 text-center space-y-1">
                <p>AI Provider: {analysis.meta.aiProvider} • Processed in {analysis.meta.processingTimeMs}ms</p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function RiskSnapshotPage() {
    const [url, setUrl] = useState('');
    const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>(INDUSTRIES[0]);
    const [processor, setProcessor] = useState<(typeof PROCESSORS)[number]>(PROCESSORS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState('');
    const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Extract hostname from analysis URL for forecast panel
    const scannedHost = useMemo(() => {
        if (!analysis?.url) return null;
        try {
            const normalized = analysis.url.startsWith('http') ? analysis.url : `https://${analysis.url}`;
            return new URL(normalized).hostname;
        } catch {
            return null;
        }
    }, [analysis?.url]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        setIsLoading(true);
        setError(null);
        setAnalysis(null);

        // Loading simulation stages
        const stages = [
            'Validating URL...',
            'Fetching content...',
            'Analyzing policies...',
            'Calculating risk score...',
            'Generating AI narrative...',
        ];

        let stageIndex = 0;
        setLoadingStage(stages[0]);

        const stageInterval = setInterval(() => {
            stageIndex = Math.min(stageIndex + 1, stages.length - 1);
            setLoadingStage(stages[stageIndex]);
        }, 2000);

        try {
            const response = await fetch('/api/v1/risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, industry, processor }),
            });

            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Scan failed.');
            }

            // Direct assignment: The backend response structure MUST match RiskAnalysis interface
            setAnalysis(payload as RiskAnalysis);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            clearInterval(stageInterval);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 p-8">
            <div data-fingerprint="risk-snapshot" style={{ display: 'none' }}>ROUTE_FINGERPRINT: RISK_SNAPSHOT</div>
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-white">Merchant Risk Snapshot</h1>
                    <p className="text-sm text-zinc-400">
                        Analyze merchant websites for payment risk indicators
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Website URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="example.com"
                            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Industry</label>
                            <select
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value as (typeof INDUSTRIES)[number])}
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                disabled={isLoading}
                            >
                                {INDUSTRIES.map((ind) => (
                                    <option key={ind} value={ind}>
                                        {ind}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Processor</label>
                            <select
                                value={processor}
                                onChange={(e) => setProcessor(e.target.value as (typeof PROCESSORS)[number])}
                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                disabled={isLoading}
                            >
                                {PROCESSORS.map((proc) => (
                                    <option key={proc} value={proc}>
                                        {proc}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : (
                            <>
                                <Shield className="w-4 h-4" />
                                <span>Run Risk Scan</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Loading State */}
                {isLoading && <LoadingSimulation stage={loadingStage} />}

                {/* Error State */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-400">Analysis Failed</h3>
                            <p className="text-sm text-red-300/80 mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Report View */}
                {analysis && !isLoading && <ReportView analysis={analysis} />}

                {/* Reserve Forecast — appears after scan completes */}
                {analysis && !isLoading && (
                    <ReserveForecastPanel host={scannedHost} />
                )}
            </div>
        </div>
    );
}

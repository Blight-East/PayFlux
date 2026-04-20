'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Clock3,
    Loader2,
    Save,
    ShieldAlert,
    UserRound,
} from 'lucide-react';

type IncidentStatus = 'new' | 'reviewing' | 'resolved';
type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low';

interface ForecastData {
    normalizedHost: string;
    currentRiskTier: number;
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    tierDelta: number;
    instabilitySignal: string;
    hasProjectionAccess: boolean;
    recommendedInterventions: Array<{
        action: string;
        rationale: string;
        priority: AlertSeverity;
    }>;
    projectionBasis: {
        inputs: {
            policySurface: { present: number; weak: number; missing: number };
        };
    } | null;
    projectedAt: string;
}

interface RiskScan {
    id: string;
    createdAt: string;
    source: 'fresh' | 'cache';
    payload: {
        riskTier: number;
        riskLabel: string;
        stabilityScore: number;
        narrative?: {
            summary?: string;
            recommendations?: string[];
        };
    };
}

interface IncidentRecord {
    workspaceId: string;
    host: string;
    status: IncidentStatus;
    owner: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

interface AlertItem {
    severity: AlertSeverity;
    title: string;
    detail: string;
}

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
    critical: 'border-amber-500/24 bg-[rgba(233,181,117,0.08)] text-[var(--pf-accent-soft)]',
    high: 'border-orange-500/24 bg-orange-500/6 text-orange-300',
    moderate: 'border-amber-500/22 bg-amber-500/6 text-amber-300',
    low: 'border-emerald-500/20 bg-emerald-500/6 text-emerald-300',
};

function toHistoryUrl(host: string) {
    return `https://${host}`;
}

function compareAlerts(a: AlertItem, b: AlertItem) {
    const rank: Record<AlertSeverity, number> = {
        critical: 0,
        high: 1,
        moderate: 2,
        low: 3,
    };
    return rank[a.severity] - rank[b.severity];
}

function humanizeAction(action: string) {
    return action
        .replace(/Modeled impact suggests reducing retry attempts from (\d+) → (\d+)/i, 'Try lowering retry attempts from $1 to $2')
        .replace(/Modeled impact suggests increasing backoff (?:interval|window) by (\d+)%/i, 'Try spacing retry attempts out by about $1%')
        .replace(/Modeled trajectory suggests monitoring Tier Delta over next (\d+)h/i, 'Watch the risk level over the next $1 hours')
        .replace(/Modeled risk weight suggests adding (\d+) missing policy page(?:s)?/i, 'Add $1 missing policy page' + (action.includes('pages') ? 's' : ''))
        .replace(/Modeled risk weight suggests strengthening (\d+) weak policy page(?:s)?/i, 'Tighten up $1 policy page' + (action.includes('pages') ? 's' : ''))
        .replace(/Modeled impact suggests capping retry attempts at (\d+)/i, 'Try capping retry attempts at $1')
        .replace(/No structural changes modeled/i, 'No major changes suggested right now');
}

function humanizeDetail(detail: string) {
    return detail
        .replace(/Degrading trend increases escalation probability\. Lower retry ceiling slows velocity accumulation\./i, 'A lower retry ceiling can make the payment pattern look steadier.')
        .replace(/Wider backoff reduces clustering signal in processor monitoring windows\./i, 'More spacing between retries can make activity look less clustered.')
        .replace(/Consecutive positive deltas trigger accelerated processor review\./i, 'Repeated upward moves are usually worth paying attention to.')
        .replace(/Missing compliance pages \(refund, privacy, terms\) are weighted negatively in processor risk scoring\./i, 'Missing refund, privacy, or terms pages can make the business harder to explain.')
        .replace(/Weak policy pages \(low keyword density, vague language\) receive partial credit in stability scoring\./i, 'Clearer policy pages usually make the picture easier to understand.')
        .replace(/Derived from the latest stored risk snapshot\./i, 'Taken from the latest saved snapshot.');
}

function simplifyNarrativeSummary(summary?: string) {
    if (!summary) return 'Saved snapshot created.';

    return summary
        .replace(/This merchant has a\s+/i, '')
        .replace(/\s*risk profile/i, '')
        .replace(/\s*\(Score:\s*\d+\)\.?/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function buildAlerts(forecast: ForecastData | null, scans: RiskScan[]): AlertItem[] {
    if (!forecast) {
        return [];
    }

    const alerts: AlertItem[] = [];
    const policySurface = forecast.projectionBasis?.inputs.policySurface;
    const sortedScans = [...scans].sort((a, b) => (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    const latestScan = sortedScans[0];
    const previousScan = sortedScans[1];

    if (forecast.instabilitySignal === 'ACCELERATING') {
        alerts.push({
            severity: 'critical',
            title: 'Things are moving the wrong way',
            detail: 'The current signal is picking up speed. It is worth checking this now instead of waiting for the next review.',
        });
    }

    if (forecast.currentRiskTier >= 4) {
        alerts.push({
            severity: forecast.currentRiskTier >= 5 ? 'critical' : 'high',
            title: `Current risk level is Level ${forecast.currentRiskTier}`,
            detail: 'This is already in the range where processors tend to pay closer attention.',
        });
    }

    if (forecast.trend === 'DEGRADING' && forecast.tierDelta > 0) {
        alerts.push({
            severity: 'high',
            title: 'The risk level increased since the last scan',
            detail: `The level moved up by ${forecast.tierDelta}. That usually matters more than normal day-to-day noise.`,
        });
    }

    if (policySurface && policySurface.missing > 0) {
        alerts.push({
            severity: 'moderate',
            title: 'Some policy pages still look incomplete',
            detail: `${policySurface.missing} expected policy page(s) were missing in the latest scan. Filling those in makes the business easier to explain.`,
        });
    }

    if (latestScan && previousScan) {
        const scoreDelta = latestScan.payload.stabilityScore - previousScan.payload.stabilityScore;
        if (scoreDelta <= -15) {
            alerts.push({
                severity: 'moderate',
                title: 'The latest scan looked weaker than the one before it',
                detail: 'The latest scan changed more than normal. It is worth checking the recent timeline to see what shifted.',
            });
        }
    }

    if (alerts.length === 0) {
        alerts.push({
            severity: 'low',
            title: 'Nothing urgent stands out right now',
            detail: 'The current saved signals do not show a fresh jump. Keep an eye on it and keep your notes current.',
        });
    }

    return alerts.sort(compareAlerts);
}

export default function RiskActionCenter({ host }: { host: string | null }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forecast, setForecast] = useState<ForecastData | null>(null);
    const [scans, setScans] = useState<RiskScan[]>([]);
    const [incident, setIncident] = useState<IncidentRecord | null>(null);
    const [status, setStatus] = useState<IncidentStatus>('new');
    const [owner, setOwner] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!host) {
            setLoading(false);
            return;
        }

        const currentHost = host;
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);
            setSaveMessage(null);

            try {
                const [forecastRes, historyRes, incidentRes] = await Promise.all([
                    fetch(`/api/v1/risk/forecast?host=${encodeURIComponent(currentHost)}`),
                    fetch(`/api/v1/risk/history?url=${encodeURIComponent(toHistoryUrl(currentHost))}`),
                    fetch(`/api/v1/risk/incidents?host=${encodeURIComponent(currentHost)}`),
                ]);

                if (!forecastRes.ok) {
                    throw new Error('Failed to load current risk state.');
                }

                const forecastJson: ForecastData = await forecastRes.json();
                const historyJson = historyRes.ok ? await historyRes.json() : { scans: [] };
                const incidentJson = incidentRes.ok ? await incidentRes.json() : { incident: null };

                if (cancelled) return;

                const nextIncident = incidentJson.incident ?? null;
                setForecast(forecastJson);
                setScans(
                    Array.isArray(historyJson.scans)
                        ? historyJson.scans.sort((a: RiskScan, b: RiskScan) => (
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        ))
                        : []
                );
                setIncident(nextIncident);
                setStatus(nextIncident?.status ?? 'new');
                setOwner(nextIncident?.owner ?? '');
                setNotes(nextIncident?.notes ?? '');
            } catch (loadError) {
                if (cancelled) return;
                setError((loadError as Error).message);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [host]);

    const alerts = useMemo(() => buildAlerts(forecast, scans), [forecast, scans]);

    const recommendedActions = useMemo(() => {
        if (forecast?.recommendedInterventions?.length) {
            return forecast.recommendedInterventions.slice(0, 3).map((item) => ({
                action: humanizeAction(item.action),
                detail: humanizeDetail(item.rationale),
            }));
        }

        const latestRecommendations = scans[0]?.payload?.narrative?.recommendations ?? [];
        return latestRecommendations.slice(0, 3).map((item) => ({
            action: humanizeAction(item),
            detail: 'Taken from the latest saved snapshot.',
        }));
    }, [forecast, scans]);

    if (!host) return null;

    async function handleSave() {
        setSaving(true);
        setSaveMessage(null);

        try {
            const response = await fetch('/api/v1/risk/incidents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    host,
                    status,
                    owner,
                    notes,
                }),
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save incident record.');
            }

            setIncident(payload.incident);
            setSaveMessage('Incident record saved.');
        } catch (saveError) {
            setSaveMessage((saveError as Error).message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="pf-panel rounded-[2rem] p-7 space-y-7">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="mb-3 flex items-center space-x-2">
                        <ShieldAlert className="w-4 h-4 text-[var(--pf-muted)]" />
                        <h3 className="text-base font-semibold text-[var(--pf-paper)]">What To Look At Next</h3>
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-[var(--pf-text-soft)]">
                        This section turns the latest saved signals into simple alerts, suggested next steps, and a lightweight notes area for your team.
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--pf-text-soft)]">
                        Risk level is the simple 1 to 5 summary. Direction shows whether the picture looks better, steady, or worse.
                    </p>
                </div>
                {incident && (
                    <span className="text-[11px] text-[var(--pf-text-soft)]">
                        Last updated {new Date(incident.updatedAt).toLocaleString()}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex items-center space-x-3 py-6 text-sm text-[var(--pf-text-soft)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading current alerts and recent history…</span>
                </div>
            ) : error ? (
                <div className="border border-red-500/20 rounded-lg p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="text-sm text-red-400">This section is unavailable right now</div>
                        <p className="text-sm text-red-300/80 mt-1">{error}</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-7 lg:grid-cols-2">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-[var(--pf-muted)]" />
                                <h4 className="pf-kicker text-[var(--pf-muted)]">Things To Notice</h4>
                            </div>

                            {alerts.map((alert, index) => (
                                <div
                                    key={`${alert.title}-${index}`}
                                    className={`rounded-[1.35rem] border p-5 ${SEVERITY_STYLES[alert.severity]}`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[1rem] font-semibold leading-6">{alert.title}</span>
                                        <span className="text-[11px] uppercase tracking-wider opacity-80">{alert.severity}</span>
                                    </div>
                                    <p className="text-sm leading-7 opacity-80">{alert.detail}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <ClipboardList className="w-4 h-4 text-[var(--pf-muted)]" />
                                <h4 className="pf-kicker text-[var(--pf-muted)]">Suggested Next Steps</h4>
                            </div>

                            {recommendedActions.length > 0 ? recommendedActions.map((item, index) => (
                                <div key={`${item.action}-${index}`} className="rounded-[1.35rem] border border-[var(--pf-line)] bg-[rgba(255,255,255,0.02)] p-5">
                                    <div className="flex items-start space-x-2">
                                        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--pf-cool)]" />
                                        <div>
                                            <div className="text-[0.98rem] leading-6 text-zinc-200">{item.action}</div>
                                            <p className="mt-1.5 text-sm leading-7 text-[var(--pf-text-soft)]">{item.detail}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-[1.35rem] border border-[var(--pf-line)] bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--pf-text-soft)]">
                                    No suggestions are available for this merchant yet.
                                </div>
                            )}

                            <p className="text-sm text-[var(--pf-text-soft)]">
                                These are suggestions only. PayFlux is not changing processor settings or fulfillment behavior for you.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-7 lg:grid-cols-[1.16fr,0.84fr]">
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Clock3 className="w-4 h-4 text-[var(--pf-muted)]" />
                                <h4 className="pf-kicker text-[var(--pf-muted)]">Recent History</h4>
                            </div>

                            {scans.length === 0 ? (
                                <div className="rounded-[1.35rem] border border-[var(--pf-line)] bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--pf-text-soft)]">
                                    No saved history yet. Run a merchant scan to create the first entry.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {scans.slice(0, 5).map((scan, index) => {
                                        const previous = scans[index + 1];
                                        const delta = previous
                                            ? scan.payload.riskTier - previous.payload.riskTier
                                            : 0;

                                        return (
                                            <div key={scan.id} className="rounded-[1.35rem] border border-[var(--pf-line)] bg-[rgba(255,255,255,0.02)] p-5">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="text-[0.98rem] text-zinc-200">
                                                        Risk level {scan.payload.riskTier} · {scan.payload.riskLabel}
                                                        {delta !== 0 && (
                                                            <span className={`ml-2 text-xs ${delta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                {delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`} from the last scan
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-[var(--pf-muted)]">
                                                        {new Date(scan.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm leading-7 text-[var(--pf-text-soft)]">
                                                    {simplifyNarrativeSummary(scan.payload.narrative?.summary)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <UserRound className="w-4 h-4 text-[var(--pf-muted)]" />
                                <h4 className="pf-kicker text-[var(--pf-muted)]">Team Notes</h4>
                            </div>

                            <div className="rounded-[1.35rem] border border-[var(--pf-line)] bg-[rgba(255,255,255,0.02)] p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider">Status</label>
                                    <select
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value as IncidentStatus)}
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                                    >
                                        <option value="new">New</option>
                                        <option value="reviewing">Reviewing</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider">Owner</label>
                                    <input
                                        value={owner}
                                        onChange={(event) => setOwner(event.target.value)}
                                        placeholder="owner@company.com"
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-[var(--pf-muted)]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] text-[var(--pf-muted)] uppercase tracking-wider">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(event) => setNotes(event.target.value)}
                                        rows={5}
                                        placeholder="What changed, what you want to review next, and anything worth sharing later."
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-[var(--pf-muted)]"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-sm font-medium text-white transition-colors"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save notes
                                </button>

                                {saveMessage && (
                                    <div className="flex items-center space-x-2 text-sm text-[var(--pf-text-soft)]">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{saveMessage}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

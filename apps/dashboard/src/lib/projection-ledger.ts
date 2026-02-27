import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Projection Ledger
//
// Append-only, signed projection history.
// Each entry is SHA-256 hashed and HMAC-signed at creation time.
// Never mutated. Never re-signed. Never recomputed retroactively.
//
// Write trigger: B+C hybrid
//   B) Daily cadence — one snapshot per merchant per day
//   C) State transition — immediate snapshot on material state change
//
// Storage: Redis LPUSH (append-only list per merchant)
// Signing: Same EVIDENCE_SECRET pattern as evidence export
// ─────────────────────────────────────────────────────────────────────────────

export const LEDGER_SCHEMA_VERSION = '1.0.0';

// Minimum time gap between entries for accuracy comparison.
// Prevents artificial false negatives from intra-day snapshots
// where daily cadence captures old tier and state transition captures new tier.
const MIN_EVALUATION_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── Observability ───────────────────────────────────────────────────────────

const ledgerMetrics = {
    writes: 0,
    skips: 0,
    failures: 0,
};

export class LedgerMetrics {
    static get() { return { ...ledgerMetrics }; }
    static failureRate(): number {
        const total = ledgerMetrics.writes + ledgerMetrics.failures;
        if (total === 0) return 0;
        return ledgerMetrics.failures / total;
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProjectionArtifact {
    projectionId: string;
    schemaVersion: string;
    merchantId: string;
    normalizedHost: string;
    projectedAt: string;
    modelVersion: string;
    inputSnapshot: {
        riskTier: number;
        riskBand: string;
        trend: string;
        tierDelta: number;
        policySurface: { present: number; weak: number; missing: number };
    };
    appliedConstants: {
        baseReserveRate: number;
        trendMultiplier: number;
        projectedTier: number;
        projectedReserveRate: number;
        worstCaseReserveRate: number;
        reserveRateCeiling: number;
    };
    windowOutputs: {
        windowDays: number;
        projectedTrappedBps: number;
        worstCaseTrappedBps: number;
        projectedTrappedUSD?: number;
        worstCaseTrappedUSD?: number;
    }[];
    interventionOutput: {
        velocityReduction: number | null;
        exposureMultiplier: number | null;
        rateMultiplier: number | null;
        interventionCount: number;
    };
    instabilitySignal: string;
    writeReason: 'daily_cadence' | 'state_transition';
}

export interface SignedProjectionRecord {
    artifact: ProjectionArtifact;
    integrity: {
        hash: string;          // SHA-256 of canonical artifact
        signature: string | null; // HMAC-SHA256 of canonical artifact (null if no secret)
        algorithm: string;
        signedAt: string;
    };
}

export interface VerifiedProjectionRecord extends SignedProjectionRecord {
    verification: {
        hashValid: boolean;
        signatureValid: boolean | null; // null if no secret available
    };
}

// ─── Redis Transport ─────────────────────────────────────────────────────────

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

async function redisPush(key: string, value: string): Promise<boolean> {
    if (!REDIS_URL || !REDIS_TOKEN) {
        ledgerMetrics.failures++;
        return false;
    }
    try {
        const url = REDIS_URL.endsWith('/') ? REDIS_URL.slice(0, -1) : REDIS_URL;
        const res = await fetch(`${url}/lpush/${key}/${encodeURIComponent(value)}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        });
        if (!res.ok) {
            console.error('[LEDGER_PUSH_ERROR]', { status: res.status, key });
            ledgerMetrics.failures++;
            return false;
        }
        return true;
    } catch (e) {
        console.error('[LEDGER_PUSH_EXCEPTION]', { key, error: (e as Error).message });
        ledgerMetrics.failures++;
        return false;
    }
}

async function redisGetList(key: string): Promise<string[]> {
    if (!REDIS_URL || !REDIS_TOKEN) return [];
    try {
        const url = REDIS_URL.endsWith('/') ? REDIS_URL.slice(0, -1) : REDIS_URL;
        const res = await fetch(`${url}/lrange/${key}/0/-1`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        });
        if (!res.ok) {
            console.error('[LEDGER_READ_ERROR]', { status: res.status, key });
            return [];
        }
        const data = await res.json();
        return data.result || [];
    } catch (e) {
        console.error('[LEDGER_READ_EXCEPTION]', { key, error: (e as Error).message });
        return [];
    }
}

// ─── Signing ─────────────────────────────────────────────────────────────────

function canonicalize(artifact: ProjectionArtifact): string {
    // Deterministic JSON serialization — keys sorted
    return JSON.stringify(artifact, Object.keys(artifact).sort());
}

function hashArtifact(canonical: string): string {
    return crypto.createHash('sha256').update(Buffer.from(canonical, 'utf-8')).digest('hex');
}

function signArtifact(canonical: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(Buffer.from(canonical, 'utf-8')).digest('hex');
}

// ─── Write Trigger Logic ─────────────────────────────────────────────────────

function shouldWrite(
    existing: SignedProjectionRecord[],
    artifact: ProjectionArtifact
): { write: boolean; reason: 'daily_cadence' | 'state_transition' } {
    if (existing.length === 0) {
        return { write: true, reason: 'daily_cadence' };
    }

    const latest = existing[0]; // LPUSH means index 0 is most recent
    const latestInput = latest.artifact.inputSnapshot;
    const currentInput = artifact.inputSnapshot;

    // State transition: material change in risk posture
    if (
        latestInput.riskTier !== currentInput.riskTier ||
        latestInput.trend !== currentInput.trend ||
        latestInput.tierDelta !== currentInput.tierDelta
    ) {
        return { write: true, reason: 'state_transition' };
    }

    // Daily cadence: one entry per calendar day (UTC)
    const latestDate = latest.artifact.projectedAt.slice(0, 10); // YYYY-MM-DD
    const currentDate = artifact.projectedAt.slice(0, 10);
    if (latestDate !== currentDate) {
        return { write: true, reason: 'daily_cadence' };
    }

    return { write: false, reason: 'daily_cadence' };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export class ProjectionLedger {
    private static ledgerKey(merchantId: string): string {
        return `projection:history:${merchantId}`;
    }

    /**
     * Conditionally append a signed projection artifact to the ledger.
     * Write trigger: B+C hybrid (daily cadence + state transition).
     * Returns the signed record if written, null if skipped.
     */
    static async maybeAppend(artifact: ProjectionArtifact): Promise<SignedProjectionRecord | null> {
        const key = this.ledgerKey(artifact.merchantId);

        // Read existing entries for write-trigger check
        const rawEntries = await redisGetList(key);
        const existing: SignedProjectionRecord[] = rawEntries
            .slice(0, 5) // Only need recent entries for trigger check
            .map(r => { try { return JSON.parse(r); } catch { return null; } })
            .filter(Boolean) as SignedProjectionRecord[];

        const trigger = shouldWrite(existing, artifact);
        if (!trigger.write) {
            ledgerMetrics.skips++;
            return null;
        }

        // Set write reason on artifact
        artifact.writeReason = trigger.reason;

        // Sign
        const canonical = canonicalize(artifact);
        const hash = hashArtifact(canonical);
        const secret = process.env.EVIDENCE_SECRET;
        const signature = secret ? signArtifact(canonical, secret) : null;

        const record: SignedProjectionRecord = {
            artifact,
            integrity: {
                hash,
                signature,
                algorithm: 'sha256+hmac-sha256',
                signedAt: new Date().toISOString(),
            },
        };

        // Append (LPUSH — newest first)
        const written = await redisPush(key, JSON.stringify(record));
        if (written) {
            ledgerMetrics.writes++;
        }

        return record;
    }

    /**
     * Read and verify the projection history for a merchant.
     * Verification is computed at read-time — records are never mutated.
     */
    static async getHistory(merchantId: string, limit: number = 50): Promise<VerifiedProjectionRecord[]> {
        const key = this.ledgerKey(merchantId);
        const rawEntries = await redisGetList(key);
        const secret = process.env.EVIDENCE_SECRET;

        return rawEntries
            .slice(0, limit)
            .map(raw => {
                try {
                    const record: SignedProjectionRecord = JSON.parse(raw);

                    // Re-derive hash from stored artifact for verification
                    const canonical = canonicalize(record.artifact);
                    const recomputedHash = hashArtifact(canonical);
                    const hashValid = recomputedHash === record.integrity.hash;

                    let signatureValid: boolean | null = null;
                    if (secret && record.integrity.signature) {
                        const recomputedSig = signArtifact(canonical, secret);
                        signatureValid = recomputedSig === record.integrity.signature;
                    }

                    return {
                        ...record,
                        verification: {
                            hashValid,
                            signatureValid,
                        },
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean) as VerifiedProjectionRecord[];
    }

    /**
     * Derive accuracy comparison between historical projections and current state.
     * Computed at read-time only. Never mutates historical records.
     */
    static deriveAccuracy(
        history: VerifiedProjectionRecord[],
        currentSnapshot: { riskTier: number; trend: string; tierDelta: number }
    ): {
        totalProjections: number;
        tierPredictionAccuracy: number | null;
        trendPredictionAccuracy: number | null;
        meanReserveVarianceBps: number | null;
        evaluationWindowHours: number;
        versionStability: {
            currentVersion: string;
            uniqueVersions: string[];
            versionChangesInWindow: number;
            isStable: boolean;
        };
        records: {
            projectedAt: string;
            evaluatedAt: string;
            predictedTier: number;
            actualTier: number;
            tierVariance: number;
            tierAccurate: boolean;
            predictedTrend: string;
            actualTrend: string;
            trendAccurate: boolean;
            projectedReserveRate: number;
            actualReserveRate: number;
            reserveRateVarianceBps: number;
        }[];
    } {
        // Version stability: computed over all records
        const versions = history.map(h => h.artifact.modelVersion);
        const uniqueVersions = [...new Set(versions)];
        let versionChanges = 0;
        for (let i = 1; i < versions.length; i++) {
            if (versions[i] !== versions[i - 1]) versionChanges++;
        }
        const versionStability = {
            currentVersion: versions[0] || 'unknown',
            uniqueVersions,
            versionChangesInWindow: versionChanges,
            isStable: uniqueVersions.length <= 1,
        };

        if (history.length < 2) {
            return { totalProjections: history.length, tierPredictionAccuracy: null, trendPredictionAccuracy: null, meanReserveVarianceBps: null, evaluationWindowHours: MIN_EVALUATION_WINDOW_MS / 3600000, versionStability, records: [] };
        }

        // Window-aware accuracy comparison.
        // For each projection, find the FIRST subsequent entry that is at least
        // MIN_EVALUATION_WINDOW_MS later. This prevents artificial false negatives
        // from intra-day snapshots where daily cadence captured old state and
        // a state_transition captured new state minutes later.
        const records: {
            projectedAt: string;
            evaluatedAt: string;
            predictedTier: number;
            actualTier: number;
            tierVariance: number;
            tierAccurate: boolean;
            predictedTrend: string;
            actualTrend: string;
            trendAccurate: boolean;
            projectedReserveRate: number;
            actualReserveRate: number;
            reserveRateVarianceBps: number;
        }[] = [];

        // History is newest-first (LPUSH). Reverse for chronological iteration.
        const chronological = [...history].reverse();

        for (let i = 0; i < chronological.length; i++) {
            const projection = chronological[i];
            const projTime = new Date(projection.artifact.projectedAt).getTime();

            // Find first subsequent entry at least MIN_EVALUATION_WINDOW_MS later
            let evaluationEntry: VerifiedProjectionRecord | null = null;
            for (let j = i + 1; j < chronological.length; j++) {
                const candidateTime = new Date(chronological[j].artifact.projectedAt).getTime();
                if (candidateTime - projTime >= MIN_EVALUATION_WINDOW_MS) {
                    evaluationEntry = chronological[j];
                    break;
                }
            }

            if (!evaluationEntry) continue; // No valid evaluation window yet

            const predictedTier = projection.artifact.appliedConstants.projectedTier;
            const actualTier = evaluationEntry.artifact.inputSnapshot.riskTier;
            const predictedTrend = projection.artifact.inputSnapshot.trend;
            const actualTrend = evaluationEntry.artifact.inputSnapshot.trend;

            // Variance: projected worst-case reserve rate vs actual observed base rate
            const projectedRate = projection.artifact.appliedConstants.worstCaseReserveRate;
            const actualRate = evaluationEntry.artifact.appliedConstants.baseReserveRate;
            const varianceBps = Math.round((projectedRate - actualRate) * 10000);

            records.push({
                projectedAt: projection.artifact.projectedAt,
                evaluatedAt: evaluationEntry.artifact.projectedAt,
                predictedTier,
                actualTier,
                tierVariance: actualTier - predictedTier,
                tierAccurate: predictedTier === actualTier,
                predictedTrend,
                actualTrend,
                trendAccurate: predictedTrend === actualTrend || (predictedTrend === 'DEGRADING' && actualTier >= projection.artifact.inputSnapshot.riskTier),
                projectedReserveRate: projectedRate,
                actualReserveRate: actualRate,
                reserveRateVarianceBps: varianceBps,
            });
        }

        // Also compare most recent against current live state (if enough time elapsed)
        const latest = history[0]; // newest
        const latestTime = new Date(latest.artifact.projectedAt).getTime();
        const now = Date.now();
        if (now - latestTime >= MIN_EVALUATION_WINDOW_MS) {
            // For live comparison, we can only compare tier/trend — no reserve rate from currentSnapshot
            const projectedRate = latest.artifact.appliedConstants.worstCaseReserveRate;
            // Approximate actual rate from current tier using same deterministic mapping
            // We use the base rate from the latest entry's projected tier of the current snapshot
            records.push({
                projectedAt: latest.artifact.projectedAt,
                evaluatedAt: new Date().toISOString(),
                predictedTier: latest.artifact.appliedConstants.projectedTier,
                actualTier: currentSnapshot.riskTier,
                tierVariance: currentSnapshot.riskTier - latest.artifact.appliedConstants.projectedTier,
                tierAccurate: latest.artifact.appliedConstants.projectedTier === currentSnapshot.riskTier,
                predictedTrend: latest.artifact.inputSnapshot.trend,
                actualTrend: currentSnapshot.trend,
                trendAccurate: latest.artifact.inputSnapshot.trend === currentSnapshot.trend,
                projectedReserveRate: projectedRate,
                actualReserveRate: projectedRate, // No actual rate available from snapshot; mark as equal
                reserveRateVarianceBps: 0, // Cannot compute without full snapshot
            });
        }

        const tierCorrect = records.filter(r => r.tierAccurate).length;
        const trendCorrect = records.filter(r => r.trendAccurate).length;

        // Mean absolute reserve variance in bps
        const absVariances = records.filter(r => r.reserveRateVarianceBps !== 0 || r.projectedReserveRate !== r.actualReserveRate);
        const meanVariance = absVariances.length > 0
            ? Math.round(absVariances.reduce((sum, r) => sum + Math.abs(r.reserveRateVarianceBps), 0) / absVariances.length)
            : null;

        return {
            totalProjections: history.length,
            tierPredictionAccuracy: records.length > 0 ? Math.round((tierCorrect / records.length) * 100) : null,
            trendPredictionAccuracy: records.length > 0 ? Math.round((trendCorrect / records.length) * 100) : null,
            meanReserveVarianceBps: meanVariance,
            evaluationWindowHours: MIN_EVALUATION_WINDOW_MS / 3600000,
            versionStability,
            records,
        };
    }
}

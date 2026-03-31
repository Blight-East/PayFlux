'use client';

import { useState } from 'react';

interface VerificationResult {
    valid: boolean;
    hashMatch: boolean;
    reportType: string | null;
    reportVersion: string | null;
    generatedAt: string | null;
    artifactHash: string | null;
    recomputedHash: string | null;
    ledgerRecords: number;
    recordsWithValidHash: number;
    recordsWithValidSignature: number;
    error: string | null;
}

export default function VerifyPage() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState<VerificationResult | null>(null);
    const [verifying, setVerifying] = useState(false);

    async function verify() {
        setVerifying(true);
        setResult(null);

        try {
            const parsed = JSON.parse(input);

            // Determine artifact type
            if (parsed.reportType === 'BOARD_RESERVE_REPORT') {
                await verifyBoardReport(parsed);
            } else if (parsed.payflux_export) {
                await verifyEvidenceExport(parsed);
            } else {
                setResult({
                    valid: false,
                    hashMatch: false,
                    reportType: null,
                    reportVersion: null,
                    generatedAt: null,
                    artifactHash: null,
                    recomputedHash: null,
                    ledgerRecords: 0,
                    recordsWithValidHash: 0,
                    recordsWithValidSignature: 0,
                    error: 'Unrecognized artifact format. Expected BOARD_RESERVE_REPORT or payflux_export envelope.',
                });
            }
        } catch (err) {
            setResult({
                valid: false,
                hashMatch: false,
                reportType: null,
                reportVersion: null,
                generatedAt: null,
                artifactHash: null,
                recomputedHash: null,
                ledgerRecords: 0,
                recordsWithValidHash: 0,
                recordsWithValidSignature: 0,
                error: 'Invalid JSON. Unable to parse input.',
            });
        } finally {
            setVerifying(false);
        }
    }

    async function verifyBoardReport(report: any) {
        // Re-derive the artifact hash from the same payload structure
        const artifactPayload = JSON.stringify({
            forecast: report.currentForecast?.appliedConstants ? {
                inputs: report.currentForecast.inputSnapshot,
                constants: report.currentForecast.appliedConstants,
            } : null,
            accuracy: report.modelAccuracy,
            generatedAt: report.generatedAt,
        });

        const encoder = new TextEncoder();
        const data = encoder.encode(artifactPayload);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const recomputedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const declaredHash = report.integrityDeclaration?.artifactHash || null;
        const hashMatch = declaredHash === recomputedHash;

        // Check ledger record integrity
        const records = report.projectionLedger?.records || [];
        const recordsWithValidHash = records.filter((r: any) => r.verification?.hashValid === true).length;
        const recordsWithValidSignature = records.filter((r: any) => r.verification?.signatureValid === true).length;

        setResult({
            valid: hashMatch,
            hashMatch,
            reportType: report.reportType,
            reportVersion: report.reportVersion,
            generatedAt: report.generatedAt,
            artifactHash: declaredHash,
            recomputedHash,
            ledgerRecords: records.length,
            recordsWithValidHash,
            recordsWithValidSignature,
            error: null,
        });
    }

    async function verifyEvidenceExport(envelope: any) {
        const exp = envelope.payflux_export;

        // Re-derive hash from source data
        const canonicalString = JSON.stringify(exp.source);
        const encoder = new TextEncoder();
        const data = encoder.encode(canonicalString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const recomputedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const declaredHash = exp.integrity_hash || exp.signature?.integrity_hash || null;
        const hashMatch = declaredHash === recomputedHash;

        setResult({
            valid: hashMatch,
            hashMatch,
            reportType: 'EVIDENCE_EXPORT',
            reportVersion: exp.schemaVersion,
            generatedAt: exp.generatedAt,
            artifactHash: declaredHash,
            recomputedHash,
            ledgerRecords: 0,
            recordsWithValidHash: 0,
            recordsWithValidSignature: 0,
            error: null,
        });
    }

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Check a Signed Export</h1>
                <p className="text-gray-500 text-sm mt-1 font-mono">Independent integrity verification for signed PayFlux exports.</p>
            </div>

            {/* Input */}
            <section className="mb-8">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-4">Signed Artifact</div>
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Paste JSON export (Board Reserve Report or Evidence Export envelope)"
                    className="w-full h-64 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-900 resize-none focus:outline-none focus:border-gray-400 transition-colors placeholder-gray-400"
                />
                <div className="flex items-center justify-between mt-4">
                    <div className="text-[10px] text-gray-400 font-mono">
                        {input.length > 0 ? `${input.length.toLocaleString('en-US')} characters` : 'No input'}
                    </div>
                    <button
                        onClick={verify}
                        disabled={!input.trim() || verifying}
                        className="bg-white text-black font-bold py-2 px-6 rounded text-sm hover:bg-slate-200 transition-colors disabled:opacity-30"
                    >
                        {verifying ? 'Verifying…' : 'Verify'}
                    </button>
                </div>
            </section>

            {/* Result */}
            {result && (
                <section className="mb-16">
                    <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-4">Verification Result</div>

                    {result.error ? (
                        <div className="border border-gray-200 rounded-xl px-6 py-6">
                            <div className="text-xs text-amber-500 font-mono">{result.error}</div>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-xl px-6 py-6 space-y-6">
                            {/* Overall Status */}
                            <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${result.valid ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                <div className={`text-lg font-mono font-bold ${result.valid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {result.valid ? 'INTEGRITY VERIFIED' : 'INTEGRITY MISMATCH'}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Type</div>
                                    <div className="text-xs font-mono text-gray-700">{result.reportType}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Version</div>
                                    <div className="text-xs font-mono text-gray-700">{result.reportVersion}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Generated</div>
                                    <div className="text-xs font-mono text-gray-700">
                                        {result.generatedAt ? (() => {
                                            const d = new Date(result.generatedAt);
                                            const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
                                            const day = d.getUTCDate();
                                            const h = String(d.getUTCHours()).padStart(2, '0');
                                            const m = String(d.getUTCMinutes()).padStart(2, '0');
                                            return `${month} ${day}, ${h}:${m} UTC`;
                                        })() : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Hash Comparison */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-2">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Hash Verification</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">Declared</span>
                                    <span className="text-[10px] font-mono text-gray-500">{result.artifactHash ? `${result.artifactHash.slice(0, 32)}…` : '—'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">Recomputed</span>
                                    <span className="text-[10px] font-mono text-gray-500">{result.recomputedHash ? `${result.recomputedHash.slice(0, 32)}…` : '—'}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                    <span className="text-[10px] text-gray-500">Match</span>
                                    <span className={`text-[10px] font-mono font-bold ${result.hashMatch ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {result.hashMatch ? '✓ SHA-256 Match' : '✗ Mismatch'}
                                    </span>
                                </div>
                            </div>

                            {/* Ledger Records (for board reports) */}
                            {result.ledgerRecords > 0 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-2">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Ledger Records</div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-gray-500">Total Records</span>
                                        <span className="text-xs font-mono text-gray-700">{result.ledgerRecords}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-gray-500">Valid Hash</span>
                                        <span className="text-xs font-mono text-emerald-500">{result.recordsWithValidHash} / {result.ledgerRecords}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-gray-500">Valid Signature</span>
                                        <span className="text-xs font-mono text-emerald-500">{result.recordsWithValidSignature} / {result.ledgerRecords}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {/* Methodology */}
            <section className="mb-16">
                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-4">Verification Methodology</div>
                <div className="border border-gray-200 rounded-xl px-6 py-5 space-y-4">
                    <div className="text-xs text-gray-500 leading-relaxed">
                        Verification re-derives the SHA-256 hash from the artifact payload using the same deterministic serialization. If the recomputed hash matches the declared hash, the artifact has not been modified since generation.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] font-mono font-bold text-gray-700 mb-1">Hash Algorithm</div>
                            <div className="text-[10px] text-gray-500">SHA-256</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-mono font-bold text-gray-700 mb-1">Signature Algorithm</div>
                            <div className="text-[10px] text-gray-500">HMAC-SHA256</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-mono font-bold text-gray-700 mb-1">Client-Side Verification</div>
                            <div className="text-[10px] text-gray-500">Hash only (no secret access)</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-mono font-bold text-gray-700 mb-1">Server-Side Verification</div>
                            <div className="text-[10px] text-gray-500">Hash + HMAC signature (requires EVIDENCE_SECRET)</div>
                        </div>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono pt-2 border-t border-gray-100">
                        HMAC signature verification requires server-side access to the signing secret. Client-side verification confirms structural integrity (hash match) but cannot verify signing authority.
                    </div>
                </div>
            </section>
        </div>
    );
}

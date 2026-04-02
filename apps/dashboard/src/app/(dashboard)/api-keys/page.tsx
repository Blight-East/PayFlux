'use client';

import { useEffect, useState } from 'react';

type ApiKeyRecord = {
    id: string;
    label: string;
    keyPrefix: string;
    createdAt: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
};

function formatDate(value: string | null): string {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
}

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [label, setLabel] = useState('Primary key');
    const [plaintextKey, setPlaintextKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadKeys() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/api-keys');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to load API keys');
            }
            setKeys(data.keys || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load API keys');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadKeys();
    }, []);

    async function handleCreate() {
        setCreating(true);
        setError(null);
        setPlaintextKey(null);
        try {
            const res = await fetch('/api/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create API key');
            }
            setPlaintextKey(data.plaintextKey || null);
            setLabel('Primary key');
            await loadKeys();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create API key');
        } finally {
            setCreating(false);
        }
    }

    async function handleRevoke(id: string) {
        setRevokingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/api-keys/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to revoke API key');
            }
            await loadKeys();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to revoke API key');
        } finally {
            setRevokingId(null);
        }
    }

    return (
        <div className="p-8 max-w-5xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">API Keys</h2>
                <p className="text-slate-500 text-sm mt-1">Create real workspace-scoped credentials for programmatic access.</p>
            </div>

            {error ? (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            ) : null}

            {plaintextKey ? (
                <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">New key created</p>
                    <p className="mt-2 text-sm text-slate-300">This is the only time the full key will be shown.</p>
                    <div className="mt-3 rounded border border-slate-800 bg-slate-950 px-4 py-3">
                        <code className="break-all text-sm text-[#0A64BC]">{plaintextKey}</code>
                    </div>
                </div>
            ) : null}

            <div className="mb-8 rounded-lg border border-slate-800 bg-slate-950 p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Create key</h3>
                <p className="mt-2 text-sm text-slate-500">Use this for authenticated scan requests and future workspace integrations.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Primary key"
                        className="flex-1 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="rounded bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-slate-200 disabled:opacity-50"
                    >
                        {creating ? 'Creating...' : 'Create API key'}
                    </button>
                </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Workspace keys</h3>
                    <p className="mt-2 text-sm text-slate-500">Revoke old keys aggressively. Only active keys should remain in circulation.</p>
                </div>

                {loading ? (
                    <div className="py-8 text-sm text-slate-500">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="py-8 text-sm text-slate-500">No keys created yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-800 text-slate-500">
                                <tr>
                                    <th className="pb-3">Label</th>
                                    <th className="pb-3">Prefix</th>
                                    <th className="pb-3">Created</th>
                                    <th className="pb-3">Last used</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {keys.map((key) => {
                                    const active = !key.revokedAt;
                                    return (
                                        <tr key={key.id}>
                                            <td className="py-4 text-white">{key.label}</td>
                                            <td className="py-4 font-mono text-[#0A64BC]">{key.keyPrefix}...</td>
                                            <td className="py-4 text-slate-400">{formatDate(key.createdAt)}</td>
                                            <td className="py-4 text-slate-400">{formatDate(key.lastUsedAt)}</td>
                                            <td className="py-4">
                                                <span className={active ? 'text-emerald-400' : 'text-slate-500'}>
                                                    {active ? 'Active' : `Revoked ${formatDate(key.revokedAt)}`}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                {active ? (
                                                    <button
                                                        onClick={() => handleRevoke(key.id)}
                                                        disabled={revokingId === key.id}
                                                        className="rounded border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                                                    >
                                                        {revokingId === key.id ? 'Revoking...' : 'Revoke'}
                                                    </button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

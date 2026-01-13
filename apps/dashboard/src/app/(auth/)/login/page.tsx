'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        // In a real app, this would be a server action or API call
        // For MVP, we'll just set the cookie if it matches the env on the client (or send to api/login)
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        if (res.ok) {
            router.push('/dashboard');
        } else {
            setError('Invalid admin token');
        }
    };

    return (
        <div className="flex min-h-screen bg-black items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8 bg-zinc-950 p-8 border border-zinc-900 rounded-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">PayFlux</h1>
                    <p className="mt-2 text-sm text-zinc-500">Sign in to your control plane</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="token" className="block text-xs font-medium text-zinc-400 uppercase tracking-widest mb-2">
                            Admin Token
                        </label>
                        <input
                            id="token"
                            name="token"
                            type="password"
                            required
                            className="w-full bg-black border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="••••••••••••••••"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-white text-black font-bold py-2 rounded text-sm hover:bg-zinc-200 transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}

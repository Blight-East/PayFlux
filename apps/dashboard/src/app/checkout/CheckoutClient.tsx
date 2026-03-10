'use client';

import { useState } from 'react';

export default function CheckoutClient({ workspaceId }: { workspaceId: string }) {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/checkout/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Unable to start checkout. Please try again.');
                setLoading(false);
            }
        } catch {
            alert('Unable to connect to payment system. Please try again.');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full text-sm font-medium text-slate-950 bg-white hover:bg-slate-200 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait"
        >
            {loading ? 'Loading...' : 'Subscribe to Pro'}
        </button>
    );
}

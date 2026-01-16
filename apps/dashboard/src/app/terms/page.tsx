'use client';

import { useEffect } from 'react';

export default function TermsRedirect() {
    useEffect(() => {
        window.location.replace('https://payflux.dev/terms');
    }, []);

    return (
        <div className="min-h-screen bg-black text-zinc-400 flex items-center justify-center">
            <div className="text-center">
                <p className="text-lg">Redirecting to Terms of Service...</p>
            </div>
        </div>
    );
}

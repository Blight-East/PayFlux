'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STALE_KEYS = ['checkout', 'cancelled', 'session_id'];

export default function LegacyCheckoutQuerySanitizer() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        let changed = false;

        for (const key of STALE_KEYS) {
            if (params.has(key)) {
                params.delete(key);
                changed = true;
            }
        }

        if (!changed) return;

        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [pathname, router, searchParams]);

    return null;
}

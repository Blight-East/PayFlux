'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isOnboardingRoute, isProtectedRoute } from '@/lib/onboarding-guard';

export default function OnboardingGate({
    onboardingRequired,
    children,
}: {
    onboardingRequired: boolean;
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    const shouldRedirect = Boolean(
        onboardingRequired &&
        pathname &&
        isProtectedRoute(pathname) &&
        !isOnboardingRoute(pathname)
    );

    useEffect(() => {
        if (shouldRedirect) {
            router.replace('/setup');
        }
    }, [router, shouldRedirect]);

    if (shouldRedirect) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-5 py-4 text-sm text-zinc-400">
                    Redirecting to setup...
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

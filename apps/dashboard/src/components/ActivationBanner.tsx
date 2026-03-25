'use client';

import { useSearchParams } from 'next/navigation';

interface ActivationBannerProps {
    isActivated: boolean;
    isWarming: boolean;
    activationMeta?: {
        baselineGeneratedAt?: string;
        firstProjectionAt?: string;
        alertPolicyArmedAt?: string;
        activationCompletedAt?: string;
    };
}

export default function ActivationBanner({ isActivated, isWarming, activationMeta }: ActivationBannerProps) {
    const searchParams = useSearchParams();
    const justActivated = searchParams.get('activated') === 'true';

    // Freshly activated — show success banner
    if (isActivated && justActivated) {
        return (
            <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-emerald-300">
                        PayFlux is now watching your processor activity live.
                    </p>
                    <p className="text-xs text-emerald-400/60 mt-1">
                        Alerts are on for held-fund risk, worsening payout pressure, and rising account risk.
                    </p>
                </div>
            </div>
        );
    }

    // Still warming up — show warm-up banner
    if (isWarming) {
        return (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </div>
                </div>
                <div>
                    <p className="text-sm font-medium text-amber-300">
                        PayFlux is still learning your payout pattern.
                    </p>
                    <p className="text-xs text-amber-400/60 mt-1">
                        Live processor data is still being pulled in. Your first risk estimate will appear as soon as setup finishes.
                    </p>
                </div>
            </div>
        );
    }

    return null;
}

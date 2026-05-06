'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

// ─────────────────────────────────────────────────────────────────────────────
// Returning User Banner
//
// Shown once per session when:
//   - User has a Stripe connection
//   - User is on the free tier
//   - User has previously seen the dashboard
//
// Creates temporal pressure: "things may have changed since you last looked"
// Does NOT fabricate risk — it implies change is possible.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'payflux_returning_banner_dismissed';

interface ReturningUserBannerProps {
    onUpgradeClick: () => void;
    riskSignal?: string;
}

export default function ReturningUserBanner({ onUpgradeClick, riskSignal }: ReturningUserBannerProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Check if this is a returning user (has previous session marker)
        const previousVisit = localStorage.getItem('payflux_dashboard_visited');
        const dismissedThisSession = sessionStorage.getItem(SESSION_KEY);

        if (previousVisit && !dismissedThisSession) {
            setVisible(true);
            logOnboardingEventClient('upgrade_viewed', {
                trigger_type: 'returning_user',
                risk_signal: riskSignal,
            });
        }

        // Mark this visit for future sessions
        localStorage.setItem('payflux_dashboard_visited', new Date().toISOString());
    }, [riskSignal]);

    function handleDismiss() {
        sessionStorage.setItem(SESSION_KEY, '1');
        setVisible(false);
    }

    function handleUpgrade() {
        logOnboardingEventClient('upgrade_checkout_clicked', {
            trigger_type: 'returning_user',
            risk_signal: riskSignal,
        });
        onUpgradeClick();
    }

    if (!visible) return null;

    const isHighRisk = riskSignal === 'ACCELERATING' || riskSignal === 'ELEVATED';

    return (
        <div className={`rounded-xl border p-4 mb-4 ${
            isHighRisk
                ? 'bg-red-50/50 border-red-200'
                : 'bg-amber-50/50 border-amber-200'
        }`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isHighRisk ? 'text-red-500' : 'text-amber-500'
                    }`} />
                    <div className="space-y-1">
                        <p className={`text-sm font-medium ${isHighRisk ? 'text-red-900' : 'text-amber-900'}`}>
                            Your risk profile may have changed since your last check
                        </p>
                        <p className={`text-xs ${isHighRisk ? 'text-red-700/70' : 'text-amber-700/70'}`}>
                            {isHighRisk
                                ? 'Elevated risk was previously detected. You\'re still limited to 30 days of visibility.'
                                : 'Unlock full visibility to see updated 60 and 90-day projections.'
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleUpgrade}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isHighRisk
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                    >
                        See full projection <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1.5"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}

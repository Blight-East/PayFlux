'use client';

import { useEffect, useCallback } from 'react';
import { X, AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

// ─────────────────────────────────────────────────────────────────────────────
// Upgrade Modal — Core Conversion Unit
//
// Triggered at high-intent moments only:
//   1. Clicking locked projection panels (T+60 / T+90)
//   2. Attempting board-grade export on free tier
//   3. Returning user banner interaction
//
// Framing: loss of financial visibility, NOT feature access.
// ─────────────────────────────────────────────────────────────────────────────

export type UpgradeTrigger = 'locked_panel' | 'export' | 'returning_user';

interface UpgradeModalProps {
    open: boolean;
    onClose: () => void;
    trigger: UpgradeTrigger;
    /** Current visible risk from T+30 projection, e.g. "$12,400" */
    visibleRisk?: string;
    /** Instability signal for urgency calibration */
    riskSignal?: 'ACCELERATING' | 'ELEVATED' | 'LATENT' | 'RECOVERING' | 'NOMINAL';
    /** Whether Stripe is connected (for context) */
    hasStripeConnection?: boolean;
}

function riskIsHigh(signal?: string): boolean {
    return signal === 'ACCELERATING' || signal === 'ELEVATED';
}

function headlineForTrigger(trigger: UpgradeTrigger, isHighRisk: boolean): string {
    switch (trigger) {
        case 'locked_panel':
            return isHighRisk
                ? 'You may be exposed beyond what you can see'
                : 'You\'re missing future risk visibility';
        case 'export':
            return 'Full projections required for export';
        case 'returning_user':
            return 'Your exposure may have changed';
    }
}

function contextForTrigger(trigger: UpgradeTrigger, visibleRisk?: string, isHighRisk?: boolean): string {
    const riskLine = visibleRisk
        ? `Your 30-day projection shows ${visibleRisk} at risk.`
        : 'Your 30-day projection is active.';

    switch (trigger) {
        case 'locked_panel':
            return isHighRisk
                ? `${riskLine} Risk typically increases in the 60 and 90-day windows — and you cannot currently see them.`
                : `${riskLine} The 60 and 90-day windows are not visible on your current plan.`;
        case 'export':
            return `Board-grade reports require full 30/60/90-day projections. You need complete risk visibility to generate an export.`;
        case 'returning_user':
            return `${riskLine} Processor behavior changes over time. You're still limited to a 30-day view.`;
    }
}

function urgencyLine(signal?: string): string | null {
    switch (signal) {
        case 'ACCELERATING':
            return 'Elevated risk detected — your exposure is likely increasing beyond day 30.';
        case 'ELEVATED':
            return 'Your risk profile suggests additional reserves may be applied beyond your visible window.';
        case 'LATENT':
            return 'Early warning signals are present. The 60 and 90-day trajectory matters here.';
        default:
            return null;
    }
}

export default function UpgradeModal({
    open,
    onClose,
    trigger,
    visibleRisk,
    riskSignal,
    hasStripeConnection,
}: UpgradeModalProps) {
    const isHighRisk = riskIsHigh(riskSignal);

    // Track modal view
    useEffect(() => {
        if (open) {
            logOnboardingEventClient('upgrade_viewed', {
                trigger_type: trigger,
                risk_signal: riskSignal,
                has_stripe: hasStripeConnection,
                visible_risk: visibleRisk,
            });
        }
    }, [open, trigger, riskSignal, hasStripeConnection, visibleRisk]);

    // ESC to close
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (open) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [open, handleKeyDown]);

    if (!open) return null;

    const headline = headlineForTrigger(trigger, isHighRisk);
    const context = contextForTrigger(trigger, visibleRisk, isHighRisk);
    const urgency = urgencyLine(riskSignal);

    function handleUpgradeClick() {
        logOnboardingEventClient('upgrade_checkout_clicked', {
            trigger_type: trigger,
            risk_signal: riskSignal,
            has_stripe: hasStripeConnection,
        });
        // Navigate to upgrade/checkout page
        window.location.href = '/upgrade';
    }

    function handleDismiss() {
        logOnboardingEventClient('connect_skipped', {
            trigger_type: trigger,
            action: 'upgrade_dismissed',
            risk_signal: riskSignal,
        });
        onClose();
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
        >
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Visual tension bar */}
                <div className={`h-1.5 w-full ${isHighRisk ? 'bg-red-500' : 'bg-amber-400'}`} />

                <div className="p-8 space-y-6">
                    {/* Icon + headline */}
                    <div className="space-y-3">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
                            isHighRisk
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-amber-50 border border-amber-200'
                        }`}>
                            <EyeOff className={`w-6 h-6 ${isHighRisk ? 'text-red-500' : 'text-amber-500'}`} />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                            {headline}
                        </h2>
                    </div>

                    {/* Context paragraph */}
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {context}
                    </p>

                    {/* Urgency callout — only shown when risk warrants it */}
                    {urgency && (
                        <div className={`flex items-start gap-3 rounded-lg border p-4 ${
                            isHighRisk
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-amber-50/50 border-amber-200'
                        }`}>
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                isHighRisk ? 'text-red-500' : 'text-amber-500'
                            }`} />
                            <p className={`text-xs leading-relaxed ${
                                isHighRisk ? 'text-red-700' : 'text-amber-700'
                            }`}>
                                {urgency}
                            </p>
                        </div>
                    )}

                    {/* What you're blind to — loss framing */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                            <p className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-bold">
                                What you can't currently see
                            </p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            <div className="flex items-center gap-3 px-5 py-3.5">
                                <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">60 and 90-day reserve projections</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Where most processor holds actually happen</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-5 py-3.5">
                                <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Reserve escalation trajectory</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Whether your risk is accelerating or stabilizing</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 px-5 py-3.5">
                                <EyeOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Intervention modeling and confidence bands</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Which actions reduce exposure and by how much</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Framing line */}
                    <p className="text-xs text-gray-500 text-center leading-relaxed">
                        Processor decisions happen before you see them.<br />
                        You're currently blind beyond 30 days.
                    </p>

                    {/* CTAs */}
                    <div className="space-y-3">
                        <button
                            onClick={handleUpgradeClick}
                            className={`w-full py-3.5 rounded-lg text-sm font-semibold transition-colors ${
                                isHighRisk
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                            }`}
                        >
                            Unlock full projection &rarr;
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="w-full py-3 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Continue with limited visibility
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

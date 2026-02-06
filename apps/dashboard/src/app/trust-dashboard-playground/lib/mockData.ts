// DEMO ONLY — DELETE BEFORE PROD

import { EventItem } from './types';

export const HEALTHY_EVENTS: EventItem[] = [
    {
        id: 1,
        time: '14:32:11.402',
        sev: 'HIGH',
        event: 'Dispute filed – cardholder claims fraud',
        tcs: 72,
        color: 'bg-tcs-low',
        details: {
            payload: '{"type": "dispute", "reason": "fraudulent", "amount": 142.00, "currency": "USD"}',
            breakdown: [
                { label: 'Watermark verified', score: '+30', type: 'plus' },
                { label: 'Source active (Stripe)', score: '+25', type: 'plus' },
                { label: 'Not cross-verified', score: '-15', type: 'minus' },
                { label: 'Timestamp offset detected', score: '-10', type: 'minus' },
                { label: 'Historical pattern match', score: '+8', type: 'plus' },
            ],
            recommendation: 'Treat as credible but verify via secondary channel before actioning.'
        }
    },
    {
        id: 2,
        time: '14:29:45.011',
        sev: 'MEDIUM',
        event: 'Velocity spike – repeated small auths',
        tcs: 58,
        color: 'bg-tcs-medium',
        details: {
            payload: '{"type": "velocity_check", "count": 12, "period": "60s"}',
            breakdown: [
                { label: 'Source active (Stripe)', score: '+25', type: 'plus' },
                { label: 'Unverified Watermark Gap', score: '-40', type: 'minus' },
                { label: 'Historical consistency', score: '+15', type: 'plus' },
            ],
            recommendation: 'Potential automated attack. Monitor closely.'
        }
    },
    { id: 3, time: '14:28:02.883', sev: 'LOW', event: 'Pattern mismatch – anomalous OS version', tcs: 91, color: 'bg-zinc-500' },
    { id: 4, time: '14:27:18.109', sev: 'LOW', event: 'Geolocation drift – VPN detected', tcs: 88, color: 'bg-zinc-500' },
];

export const VIOLATION_EVENTS: EventItem[] = [
    {
        id: 99,
        time: '14:41:02.991',
        sev: 'HIGH',
        event: 'CREDIBILITY VIOLATION DETECTED - Watermark Broken',
        tcs: 12,
        color: 'bg-tcs-low',
        details: {
            payload: '{"violation": "watermark_mismatch", "expected_seq": 1047, "received_seq": 1049, "witness": "validator-02"}',
            breakdown: [
                { label: 'Watermark Registry Failure', score: '-60', type: 'minus' },
                { label: 'Source entropy spike', score: '-20', type: 'minus' },
                { label: 'Evidence chain broken', score: '-15', type: 'minus' },
            ],
            recommendation: 'DO NOT PROCESS TRANSACTIONS. Contact PayFlux support immediately. Evidence archived for audit.'
        }
    },
    ...HEALTHY_EVENTS
];

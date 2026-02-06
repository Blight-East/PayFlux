// DEMO ONLY — DELETE BEFORE PROD

export type SystemState = 'HEALTHY' | 'OFFLINE' | 'VIOLATION';

export interface EventItem {
    id: number;
    time: string;
    sev: 'HIGH' | 'MEDIUM' | 'LOW';
    event: string;
    tcs: number;
    color: string;
    details?: {
        payload: string;
        breakdown: { label: string; score: string; type: 'plus' | 'minus' }[];
        recommendation: string;
    };
}

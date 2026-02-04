import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

export function useRiskFeed() {
    const [events, setEvents] = useState([]);
    const [meta, setMeta] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [transport, setTransport] = useState('initializing'); // 'sse' | 'poll' | 'initializing'
    const [lastHeartbeat, setLastHeartbeat] = useState(null);

    // Polling Logic (Fallback)
    const { data: pollData, error: pollError, mutate: mutatePoll } = useSWR(
        transport === 'poll' ? '/api/risk/feed' : null,
        fetcher,
        {
            refreshInterval: 5000,
            revalidateOnFocus: true
        }
    );

    // SSE Logic
    useEffect(() => {
        let eventSource = null;

        const connectSSE = () => {
            // Don't open if already open
            if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

            eventSource = new EventSource('/api/risk/stream');

            eventSource.addEventListener('ledger', (e) => {
                try {
                    const data = JSON.parse(e.data);

                    // Intelligent Merge: Don't let watermark drop to null/0 if we had a better one
                    if (data.meta?.watermark) {
                        setMeta(prev => {
                            const newW = data.meta.watermark;
                            const oldW = prev.watermark;

                            // If new is degraded/empty but we have a good one, keep ours
                            if ((!newW.seq || newW.seq === 0) && oldW && oldW.seq > 0) {
                                return { ...data.meta, watermark: oldW };
                            }
                            return data.meta || {};
                        });
                    } else {
                        setMeta(data.meta || {});
                    }

                    setEvents(data.events || []);
                    setIsLoading(false);
                    setTransport('sse');
                } catch (err) {
                    console.error("SSE Parse Error", err);
                }
            });

            eventSource.addEventListener('heartbeat', (e) => {
                try {
                    const hb = JSON.parse(e.data);
                    setLastHeartbeat(hb.generatedAt);

                    if (hb.credibility) {
                        setMeta(prev => {
                            // Only update if absent or newer
                            const oldCred = prev.credibility;
                            const newCred = hb.credibility;

                            if (!oldCred || new Date(newCred.computedAt) > new Date(oldCred.computedAt)) {
                                return { ...prev, credibility: newCred };
                            }
                            return prev;
                        });
                    }
                } catch (err) { }
            });

            eventSource.onerror = () => {
                console.warn("SSE connection failed. Falling back to polling.");
                eventSource.close();
                setTransport('poll');

                // Immediate fetch fallback
                mutatePoll();
            };
        };

        // Try SSE initially
        if (transport !== 'poll') {
            connectSSE();
        }

        return () => {
            if (eventSource) eventSource.close();
        };
    }, [transport, mutatePoll]);

    // Sync SWR data to state when polling
    useEffect(() => {
        if (transport === 'poll' && pollData) {
            setEvents(pollData.events || []);
            setMeta(pollData.meta || {});
            setIsLoading(false);
        }
    }, [transport, pollData]);

    const hasEvents = events.length > 0;

    // Enhance meta with client-side annotations
    const enrichedMeta = {
        ...meta,
        client: {
            transport,
            lastHeartbeat
        }
    };

    return {
        events,
        meta: enrichedMeta,
        hasEvents,
        isLoading,
        error: transport === 'poll' ? pollError : null
    };
}

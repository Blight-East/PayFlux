import { getRiskLedgerState } from '../_lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let lastWatermark = null;
            let lastCredibility = null;
            let consecutiveFailures = 0;
            const MAX_FAILURES = 3;

            let refreshInterval;

            // Heartbeat loop (15s)
            const heartbeatInterval = setInterval(() => {
                if (consecutiveFailures >= MAX_FAILURES) return;

                try {
                    const heartbeat = {
                        generatedAt: new Date().toISOString(),
                        type: 'heartbeat',
                        watermark: lastWatermark,
                        credibility: lastCredibility
                    };
                    controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify(heartbeat)}\n\n`));
                } catch (e) {
                    cleanup();
                }
            }, 15000);

            // Fetch loop (5s)
            const refreshLedger = async () => {
                if (consecutiveFailures >= MAX_FAILURES) {
                    cleanup();
                    return;
                }

                try {
                    const data = await getRiskLedgerState({
                        requestUrl: request.url,
                        previousWatermark: lastWatermark
                    });

                    // Update cache only if new watermark is valid (never regress to null/0)
                    if (data.meta?.watermark && data.meta.watermark.seq !== null && data.meta.watermark.seq !== 0) {
                        lastWatermark = data.meta.watermark;
                    }
                    if (data.meta?.credibility) {
                        lastCredibility = data.meta.credibility;
                    }

                    controller.enqueue(encoder.encode(`event: ledger\ndata: ${JSON.stringify(data)}\n\n`));
                    consecutiveFailures = 0; // Reset on success
                } catch (e) {
                    consecutiveFailures++;
                    if (consecutiveFailures >= MAX_FAILURES) {
                        console.error("[SSE] Max failures reached. Closing stream.");
                        cleanup();
                    }
                }
            };

            const cleanup = () => {
                clearInterval(heartbeatInterval);
                if (refreshInterval) clearInterval(refreshInterval);
                try { controller.close(); } catch (e) { }
            };

            // Initial send
            await refreshLedger();

            refreshInterval = setInterval(refreshLedger, 5000);

            // Cleanup on close
            request.signal.addEventListener('abort', cleanup);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    });
}

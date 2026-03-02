import type { Config } from "@netlify/functions";

/**
 * Projection Cadence Cron
 *
 * Runs every 6 hours. Calls the internal projection-cadence endpoint
 * which iterates all active merchants, computes projections, and writes
 * signed artifacts to the ledger.
 *
 * Schedule: 0 */6 * * * (every 6 hours: 00:00, 06:00, 12:00, 18:00 UTC)
 */
export default async function handler() {
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (!siteUrl || !cronSecret) {
        console.error("[PROJECTION_CRON] Missing URL or CRON_SECRET");
        return new Response(
            JSON.stringify({ error: "Missing configuration" }),
            { status: 500 }
        );
    }

    const endpoint = `${siteUrl}/api/cron/projection-cadence`;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cronSecret}`,
                "Content-Type": "application/json",
            },
        });

        const body = await res.json();
        console.log("[PROJECTION_CRON] Result:", JSON.stringify(body));

        return new Response(JSON.stringify(body), { status: res.status });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[PROJECTION_CRON] Failed:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500 }
        );
    }
}

export const config: Config = {
    schedule: "0 */6 * * *",
};

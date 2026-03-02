/**
 * Projection Cadence Cron
 *
 * Runs every 6 hours. Calls the internal projection-cadence endpoint
 * which iterates all active merchants, computes projections, and writes
 * signed artifacts to the ledger.
 *
 * Schedule: 0 0,6,12,18 * * * (every 6 hours UTC)
 */
exports.handler = async function () {
    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const cronSecret = process.env.CRON_SECRET;

    if (!siteUrl || !cronSecret) {
        console.error("[PROJECTION_CRON] Missing URL or CRON_SECRET");
        return { statusCode: 500, body: JSON.stringify({ error: "Missing configuration" }) };
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

        return { statusCode: res.status, body: JSON.stringify(body) };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[PROJECTION_CRON] Failed:", message);
        return { statusCode: 500, body: JSON.stringify({ error: message }) };
    }
};

exports.config = {
    schedule: "0 0,6,12,18 * * *",
};

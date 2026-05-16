// Operational rounds — DB-substrate read-only health audit.
//
// This is a cockpit preflight, not a monitoring platform.
//
// What this script does:
//   - read-only queries against the production (or branch) Postgres
//   - flat, scannable text output with raw numbers
//   - explicit "not observable from DB" section listing what to check separately
//
// What this script must NOT become:
//   - a metrics framework
//   - alerting orchestration
//   - dashboard backend
//   - configurable rules engine
//   - "health score" interpretation layer
//
// If a number is 3, print "3" — not "degraded." Operators stay close to raw
// truth. Interpretation belongs in operator judgment, not in this script.
//
// Run:
//   DIRECT_URL=... node scripts/operational-rounds.mjs
//
// Falls back to DATABASE_URL if DIRECT_URL is unset. The pooler URL works
// fine for these read-only single-statement queries; the direct URL is
// preferred for consistency with the migration runner and reducer.

import pg from 'pg';
const { Client } = pg;

function getDatabaseUrl() {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) {
        console.error('DIRECT_URL or DATABASE_URL is required');
        process.exit(2);
    }
    return url;
}

function pad(label, width = 38) {
    return label.padEnd(width);
}

async function main() {
    const client = new Client({ connectionString: getDatabaseUrl() });
    await client.connect();

    const ts = new Date().toISOString();
    console.log(`[${ts}] payflux operational rounds  (DB substrate only)`);
    console.log('');

    try {
        // ------ migrations ------
        console.log('migrations:');
        {
            const r = await client.query(`SELECT count(*)::int AS n FROM schema_migrations`);
            console.log(`  ${pad('schema_migrations tracked:')} ${r.rows[0].n}`);
        }
        console.log('');

        // ------ reducer cursors ------
        console.log('reducer cursors:');
        {
            const cursors = await client.query(`
                SELECT
                    reducer_name, reducer_version,
                    cursor_received_at,
                    EXTRACT(EPOCH FROM (now() - last_heartbeat_at))::int AS heartbeat_age_s,
                    EXTRACT(EPOCH FROM (now() - updated_at))::int AS update_age_s
                FROM reducer_cursors
                ORDER BY reducer_name, reducer_version
            `);
            if (cursors.rows.length === 0) {
                console.log('  (none)');
            } else {
                for (const c of cursors.rows) {
                    console.log(`  ${c.reducer_name}/${c.reducer_version}`);
                    console.log(`    ${pad('cursor_received_at:', 28)} ${c.cursor_received_at.toISOString()}`);
                    console.log(`    ${pad('last_heartbeat_age_s:', 28)} ${c.heartbeat_age_s}`);
                    console.log(`    ${pad('updated_at_age_s:', 28)} ${c.update_age_s}`);
                }
            }
        }
        console.log('');

        // ------ active epochs ------
        console.log('active replay epochs:');
        {
            const r = await client.query(`
                SELECT
                    substring(id::text, 1, 8) AS id,
                    reducer_name, reducer_version,
                    events_processed, projections_written, conflicts_emitted,
                    EXTRACT(EPOCH FROM (now() - started_at))::int AS age_s
                FROM replay_epochs
                WHERE completed_at IS NULL AND aborted_at IS NULL
                ORDER BY started_at
            `);
            if (r.rows.length === 0) {
                console.log('  (none)');
            } else {
                for (const e of r.rows) {
                    console.log(`  ${e.id}  ${e.reducer_name}/${e.reducer_version}  scanned=${e.events_processed}  projected=${e.projections_written}  conflicts=${e.conflicts_emitted}  age_s=${e.age_s}`);
                }
            }
        }
        console.log('');

        // ------ aborted epochs (7d window) ------
        console.log('aborted replay epochs (7d):');
        {
            const r = await client.query(`
                SELECT
                    substring(id::text, 1, 8) AS id,
                    reducer_name, reducer_version, aborted_at, abort_reason
                FROM replay_epochs
                WHERE aborted_at IS NOT NULL
                  AND aborted_at > now() - interval '7 days'
                ORDER BY aborted_at DESC LIMIT 10
            `);
            if (r.rows.length === 0) {
                console.log('  (none)');
            } else {
                for (const e of r.rows) {
                    const reason = (e.abort_reason || '').slice(0, 80);
                    console.log(`  ${e.id}  ${e.reducer_name}/${e.reducer_version}  at=${e.aborted_at.toISOString()}  reason=${reason}`);
                }
            }
        }
        console.log('');

        // ------ ledger ------
        console.log('ledger:');
        {
            const total = await client.query(`SELECT count(*)::int AS n FROM stripe_event_ledger`);
            console.log(`  ${pad('stripe_event_ledger rows:')} ${total.rows[0].n}`);

            const byOutcome = await client.query(`
                SELECT verify_outcome, count(*)::int AS n
                FROM stripe_event_ledger
                GROUP BY verify_outcome
                ORDER BY verify_outcome
            `);
            const outcomes = ['primary', 'fallback', 'connect', 'per_account', 'fail', 'no_signature', 'malformed'];
            const have = Object.fromEntries(byOutcome.rows.map(r => [r.verify_outcome, r.n]));
            const line = outcomes.map(o => `${o}=${have[o] || 0}`).join('  ');
            console.log(`  ${pad('verify_outcome breakdown:')} ${line}`);

            const stuck = await client.query(`
                SELECT count(*)::int AS n
                FROM processed_webhooks
                WHERE status = 'received'
                  AND created_at < now() - interval '5 minutes'
            `);
            console.log(`  ${pad('processed_webhooks stuck >5m:')} ${stuck.rows[0].n}`);
        }
        console.log('');

        // ------ projections ------
        console.log('projections:');
        {
            const proj = await client.query(`SELECT count(*)::int AS n FROM subscription_projection`);
            console.log(`  ${pad('subscription_projection rows:')} ${proj.rows[0].n}`);

            const conflicts = await client.query(`SELECT count(*)::int AS n FROM subscription_projection_conflicts`);
            console.log(`  ${pad('subscription_projection_conflicts:')} ${conflicts.rows[0].n}`);
        }
        console.log('');

        // ------ drift ------
        console.log('drift:');
        {
            const open = await client.query(`
                SELECT severity, sum(open_count)::int AS n
                FROM subscription_drift_open
                GROUP BY severity
            `);
            const severities = ['informational', 'warning', 'critical', 'regulatory'];
            const have = Object.fromEntries(open.rows.map(r => [r.severity, r.n]));
            const total = Object.values(have).reduce((a, b) => a + b, 0);
            console.log(`  ${pad('subscription_drift_open total:')} ${total}`);
            console.log(`  ${pad('by severity:')} ${severities.map(s => `${s}=${have[s] || 0}`).join('  ')}`);

            const recon24h = await client.query(`
                SELECT count(*)::int AS n
                FROM subscription_reconciliation_events
                WHERE detected_at > now() - interval '24 hours'
            `);
            console.log(`  ${pad('reconciliation events (24h):')} ${recon24h.rows[0].n}`);
        }
        console.log('');

        // ------ not observable from DB ------
        console.log('not observable from DB (check separately):');
        console.log('  detector process status:    fly status --app payflux-drift-detector');
        console.log('  detector sweep cadence:     fly logs --app payflux-drift-detector --no-tail | grep "sweep complete" | tail');
        console.log('  reducer process status:     fly status --app payflux-reducer');
        console.log('  reducer log emission:       fly logs --app payflux-reducer --no-tail | tail');
        console.log('');

        console.log('[rounds complete]');
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error('rounds failed:', err.message);
    process.exit(1);
});

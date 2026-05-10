-- Append-only ledger of every Stripe webhook delivery this service receives,
-- captured BEFORE signature verification so the audit trail is complete even
-- for rejected events. Signature failures are themselves a security signal —
-- losing them to a 400 response throws away forensic value.
--
-- Code discipline: this table is INSERT-only. No UPDATE, no DELETE in the
-- handler. A future retention policy can move rows to cold storage.

CREATE TABLE IF NOT EXISTS stripe_event_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parsed from the body if present. May be null when the body is
    -- malformed or when an attacker probes with junk. Not unique because
    -- Stripe retries deliver the same event_id many times and each delivery
    -- is its own audit record.
    stripe_event_id text,

    -- Raw bytes from the request, exactly as received. Stored as text (not
    -- jsonb) because jsonb normalizes whitespace/ordering and signature
    -- verification depends on byte-exact payload.
    payload text NOT NULL,
    payload_size_bytes integer NOT NULL,

    -- Stripe-Signature header value (or NULL if missing). Combined with
    -- payload, this is what's needed to re-verify the event historically
    -- against any past or future webhook secret.
    signature_header text,

    -- Result of signature verification on this delivery.
    verify_outcome text NOT NULL CHECK (verify_outcome IN (
        'primary',         -- verified against current STRIPE_WEBHOOK_SECRET
        'fallback',        -- verified against STRIPE_WEBHOOK_SECRET_FALLBACK (during rotation)
        'per_account',     -- verified against per-merchant secret in processor_connections
        'fail',            -- signature present but did not verify against any secret
        'no_signature',    -- request arrived without a Stripe-Signature header
        'malformed'        -- body was not valid JSON / could not be parsed
    )),

    received_at timestamptz NOT NULL DEFAULT now()
);

-- Forensic lookup by event_id (e.g., trace a specific Stripe event's delivery history)
CREATE INDEX IF NOT EXISTS stripe_event_ledger_event_id_idx
    ON stripe_event_ledger (stripe_event_id)
    WHERE stripe_event_id IS NOT NULL;

-- Time-series queries for ops dashboards (recent activity, ingestion latency)
CREATE INDEX IF NOT EXISTS stripe_event_ledger_received_at_idx
    ON stripe_event_ledger (received_at DESC);

-- Anomaly queries (signature failures, malformed, missing-signature attempts)
CREATE INDEX IF NOT EXISTS stripe_event_ledger_outcome_idx
    ON stripe_event_ledger (verify_outcome, received_at DESC)
    WHERE verify_outcome IN ('fail', 'no_signature', 'malformed');

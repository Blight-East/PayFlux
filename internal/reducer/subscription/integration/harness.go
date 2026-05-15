// Package integration is the substrate validation harness.
//
// This is NOT a unit test suite. It is certification infrastructure for
// substrate invariants — the executable artifact that converts every
// claim in SUBSCRIPTION_REDUCER_CONTRACT.md and LEDGER_CONTRACT.md into
// a pass/fail proof against a real Postgres.
//
// The harness:
//
//   - Connects to an ephemeral Postgres (set INTEGRATION_DATABASE_URL).
//   - Applies all migrations from apps/dashboard/src/lib/db/migrations/
//     in order, from zero.
//   - Provides helpers for inserting synthetic ledger events and
//     canonical billing rows.
//   - Drives the reducer and the drift detector against the populated
//     substrate.
//
// Tests that use the harness skip cleanly when INTEGRATION_DATABASE_URL
// is unset, so `go test ./...` from a developer machine doesn't require
// Docker. CI spins up Postgres via the GitHub Actions services block.
package integration

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// migrationsDir is the path from the repo root to the dashboard's
// migration files. The harness resolves it relative to the package's
// runtime location.
const migrationsDirRelative = "../../../../apps/dashboard/src/lib/db/migrations"

// IntegrationDatabaseURL is the env var the harness reads. Tests skip
// when it's unset. CI sets it to point at the ephemeral Postgres service.
const IntegrationDatabaseURLEnv = "INTEGRATION_DATABASE_URL"

// SetupSubstrate prepares an isolated Postgres for the test: applies
// every migration from 0000 onward, returns a *sql.DB scoped to the test.
// Tests cleanly skip when the integration env var is unset.
//
// Each call to SetupSubstrate DROPS and RECREATES the public schema so
// tests are independent. The migration set is then reapplied.
func SetupSubstrate(t *testing.T) *sql.DB {
	t.Helper()

	dsn := os.Getenv(IntegrationDatabaseURLEnv)
	if dsn == "" {
		t.Skipf("%s not set; substrate integration tests skipped", IntegrationDatabaseURLEnv)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping postgres: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	// Wipe + rebuild the schema for clean isolation between tests.
	resetSchema(t, db)

	if err := applyMigrations(context.Background(), db); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	return db
}

func resetSchema(t *testing.T, db *sql.DB) {
	t.Helper()
	statements := []string{
		`DROP SCHEMA IF EXISTS public CASCADE`,
		`CREATE SCHEMA public`,
		`GRANT ALL ON SCHEMA public TO public`,
	}
	for _, s := range statements {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("reset schema (%q): %v", s, err)
		}
	}
}

func applyMigrations(ctx context.Context, db *sql.DB) error {
	dir := resolveMigrationsDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir %s: %w", dir, err)
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			// The 0000* migrations are legacy compatibility shims for
			// production schemas that pre-date the migration tracker.
			// On a fresh integration DB those shims either no-op or
			// fail on references to tables that don't exist yet. Skip
			// them — the substrate the integration tests actually need
			// (workspaces, billing, ledger, projections) is created
			// from 0001 onward.
			if strings.HasPrefix(e.Name(), "0000") {
				continue
			}
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	// Bootstrap schema_migrations (mirrors what apply-db-migrations.mjs
	// does in production).
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, name := range files {
		migrationSQL, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("begin tx for %s: %w", name, err)
		}
		if _, err := tx.ExecContext(ctx, string(migrationSQL)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
			name,
		); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record %s: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit %s: %w", name, err)
		}
	}
	return nil
}

func resolveMigrationsDir() string {
	// Walk up from the package's location until we find apps/dashboard.
	// This keeps the harness independent of the absolute repo path.
	wd, err := os.Getwd()
	if err != nil {
		return migrationsDirRelative
	}
	candidate := filepath.Join(wd, migrationsDirRelative)
	if _, err := os.Stat(candidate); err == nil {
		return candidate
	}
	// Fallback: walk up looking for the migrations directory.
	cur := wd
	for i := 0; i < 8; i++ {
		try := filepath.Join(cur, "apps/dashboard/src/lib/db/migrations")
		if _, err := os.Stat(try); err == nil {
			return try
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			break
		}
		cur = parent
	}
	return migrationsDirRelative
}

// ----- Fixture helpers --------------------------------------------------

// InsertWorkspace creates a workspace row so foreign-key references from
// projection/billing rows can resolve. Returns the generated workspace id.
//
// This is a synthetic workspace — not an actual Clerk org. The test
// substrate doesn't care about workspace identity, only that the foreign
// key resolves.
func InsertWorkspace(t *testing.T, db *sql.DB) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO workspaces (clerk_org_id, name, owner_clerk_user_id)
		VALUES ($1, $2, $3)
		RETURNING id::text
	`,
		"org_test_"+randomSuffix(),
		"Test Workspace",
		"user_test_"+randomSuffix(),
	).Scan(&id)
	if err != nil {
		t.Fatalf("insert workspace: %v", err)
	}
	return id
}

// InsertBillingCustomer creates a billing_customers row mapping a Stripe
// customer id to a workspace. Returns the inserted row's id.
func InsertBillingCustomer(t *testing.T, db *sql.DB, workspaceID, stripeCustomerID string) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO billing_customers (workspace_id, stripe_customer_id, provider)
		VALUES ($1::uuid, $2, 'stripe')
		RETURNING id::text
	`, workspaceID, stripeCustomerID).Scan(&id)
	if err != nil {
		t.Fatalf("insert billing_customer: %v", err)
	}
	return id
}

// LedgerEvent describes a synthetic Stripe event to insert into the
// stripe_event_ledger. Pass the payload as a Go map; the harness JSON-
// encodes and stores it.
type LedgerEvent struct {
	StripeEventID    string
	Payload          map[string]any
	IngestionVersion string
	VerifyOutcome    string
	ReceivedAt       time.Time
}

// InsertLedgerEvent appends a synthetic event to stripe_event_ledger.
// Returns the inserted row's id (uuid as string).
func InsertLedgerEvent(t *testing.T, db *sql.DB, e LedgerEvent) string {
	t.Helper()
	if e.IngestionVersion == "" {
		e.IngestionVersion = "test-harness"
	}
	if e.VerifyOutcome == "" {
		e.VerifyOutcome = "primary"
	}
	if e.ReceivedAt.IsZero() {
		e.ReceivedAt = time.Now().UTC()
	}
	payloadBytes := marshalJSON(t, e.Payload)
	var id string
	err := db.QueryRow(`
		INSERT INTO stripe_event_ledger (
			stripe_event_id, payload, payload_size_bytes, signature_header,
			verify_outcome, payload_schema_version, ingestion_version, received_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id::text
	`,
		e.StripeEventID,
		string(payloadBytes),
		len(payloadBytes),
		nil,
		e.VerifyOutcome,
		payloadAPIVersion(e.Payload),
		e.IngestionVersion,
		e.ReceivedAt,
	).Scan(&id)
	if err != nil {
		t.Fatalf("insert ledger event: %v", err)
	}
	return id
}

// InsertBillingSubscription writes a synthetic canonical subscription row.
// Used by the drift detector tests to set up the "authority" side.
type BillingSubscription struct {
	WorkspaceID          string
	StripeSubscriptionID string
	StripeCustomerID     string
	Status               string
	CurrentPeriodStart   *time.Time
	CurrentPeriodEnd     *time.Time
	CancelAtPeriodEnd    bool
	CanceledAt           *time.Time
	TrialStart           *time.Time
	TrialEnd             *time.Time
	BillingCustomerID    string
}

func InsertBillingSubscription(t *testing.T, db *sql.DB, s BillingSubscription) {
	t.Helper()
	// Insert a billing_customer row first if not provided. The 0001
	// schema defines a unique constraint on stripe_customer_id, so we
	// rely on that to make this helper idempotent across multiple
	// subscriptions for the same customer.
	if s.BillingCustomerID == "" {
		var id string
		err := db.QueryRow(`
			INSERT INTO billing_customers (workspace_id, stripe_customer_id, provider)
			VALUES ($1::uuid, $2, 'stripe')
			ON CONFLICT (stripe_customer_id) DO UPDATE SET workspace_id = EXCLUDED.workspace_id
			RETURNING id::text
		`, s.WorkspaceID, s.StripeCustomerID).Scan(&id)
		if err != nil {
			t.Fatalf("insert/lookup billing_customer: %v", err)
		}
		s.BillingCustomerID = id
	}
	_, err := db.Exec(`
		INSERT INTO billing_subscriptions (
			workspace_id, billing_customer_id, stripe_subscription_id,
			status, raw_status,
			current_period_start, current_period_end,
			cancel_at_period_end, canceled_at, trial_start, trial_end,
			last_reconciled_at
		) VALUES (
			$1::uuid, $2::uuid, $3,
			$4::subscription_status_enum, $4,
			$5, $6,
			$7, $8, $9, $10,
			now()
		)
		ON CONFLICT (stripe_subscription_id) DO UPDATE SET
			status = EXCLUDED.status, raw_status = EXCLUDED.raw_status,
			current_period_start = EXCLUDED.current_period_start,
			current_period_end = EXCLUDED.current_period_end,
			cancel_at_period_end = EXCLUDED.cancel_at_period_end,
			canceled_at = EXCLUDED.canceled_at,
			trial_start = EXCLUDED.trial_start,
			trial_end = EXCLUDED.trial_end,
			last_reconciled_at = now()
	`,
		s.WorkspaceID, s.BillingCustomerID, s.StripeSubscriptionID,
		s.Status,
		s.CurrentPeriodStart, s.CurrentPeriodEnd,
		s.CancelAtPeriodEnd, s.CanceledAt, s.TrialStart, s.TrialEnd,
	)
	if err != nil {
		t.Fatalf("insert billing_subscription: %v", err)
	}
}

// ----- Small utilities --------------------------------------------------

func marshalJSON(t *testing.T, v any) []byte {
	t.Helper()
	b, err := jsonMarshal(v)
	if err != nil {
		t.Fatalf("marshal json: %v", err)
	}
	return b
}

func payloadAPIVersion(payload map[string]any) any {
	if v, ok := payload["api_version"].(string); ok {
		return v
	}
	return nil
}

func randomSuffix() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

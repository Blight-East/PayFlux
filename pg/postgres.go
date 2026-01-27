// Package pg provides minimal Postgres integration for TPV settlement snapshots.
// This layer is intentionally minimal - no ORM, just database/sql.
package pg

import (
	"context"
	"database/sql"
	"time"

	_ "github.com/lib/pq" // Postgres driver
)

// TPVSnapshot represents a daily TPV usage snapshot for a merchant.
type TPVSnapshot struct {
	MerchantIDHash    string
	Day               time.Time
	Currency          string
	UsageCents        int64
	CoverageTier      string
	MonthlyLimitCents int64
}

// Connect establishes a connection to Postgres using the provided DSN.
// Returns error if connection fails or cannot be pinged.
func Connect(dsn string) (*sql.DB, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	// Verify connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

// UpsertDailySnapshot inserts or updates a daily TPV snapshot for a merchant.
// Uses ON CONFLICT to handle updates for the same merchant/day/currency combination.
func UpsertDailySnapshot(ctx context.Context, db *sql.DB, snap TPVSnapshot) error {
	query := `
		INSERT INTO tpv_usage_daily 
			(merchant_id_hash, day, currency, usage_cents, coverage_tier, monthly_limit_cents, created_at, updated_at)
		VALUES 
			($1, $2, $3, $4, $5, $6, NOW(), NOW())
		ON CONFLICT (merchant_id_hash, day, currency) 
		DO UPDATE SET 
			usage_cents = EXCLUDED.usage_cents,
			coverage_tier = EXCLUDED.coverage_tier,
			monthly_limit_cents = EXCLUDED.monthly_limit_cents,
			updated_at = NOW()
	`

	_, err := db.ExecContext(ctx, query,
		snap.MerchantIDHash,
		snap.Day,
		snap.Currency,
		snap.UsageCents,
		snap.CoverageTier,
		snap.MonthlyLimitCents,
	)

	return err
}

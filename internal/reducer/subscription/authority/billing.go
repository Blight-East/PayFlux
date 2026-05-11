package authority

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// BillingProviderVersion identifies this implementation. Bump on any
// behavior change to the canonical-side comparison logic.
const BillingProviderVersion = "v1"

// BillingProvider implements Provider by reading the dashboard's canonical
// billing_subscriptions table.
//
// This is Phase 1. The intent is comparison against incumbent operational
// truth as the reducer accumulates its parallel interpretation. When the
// Stripe polling worker exists (Phase 2), a new provider takes over and
// this one is deprecated. The detector code is unchanged across the
// transition.
type BillingProvider struct {
	db *sql.DB
}

func NewBillingProvider(db *sql.DB) *BillingProvider {
	return &BillingProvider{db: db}
}

func (p *BillingProvider) Name() string    { return "billing_subscriptions" }
func (p *BillingProvider) Version() string { return BillingProviderVersion }

// billingSubscriptionRow mirrors the dashboard's billing_subscriptions
// table. Only the fields the detector compares are projected.
type billingSubscriptionRow struct {
	StripeSubscriptionID sql.NullString
	Status               sql.NullString
	CurrentPeriodStart   sql.NullTime
	CurrentPeriodEnd     sql.NullTime
	CancelAtPeriodEnd    sql.NullBool
	CanceledAt           sql.NullTime
	TrialStart           sql.NullTime
	TrialEnd             sql.NullTime
}

func (r billingSubscriptionRow) toState() *State {
	if !r.StripeSubscriptionID.Valid || r.StripeSubscriptionID.String == "" {
		return nil
	}
	s := &State{
		StripeSubscriptionID: r.StripeSubscriptionID.String,
		ProviderName:         "billing_subscriptions",
		ProviderVersion:      BillingProviderVersion,
	}
	if r.Status.Valid {
		s.Status = r.Status.String
	}
	if r.CurrentPeriodStart.Valid {
		t := r.CurrentPeriodStart.Time
		s.CurrentPeriodStart = &t
	}
	if r.CurrentPeriodEnd.Valid {
		t := r.CurrentPeriodEnd.Time
		s.CurrentPeriodEnd = &t
	}
	if r.CancelAtPeriodEnd.Valid {
		s.CancelAtPeriodEnd = r.CancelAtPeriodEnd.Bool
	}
	if r.CanceledAt.Valid {
		t := r.CanceledAt.Time
		s.CanceledAt = &t
	}
	if r.TrialStart.Valid {
		t := r.TrialStart.Time
		s.TrialStart = &t
	}
	if r.TrialEnd.Valid {
		t := r.TrialEnd.Time
		s.TrialEnd = &t
	}
	return s
}

const billingSelectColumns = `
    stripe_subscription_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    trial_start,
    trial_end
`

func (p *BillingProvider) FetchState(ctx context.Context, id string) (*State, error) {
	var row billingSubscriptionRow
	err := p.db.QueryRowContext(ctx,
		`SELECT `+billingSelectColumns+`
		 FROM billing_subscriptions WHERE stripe_subscription_id = $1`,
		id,
	).Scan(
		&row.StripeSubscriptionID,
		&row.Status,
		&row.CurrentPeriodStart,
		&row.CurrentPeriodEnd,
		&row.CancelAtPeriodEnd,
		&row.CanceledAt,
		&row.TrialStart,
		&row.TrialEnd,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query billing_subscriptions: %w", err)
	}
	return row.toState(), nil
}

func (p *BillingProvider) FetchAll(ctx context.Context) ([]*State, error) {
	rows, err := p.db.QueryContext(ctx,
		`SELECT `+billingSelectColumns+` FROM billing_subscriptions`,
	)
	if err != nil {
		return nil, fmt.Errorf("query billing_subscriptions: %w", err)
	}
	defer rows.Close()

	var out []*State
	for rows.Next() {
		var row billingSubscriptionRow
		if err := rows.Scan(
			&row.StripeSubscriptionID,
			&row.Status,
			&row.CurrentPeriodStart,
			&row.CurrentPeriodEnd,
			&row.CancelAtPeriodEnd,
			&row.CanceledAt,
			&row.TrialStart,
			&row.TrialEnd,
		); err != nil {
			return nil, fmt.Errorf("scan billing_subscriptions row: %w", err)
		}
		if s := row.toState(); s != nil {
			out = append(out, s)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate billing_subscriptions: %w", err)
	}
	return out, nil
}

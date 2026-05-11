// drift-detector is the entry point for the subscription drift detector
// service.
//
// In Phase 1 (now), the detector compares subscription_projection against
// the dashboard's canonical billing_subscriptions table. When the Stripe
// polling worker exists (Phase 2), a new authority provider is plugged in
// and this binary is unchanged.
//
// The detector NEVER corrects either side. It observes and records.
// Reconciliation actions are separate operational decisions.
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"payment-node/internal/reducer/subscription/authority"
	"payment-node/internal/reducer/subscription/drift"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// DIRECT_URL preferred — the detector runs SELECT-heavy comparisons
	// across the projection and authority tables. Transaction-mode
	// pooling is acceptable but the detector benefits from a direct
	// connection's predictable read snapshot.
	dsn := os.Getenv("DIRECT_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		logger.Error("DIRECT_URL or DATABASE_URL is required")
		os.Exit(2)
	}

	tick := 60 * time.Second
	if v := os.Getenv("DRIFT_DETECTOR_TICK_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			tick = time.Duration(n) * time.Second
		}
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Error("open postgres", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)

	if err := db.Ping(); err != nil {
		logger.Error("ping postgres", "error", err)
		os.Exit(1)
	}

	provider := authority.NewBillingProvider(db)
	detector := &drift.Detector{
		DB:       db,
		Provider: provider,
		Logger:   logger,
		Tick:     tick,
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		sig := <-sigCh
		logger.Info("received signal; canceling detector", "signal", sig.String())
		cancel()
	}()

	if err := detector.Run(ctx); err != nil {
		logger.Error("detector exited with error", "error", err)
		os.Exit(1)
	}
	logger.Info("detector exited cleanly")
}

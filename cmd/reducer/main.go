// reducer is the entry point for the projection reducer service.
//
// Currently runs a single reducer (subscription) in either backfill or
// tail mode, controlled by the REDUCER_MODE environment variable.
//
// This binary is intended to be deployed separately from the payflux-core
// ingest service (own Fly app, own process group) so its resource usage
// is observable independently. The dashboard's webhook handler continues
// to write canonical state to billing_subscriptions — this reducer
// accumulates a parallel interpretation in subscription_projection.
//
// In v1, production reads are NOT switched. See SUBSCRIPTION_REDUCER_CONTRACT.md.
package main

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"

	"payment-node/internal/reducer/subscription"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// DIRECT_URL preferred for long-running consumers — the reducer
	// holds open connections and runs multi-statement transactions,
	// neither of which is friendly to transaction-mode pooling.
	dsn := os.Getenv("DIRECT_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		logger.Error("DIRECT_URL or DATABASE_URL is required")
		os.Exit(2)
	}

	mode := subscription.Mode(os.Getenv("REDUCER_MODE"))
	switch mode {
	case subscription.ModeBackfill, subscription.ModeTail:
	case "":
		mode = subscription.ModeTail
	default:
		logger.Error("invalid REDUCER_MODE", "value", os.Getenv("REDUCER_MODE"))
		os.Exit(2)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		logger.Error("open postgres", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	// Constrain the connection pool — the reducer is single-process and
	// doesn't need more than a small handful of connections.
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)

	if err := db.Ping(); err != nil {
		logger.Error("ping postgres", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Graceful shutdown on SIGINT / SIGTERM.
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		sig := <-sigCh
		logger.Info("received signal; canceling reducer", "signal", sig.String())
		cancel()
	}()

	if err := subscription.Run(ctx, db, logger, mode); err != nil {
		logger.Error("reducer exited with error", "error", err)
		os.Exit(1)
	}
	logger.Info("reducer exited cleanly")
}

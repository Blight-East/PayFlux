# Work in Flight

This repo has multiple AI agents (Devin + Claude Code) plus the founder
writing to it in parallel. Without coordination, branches stomp on each
other. This doc is a lightweight coordination register.

**Rule:** before starting any non-trivial work, read this file and add
an entry. When you finish (or merge), remove your entry.

## How to use

Each entry has:

- **Agent** — who (Devin, claude-code, founder)
- **Started** — ISO date
- **PR / Branch** — link + branch name
- **Files touched (broad)** — top-level paths
- **Status** — in-progress / ready-for-review / merged / abandoned
- **Blocks on** — what must land first

## Currently active

<!-- Add entries here. Remove when done. -->

### Agent: claude-code

- **Started:** 2026-04-28
- **PR / Branch:** [PR #39 — export observability metrics](https://github.com/Blight-East/PayFlux/pull/39) — `claude/p2-4-export-observability`
- **Files:** `main.go`, `internal/exporter/{interfaces,output}.go`, `exporter_adapter.go`, `exporter_adapter_test.go`, `go.mod`
- **Status:** ready for review
- **Blocks on:** founder review + merge

### Agent: Devin

- **Started:** ~2026-04-22 (inferred from recent commits on `devin/e2e-stripe-oauth`)
- **PR / Branch:** Stripe Connect OAuth + Playwright E2E — `devin/e2e-stripe-oauth` (and several earlier `devin/*` branches already merged)
- **Files:** `apps/dashboard/`, Stripe OAuth callback, financial sync job, payment failure velocity signal
- **Status:** active
- **Blocks on:** unknown — coordinate with Devin/founder before touching `cmd/ingest/main.go` or `apps/dashboard/` callback paths

## Recently merged (last 14 days)

<!-- Prune aggressively. This is a memory aid, not an archive. -->

- **2026-04-22 → 2026-04-28** — Devin — Stripe Connect OAuth, financial sync, payment failure velocity signal — commits `0edbf64` through `a5c1629`
- **2026-04-22** — Devin — `25072c1` fix: copy `pg/` directory in Dockerfile

## Conflicts to watch for

- **Ingest path** (`cmd/ingest/main.go`, `main.go` `handleEvent`): touched by Devin's payment-failure-velocity signal work AND by any future P2-1 (durable event log) work. Coordinate before either lands.
- **Dashboard callback** (`apps/dashboard/`): Devin owns Stripe OAuth callback and the run-migrations / find-workspaces tooling. Any UI work coordinates here.
- **Exporter pipeline** (`internal/exporter/*`, `exporter_adapter.go`): clean as of P2-4. Any new metrics or Tier 2 changes should extend the existing `ExportMetrics` interface, not parallel it.
- **Migrations** (`migrations/`): only one tracked migration today. Adding a second migration is fine; renumber-collision risk is low.

## Notes for agents

- If you're an AI agent starting work here, **always** check `gh pr list` and this file before creating a branch.
- Update this file **in the same PR** as your work — a separate "doc" PR creates merge conflicts with other agents doing the same.
- For coordination patterns this file mirrors, see the equivalent doc in the Meridian repo (`~/Agent Flux/docs/WORK_IN_FLIGHT.md`).

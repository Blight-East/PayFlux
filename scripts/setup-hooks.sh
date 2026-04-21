#!/usr/bin/env bash
# Point git at the repo's tracked hooks directory.
# Idempotent: safe to re-run. Required once per clone — the
# core.hooksPath config lives in .git/config, which isn't tracked.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Skip silently outside a git checkout (e.g. tarball install).
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

git config core.hooksPath .githooks
echo "✓ git hooks wired to .githooks/ (pre-push active)"

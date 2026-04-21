#!/bin/bash
set -e

# Pre-commit check: Ensure signal-registry.v1.json and signals.runtime.json are in sync

if git diff --cached --name-only | grep -q "internal/specs/signal-registry.v1.json"; then
  if ! git diff --cached --name-only | grep -q "config/signals.runtime.json"; then
    echo "ERROR: signal-registry.v1.json changed but signals.runtime.json not regenerated"
    echo ""
    echo "Run the following command to regenerate:"
    echo "  go run internal/specs/generate_runtime_config.go"
    echo ""
    echo "Then stage and commit the updated config/signals.runtime.json"
    exit 1
  fi
fi

exit 0

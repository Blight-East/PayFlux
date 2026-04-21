#!/usr/bin/env bash
set -e

npx ajv validate \
  -s docs/system_taxonomy.schema.json \
  -d docs/SYSTEM_TAXONOMY.json \
  -c ajv-formats

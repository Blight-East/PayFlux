#!/bin/bash
set -e

# Compliance Artifact Validator
# Verifies existence, content, and structure of SOC2 artifacts.

COMPLIANCE_DIR="docs/compliance"

# 1. Check all required files exist
REQUIRED_FILES=(
  "system_boundary.md"
  "access_matrix.csv"
  "permission_model.md"
  "change_control.md"
  "data_flow.md"
  "logging_controls.md"
  "determinism_model.md"
  "incident_response.md"
  "availability_guarantees.md"
  "config_integrity.md"
  "deployment_pipeline.md"
  "dependencies.md"
  "README.md"
)

echo "Verifying Compliance Artifacts..."

for file in "${REQUIRED_FILES[@]}"; do
  filepath="$COMPLIANCE_DIR/$file"
  
  # Check existence
  if [ ! -f "$filepath" ]; then
    echo "❌ MISSING: $filepath"
    exit 1
  fi
  
  # Check non-empty
  if [ ! -s "$filepath" ]; then
    echo "❌ EMPTY: $filepath"
    exit 1
  fi
  
  # Check markdown headings (for .md files)
  if [[ "$file" == *.md ]]; then
    if ! grep -q "^# " "$filepath"; then
      echo "❌ MALFORMED: $filepath (missing H1 title)"
      exit 1
    fi
    
    # 2. Timestamp Enforcement
    # Search first 30 lines for case-insensitive "Last Updated:"
    if ! head -n 30 "$filepath" | grep -q -i "Last Updated:"; then
      echo "❌ NO TIMESTAMP: $file"
      exit 1
    fi
  fi
  
  echo "✔ VERIFIED: $file"
done

# 3. Checksum Logic & Cross-Platform Support

CHECKSUM_FILE="$COMPLIANCE_DIR/.checksums"

# Dynamic hash command selection
if command -v sha256sum >/dev/null 2>&1; then
    HASH_CMD="sha256sum"
    CHECK_CMD="sha256sum -c"
elif command -v shasum >/dev/null 2>&1; then
    HASH_CMD="shasum -a 256"
    CHECK_CMD="shasum -a 256 -c"
else
    echo "❌ NO HASH TOOL: Install sha256sum or shasum"
    exit 1
fi

# Generate if missing
if [ ! -f "$CHECKSUM_FILE" ]; then
    echo "Generating checksums..."
    # Sort files for determinism, exclude .checksums
    find "$COMPLIANCE_DIR" -type f -not -name ".checksums" -print0 | sort -z | xargs -0 $HASH_CMD > "$CHECKSUM_FILE"
fi

# Validate
echo "Verifying Checksums..."
if ! $CHECK_CMD "$CHECKSUM_FILE" >/dev/null 2>&1; then
    echo "❌ CHECKSUM MISMATCH — COMPLIANCE FILE TAMPERED"
    exit 1
fi
echo "✔ Checksums verified"

echo "SOC2_ARTIFACT_SYSTEM_READY"

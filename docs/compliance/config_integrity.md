# Configuration Integrity


Last Updated: 2026-02-17
## 1. Validation Strategy
Configuration is validated at two stages:
- **Build Time**: Static JSON schemas validate structure and types.
- **Load Time**: Application logic verifies semantic correctness (e.g., ranges, references).

## 2. Schema Enforcement
- **Taxonomy**: Validated against `docs/schema/taxonomy.schema.json`.
- **Tiers**: Validated against internal schema.
- **Signals**: Validated against signal registry specifications.

## 3. Override Auditing
Runtime configuration changes (Signal Overrides) are audited:
- **Immutable Log**: `audit.log` tracks all changes.
- **Attribution**: Every change links to an Operator ID.
- **Traceability**: Audit entries include the exact diff of the change.

## 4. Rollback
The `OverrideStore` supports manual rollback by re-applying the previous state found in the audit log. The system creates a new audit entry for the rollback (Undo is a new Action).

# Permission Model


Last Updated: 2026-02-17
## 1. Authorization Philosophy
PayFlux operates on a **Role-Based Access Control (RBAC)** model with a strong emphasis on **Privilege Isolation** and **Read-Only Defaults**.

- **System Role**: The runtime environment holds the highest privilege for *execution* and *state mutation*. Users cannot directly execute core primitives.
- **Human Roles**: Admins and Operators manage configuration and overrides but cannot manually trigger risk scoring or decision logic.

## 2. Roles Defined

### Admin
- **Purpose**: Full system configuration and emergency intervention.
- **Capabilities**:
    - Read all data.
    - Write/Update Configuration (Overrides, Entitlements).
    - Manage API Keys.
- **Restrictions**: Cannot execute `RiskScorer` or `DecisionEngine` directly.

### Operator
- **Purpose**: Day-to-day operations and signal tuning.
- **Capabilities**:
    - Read all data.
    - Write/Update Signal Overrides.
- **Restrictions**: Read-only access to Entitlements.

### Viewer
- **Purpose**: Auditing and monitoring.
- **Capabilities**:
    - Read-only access to all resources.
- **Restrictions**: No write access.

### System (Service Account)
- **Purpose**: Automated runtime execution.
- **Capabilities**:
    - Exclusive execute permission on Core Primitives.
    - Write permission to Persistence and Logs.

## 3. Enforcement
- **API Layer**: Authentication via Bearer tokens. Authorization checks against the `Role` claim.
- **Internal Layer**: Function-level access is restricted by code architecture (interfaces).
- **Physical Layer**: `flock` ensures single-writer access to file-based resources.

## 4. Deny by Default
Any action not explicitly allowed in the `access_matrix.csv` is denied. Unknown roles default to no access.

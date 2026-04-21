# SOC2 Compliance Artifacts


Last Updated: 2026-02-17
## Purpose
This directory contains the authoritative documentation for PayFlux's SOC2 compliance controls. These documents are automatically verified against the system architecture to ensuring that documentation never drifts from implementation.

## Auditor Guide

| Control Area | Document |
|---|---|
| **System Scope** | [system_boundary.md](system_boundary.md) |
| **Access Control** | [access_matrix.csv](access_matrix.csv), [permission_model.md](permission_model.md) |
| **Change Management** | [change_control.md](change_control.md), [deployment_pipeline.md](deployment_pipeline.md) |
| **Data Protection** | [data_flow.md](data_flow.md), [logging_controls.md](logging_controls.md) |
| **Reliability** | [availability_guarantees.md](availability_guarantees.md), [incident_response.md](incident_response.md) |
| **Integrity** | [config_integrity.md](config_integrity.md), [determinism_model.md](determinism_model.md) |

## Validation
Run `scripts/validate-compliance.sh` to verify the completeness and structure of these artifacts.

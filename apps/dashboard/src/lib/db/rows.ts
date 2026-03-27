import type {
    ActivationRunRow,
    BaselineSnapshotRow,
    BillingCustomerRow,
    BillingSubscriptionRow,
    JsonObject,
    MonitoredEntityRow,
    ProcessorConnectionRow,
    ReserveProjectionRow,
    WorkspaceRow,
} from './types';

function normalizeJsonObject(value: unknown): JsonObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value as JsonObject;
}

function normalizeTimestamp(value: unknown): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

export function normalizeHostCandidate(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        return new URL(candidate).hostname.toLowerCase();
    } catch {
        return trimmed.toLowerCase().slice(0, 255);
    }
}

export function mapWorkspaceRow(row: Record<string, unknown>): WorkspaceRow {
    return {
        id: String(row.id),
        clerk_org_id: String(row.clerk_org_id),
        name: String(row.name),
        owner_clerk_user_id: row.owner_clerk_user_id ? String(row.owner_clerk_user_id) : null,
        status: String(row.status) as WorkspaceRow['status'],
        entitlement_tier: String(row.entitlement_tier) as WorkspaceRow['entitlement_tier'],
        payment_status: String(row.payment_status) as WorkspaceRow['payment_status'],
        activation_state: String(row.activation_state) as WorkspaceRow['activation_state'],
        primary_host_candidate: row.primary_host_candidate ? String(row.primary_host_candidate) : null,
        scan_attached_at: normalizeTimestamp(row.scan_attached_at),
        latest_scan_summary: normalizeJsonObject(row.latest_scan_summary),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
        deleted_at: normalizeTimestamp(row.deleted_at),
    };
}

export function mapBillingCustomerRow(row: Record<string, unknown>): BillingCustomerRow {
    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        provider: String(row.provider) as BillingCustomerRow['provider'],
        stripe_customer_id: String(row.stripe_customer_id),
        email: row.email ? String(row.email) : null,
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

export function mapBillingSubscriptionRow(row: Record<string, unknown>): BillingSubscriptionRow {
    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        billing_customer_id: String(row.billing_customer_id),
        provider: String(row.provider) as BillingSubscriptionRow['provider'],
        stripe_subscription_id: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
        stripe_checkout_session_id: row.stripe_checkout_session_id ? String(row.stripe_checkout_session_id) : null,
        stripe_price_id: row.stripe_price_id ? String(row.stripe_price_id) : null,
        status: String(row.status) as BillingSubscriptionRow['status'],
        grants_tier: String(row.grants_tier) as BillingSubscriptionRow['grants_tier'],
        current_period_start: normalizeTimestamp(row.current_period_start),
        current_period_end: normalizeTimestamp(row.current_period_end),
        cancel_at_period_end: Boolean(row.cancel_at_period_end),
        canceled_at: normalizeTimestamp(row.canceled_at),
        trial_start: normalizeTimestamp(row.trial_start),
        trial_end: normalizeTimestamp(row.trial_end),
        latest_invoice_id: row.latest_invoice_id ? String(row.latest_invoice_id) : null,
        raw_status: String(row.raw_status),
        last_webhook_event_at: normalizeTimestamp(row.last_webhook_event_at),
        last_reconciled_at: normalizeTimestamp(row.last_reconciled_at),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

export function mapProcessorConnectionRow(row: Record<string, unknown>): ProcessorConnectionRow {
    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        provider: String(row.provider) as ProcessorConnectionRow['provider'],
        stripe_account_id: String(row.stripe_account_id),
        status: String(row.status) as ProcessorConnectionRow['status'],
        oauth_scope: String(row.oauth_scope),
        connected_at: normalizeTimestamp(row.connected_at),
        last_verified_at: normalizeTimestamp(row.last_verified_at),
        disconnected_at: normalizeTimestamp(row.disconnected_at),
        connection_metadata: normalizeJsonObject(row.connection_metadata),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

export function mapMonitoredEntityRow(row: Record<string, unknown>): MonitoredEntityRow {
    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        processor_connection_id: String(row.processor_connection_id),
        entity_type: String(row.entity_type) as MonitoredEntityRow['entity_type'],
        status: String(row.status) as MonitoredEntityRow['status'],
        primary_host: row.primary_host ? String(row.primary_host) : null,
        primary_host_source: String(row.primary_host_source) as MonitoredEntityRow['primary_host_source'],
        current_baseline_snapshot_id: row.current_baseline_snapshot_id ? String(row.current_baseline_snapshot_id) : null,
        current_projection_id: row.current_projection_id ? String(row.current_projection_id) : null,
        first_data_at: normalizeTimestamp(row.first_data_at),
        last_data_at: normalizeTimestamp(row.last_data_at),
        last_sync_at: normalizeTimestamp(row.last_sync_at),
        ready_at: normalizeTimestamp(row.ready_at),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

export function mapActivationRunRow(row: Record<string, unknown>): ActivationRunRow {
    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        processor_connection_id: row.processor_connection_id ? String(row.processor_connection_id) : null,
        monitored_entity_id: row.monitored_entity_id ? String(row.monitored_entity_id) : null,
        status: String(row.status) as ActivationRunRow['status'],
        trigger: String(row.trigger) as ActivationRunRow['trigger'],
        triggered_by: row.triggered_by ? String(row.triggered_by) : null,
        baseline_snapshot_id: row.baseline_snapshot_id ? String(row.baseline_snapshot_id) : null,
        first_projection_id: row.first_projection_id ? String(row.first_projection_id) : null,
        attempt_number: Number(row.attempt_number ?? 1),
        connection_verified: Boolean(row.connection_verified),
        baseline_ready: Boolean(row.baseline_ready),
        first_projection_ready: Boolean(row.first_projection_ready),
        failure_code: row.failure_code ? String(row.failure_code) : null,
        failure_detail: row.failure_detail ? String(row.failure_detail) : null,
        started_at: normalizeTimestamp(row.started_at),
        completed_at: normalizeTimestamp(row.completed_at),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updated_at: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

export function mapBaselineSnapshotRow(row: Record<string, unknown>): BaselineSnapshotRow {
    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        monitored_entity_id: String(row.monitored_entity_id),
        source_processor_connection_id: String(row.source_processor_connection_id),
        risk_tier: Number(row.risk_tier),
        risk_band: String(row.risk_band),
        stability_score: Number(row.stability_score),
        trend: String(row.trend),
        policy_surface: normalizeJsonObject(row.policy_surface),
        source_summary: normalizeJsonObject(row.source_summary),
        computed_at: normalizeTimestamp(row.computed_at) ?? new Date().toISOString(),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    };
}

export function mapReserveProjectionRow(row: Record<string, unknown>): ReserveProjectionRow {
    const simulationDelta = row.simulation_delta ? normalizeJsonObject(row.simulation_delta) : null;

    return {
        id: String(row.id),
        workspace_id: String(row.workspace_id),
        monitored_entity_id: String(row.monitored_entity_id),
        baseline_snapshot_id: String(row.baseline_snapshot_id),
        activation_run_id: row.activation_run_id ? String(row.activation_run_id) : null,
        model_version: String(row.model_version),
        instability_signal: String(row.instability_signal),
        current_risk_tier: Number(row.current_risk_tier),
        trend: String(row.trend),
        tier_delta: Number(row.tier_delta ?? 0),
        projection_basis: normalizeJsonObject(row.projection_basis),
        reserve_projections: Array.isArray(row.reserve_projections) ? row.reserve_projections : [],
        recommended_interventions: Array.isArray(row.recommended_interventions) ? row.recommended_interventions : [],
        simulation_delta: simulationDelta,
        volume_mode: String(row.volume_mode),
        projected_at: normalizeTimestamp(row.projected_at) ?? new Date().toISOString(),
        created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
    };
}

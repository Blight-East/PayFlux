export type WorkspaceTier = 'free' | 'pro' | 'enterprise';
export type WorkspaceStatus = 'provisioning' | 'active' | 'suspended' | 'deleted';
export type WorkspacePaymentStatus =
    | 'none'
    | 'current'
    | 'trialing'
    | 'past_due'
    | 'unpaid'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired';
export type WorkspaceActivationState =
    | 'not_started'
    | 'paid_unconnected'
    | 'connection_pending_verification'
    | 'ready_for_activation'
    | 'activation_in_progress'
    | 'active'
    | 'activation_failed';

export type BillingProvider = 'stripe';
export type SubscriptionStatus =
    | 'checkout_pending'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'unpaid'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired';

export type ProcessorProvider = 'stripe';
export type ProcessorConnectionStatus = 'pending' | 'connected' | 'verification_failed' | 'disconnected';
export type MonitoredEntityType = 'stripe_account';
export type MonitoredEntityStatus = 'pending' | 'ready' | 'error' | 'inactive';
export type HostSource = 'scan' | 'manual' | 'stripe_profile' | 'unknown';
export type ActivationRunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ActivationTrigger = 'post_payment' | 'post_connect' | 'manual_retry' | 'system_reconcile';

export type JsonObject = Record<string, unknown>;

export interface WorkspaceRow {
    id: string;
    clerk_org_id: string;
    name: string;
    owner_clerk_user_id: string | null;
    status: WorkspaceStatus;
    entitlement_tier: WorkspaceTier;
    payment_status: WorkspacePaymentStatus;
    activation_state: WorkspaceActivationState;
    primary_host_candidate: string | null;
    scan_attached_at: string | null;
    latest_scan_summary: JsonObject;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface BillingCustomerRow {
    id: string;
    workspace_id: string;
    provider: BillingProvider;
    stripe_customer_id: string;
    email: string | null;
    created_at: string;
    updated_at: string;
}

export interface BillingSubscriptionRow {
    id: string;
    workspace_id: string;
    billing_customer_id: string;
    provider: BillingProvider;
    stripe_subscription_id: string | null;
    stripe_checkout_session_id: string | null;
    stripe_price_id: string | null;
    status: SubscriptionStatus;
    grants_tier: WorkspaceTier;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    trial_start: string | null;
    trial_end: string | null;
    latest_invoice_id: string | null;
    raw_status: string;
    last_webhook_event_at: string | null;
    last_reconciled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProcessorConnectionRow {
    id: string;
    workspace_id: string;
    provider: ProcessorProvider;
    stripe_account_id: string;
    status: ProcessorConnectionStatus;
    oauth_scope: string;
    connected_at: string | null;
    last_verified_at: string | null;
    disconnected_at: string | null;
    connection_metadata: JsonObject;
    created_at: string;
    updated_at: string;
}

export interface MonitoredEntityRow {
    id: string;
    workspace_id: string;
    processor_connection_id: string;
    entity_type: MonitoredEntityType;
    status: MonitoredEntityStatus;
    primary_host: string | null;
    primary_host_source: HostSource;
    current_baseline_snapshot_id: string | null;
    current_projection_id: string | null;
    first_data_at: string | null;
    last_data_at: string | null;
    last_sync_at: string | null;
    ready_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ActivationRunRow {
    id: string;
    workspace_id: string;
    processor_connection_id: string | null;
    monitored_entity_id: string | null;
    status: ActivationRunStatus;
    trigger: ActivationTrigger;
    triggered_by: string | null;
    baseline_snapshot_id: string | null;
    first_projection_id: string | null;
    attempt_number: number;
    connection_verified: boolean;
    baseline_ready: boolean;
    first_projection_ready: boolean;
    failure_code: string | null;
    failure_detail: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface BaselineSnapshotRow {
    id: string;
    workspace_id: string;
    monitored_entity_id: string;
    source_processor_connection_id: string;
    risk_tier: number;
    risk_band: string;
    stability_score: number;
    trend: string;
    policy_surface: JsonObject;
    source_summary: JsonObject;
    computed_at: string;
    created_at: string;
}

export interface ReserveProjectionRow {
    id: string;
    workspace_id: string;
    monitored_entity_id: string;
    baseline_snapshot_id: string;
    activation_run_id: string | null;
    model_version: string;
    instability_signal: string;
    current_risk_tier: number;
    trend: string;
    tier_delta: number;
    projection_basis: JsonObject;
    reserve_projections: unknown[];
    recommended_interventions: unknown[];
    simulation_delta: JsonObject | null;
    volume_mode: string;
    projected_at: string;
    created_at: string;
}

export interface WorkspaceApiKeyRow {
    id: string;
    workspace_id: string;
    label: string;
    key_prefix: string;
    key_hash: string;
    created_by_clerk_user_id: string | null;
    last_used_at: string | null;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
}

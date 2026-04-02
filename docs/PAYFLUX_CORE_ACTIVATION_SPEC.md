# PayFlux Core Activation Flow

**Post-purchase product activation: paid user → activated workspace → live monitored workspace.**

---

## 1. Entry Point After Payment

**Route:** `/activate`

**Purpose:** Single post-purchase surface that replaces the current dead drop to `/dashboard?checkout=success`. The user just paid $499/month. They should land on a page that feels like turning on a defense system, not logging into a SaaS dashboard.

**Headline:** "Your risk defense layer is ready to arm."

**Subhead:** "Connect your processor and PayFlux will generate your first reserve exposure projection in under 60 seconds."

**Primary CTA:** "Connect Stripe" (OAuth button, same flow as existing `/api/stripe/authorize`)

**Secondary link:** "I use a different processor" → expands generic webhook path (beta badge)

**Why this is the right first surface:**
- The user already proved intent (they paid). They don't need education or feature tours.
- The only thing standing between "paid" and "live monitored" is processor data. This page makes that the sole focus.
- It is not `/dashboard` because the dashboard is empty without a connection. Landing on an empty dashboard after paying $499 is a value-destruction moment.
- It is not `/connect` because this page carries activation framing ("arm your workspace"), not onboarding framing ("set up your account").

**Completion:** OAuth callback succeeds → redirect to `/activate/arming` (not `/dashboard`).

---

## 2. Activation Sequence

### Required Step 1: Connect Processor

| | Detail |
|---|---|
| **Required** | Yes |
| **What the user does** | Clicks "Connect Stripe" → completes OAuth in Stripe's UI → redirected back |
| **Data collected** | `stripe_user_id` (connected account ID) via OAuth token exchange |
| **System background actions** | Store `stripeAccountId` in Clerk org metadata. Fire `connect_completed` event. Trigger async `baseline_generation` job (see Section 10). Begin pulling historical payment events from the connected account via Stripe API. |
| **Completion** | OAuth callback returns with `stripeAccountId`. User is redirected to `/activate/arming`. |

### Required Step 2: Wait for Baseline (system does the work, user watches)

| | Detail |
|---|---|
| **Required** | Yes, but the user does nothing. The system works. The user watches progress. |
| **What the user sees** | `/activate/arming` — a live progress surface showing: (1) processor data pull status, (2) baseline risk computation, (3) reserve projection generation, (4) default alert arming. Staged checkmarks, similar to the scan wait-state but with real system progress. |
| **Data collected** | None from the user. System pulls processor metadata, recent payment events, failure patterns. |
| **System background actions** | See Section 10 — full baseline generation pipeline. |
| **Completion** | All four checkpoints resolve. CTA transitions to: "Enter your workspace" → `/dashboard`. |

**Total required user actions: 1** (connect processor). Step 2 is zero-effort observation. The 2-step constraint is met: one click (connect) + one wait (arming), then the user is live.

### Optional / Deferred

| Step | When | What |
|---|---|---|
| Customize alert thresholds | After live, from `/settings` | Default alerts are armed automatically. User can tune later. |
| Add team members | After live, from workspace settings | Clerk org invitations. Not part of activation. |
| Generate API key | After live, from `/api-keys` | Advanced users only. See Section 8. |
| Connect additional processors | After live, from `/connectors` | Multi-processor monitoring. Phase B. |
| Upload historical evidence | After live, from `/evidence` | Optional audit augmentation. |

---

## 3. Definition: "Live Monitored Workspace"

A workspace is **live monitored** when ALL of the following are true:

| Condition | System field | Check |
|---|---|---|
| At least one processor connected | `org.publicMetadata.stripeAccountId` is non-null | Boolean |
| Baseline risk surface generated | `org.publicMetadata.baselineGeneratedAt` is non-null | Boolean |
| At least one reserve projection exists | ProjectionLedger has >= 1 artifact for this workspace | Count >= 1 |
| Default alert policy is armed | `org.publicMetadata.alertPolicyArmed` is `true` | Boolean |
| Monitoring job is active | Projection cron includes this workspace in its sweep | Inclusion check |

**Binary test function:**
```typescript
function isLiveMonitored(org: ClerkOrg): boolean {
  const m = org.publicMetadata;
  return !!(
    m.stripeAccountId &&
    m.baselineGeneratedAt &&
    m.firstProjectionAt &&
    m.alertPolicyArmed &&
    m.tier !== 'free'
  );
}
```

If any condition is false, the workspace is **not live monitored** and the UI should show the specific missing condition with a CTA to resolve it.

---

## 4. First-Value Moment

**The first irreversible value is: the first reserve exposure projection with a risk band, computed from the customer's real processor data.**

Specifically, a screen that shows:

> **Your Reserve Exposure**
>
> Risk Band: **Elevated** (Tier 3)
>
> | Window | Projected Trapped Capital |
> |---|---|
> | T+30 | ~$12,400 |
> | T+60 | ~$28,800 |
> | T+90 | ~$41,200 |
>
> Based on 847 payment events from your Stripe account over the last 90 days.

This is the moment the product is no longer theoretical. The customer sees their own money at risk, quantified, with a timeline. This cannot be undone — they now know what they didn't know before.

Everything else (alerts, intervention modeling, evidence export) is a consequence of this moment.

---

## 5. Post-Purchase State Machine

```
paid_unconnected
    │
    │  [user connects processor via OAuth]
    ▼
connected_generating
    │
    │  [baseline generation completes]
    ▼
baseline_ready
    │
    │  [default alerts armed + first projection written]
    ▼
live_monitored
    │
    │  [user enables advanced features: custom alerts, API, evidence export]
    ▼
fully_configured
```

### State Details

#### `paid_unconnected`
- **Description:** Customer has paid but has not connected a processor. PayFlux has no live data.
- **Allowed transitions:** → `connected_generating` (on successful OAuth callback)
- **Blocking conditions:** No processor connection.
- **UI emphasis:** `/activate` page. Single focus: connect processor. No sidebar, no dashboard chrome. Count-up timer showing "time since purchase without protection."
- **Metadata:** `tier: 'pro'`, `stripeAccountId: null`, `activationState: 'paid_unconnected'`

#### `connected_generating`
- **Description:** Processor is connected. System is pulling data and computing baseline.
- **Allowed transitions:** → `baseline_ready` (on baseline job completion)
- **Blocking conditions:** Baseline job has not finished.
- **UI emphasis:** `/activate/arming` page. Progress indicators. "Analyzing your payment stack..." User cannot navigate to dashboard yet — it would be empty.
- **Metadata:** `stripeAccountId: set`, `activationState: 'connected_generating'`, `baselineJobId: <id>`
- **Timeout:** If baseline takes > 3 minutes, show: "Taking longer than expected. We're pulling a larger dataset. You'll get an email when it's ready." Redirect to `/dashboard` in degraded mode showing partial data as it arrives.

#### `baseline_ready`
- **Description:** Baseline computed. First projection written. Default alerts being armed.
- **Allowed transitions:** → `live_monitored` (immediate — alerts arm synchronously after baseline)
- **Blocking conditions:** Alert arming failure (rare, retry automatically).
- **UI emphasis:** Transition state — typically passes through in < 2 seconds. If visible, shows final checkmark animation.
- **Metadata:** `baselineGeneratedAt: <iso>`, `activationState: 'baseline_ready'`

#### `live_monitored`
- **Description:** Workspace is fully operational. Processor connected, baseline exists, projections running, alerts armed, monitoring active.
- **Allowed transitions:** → `fully_configured` (optional, on advanced feature activation)
- **Blocking conditions:** None.
- **UI emphasis:** Full `/dashboard`. First load shows the first-value moment: risk band + reserve projection. Celebratory but understated: "Your workspace is live." — not confetti, but a green status indicator and the first real data.
- **Metadata:** `alertPolicyArmed: true`, `firstProjectionAt: <iso>`, `activationState: 'live_monitored'`

#### `fully_configured`
- **Description:** User has customized alerts, connected additional processors, generated API keys, or enabled evidence export.
- **Allowed transitions:** Lateral only (feature additions/removals).
- **Blocking conditions:** None.
- **UI emphasis:** Standard dashboard operation. Settings show configured features.
- **Metadata:** Various feature flags as configured.

---

## 6. Product Modes After Purchase

### Mode 1: Paid But Not Activated (`paid_unconnected`)
- **Can do:** View `/activate`, read documentation, contact support.
- **Blocked:** Dashboard, projections, alerts, evidence, API. All require processor data.
- **UI emphasis:** Full-screen activation prompt. No sidebar. Clock showing elapsed time since purchase.

### Mode 2: Connected But Not Live (`connected_generating` / `baseline_ready`)
- **Can do:** View arming progress. Cancel and reconnect if needed.
- **Blocked:** Dashboard (in full mode), alerts, evidence export.
- **UI emphasis:** Progress surface. "Analyzing your payment stack..." with staged checkpoints.

### Mode 3: Live Monitored (`live_monitored`)
- **Can do:** View dashboard, risk bands, reserve projections, intervention guidance, evidence stream. Receive default alerts. Export evidence.
- **Blocked:** Nothing in Pro tier. Enterprise features (bulk export, extended retention, system shock blend) are gated by tier, not by activation state.
- **UI emphasis:** Full dashboard. Risk band prominent. Reserve projections front and center. "Your workspace is live and being monitored" indicator in header.

### Mode 4: Forecasting Active (submode of `live_monitored`)
- **Can do:** Everything in Mode 3 plus: slope modeling, acceleration detection, instability index, confidence bands. These activate automatically once the system has >= 7 days of continuous data.
- **Blocked:** Activates automatically — not user-gated.
- **UI emphasis:** Dashboard projections gain trend arrows, confidence intervals, and "forecast horizon" indicators. Subtle upgrade: "Forecasting active — 12 days of continuous data."

### Mode 5: Advanced / API-Integrated (`fully_configured`)
- **Can do:** Everything in Mode 3-4 plus: API access, custom webhook sinks, programmatic evidence retrieval, CI/CD integration for risk gating.
- **Blocked:** Nothing (self-service API key generation).
- **UI emphasis:** `/api-keys` page shows active keys. `/settings` shows custom configurations.

---

## 7. API Key Strategy

**Should customers get an API key?** Yes, but not during activation.

**When?** After the workspace is live monitored. Available on-demand from `/api-keys`.

**Where in the UX?** Sidebar navigation → "API Keys" (visible only after `live_monitored` state). Not promoted during activation. Not in onboarding. Not in the first session.

**Who is it for?**
1. Engineering teams integrating PayFlux risk scores into their deployment pipelines.
2. Finance teams pulling reserve projections into internal dashboards or board decks.
3. Compliance teams automating evidence collection.

**Use cases that justify it:**
- `GET /api/v1/risk?url=<merchant>` — programmatic risk scoring
- `GET /api/v1/evidence` — pull evidence artifacts for audit
- `GET /api/v1/projections/<merchantId>` — reserve projections for financial modeling
- Webhook sink registration — push alerts to Slack, PagerDuty, internal systems

**What the API key is NOT for:** Initial activation. The happy path is OAuth + dashboard. API keys are for customers who have already experienced the value and want to integrate it into their stack.

---

## 8. Workspace Model

### Day-1 Essentials (required for `live_monitored`)

```typescript
interface PayFluxWorkspace {
  // Identity
  workspaceId: string;              // Clerk org ID
  workspaceName: string;            // Clerk org name
  tier: 'pro' | 'enterprise';      // Billing tier
  activationState: ActivationState; // State machine position

  // Processor connections
  processors: ProcessorConnection[];  // Day 1: single Stripe connection
  primaryProcessorId: string;         // The connected stripeAccountId

  // Risk profile
  baselineRiskSurface: {
    riskTier: 1 | 2 | 3 | 4 | 5;
    riskBand: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
    stabilityScore: number;           // 0-100
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    computedAt: string;               // ISO timestamp
    eventCount: number;               // events analyzed
    windowDays: number;               // lookback window
  };

  // Reserve model
  reserveModelSkeleton: {
    currentReserveRate: number;       // 0.00 - 0.25
    projectedWindows: {
      t30: { trappedBps: number; usdEstimate?: number };
      t60: { trappedBps: number; usdEstimate?: number };
      t90: { trappedBps: number; usdEstimate?: number };
    };
    trendMultiplier: number;
    lastProjectionAt: string;
  };

  // Alert policy
  defaultAlertPolicy: {
    armed: boolean;
    rules: AlertRule[];               // See below
    lastTriggeredAt?: string;
  };

  // Evidence
  evidenceLedgerEnabled: boolean;     // true by default for pro+
  ledgerEntryCount: number;

  // Activation timestamps
  paidAt: string;
  connectedAt?: string;
  baselineGeneratedAt?: string;
  firstProjectionAt?: string;
  alertPolicyArmedAt?: string;
  liveMonitoredAt?: string;
}

interface ProcessorConnection {
  processorId: string;              // stripeAccountId
  processorType: 'stripe' | 'generic_webhook';
  connectedAt: string;
  status: 'active' | 'disconnected' | 'degraded';
  lastEventAt?: string;
  eventCount: number;
}

interface AlertRule {
  id: string;
  name: string;
  trigger: 'tier_escalation' | 'reserve_spike' | 'trend_degradation' | 'projection_breach';
  threshold: number;
  channel: 'email' | 'dashboard';    // Day 1: email + in-dashboard only
  armed: boolean;
}
```

### Default Alert Policy (armed automatically)

| Rule | Trigger | Threshold | Channel |
|---|---|---|---|
| Tier escalation | Risk tier increases by >= 1 | delta >= 1 | Email + dashboard |
| Reserve spike | Projected T+90 trapped capital increases > 25% | delta > 0.25 | Email + dashboard |
| Trend degradation | Trend shifts to DEGRADING | trend == 'DEGRADING' | Dashboard only |
| Projection breach | Any projection window exceeds previous worst-case | exceeded == true | Email + dashboard |

### Later Extensions (not Day 1)

| Extension | Phase | Description |
|---|---|---|
| Fine-grained operator routing | B | Route alerts to specific team members by rule type |
| Multi-workspace hierarchies | C | Parent org with child workspaces per business unit |
| API credentials | B | Self-service key generation and rotation |
| SSO | C | SAML/OIDC enterprise SSO via Clerk |
| Advanced exports | B | Bulk CSV/PDF evidence export, scheduled reports |
| Custom alert policies | B | User-defined rules beyond the four defaults |
| Slack / PagerDuty integration | B | Alert channels beyond email + dashboard |
| Webhook sinks | B | Push alerts to customer-owned endpoints |
| Multi-processor monitoring | B | Connect Adyen, Checkout.com, etc. alongside Stripe |
| Historical import | C | Backfill evidence ledger from external sources |

---

## 9. Activation UX and Routes

### Page 1: `/activate`

- **Purpose:** Post-purchase entry. Single action: connect processor.
- **Headline:** "Your risk defense layer is ready to arm."
- **Subhead:** "Connect your processor. PayFlux will analyze your payment data and generate your first reserve exposure projection."
- **CTA:** `Connect Stripe` (primary, large) / "I use a different processor" (secondary, text link)
- **Success state:** OAuth completes → redirect to `/activate/arming`
- **Visual:** Dark, focused. No sidebar. No navigation distractions. PayFlux wordmark top-left. A subtle shield or radar icon that's not yet "active."

### Page 2: `/activate/arming`

- **Purpose:** System works, user watches. Builds confidence that something real is happening.
- **Headline:** "Arming your workspace..."
- **Subhead:** "PayFlux is analyzing your payment stack and building your risk baseline."
- **Progress stages:**

| Stage | Label | Detail text |
|---|---|---|
| 1 | Pulling processor data | "Retrieving payment events from your Stripe account..." |
| 2 | Computing risk baseline | "Analyzing failure patterns, retry pressure, geographic entropy..." |
| 3 | Generating reserve projection | "Modeling reserve exposure across T+30, T+60, T+90 windows..." |
| 4 | Arming default alerts | "Setting up tier escalation, reserve spike, and trend monitors..." |

Each stage: spinner → checkmark. Stages 1-3 are async (real progress). Stage 4 is synchronous (instant after 3).

- **CTA (after completion):** "Enter your workspace" → `/dashboard`
- **Success state:** All four checkmarks. CTA appears. Green "Live" indicator.
- **Timeout fallback:** If > 3 minutes, show: "Still processing — we'll email you when it's ready." Link to `/dashboard` in partial mode.

### Page 3: `/dashboard` (first load after activation)

- **Purpose:** Deliver the first-value moment.
- **Headline (first visit only):** "Your workspace is live."
- **Primary content:** Risk band card + reserve projection table. This is the aha moment from Section 4.
- **CTA:** None needed — the user is now in the product. Sidebar navigation appears.
- **Success state:** Dashboard populated with real data. "Live" indicator in header.

### Page 4: `/dashboard/activate-prompt` (degraded — paid but not connected)

- **Purpose:** Catch users who land on `/dashboard` without having completed activation.
- **Headline:** "Your workspace needs a processor connection."
- **Subhead:** "PayFlux can't monitor what it can't see. Connect your processor to start."
- **CTA:** "Connect Stripe" → `/activate`
- **When shown:** If tier is pro/enterprise but `stripeAccountId` is null and `activationState` is `paid_unconnected`.

---

## 10. Background Jobs and System Actions

### Synchronous (user-facing, blocking)

| Action | When | Duration |
|---|---|---|
| OAuth token exchange | On callback from Stripe | < 2s |
| Store processor metadata in Clerk | On callback, after token exchange | < 1s |
| Arm default alert policy | After baseline ready | < 1s |
| Write `activationState` transitions | On each state change | < 500ms |

### Asynchronous (background, non-blocking)

| Job | Trigger | What it does | Duration |
|---|---|---|---|
| **Pull processor event history** | `connect_completed` event | Calls Stripe API to retrieve recent payment intents (last 90 days). Normalizes to PayFlux event format. Feeds into risk scorer. | 10-60s depending on volume |
| **Compute baseline risk surface** | Event history pull completes | Runs the Go risk scorer across all pulled events. Computes initial risk tier, band, stability score, trend. Stores as `baselineRiskSurface` in workspace metadata. | 5-15s |
| **Generate first projection artifact** | Baseline ready | Runs the projection cadence logic (same as cron) but immediately, for this workspace only. Writes first `ProjectionArtifact` to the ledger. Signs it. | 2-5s |
| **Create first evidence record** | First projection written | Initializes the evidence ledger for this workspace. Creates the first envelope with baseline snapshot, processor connection record, and initial projection. | 1-2s |
| **Register workspace in monitoring sweep** | First projection written | Ensures the projection cron (every 6 hours) includes this workspace's merchants. Adds merchant snapshots to `RiskIntelligence`. | < 1s |
| **Send activation confirmation email** | `live_monitored` state reached | Email with: workspace name, risk band summary, first projection highlights, link to dashboard. | async |

### Job Orchestration

The baseline generation pipeline is a sequential chain:

```
connect_completed
  → enqueue: pull_processor_events(workspaceId, stripeAccountId)
    → on_complete: compute_baseline(workspaceId)
      → on_complete: generate_first_projection(workspaceId)
        → on_complete: arm_default_alerts(workspaceId)
          → on_complete: set_live_monitored(workspaceId)
            → send_activation_email(workspaceId)
```

Each step writes its completion timestamp to workspace metadata so the `/activate/arming` page can show real progress via polling.

---

## 11. Minimal Viable Activation

**The absolute minimum the customer must do before PayFlux is genuinely useful:**

1. **Complete Stripe OAuth.** (One click + Stripe's UI.)

That's it. One user action.

Everything else — baseline computation, projection generation, alert arming, evidence initialization, monitoring registration — is system work that happens automatically after the connection.

**Time to value:** ~60-90 seconds after OAuth completion. The user waits on the arming page, then enters a fully operational dashboard with their first real reserve exposure projection.

**Why this is the minimum:** Without processor data, PayFlux cannot compute a risk surface. The scan (pre-purchase) gives a directional signal from public data. But the product's real value — reserve projections from actual payment event data — requires the processor connection. There is no way to deliver genuine value without it.

---

## 12. Incomplete / Failed Activation States

### State: Paid but not connected

- **UI:** `/activate` page (or `/dashboard/activate-prompt` if they somehow reach the dashboard).
- **Message:** "Your workspace is ready to arm. Connect your processor to start monitoring."
- **CTA:** "Connect Stripe"
- **System action:** Send reminder email at T+24h and T+72h if still unconnected. No further reminders after that.

### State: Connected but no baseline

- **UI:** `/activate/arming` with stage 1 checkmarked, stage 2 spinning.
- **Message:** "We're analyzing your payment data. This usually takes under a minute."
- **CTA:** None (wait). After 3 minutes: "Taking longer than expected. We'll email you when it's ready." + link to partial dashboard.
- **System action:** Retry baseline computation up to 3 times with exponential backoff. If still failing after 5 minutes, log error, email support, and show: "We hit an issue analyzing your data. Our team has been notified."

### State: Baseline exists but alerts not armed

- **UI:** `/activate/arming` with stages 1-3 checkmarked, stage 4 spinning.
- **Message:** "Almost there — setting up your default monitors..."
- **CTA:** None (this should resolve in < 2 seconds).
- **System action:** Alert arming is synchronous and should not fail. If it does, retry immediately. If retry fails, skip and proceed to dashboard with a banner: "Default alerts are still being configured. We'll notify you when they're active." Background retry continues.

### State: Live data delayed / still syncing

- **UI:** Full dashboard, but with a yellow banner: "Live data sync in progress. Showing data through [timestamp]. Full sync expected within [estimate]."
- **Message:** Risk band and projections display with available data, clearly marked as "based on [N] events, sync ongoing."
- **CTA:** None needed. Banner auto-dismisses when sync completes.
- **System action:** Continue pulling events. Update dashboard in near-real-time as events arrive. Remove banner when gap between latest event and wall clock is < 5 minutes.

---

## 13. Phased Implementation Plan

### Phase A: Must-Have Activation (ship first)

**Goal:** Paid user → live monitored workspace in < 2 minutes.

| Item | Description | Effort |
|---|---|---|
| `/activate` page | Post-purchase entry, processor connection CTA | Small — new page, reuse existing OAuth flow |
| `/activate/arming` page | Progress surface with 4 stages | Medium — new page, polling for job status |
| `activationState` field | Add to Clerk org publicMetadata, write on transitions | Small — metadata writes on existing event hooks |
| Baseline generation pipeline | Sequential job chain: pull events → compute baseline → first projection → arm alerts | Large — new job orchestration, Stripe event pull, risk scorer integration |
| Default alert policy | Four default rules, email + dashboard delivery | Medium — new alert rule model, email integration |
| `isLiveMonitored()` check | Binary workspace status function | Small — metadata check |
| Dashboard first-load experience | Risk band + reserve projection as hero content | Small — reuse `ProjectionRoot`, add first-visit state |
| Activation state routing | Redirect logic: unconnected → `/activate`, generating → `/activate/arming`, live → `/dashboard` | Small — middleware or layout-level check |
| Incomplete state fallbacks | Timeout handling, retry logic, degraded mode | Medium — error boundaries, partial display |
| Activation emails | Confirmation on live, reminders if stalled | Small — transactional email templates |

**Phase A definition of done:** A customer can pay, connect Stripe, wait ~60s, and see their first real reserve exposure projection with default alerts armed.

### Phase B: Advanced Activation

**Goal:** Power users can customize, integrate, and extend.

| Item | Description |
|---|---|
| Custom alert policies | User-defined rules beyond the four defaults |
| API key self-service | Generate, rotate, revoke from `/api-keys` |
| Slack / PagerDuty integration | Alert channels beyond email + dashboard |
| Multi-processor support | Connect additional processors alongside Stripe |
| Evidence export | Bulk CSV/PDF export for audit and compliance |
| Webhook sinks | Push alerts to customer endpoints |
| Advanced projection settings | Custom windows, custom reserve rate overrides |

### Phase C: Enterprise / Developer Expansion

**Goal:** Enterprise-grade deployment and integration capabilities.

| Item | Description |
|---|---|
| Multi-workspace hierarchies | Parent org with child workspaces |
| SSO (SAML/OIDC) | Enterprise identity federation |
| Historical evidence import | Backfill from external systems |
| CI/CD risk gating | API-driven risk checks in deployment pipelines |
| Custom retention policies | Extended or shortened data retention |
| Bulk API access | High-throughput programmatic access |
| Dedicated infrastructure | Isolated compute for large accounts |

---

## Activation Flow Diagram

```
                    ┌─────────────────┐
                    │  Stripe Checkout │
                    │    Completes     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   /activate     │
                    │                 │
                    │  "Your risk     │
                    │  defense layer  │
                    │  is ready to    │
                    │  arm."          │
                    │                 │
                    │  [Connect       │
                    │   Stripe]       │
                    └────────┬────────┘
                             │ OAuth complete
                             ▼
                    ┌─────────────────┐
                    │ /activate/arming│
                    │                 │
                    │ ✓ Pulling data  │
                    │ ◉ Computing     │   Background:
                    │   baseline      │   pull events → baseline
                    │ ○ Generating    │   → projection → alerts
                    │   projection    │
                    │ ○ Arming alerts │
                    └────────┬────────┘
                             │ All stages complete
                             ▼
                    ┌─────────────────┐
                    │   /dashboard    │
                    │                 │
                    │  FIRST VALUE:   │
                    │  Risk Band:     │
                    │  Elevated       │
                    │                 │
                    │  T+30: $12,400  │
                    │  T+60: $28,800  │
                    │  T+90: $41,200  │
                    │                 │
                    │  "Your workspace│
                    │   is live."     │
                    └─────────────────┘
```

---

## Summary: Required-Step Sequence

| # | Step | Who does the work | User effort | Time |
|---|---|---|---|---|
| 0 | Checkout completes | Stripe | Already done | 0s |
| 1 | Connect processor | User clicks OAuth button | **1 click + Stripe UI** | 15-30s |
| 2 | Baseline + projection + alerts | System (user watches) | **Zero** | 30-90s |
| — | Dashboard with first projection | — | User is live | — |

**Total user effort: 1 button click.**
**Total time to value: ~60-90 seconds after purchase.**

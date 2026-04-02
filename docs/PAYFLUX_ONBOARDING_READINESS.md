# PayFlux Onboarding Readiness

Last reviewed: 2026-04-02

## Executive Summary

PayFlux is not an empty shell. There is a real hosted product path for a Stripe-first customer:

1. Run a free scan
2. Create/sign into a workspace
3. Upgrade to Pro through Stripe Checkout
4. Connect Stripe through OAuth
5. Run activation
6. Land in a live monitored dashboard if activation succeeds

The product is therefore saleable as a guided beta or assisted pilot.

It is not yet a clean self-serve SaaS for broad public sale.

## Current Sellability

### Ready to sell now

- Founder-assisted or concierge onboarding
- Stripe-first merchants only
- Beta / pilot framing
- Pro positioning as hosted dashboard + live Stripe-connected monitoring

### Not ready to sell as

- Fully self-serve multi-processor SaaS
- API-key-led product
- Polished enterprise control plane
- Broad public launch with minimal support

## What The Customer Journey Actually Is

### 1. Entry

- `/start` routes signed-out users to the product landing page and signed-in users into the onboarding funnel
- free users are pushed toward `/scan`

### 2. Free scan

- `/scan` runs a one-time risk scan
- `/api/onboarding/complete` persists scan summary onto the workspace
- `/scan/results` shows findings and pushes the user toward connect or dashboard preview

### 3. Free preview

- free-tier users can reach `/dashboard`
- they see a limited preview dashboard, not the fully activated live product

### 4. Upgrade

- `/upgrade` explains the Pro path
- `/api/checkout/session` creates a real Stripe subscription checkout session
- successful purchase routes to `/activate`

### 5. Post-purchase activation

- `/activate` explains that PayFlux is unlocked but still needs Stripe connected
- `/api/stripe/authorize` sends the customer through Stripe Connect OAuth
- `/api/stripe/callback` stores the processor connection and monitored entity

### 6. Activation run

- `/activate/arming` polls activation progress
- `/api/activation/run` attempts to:
  - verify processor connection
  - pull Stripe activation inputs
  - generate a baseline snapshot
  - generate a reserve projection
  - mark the workspace active

### 7. Live dashboard

- paid users only reach the live dashboard if activation state becomes `live_monitored`
- otherwise they are forced back into activation / arming

## What The Customer Gets After Purchase

Today the intended Pro deliverable is:

- a hosted authenticated dashboard
- a Stripe-connected workspace
- a generated baseline risk surface
- a generated reserve projection
- monitoring-oriented views and evidence history

This is not primarily an API-key product today.

If a customer pays, they should not expect:

- immediate access without connecting Stripe
- an integration-first API workflow
- multi-processor support from the self-serve flow

## What Is Real

- Real hosted dashboard application exists
- Real authenticated workspace model exists
- Real Stripe Checkout subscription path exists
- Real Stripe OAuth connection path exists
- Real activation state machine exists
- Real activation runner exists
- Real baseline/projection generation exists
- The dashboard app builds successfully with `npm run build`

## What Is Still Weak Or Incomplete

### API keys are not real

The API keys page is still mock UI. It generates fake keys client-side and does not issue or persist secure credentials.

Implication:

- do not market PayFlux as an API-key-led self-serve product yet

### Connector settings are still operator-facing

The Stripe connector settings route only persists non-sensitive fields like labels. It explicitly does not persist signing secrets and expects secrets to be managed through environment variables.

Implication:

- webhook/connector setup is still partly ops-managed
- the connector screen looks more self-serve than it really is

### Some dashboard surfaces are still pilot/control-plane UI

Settings and some support pages still read like internal or pilot tooling instead of polished customer SaaS.

Implication:

- the product experience is uneven after login

### Mock/dev fallbacks still exist in customer-adjacent paths

Some proxy and evidence paths still have development mock behavior.

Implication:

- these need to be tightly controlled before broader customer exposure

### Activation can fail for ordinary customer reasons

Activation currently fail-closes if:

- no processor connection exists
- monitored entity host is missing
- Stripe account is not ready
- there is insufficient recent Stripe activity

Implication:

- a paying customer can still get stuck immediately after purchase
- this needs either stronger prequalification or strong assisted onboarding

## Operational Reality Right Now

### Best-fit customer

- Stripe merchant
- enough recent Stripe activity
- valid business URL / host
- active processor concern or desire for live payout-risk monitoring
- comfortable with a beta/assisted onboarding experience

### Bad-fit customer right now

- non-Stripe merchant expecting full product parity
- low-activity merchant
- customer expecting turnkey API onboarding
- customer expecting polished account administration immediately after purchase

## Go / No-Go Decision

### Go if

- we sell it as a guided beta
- we stay Stripe-first
- we are willing to assist activation failures manually
- we are comfortable telling customers the product is hosted and onboarding is hands-on

### No-Go if

- we want broad public self-serve launch
- we want to advertise API-key integrations as core value
- we want multi-processor onboarding without operator help
- we are not prepared to support stuck activations

## Recommended Near-Term Commercial Positioning

Sell PayFlux as:

- hosted
- Stripe-first
- live payout-risk monitoring
- founder-assisted onboarding
- beta / pilot access

Do not sell PayFlux yet as:

- open-ended platform
- polished API product
- zero-touch onboarding flow

## What Needs To Be True Before Broad Self-Serve

### P0

- Real API key issuance and secure storage
- Real connector secret handling or fully remove self-serve webhook setup claims
- Clean handling for activation failure states
- Stronger pre-purchase qualification for Stripe activity and business host readiness

### P1

- Remove or lock down development mock behavior in customer-facing paths
- Make settings/billing/account pages reflect real customer state
- Improve onboarding copy around what happens after purchase

### P2

- Add broader processor support if desired
- Add true self-serve operational controls
- Add cleaner account and team management

## Recommended Internal Sales Rule

Until the P0 items are addressed, every closed customer should be treated as:

- assisted onboarding required
- Stripe-first
- activation health must be checked manually after purchase

## One-Sentence Honest Status

PayFlux is real enough to sell as a guided Stripe-only beta, but not yet polished enough to trust as a broad self-serve SaaS.

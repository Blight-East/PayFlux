# Detecting Stripe Payment Incidents

## Overview
Stripe accounts are monitored by automated risk systems that can trigger sudden restrictions or closures. Detecting these incidents early is critical for operational continuity. Incident detection relies on monitoring API error rates, webhooks, and account status changes to identify when standard processing has been interrupted.

## Common Stripe incident patterns
Incidents typically manifest as:
- **API Rejections**: `400` or `402` errors indicating "account restricted" or "sending limits exceeded".
- **Webhook Alerts**: `account.updated` events with `payouts_enabled: false` or `charges_enabled: false`.
- **Payout Failures**: Scheduled payouts transitioning to `canceled` or `failed` status.
- **Balance Holds**: Funds moving from `available` to `reserved` buckets.

## How incident detection works
Detection infrastructure monitors the Stripe API for non-standard responses.

1.  **Status Polling**: Periodically checking the `Account` object for capability status.
2.  **Error Rate Monitoring**: Tracking spikes in specific error codes (e.g., `account_invalid`).
3.  **Webhook Ingestion**: Listening for real-time state change notifications from Stripe.

## Operational response requirements
When an incident is detected, operations teams typically need to:
- **Verify**: Confirm the restriction via the Stripe Dashboard or API.
- **Assess**: Determine if the restriction applies to payments, payouts, or both.
- **Respond**: Submit required evidence or complete identification checks.
- **Mitigate**: Pause marketing or redirect traffic if processing is fully disabled.

## What infrastructure supports incident detection
Robust infrastructure ensures:
- **Real-time Alerting**: Immediate notification when account capabilities change.
- **Context Preservation**: Snapshotting the account state at the moment of the incident.
- **Timeline Reconstruction**: logging the sequence of events leading up to the restriction.

## Where PayFlux fits
PayFlux fits as an independent monitoring layer for Stripe integrations. It observes account status, tracks webhook events, and visualizes the timeline of risk incidents. PayFlux monitors for critical state changes—like reserve activation or payout suspension—and preserves this history to support operational response and audit requirements. PayFlux does not control Stripe account status but ensures teams are aware of changes the moment they occur.

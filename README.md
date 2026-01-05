PayFlux

Real-time payment event gateway for modern fintech teams

PayFlux is a lightweight, high-throughput ingestion node that centralizes payment events into a durable, ordered stream — without the operational overhead of Kafka or heavyweight streaming platforms.

It is designed for teams who already feel pain around payment reliability, observability, and downstream coupling, and want a simple, infrastructure-grade solution they can self-host.

⸻

What PayFlux Does

PayFlux sits between your payment producers and everything downstream.
	•	Services, webhooks, or processors send payment events via HTTP
	•	PayFlux validates and ingests events at high throughput
	•	Events are buffered, ordered, and persisted in Redis Streams
	•	Consumers process events independently, at their own pace

No producer ever blocks on downstream systems.

⸻

Who It’s For

PayFlux is built for:
	•	Payment processors & gateways
Internal event pipelines, risk tooling, analytics, and ops visibility
	•	E-commerce platforms & marketplaces
Centralized tracking of payment success, failures, retries, and provider behavior
	•	Fintech & SaaS billing teams
Subscriptions, usage-based billing, wallets, lending, and audit-friendly flows

If you’re already dealing with:
	•	merchants being flagged or dropped
	•	inconsistent payment data across systems
	•	fragile webhook chains
	•	batch jobs discovering problems too late

PayFlux is for you.

⸻

Architecture Overview

PayFlux follows a simple, proven model:
	•	Producers are stateless HTTP clients
Any service can emit events with a JSON POST.
	•	Redis Streams provide durability, ordering, and backpressure
Traffic spikes are absorbed without dropping events.
	•	Consumers scale independently
Add new consumers without touching the ingest path.
	•	No producer ever waits on downstream systems
This protects your core payment flows from failures elsewhere.

Think of PayFlux as the event backbone for payments.

⸻

Key Features
	•	High-throughput HTTP ingestion
	•	Redis Streams for durable, ordered events
	•	Consumer groups for parallel processing
	•	Built-in health check endpoint
	•	Prometheus metrics out of the box
	•	Structured logging
	•	Dead-letter stream support (failed consumer handling)
	•	Stateless design — easy to scale horizontally

⸻

Operational Endpoints
	•	POST /v1/events/payment_exhaust
Ingest payment events
	•	GET /health
Liveness check
	•	GET /metrics
Prometheus-compatible metrics

⸻

Deployment Model

PayFlux is self-hosted by default.

Typical deployments:
	•	Single node for early production
	•	Multiple stateless nodes behind a load balancer
	•	Shared Redis instance or cluster

PayFlux does not require Kafka, Zookeeper, or managed streaming services.

⸻

Reliability Guarantees
	•	At-least-once event delivery
	•	Ordered events per stream
	•	Consumer acknowledgment semantics
	•	Safe restarts without event loss

⸻

Licensing

PayFlux is distributed under a commercial license.
	•	Annual self-hosted license
	•	Pricing based on deployment size and expected event volume
	•	Generous included limits
	•	Custom enterprise agreements available

See LICENSE.md for full terms.

⸻

Early Access

PayFlux is currently available under an early access program.

To request access or discuss licensing:
	•	Visit https://payflux.dev
	•	Submit the early access form

⸻

Philosophy

PayFlux is intentionally:
	•	Small
	•	Focused
	•	Infrastructure-grade

It does one thing extremely well:
move payment events safely and predictably through your system.

⸻

Status

PayFlux is production-ready and actively evolving.

⸻

Contact

For licensing, deployment guidance, or custom agreements:
hello@payflux.dev
 


Pricing & Licensing

PayFlux is offered as a self-hosted, licensed infrastructure component designed for high-throughput payment environments.

Pricing is annual, with generous included limits and clear upgrade paths.

Starter — $2,500 / year

For early teams and internal tooling.
	•	Up to 10 million events / year
	•	Single deployment (1 environment)
	•	Redis Streams–based ingestion & buffering
	•	Health check and Prometheus metrics endpoints
	•	Community support (GitHub Issues)
	•	License valid for one organization

Best for: startups, internal payment observability, proof-of-production deployments.

⸻

Growth — $7,500 / year

For production fintech systems with real volume.
	•	Up to 100 million events / year
	•	Multiple environments (prod + staging)
	•	Consumer group support for parallel processing
	•	Dead-letter stream support
	•	Priority email support
	•	Upgrade-safe releases during license term

Best for: SaaS billing platforms, marketplaces, growing payment stacks.

⸻

Enterprise — Custom

For processors and high-scale platforms.
	•	Unlimited or negotiated event volume
	•	Multi-region deployments
	•	Custom SLAs and support agreements
	•	Architecture review & onboarding support
	•	Optional roadmap influence
	•	Commercial redistribution rights (if applicable)

Best for: payment processors, gateways, large fintech companies.

⸻

Licensing Model

The self-hosted license is priced annually and designed for high-throughput environments.
Pricing is based on deployment size and expected event volume, with generous included limits.
For teams exceeding those limits, custom enterprise agreements are available.

You host PayFlux.
You own your data.
You stay in control of your infrastructure.

⸻

Early Access

Early access customers receive:
	•	Discounted first-year pricing
	•	Direct access to the maintainer
	•	Priority on feature requests and feedback

To request early access, visit https://payflux.dev or contact hello@payflux.dev.

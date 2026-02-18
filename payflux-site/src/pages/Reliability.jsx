import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Reliability = () => {
    useEffect(() => {
        document.title = 'Reliability – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#uptime">Uptime</a>
                        <a href="#durability">Durability</a>
                        <a href="#degradation">Degradation</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Reliability</h1>
                    <p className="subtitle">Built for always-on payment infrastructure where dropped signals mean missed risk and real financial exposure</p>
                </section>

                <section id="uptime" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>System Availability</h2>
                        <p>Payment risk infrastructure cannot afford downtime. When your system processes thousands of transactions per hour, even a brief monitoring gap creates blind spots where chargebacks and fraud patterns go undetected. PayFlux is engineered for continuous availability.</p>
                        <div className="tier-grid">
                            <div className="tier-card pilot">
                                <h3>API Uptime</h3>
                                <p>Core risk scoring and signal ingestion APIs are designed for high availability</p>
                                <ul>
                                    <li>99.9% uptime target for scoring endpoints</li>
                                    <li>Multi-region deployment for geographic redundancy</li>
                                    <li>Health check endpoints with sub-second response</li>
                                    <li>Automated failover on instance degradation</li>
                                </ul>
                            </div>
                            <div className="tier-card growth">
                                <h3>Stream Processing</h3>
                                <p>Real-time signal processing pipeline maintains throughput under variable load conditions</p>
                                <ul>
                                    <li>Redis Streams with consumer group guarantees</li>
                                    <li>At-least-once delivery for all risk events</li>
                                    <li>Automatic rebalancing across consumer instances</li>
                                    <li>Lag monitoring with alerting thresholds</li>
                                </ul>
                            </div>
                            <div className="tier-card scale">
                                <h3>Dashboard Availability</h3>
                                <p>The PayFlux dashboard is served from edge infrastructure for fast, reliable access worldwide</p>
                                <ul>
                                    <li>Static asset delivery via global CDN</li>
                                    <li>API gateway with automatic retry logic</li>
                                    <li>Offline-capable for cached risk views</li>
                                    <li>Independent from core processing pipeline</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="durability" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Redis Stream Durability</h2>
                        <p>PayFlux uses Redis Streams as the backbone of its real-time processing pipeline. Streams provide ordered, persistent, and replayable event logs that ensure no risk signal is lost, even during consumer failures or deployment windows.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Persistent Event Log</h3>
                                <p>Every transaction event and risk signal is appended to a durable Redis Stream with AOF persistence enabled. Events remain available for reprocessing even after consumer acknowledgment, providing a rolling window of replayable history for debugging and audit purposes.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Consumer Group Semantics</h3>
                                <p>Risk signal consumers operate within Redis consumer groups, which track processing state per consumer. If a consumer crashes mid-processing, its pending entries are automatically reclaimed by healthy consumers after a configurable timeout, ensuring zero message loss.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Exactly-Once Processing</h3>
                                <p>While Redis Streams guarantee at-least-once delivery, PayFlux implements idempotency keys on all state-changing operations. Duplicate deliveries are detected and deduplicated, achieving effectively-once semantics for tier transitions, alert generation, and score updates.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="degradation" className="signals-grid">
                    <h2>Graceful Degradation</h2>
                    <p>PayFlux is designed to degrade gracefully under adverse conditions rather than fail catastrophically. Every component has a defined failure mode that preserves the most critical functionality.</p>
                    <div className="signal-card">
                        <h3>Rate Limiting</h3>
                        <p>Inbound API traffic is rate-limited per tenant using token bucket algorithms. Limits are generous under normal operation but prevent any single tenant from overwhelming shared infrastructure.</p>
                        <ul>
                            <li>Per-tenant rate limits with burst allowance</li>
                            <li>429 responses with Retry-After headers</li>
                            <li>Priority lanes for critical risk alerts</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Backpressure Handling</h3>
                        <p>When downstream processing cannot keep pace with ingestion, PayFlux applies backpressure through the Redis Stream pipeline rather than dropping events.</p>
                        <ul>
                            <li>Stream depth monitoring with lag alerts</li>
                            <li>Automatic consumer scaling based on pending count</li>
                            <li>Buffered writes with configurable high-water marks</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Circuit Breakers</h3>
                        <p>External dependencies (database queries, third-party APIs) are wrapped in circuit breakers that prevent cascade failures from propagating through the system.</p>
                        <ul>
                            <li>Half-open probing for automatic recovery</li>
                            <li>Fallback to cached scores during open-circuit state</li>
                            <li>Per-dependency failure thresholds and timeouts</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Monitoring and Alerting</h3>
                        <p>Comprehensive observability ensures operational issues are detected and addressed before they impact risk scoring accuracy.</p>
                        <ul>
                            <li>Stream lag, consumer health, and scoring latency metrics</li>
                            <li>Anomaly detection on system-level indicators</li>
                            <li>Escalation paths with configurable severity tiers</li>
                        </ul>
                    </div>
                </section>

                <section className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Deployment Resilience</h2>
                        <p>Deployments and updates are designed to be invisible to consumers. PayFlux never requires maintenance windows for routine updates.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Zero-Downtime Deployments</h3>
                                <p>Rolling deployments ensure that at least one instance of every service is healthy at all times. New versions are canary-tested with a subset of traffic before full rollout. Automated rollback triggers on error rate increases above baseline.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Schema Evolution</h3>
                                <p>API and data schema changes follow backward-compatible evolution patterns. New fields are additive-only, deprecated fields continue to be served during transition periods, and consumers are never broken by upstream schema changes.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Risk infrastructure that never sleeps</h2>
                    <p>Payment risk does not take downtime. Neither does PayFlux. Build on infrastructure designed for continuous, reliable operation.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Get Started</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Reliability;

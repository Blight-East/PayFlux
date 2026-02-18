import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Spec = () => {
    useEffect(() => {
        document.title = 'Technical Specification – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#spec">Specification</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Technical Specification</h1>
                    <p className="subtitle">API schemas, event formats, scoring models, and integration patterns for building on PayFlux</p>
                </section>

                <section id="spec" className="signals-grid">
                    <div className="signal-card">
                        <h3>Event Schema</h3>
                        <p>Every payment event ingested by PayFlux conforms to a canonical schema that captures the full context needed for risk evaluation. The schema is versioned and backward-compatible.</p>
                        <ul>
                            <li>Core fields: event_id, event_type, timestamp, amount, currency, merchant_id</li>
                            <li>Identity block: card_fingerprint, device_id, ip_address, geo coordinates</li>
                            <li>Context block: session_id, channel, recurring flag, authentication method</li>
                            <li>Schema versioning via Accept-Version header; deprecated fields carry sunset dates</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Risk Scoring Model</h3>
                        <p>The scoring model is fully deterministic. Each event is evaluated against a set of signal rules, and the resulting signals are weighted and summed into a composite score mapped to a risk band.</p>
                        <ul>
                            <li>Score range: 0–1000, mapped to bands — low (0–249), elevated (250–499), high (500–749), critical (750–1000)</li>
                            <li>Each signal carries a base weight and a context multiplier</li>
                            <li>Signal conflicts are resolved by precedence rules, not averaging</li>
                            <li>Score response includes the full signal array and computed evidence narrative</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>API and Integration Patterns</h3>
                        <p>PayFlux exposes a REST API for synchronous scoring and a webhook system for asynchronous event delivery. Both paths return identical score payloads.</p>
                        <ul>
                            <li>POST /v1/events for synchronous ingest and score; response includes risk_score and signals</li>
                            <li>GET /v1/events/:id/evidence returns the full evidence narrative for a scored event</li>
                            <li>Webhook delivery: POST to your registered endpoint with HMAC-SHA256 signature verification</li>
                            <li>Authentication via API key in the Authorization header; keys are scoped per environment</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Data Formats and Webhooks</h3>
                        <p>All API responses and webhook payloads use JSON with consistent envelope structures. Timestamps are ISO 8601 in UTC. Monetary amounts are integer minor units to avoid floating-point errors.</p>
                        <ul>
                            <li>Response envelope: {"{'data': {}, 'meta': {'request_id', 'timestamp'}}"}</li>
                            <li>Webhook payload includes event_id, risk_score, risk_band, signals array, and evidence summary</li>
                            <li>Retry policy: exponential backoff with jitter, up to 5 attempts over 24 hours</li>
                            <li>Idempotency keys on POST requests prevent duplicate event processing</li>
                        </ul>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Ready to integrate?</h2>
                    <p>Start sending payment events to PayFlux and receive real-time risk scores with full evidence traceability.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Explore PayFlux</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Spec;

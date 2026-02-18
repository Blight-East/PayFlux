import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Architecture = () => {
    useEffect(() => {
        document.title = 'Architecture – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#architecture">Architecture</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Architecture</h1>
                    <p className="subtitle">How PayFlux ingests payment events, scores risk in real time, and delivers observable evidence to your team</p>
                </section>

                <section id="architecture" className="signals-grid">
                    <div className="signal-card">
                        <h3>Ingest Pipeline</h3>
                        <p>Payment events enter PayFlux through a high-throughput ingest layer designed for processor-scale volume. Events are validated, normalized, and enriched before they reach the scoring engine.</p>
                        <ul>
                            <li>REST and webhook-based event ingestion with schema validation at the edge</li>
                            <li>Event normalization maps processor-specific formats to a canonical PayFlux schema</li>
                            <li>Enrichment stage attaches geolocation, device context, and merchant metadata</li>
                            <li>Redis Streams provide durable, ordered event delivery to downstream consumers</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Risk Scoring Engine</h3>
                        <p>The scoring engine evaluates every event against a deterministic rule set. Each rule emits typed signals, and signals are weighted and aggregated into a composite risk score with a full evidence chain.</p>
                        <ul>
                            <li>Deterministic evaluation: same input always produces the same score</li>
                            <li>Signal-level granularity allows independent tuning of individual risk indicators</li>
                            <li>Composite scoring aggregates weighted signals into risk bands (low, elevated, high, critical)</li>
                            <li>Evidence generation runs in-line with scoring — every score ships with its narrative</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Evidence and Storage Layer</h3>
                        <p>Scored events, signals, and evidence narratives are persisted for querying, audit, and historical analysis. The storage layer is optimized for both real-time lookups and bulk analytical queries.</p>
                        <ul>
                            <li>PostgreSQL stores canonical event records, scores, and structured evidence</li>
                            <li>Redis provides sub-millisecond access to active session and velocity state</li>
                            <li>Evidence narratives are stored as structured JSON linked to their source signals</li>
                            <li>Retention policies enforce data lifecycle in compliance with PCI and regional regulations</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Dashboard and API Layer</h3>
                        <p>The presentation layer serves both human operators through the dashboard and automated systems through the API. Both surfaces expose the same underlying data with full signal traceability.</p>
                        <ul>
                            <li>React-based dashboard with real-time event streaming and drill-down views</li>
                            <li>REST API for programmatic access to scores, signals, and evidence</li>
                            <li>Webhook delivery pushes risk decisions to your existing payment orchestration</li>
                            <li>Role-based access control separates analyst, operations, and integration permissions</li>
                        </ul>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Explore the platform architecture</h2>
                    <p>See how PayFlux connects to your payment stack and delivers real-time risk observability end to end.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Explore PayFlux</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Architecture;

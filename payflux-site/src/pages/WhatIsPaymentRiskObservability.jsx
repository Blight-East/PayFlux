import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const WhatIsPaymentRiskObservability = () => {
    useEffect(() => {
        document.title = 'What Is Payment Risk Observability – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#observability">Observability</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>What Is Payment Risk Observability</h1>
                    <p className="subtitle">Understanding how modern payment teams move from reactive fraud detection to continuous, evidence-driven risk awareness</p>
                </section>

                <section id="observability" className="signals-grid">
                    <div className="signal-card">
                        <h3>Beyond Fraud Detection</h3>
                        <p>Traditional payment risk tools answer a single question: is this transaction fraudulent? Payment risk observability asks a fundamentally different question: what is happening across my payment surface right now, and what does the evidence tell me?</p>
                        <ul>
                            <li>Continuous visibility into every transaction event, not just flagged ones</li>
                            <li>Contextual awareness of merchant behavior, velocity patterns, and network relationships</li>
                            <li>Shift from binary accept/reject decisions to graded risk understanding</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Telemetry for Payments</h3>
                        <p>Observability in software engineering relies on logs, metrics, and traces. Payment risk observability applies the same principles to financial transaction flows, treating every payment event as a telemetry data point.</p>
                        <ul>
                            <li>Transaction events captured as structured telemetry with full context</li>
                            <li>Metric streams for velocity, decline rates, chargeback ratios, and authorization patterns</li>
                            <li>Distributed traces that follow a payment from initiation through settlement</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Signals and Evidence Narratives</h3>
                        <p>PayFlux transforms raw telemetry into risk signals — discrete, typed indicators that describe what is anomalous and why. Signals are composed into evidence narratives that give analysts a clear, auditable story behind every risk decision.</p>
                        <ul>
                            <li>Signals are atomic: one signal describes one observable risk indicator</li>
                            <li>Evidence narratives chain signals into human-readable explanations</li>
                            <li>Every score can be traced back to the signals and data that produced it</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Why It Matters for Payment Teams</h3>
                        <p>Payment operations teams face increasing pressure from regulators, card networks, and customers. Observability gives them the tools to respond with precision instead of guesswork.</p>
                        <ul>
                            <li>Reduce false positives by understanding the full evidence behind every flag</li>
                            <li>Meet regulatory audit requirements with deterministic, explainable decisions</li>
                            <li>Detect emerging attack patterns before they breach chargeback thresholds</li>
                            <li>Align risk, compliance, and product teams around a shared source of truth</li>
                        </ul>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>See payment risk observability in action</h2>
                    <p>Explore how PayFlux gives your team continuous visibility into transaction risk with full signal traceability.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Explore PayFlux</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default WhatIsPaymentRiskObservability;

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const DeterministicRiskScoring = () => {
    useEffect(() => {
        document.title = 'Deterministic Risk Scoring – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#scoring">Scoring</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Deterministic Risk Scoring</h1>
                    <p className="subtitle">Transparent, auditable, and reproducible risk decisions — no black-box models, no unexplainable outcomes</p>
                </section>

                <section id="scoring" className="signals-grid">
                    <div className="signal-card">
                        <h3>Why Deterministic Scoring</h3>
                        <p>Machine learning models can drift, hallucinate risk, and resist explanation. When a regulator or card network asks why a transaction was declined, "the model said so" is not an acceptable answer. Deterministic scoring means the same inputs always produce the same outputs, and every output can be explained.</p>
                        <ul>
                            <li>Reproducibility: replay any event and get the identical score and evidence</li>
                            <li>Explainability: every point in the score maps to a named signal with a documented rationale</li>
                            <li>Auditability: regulators and compliance teams can inspect the full decision chain</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Rule-Based Signal Evaluation</h3>
                        <p>PayFlux evaluates every transaction against a registry of typed signal rules. Each rule inspects a specific dimension of the event — velocity, geography, device, amount, merchant history — and emits a signal when its conditions are met.</p>
                        <ul>
                            <li>Signal rules are versioned, testable, and deployable independently</li>
                            <li>Each signal has a type, severity, base weight, and human-readable description</li>
                            <li>Rules can reference session state, historical baselines, and cross-event context</li>
                            <li>New rules are validated in shadow mode before they contribute to live scores</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Signal Weighting and Risk Bands</h3>
                        <p>Emitted signals are weighted and summed into a composite score on a 0–1000 scale. The score maps to a risk band that drives downstream action — approve, review, step-up authentication, or block.</p>
                        <ul>
                            <li>Low (0–249): transaction proceeds with standard monitoring</li>
                            <li>Elevated (250–499): flagged for enhanced logging and optional analyst review</li>
                            <li>High (500–749): routed to manual review queue or step-up authentication</li>
                            <li>Critical (750–1000): blocked and escalated with full evidence narrative</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Scoring Transparency and Audit Trails</h3>
                        <p>Every scored event in PayFlux carries a complete audit trail. The trail includes every signal that fired, the weight each signal contributed, and the evidence narrative that explains the final decision in plain language.</p>
                        <ul>
                            <li>Score breakdowns show individual signal contributions to the composite total</li>
                            <li>Evidence narratives translate signal combinations into human-readable risk stories</li>
                            <li>Historical score snapshots allow before/after comparison when rules are updated</li>
                            <li>Export-ready audit reports for PCI DSS, SOC 2, and card network compliance reviews</li>
                        </ul>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Score risk with full transparency</h2>
                    <p>See how PayFlux gives your team deterministic, explainable risk scores for every payment event.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Explore PayFlux</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default DeterministicRiskScoring;

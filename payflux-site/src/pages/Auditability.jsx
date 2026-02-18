import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Auditability = () => {
    useEffect(() => {
        document.title = 'Auditability – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#audit-trail">Audit Trail</a>
                        <a href="#transparency">Transparency</a>
                        <a href="#exports">Exports</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Auditability</h1>
                    <p className="subtitle">Every risk decision is traceable, explainable, and exportable — built for compliance teams and processor reviews</p>
                </section>

                <section id="audit-trail" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Audit Trail Capabilities</h2>
                        <p>In payment risk management, "trust but verify" is not enough. Processors, compliance officers, and regulators need to trace exactly how a risk decision was made, what data informed it, and when it occurred. PayFlux maintains a complete, immutable audit trail for every risk event in the system.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Evidence Narratives</h3>
                                <p>Every tier transition and risk score change generates a human-readable evidence narrative. These narratives document the specific signals that triggered the change, the thresholds that were crossed, and the resulting action. When a processor asks "why did this merchant's risk level change?", the narrative provides a clear, timestamped answer.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Tier History Tracking</h3>
                                <p>PayFlux maintains a complete history of every merchant's tier transitions — every upgrade, downgrade, and hold. Each entry records the previous tier, the new tier, the timestamp, and the composite score at the time of transition. This creates an unbroken chain of risk state changes from onboarding forward.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Signal Attribution</h3>
                                <p>Each risk score is decomposed into its contributing signals with individual weights. Audit records show not just the final score but the breakdown: which signals contributed positively, which contributed negatively, and by how much. This granularity lets compliance teams identify exactly which behavioral pattern drove a risk decision.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="transparency" className="signals-grid">
                    <h2>Decision Transparency</h2>
                    <p>PayFlux does not use opaque ML models or black-box scoring. Every risk decision flows through a deterministic scoring engine where inputs map predictably to outputs, making the entire system auditable by design.</p>
                    <div className="signal-card">
                        <h3>Deterministic Scoring</h3>
                        <p>The PayFlux risk engine uses rule-based scoring with explicit weights and thresholds. Given the same inputs, the system always produces the same output.</p>
                        <ul>
                            <li>No hidden model weights or stochastic elements</li>
                            <li>Scoring logic is versioned and change-tracked</li>
                            <li>Any historical score can be reproduced from archived inputs</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Threshold Documentation</h3>
                        <p>Every threshold in the system — tier boundaries, alert triggers, monitoring program limits — is explicitly documented and accessible through the API.</p>
                        <ul>
                            <li>Published threshold values for all risk bands</li>
                            <li>Version history when thresholds are updated</li>
                            <li>Advance notice before threshold changes take effect</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Decision Lineage</h3>
                        <p>Every automated action in PayFlux — tier changes, alerts, notifications — links back to the specific event, score, and threshold that triggered it.</p>
                        <ul>
                            <li>Full causal chain from transaction event to risk action</li>
                            <li>Timestamp precision to the millisecond</li>
                            <li>Cross-reference IDs linking events across subsystems</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Scoring Version Control</h3>
                        <p>When scoring rules are updated, previous versions are archived. Historical scores are always evaluated against the rule version that was active at the time.</p>
                        <ul>
                            <li>Immutable rule version snapshots</li>
                            <li>Side-by-side comparison of rule versions</li>
                            <li>Backtest capability against historical data</li>
                        </ul>
                    </div>
                </section>

                <section id="exports" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Export and Compliance</h2>
                        <p>Audit data is only useful if it can be delivered to the people who need it — compliance teams, processor risk departments, and external auditors. PayFlux provides multiple export paths designed for different compliance workflows.</p>
                        <div className="tier-grid">
                            <div className="tier-card pilot">
                                <h3>Structured Exports</h3>
                                <p>Export audit data in formats designed for compliance tooling and regulatory submissions</p>
                                <ul>
                                    <li>CSV and JSON export for all audit records</li>
                                    <li>Date range and merchant-scoped filtering</li>
                                    <li>Scheduled automated exports via API</li>
                                    <li>Webhook delivery for real-time audit streams</li>
                                </ul>
                            </div>
                            <div className="tier-card growth">
                                <h3>Compliance Reports</h3>
                                <p>Pre-formatted reports aligned with common processor and network compliance requirements</p>
                                <ul>
                                    <li>Chargeback monitoring program status reports</li>
                                    <li>Risk tier transition summaries by period</li>
                                    <li>Signal activity reports for processor review</li>
                                    <li>Remediation plan documentation templates</li>
                                </ul>
                            </div>
                            <div className="tier-card scale">
                                <h3>API Access</h3>
                                <p>Full programmatic access to audit data for integration with existing compliance and GRC platforms</p>
                                <ul>
                                    <li>RESTful audit log endpoints with pagination</li>
                                    <li>Filter by event type, severity, and time range</li>
                                    <li>Bulk retrieval for large-scale audit exercises</li>
                                    <li>Integration guides for major GRC platforms</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Built for Processor Conversations</h2>
                        <p>The most critical moment for auditability is when a processor questions your risk management practices. PayFlux gives you the documentation and evidence you need to have that conversation from a position of strength.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Remediation Evidence Packages</h3>
                                <p>When a processor requests a remediation plan, PayFlux generates an evidence package showing the specific actions taken, the timeline of risk metric improvements, and projected trajectory. These packages are formatted to address the specific concerns processors raise during compliance reviews.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Continuous Compliance Posture</h3>
                                <p>Rather than scrambling to assemble documentation when a review occurs, PayFlux continuously maintains your compliance posture. Audit records are generated as a byproduct of normal operation, not as a separate reporting exercise. When the processor calls, the evidence is already assembled.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Dispute Response Support</h3>
                                <p>For chargeback representment and dispute responses, PayFlux provides the transaction-level audit trail that demonstrates due diligence. Evidence narratives include the risk signals active at the time of the original transaction, supporting your case that appropriate risk controls were in place.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Make every risk decision defensible</h2>
                    <p>When processors ask questions, have the answers ready. PayFlux gives you complete audit trails and compliance documentation out of the box.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Start Building Audit Trails</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Auditability;

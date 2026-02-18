import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const ProcessorRiskIntelligence = () => {
    useEffect(() => {
        document.title = 'Processor Risk Intelligence – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#risk-models">Risk Models</a>
                        <a href="#triggers">Triggers</a>
                        <a href="#risk-bands">Risk Bands</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Processor Risk Intelligence</h1>
                    <p className="subtitle">Understand how processors evaluate merchant risk and stay ahead of scrutiny with transparent scoring</p>
                </section>

                <section id="risk-models" className="signals-grid">
                    <h2>How Processors Evaluate Merchant Risk</h2>
                    <p>Every payment processor maintains internal risk models that determine merchant standing, reserve requirements, and account stability. These models ingest signals from chargeback ratios, refund velocity, transaction patterns, and industry classification. PayFlux reverse-maps these evaluation criteria so merchants can see themselves the way processors do.</p>
                    <div className="signal-card">
                        <h3>Chargeback Ratio Scoring</h3>
                        <p>Processors track chargeback-to-transaction ratios on rolling 30, 60, and 90-day windows. Visa and Mastercard monitoring programs trigger at different thresholds.</p>
                        <ul>
                            <li>Visa Dispute Monitoring Program (VDMP) triggers at 0.9% ratio with 100+ disputes</li>
                            <li>Mastercard Excessive Chargeback Program (ECP) triggers at 1.5% ratio</li>
                            <li>PayFlux tracks your position relative to each threshold in real time</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Refund Velocity Analysis</h3>
                        <p>High refund rates signal product or fulfillment issues to processors. Sustained spikes can trigger manual reviews or processing holds.</p>
                        <ul>
                            <li>Refund-to-sale ratio monitoring across rolling windows</li>
                            <li>Sudden refund spikes flagged as potential fraud indicators</li>
                            <li>Correlation analysis between refund patterns and dispute escalation</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>Transaction Pattern Profiling</h3>
                        <p>Processors build behavioral baselines for each merchant. Deviations from established patterns — sudden volume surges, ticket size changes, or geographic shifts — raise risk flags.</p>
                        <ul>
                            <li>Average ticket size deviation tracking</li>
                            <li>Volume anomaly detection against historical baselines</li>
                            <li>Cross-border transaction ratio monitoring</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>MCC and Industry Risk Weighting</h3>
                        <p>Merchant Category Codes carry inherent risk weights. High-risk MCCs like 5967 (direct marketing) or 7995 (gambling) face tighter scrutiny from day one.</p>
                        <ul>
                            <li>Industry-specific risk baselines and thresholds</li>
                            <li>MCC migration detection and alerting</li>
                            <li>Peer comparison within industry vertical</li>
                        </ul>
                    </div>
                </section>

                <section id="triggers" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>What Triggers Processor Scrutiny</h2>
                        <p>Processor risk teams operate on a graduated escalation model. Understanding these trigger points lets merchants take corrective action before consequences materialize.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Early Warning Indicators</h3>
                                <p>First-party fraud signals, authorization rate drops below 70%, and chargeback ratios approaching 0.65%. At this stage, processors begin internal flagging but rarely contact the merchant directly. PayFlux surfaces these pre-threshold signals so you can act early.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Active Monitoring Triggers</h3>
                                <p>Crossing the 0.9% chargeback threshold, sustained refund rates above 15%, or receiving fraud-coded chargebacks (reason code 10.4 or 4837) in clusters. Processors may impose rolling reserves of 5–10% or extend settlement windows.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Escalation Events</h3>
                                <p>Entering card network monitoring programs (VDMP, ECP), receiving compliance notices, or triggering MATCH list review criteria. At this level, processors evaluate whether to continue the relationship. Fines from card networks begin at $25,000 per month.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Termination Criteria</h3>
                                <p>Sustained breach of monitoring program thresholds for 3+ consecutive months, evidence of intentional fraud facilitation, or failure to implement a remediation plan. MATCH listing makes it extremely difficult to find alternative processing.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="risk-bands" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Risk Band Mapping</h2>
                        <p>PayFlux maps your merchant profile into discrete risk bands that mirror how processors internally classify accounts. Each band corresponds to specific processor behaviors, reserve requirements, and monitoring intensity.</p>
                        <div className="tier-grid">
                            <div className="tier-card pilot">
                                <h3>Low Risk (Band 1–2)</h3>
                                <p>Merchants with clean processing history, low chargeback ratios, and stable transaction patterns</p>
                                <ul>
                                    <li>Chargeback ratio below 0.3%</li>
                                    <li>No rolling reserves required</li>
                                    <li>Standard settlement windows (T+2)</li>
                                    <li>Eligible for rate optimization</li>
                                </ul>
                            </div>
                            <div className="tier-card growth">
                                <h3>Moderate Risk (Band 3–4)</h3>
                                <p>Merchants showing early risk signals or operating in elevated-risk industries</p>
                                <ul>
                                    <li>Chargeback ratio between 0.3% and 0.75%</li>
                                    <li>Potential 5% rolling reserve</li>
                                    <li>Extended settlement windows possible</li>
                                    <li>Enhanced monitoring recommended</li>
                                </ul>
                            </div>
                            <div className="tier-card scale">
                                <h3>High Risk (Band 5–6)</h3>
                                <p>Merchants approaching or within card network monitoring program thresholds</p>
                                <ul>
                                    <li>Chargeback ratio above 0.75%</li>
                                    <li>10%+ rolling reserve likely</li>
                                    <li>Weekly processor review cycles</li>
                                    <li>Remediation plan required</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>How PayFlux Helps</h2>
                        <p>Most merchants only learn about processor risk evaluation after consequences have already arrived — a reserve increase, a compliance notice, or a termination letter. PayFlux inverts this dynamic by giving merchants the same visibility that processor risk teams have.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Predictive Risk Positioning</h3>
                                <p>See your current risk band and trajectory. PayFlux projects where your metrics are heading based on rolling window analysis and alerts you before you cross critical thresholds.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Processor-Specific Calibration</h3>
                                <p>Different processors weight signals differently. PayFlux calibrates its scoring to match the risk models of major acquirers so your risk view matches what your processor actually sees.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Evidence-Based Remediation</h3>
                                <p>When risk signals escalate, PayFlux generates evidence narratives documenting what changed and why. These narratives give your risk team — and your processor — a clear picture of the situation and your response plan.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>See your risk profile through processor eyes</h2>
                    <p>Stop guessing how processors evaluate your account. Get real-time risk intelligence calibrated to actual processor models.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Start Risk Analysis</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default ProcessorRiskIntelligence;

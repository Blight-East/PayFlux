import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Taxonomy = () => {
    useEffect(() => {
        document.title = 'System Taxonomy – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#taxonomy">Taxonomy</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>System Taxonomy</h1>
                    <p className="subtitle">Standardized classification system for payment risk categories and processor types</p>
                </section>

                <section className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Risk Tiers</h2>
                        <div className="tier-grid">
                            <div className="tier-card pilot">
                                <h3>Pilot</h3>
                                <p>Early-stage integration with full monitoring and risk analysis</p>
                                <ul>
                                    <li>Real-time risk scoring</li>
                                    <li>Pattern detection</li>
                                    <li>Alert generation</li>
                                </ul>
                            </div>
                            <div className="tier-card growth">
                                <h3>Growth</h3>
                                <p>Scaled deployment with advanced automation and optimization</p>
                                <ul>
                                    <li>Automated responses</li>
                                    <li>Custom workflows</li>
                                    <li>API integration</li>
                                </ul>
                            </div>
                            <div className="tier-card scale">
                                <h3>Scale</h3>
                                <p>Enterprise-grade infrastructure with dedicated support</p>
                                <ul>
                                    <li>Priority support</li>
                                    <li>Custom analytics</li>
                                    <li>SLA guarantees</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="taxonomy-section">
                        <h2>Processor Classifications</h2>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Payment Gateways</h3>
                                <p>Direct payment processing platforms with risk assessment capabilities</p>
                            </div>
                            <div className="processor-item">
                                <h3>Acquirers</h3>
                                <p>Merchant acquirers and payment service providers</p>
                            </div>
                            <div className="processor-item">
                                <h3>Networks</h3>
                                <p>Card networks and payment rails</p>
                            </div>
                            <div className="processor-item">
                                <h3>Alternative Processors</h3>
                                <p>Non-traditional payment methods and emerging platforms</p>
                            </div>
                        </div>
                    </div>

                    <div className="taxonomy-section">
                        <h2>Risk Categories</h2>
                        <ul className="category-list">
                            <li><strong>Fraud:</strong> Unauthorized transactions and identity misuse</li>
                            <li><strong>Compliance:</strong> Regulatory and policy violations</li>
                            <li><strong>Operational:</strong> System failures and processing errors</li>
                            <li><strong>Reputational:</strong> Brand risk and customer impact</li>
                            <li><strong>Strategic:</strong> Market and partnership risks</li>
                        </ul>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Understand your payment risk landscape</h2>
                    <p>Use PayFlux's taxonomy to classify, analyze, and mitigate payment processing risks.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">View Your Taxonomy</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Taxonomy;

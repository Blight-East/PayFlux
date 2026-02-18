import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Signals = () => {
    useEffect(() => {
        document.title = 'Signal Registry – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#signals">Signals</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Signal Registry</h1>
                    <p className="subtitle">Real-time risk indicators and detection patterns for payment processors</p>
                </section>

                <section className="signals-grid">
                    <div className="signal-card">
                        <h3>Velocity Signals</h3>
                        <p>Track transaction velocity patterns and anomalies across time periods.</p>
                        <ul>
                            <li>Rapid transaction sequences</li>
                            <li>Threshold breaches</li>
                            <li>Behavioral baselines</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Geographic Signals</h3>
                        <p>Monitor location-based risk patterns and cross-border activity.</p>
                        <ul>
                            <li>Geo-velocity mismatches</li>
                            <li>High-risk regions</li>
                            <li>Location clustering</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Behavioral Signals</h3>
                        <p>Detect deviations from normal transaction patterns and merchant behavior.</p>
                        <ul>
                            <li>Device fingerprinting</li>
                            <li>User behavior changes</li>
                            <li>Pattern recognition</li>
                        </ul>
                    </div>

                    <div className="signal-card">
                        <h3>Network Signals</h3>
                        <p>Identify relationships and connections between transactions and actors.</p>
                        <ul>
                            <li>Connection mapping</li>
                            <li>Ring detection</li>
                            <li>Relationship scoring</li>
                        </ul>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Ready to detect risk signals?</h2>
                    <p>Join PayFlux and start protecting your payment operations today.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Explore PayFlux</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Signals;

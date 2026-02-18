import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Security = () => {
    useEffect(() => {
        document.title = 'Security – PayFlux';
    }, []);
    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#data-handling">Data Handling</a>
                        <a href="#authentication">Authentication</a>
                        <a href="#infrastructure">Infrastructure</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>Security</h1>
                    <p className="subtitle">Privacy-first architecture designed so sensitive merchant data never has to leave your control</p>
                </section>

                <section id="data-handling" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Data Handling and Privacy</h2>
                        <p>PayFlux is architected around a core principle: we never need your raw data to deliver risk intelligence. Our system operates on hashed identifiers and aggregated metrics, ensuring that sensitive merchant and cardholder information stays where it belongs — in your infrastructure.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Hashed Merchant Identifiers</h3>
                                <p>Merchant IDs are ingested as one-way SHA-256 hashes. PayFlux never stores, processes, or has access to raw merchant identifiers. Risk scoring, tier assignment, and signal detection all operate on hashed values, making it mathematically infeasible to reverse-engineer the original identifiers.</p>
                            </div>
                            <div className="processor-item">
                                <h3>No Raw PII Processing</h3>
                                <p>PayFlux does not ingest cardholder names, full card numbers, addresses, or any personally identifiable information. Our signal pipeline operates exclusively on transaction metadata — amounts, timestamps, response codes, and category codes. This design eliminates an entire class of data breach risk.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Aggregation Over Extraction</h3>
                                <p>Risk signals are computed from statistical aggregates — ratios, velocities, and distributions — rather than individual transaction records. Raw event data is processed in-stream and only aggregated metrics are persisted, minimizing the data surface area that exists at rest.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="signals-grid">
                    <h2>Encryption</h2>
                    <p>All data in the PayFlux pipeline is encrypted at every stage of its lifecycle, from ingestion through storage and delivery.</p>
                    <div className="signal-card">
                        <h3>In Transit</h3>
                        <p>All API communication is encrypted with TLS 1.3. HTTPS is enforced on every endpoint with no fallback to unencrypted connections.</p>
                        <ul>
                            <li>TLS 1.3 with modern cipher suites</li>
                            <li>HSTS headers enforced on all responses</li>
                            <li>Certificate transparency monitoring</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>At Rest</h3>
                        <p>Persisted data is encrypted using AES-256. Encryption keys are managed through dedicated key management infrastructure with automatic rotation.</p>
                        <ul>
                            <li>AES-256 encryption for all stored data</li>
                            <li>Automatic key rotation on 90-day cycles</li>
                            <li>Separate encryption contexts per tenant</li>
                        </ul>
                    </div>
                    <div className="signal-card">
                        <h3>In Processing</h3>
                        <p>Redis streams used for real-time signal processing are configured with authentication and network isolation. Stream data is ephemeral and automatically trimmed after processing.</p>
                        <ul>
                            <li>Authenticated Redis connections (requirepass + ACLs)</li>
                            <li>Network-level isolation via private subnets</li>
                            <li>Automatic stream trimming after consumption</li>
                        </ul>
                    </div>
                </section>

                <section id="authentication" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Authentication and Access Control</h2>
                        <p>PayFlux enforces layered authentication for both programmatic API access and interactive dashboard sessions, ensuring that every request is verified and scoped to the correct tenant.</p>
                        <div className="tier-grid">
                            <div className="tier-card pilot">
                                <h3>API Key Authentication</h3>
                                <p>Programmatic access to PayFlux APIs uses scoped API keys with explicit permission grants</p>
                                <ul>
                                    <li>Per-environment keys (test/production)</li>
                                    <li>Granular scope control (read, write, admin)</li>
                                    <li>Key rotation without downtime</li>
                                    <li>Automatic expiration policies</li>
                                </ul>
                            </div>
                            <div className="tier-card growth">
                                <h3>Clerk Authentication</h3>
                                <p>Dashboard access is secured through Clerk with modern identity verification</p>
                                <ul>
                                    <li>Multi-factor authentication support</li>
                                    <li>Session management with short-lived tokens</li>
                                    <li>OAuth integration for enterprise SSO</li>
                                    <li>Device-level trust verification</li>
                                </ul>
                            </div>
                            <div className="tier-card scale">
                                <h3>Tenant Isolation</h3>
                                <p>Every authenticated request is scoped to a single tenant context with strict boundary enforcement</p>
                                <ul>
                                    <li>Row-level security on all data queries</li>
                                    <li>Tenant context validated on every API call</li>
                                    <li>Cross-tenant access is architecturally impossible</li>
                                    <li>Audit logging of all access patterns</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="infrastructure" className="taxonomy-content">
                    <div className="taxonomy-section">
                        <h2>Infrastructure Security</h2>
                        <p>PayFlux infrastructure follows defense-in-depth principles with multiple overlapping security controls at the network, application, and operational layers.</p>
                        <div className="processor-list">
                            <div className="processor-item">
                                <h3>Network Architecture</h3>
                                <p>Application services run in private subnets with no direct internet access. All inbound traffic routes through load balancers with WAF rules that filter malicious payloads, SQL injection attempts, and known attack patterns. Outbound traffic is restricted to explicitly allowlisted destinations.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Dependency Management</h3>
                                <p>All third-party dependencies are pinned to exact versions and scanned for known vulnerabilities on every build. Critical security patches are applied within 24 hours of disclosure. Supply chain integrity is verified through lockfile validation and package signature checks.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Operational Security</h3>
                                <p>Production access requires multi-party approval and is logged to an immutable audit trail. Infrastructure changes are deployed through code review and CI/CD pipelines — no manual changes to production systems. Secrets are injected at runtime from encrypted stores, never committed to source control.</p>
                            </div>
                            <div className="processor-item">
                                <h3>Compliance Considerations</h3>
                                <p>By design, PayFlux minimizes its compliance surface area. Because we never process raw PII or cardholder data, many PCI DSS requirements are satisfied architecturally. Our hashed-identifier approach means merchants can use PayFlux without expanding their own compliance scope.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <h2>Security you can verify</h2>
                    <p>Our privacy-first architecture means you get full risk intelligence without exposing sensitive data. See how PayFlux keeps your merchant operations secure.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Explore PayFlux</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Security;

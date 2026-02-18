import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Glossary = () => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        document.title = 'Glossary – PayFlux';
    }, []);

    const terms = [
        {
            term: 'Acquirer',
            definition: 'A financial institution that processes payment card transactions on behalf of merchants.'
        },
        {
            term: 'BIN',
            definition: 'Bank Identification Number - the first 6 digits of a payment card that identify the issuing bank.'
        },
        {
            term: 'Chargeback',
            definition: 'A reversal of a payment transaction initiated by the cardholder or issuing bank.'
        },
        {
            term: 'CVV',
            definition: 'Card Verification Value - a security code on payment cards used to verify Card-Not-Present transactions.'
        },
        {
            term: 'False Positive',
            definition: 'A legitimate transaction incorrectly flagged as fraudulent by risk detection systems.'
        },
        {
            term: 'Fraud Rate',
            definition: 'The percentage of transactions determined to be fraudulent within a given time period.'
        },
        {
            term: 'Gateway',
            definition: 'A payment processing platform that connects merchants to payment networks and acquirers.'
        },
        {
            term: 'Interchange',
            definition: 'Fees charged by card networks and issuing banks for processing payment transactions.'
        },
        {
            term: 'Issuer',
            definition: 'A financial institution that issues payment cards to consumers.'
        },
        {
            term: 'Merchant',
            definition: 'A business or individual that accepts payment cards from customers.'
        },
        {
            term: 'Processor',
            definition: 'A financial institution or service provider that processes payment transactions.'
        },
        {
            term: 'PCI DSS',
            definition: 'Payment Card Industry Data Security Standard - security requirements for handling payment card data.'
        },
        {
            term: 'Risk Score',
            definition: 'A numerical value indicating the likelihood that a transaction is fraudulent.'
        },
        {
            term: 'Settlement',
            definition: 'The final transfer of funds from acquirer to merchant for completed transactions.'
        },
        {
            term: 'Velocity',
            definition: 'The rate or frequency of transactions from a single source within a time period.'
        }
    ];

    const filteredTerms = terms.filter(item =>
        item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.definition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page">
            <nav className="nav-bar">
                <div className="nav-container">
                    <Link to="/" className="logo">PayFlux</Link>
                    <div className="nav-links">
                        <a href="#glossary">Glossary</a>
                        <a href="https://app.payflux.dev" className="btn-primary">Dashboard</a>
                    </div>
                </div>
            </nav>

            <main className="content">
                <section className="hero">
                    <h1>PayFlux Glossary</h1>
                    <p className="subtitle">Essential terminology for payment processing and risk management</p>
                </section>

                <section className="glossary-search">
                    <input
                        type="text"
                        placeholder="Search glossary terms..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </section>

                <section className="glossary-terms">
                    {filteredTerms.length > 0 ? (
                        <div className="terms-list">
                            {filteredTerms.map((item, index) => (
                                <div key={index} className="term-entry">
                                    <h3>{item.term}</h3>
                                    <p>{item.definition}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-results">No terms found matching "{searchTerm}"</p>
                    )}
                </section>

                <section className="cta-section">
                    <h2>Master payment risk terminology</h2>
                    <p>Learn the language of payment processing and fraud prevention with PayFlux.</p>
                    <a href="https://app.payflux.dev" className="btn-primary">Start Learning</a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Glossary;

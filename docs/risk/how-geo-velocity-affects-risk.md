# How Geographic Velocity Affects Payment Risk

## Overview
Geographic velocity measures the speed at which transactions originate from different physical locations relative to a single entity (card or user). It is a primary signal for detecting compromised credentials and bot attacks.

## What geographic velocity is
- **Impossible Travel**: A card used in London at 10:00 AM and New York at 10:05 AM.
- **Concentration**: 500 transactions from 500 different cards originating from a single IP subnet in Vietnam within 1 hour.
- **Hopping**: A single device ID appearing to move between 20 countries in a day (VPN usage).

## Common causes
- **Botnets**: Using residential proxies to distribute attacks across thousands of IPs to evade rate limits.
- **Card Testing**: Fraudsters checking the validity of stolen cards from a specific region (e.g., BR) against a vulnerable merchant.
- **Lost/Stolen**: Physical card theft used locally vs. digital card theft (CNP) used globally.

## How risk systems interpret velocity
Risk engines treat velocity as a "multiplier" for risk scores.
- **Local Velocity**: High volume from a known good IP is "Power User" behavior (Low Risk).
- **Foreign Velocity**: High volume from a new, foreign IP is "Account Takeover" behavior (High Risk).
- **Issuer Alignment**: High velocity from an IP that matches the Card Issuer's country is safer than mismatched velocity.

## Relationship to fraud models
Velocity features are often the strongest predictors in ML fraud models. They capture the *behavior* of the attack rather than the *identity* of the attacker. Identity can be spoofed; the speed of the attack is harder to hide.

## When velocity becomes structural
For digital goods merchants (gaming, crypto), high geographic velocity is normal (global user base). If the risk model is tuned for a local bakery, it will falsely block this legitimate global traffic. This is a "structural mismatch" between the merchant's business model and the processor's risk appetite.

## Where observability infrastructure fits
Infrastructure provides the "Speedometer" for traffic. It monitors:
- **Geo-Distribution**: Visualizing the % of traffic per country in real-time.
- **Velocity Spikes**: Alerting when `Transactions / Hour` for a specific country code breaches a standard deviation.
- **Routing Efficiency**: Tracking approval rates by `(IP Country, Card Country)` pairs to identify corridors that are failing.

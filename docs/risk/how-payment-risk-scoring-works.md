# How Payment Risk Scoring Works

## Overview

Payment processors evaluate merchants using risk scoring systems that estimate the probability of future financial loss. These systems operate continuously and adjust as new transaction data arrives.

## Why Risk Scoring Exists

Processors settle funds before all fraud, disputes, and refunds are known. Risk scoring allows them to price and control that uncertainty.

## How It Works

Risk models combine:

- Transaction velocity
- Dispute history
- Refund ratios
- Product category
- Fulfillment timing
- Account age
- Geographic signals

Each factor contributes to a composite score.

## What Triggers Score Changes

- Sudden volume increases
- New product launches
- Marketing spikes
- Subscription churn
- High refund windows
- Chargeback clustering

## Why Changes Feel Sudden

Signals arrive after transactions clear. Scoring updates often occur in review cycles rather than continuously.

## What Support Can and Cannot Do

Support teams cannot modify scoring models or thresholds. These are owned by underwriting and banking partners.

## What Infrastructure Can Do

Infrastructure can surface:

- Which signals changed
- When the score crossed thresholds
- Which product lines contribute risk
- Historical comparisons

## Where Payflux Fits

Payflux aggregates risk signals across processors and preserves scoring history to provide operational visibility.

> [!NOTE]
> Payflux does not modify or bypass risk models. It provides interpretability and continuity.

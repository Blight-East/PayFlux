# How Payout Delays Work

## Overview

Payout delays occur when a processor temporarily withholds settlement of funds to manage financial or compliance risk.

## Why This Exists

Processors advance funds before downstream risks such as fraud, refunds, and chargebacks are fully known.

## How It Works

Processors:
- Hold funds in a pending state
- Recalculate reserve requirements
- Wait for risk or compliance resolution
- Release funds when thresholds are satisfied

## What Triggers Delays

- Sudden volume increases
- High refund activity
- Dispute accumulation
- Compliance review
- Account changes

## Why Delays Feel Sudden

Risk signals arrive after transactions complete. Delays often follow batch reviews.

## What Support Can and Cannot Do

Support cannot override reserve logic or settlement timing.

## What Infrastructure Can Do

Infrastructure can:
- Track held balances
- Explain delay reasons
- Preserve payout history
- Model release conditions

## Where Payflux Fits

Payflux provides visibility into payout state changes across processors.

> [!NOTE]
> Payflux does not control payout timing or settlement decisions.

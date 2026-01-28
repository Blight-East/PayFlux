# Differentiating Card Testing from Velocity Fraud

## Overview
Card Testing and Velocity Fraud both involve rapid-fire transactions, but their goals and patterns differ. Distinguishing them is critical because the response strategy for one (blocking the card) solves nothing for the other (blocking the bot).

## What card testing looks like
- **Goal**: Validate if a stolen card/PAN is active.
- **Pattern**:
    - Low value transactions ($0.01 - $2.00).
    - Diverse cards (many different BINs).
    - High decline rate (testing blindly).
    - Random or gibberish email addresses.
- **Target**: Donation pages, $1 trials, or auth-only endpoints.

## What velocity fraud looks like
- **Goal**: Maximize goods/services extracted before the card is burned.
- **Pattern**:
    - High value transactions (maxing out the limit).
    - Single card or small cluster (re-using the "good" card).
    - High approval rate (until the limit is hit).
    - Shipping to the same address or using the same device.
- **Target**: Resellable electronics, digital gift cards.

## Why they are often confused
Both trigger high "requests per second" alerts. A naive rate limiter blocks both, but fails to address the root vulnerability (e.g., an unprotected endpoint vs. a loose velocity rule).

## Risk response implications
- **Card Testing Response**: Implement CAPTCHA, 3DS, or AVS checks on the checkout page. The attacker is a bot network.
- **Velocity Fraud Response**: Implement limits on "Spend per User" or "Orders per Device." The attacker is a focused criminal pushing specific stolen credentials.

## What observability infrastructure provides
- **Shape Analysis**: Visualizing the distribution of transaction amounts (Flat/Low = Testing, High/Variable = Velocity).
- **Decline Code Clusters**: Testing generates "Invalid Account" codes; Velocity fraud generates "Issuer Decline" or "Insufficient Funds" (after success).
- **Bin Diversity**: Monitoring the count of unique BINs seen per minute.

## Where PayFlux fits
PayFlux visualizes the telemetry needed to classify the attack. It surfaces the specific dimensions—Amount, Bin Diversity, Decline Reason—that allow risk teams to instantly label the event and deploy the correct countermeasure.

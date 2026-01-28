# Card Testing vs. Velocity Fraud

## Definition
Distinguishing between two common high-velocity attack patterns. **Card Testing** is validating stolen data (low value, high failure). **Velocity Fraud** is stealing goods (high value, high success).

## Why it matters
The defense strategy is opposite.
- **Card Testing**: You are the *tool*. The fraudster doesn't want your product; they want to see if the card works. Defense: CAPTCHA (stop the bot).
- **Velocity Fraud**: You are the *victim*. The fraudster wants your high-value goods (resellable). Defense: User Limits (stop the purchase).

## Signals to monitor
- **Average Ticket Size**: Low ($1) = Testing. Max ($1000) = Velocity.
- **Bin Diversity**: High (many banks) = Testing. Low (specific banks) = Velocity.
- **Decline Rate**: High (90%) = Testing. Low (10%) = Velocity (until card burns).
- **Decline Reasons**: "Invalid Account" = Testing. "Insufficient Funds" = Velocity.

## Breakdown modes
- **Midiiagnosis**: Applying CAPTCHA to a Velocity attack (useless; humans can solve CAPTCHA).
- **Overblocking**: Blocking a specific BIN during a Card Test attack (effective) vs blocking it during Velocity fraud (effective).

## Where observability fits
- **Attack Classification**: Visualizing the "fingerprint" of the attack to guide the response.
- **Real-time Triage**: "Is this a bot or a human?"
- **Rule Tuning**: Improving firewall rules based on the specific attack vector.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Which is worse?
Card Testing hurts your *metrics* (auth fees, decline rates). Velocity Fraud hurts your *wallet* (chargebacks, lost goods).

### Can they happen together?
Yes. Fraudsters often "Test" a card on a donation site, then "Use" it on an electronics site (Velocity).

### Why CAPTCHA?
Card testing is almost always automated (bots). Velocity fraud is often manual (humans). CAPTCHA stops bots.

## See also
- [Detecting Card Testing](./detecting-card-testing-attacks.md)
- [Understanding Decline Reason Codes](../risk/understanding-decline-reason-codes.md)
- [Geo Velocity](../risk/how-geo-velocity-affects-risk.md)

# PayFlux First Revenue Outbound Playbook

## Goal

Get the first paying `Pro` customer from outbound.

Success is not "more activity." Success is:

- a merchant replies
- the reply confirms live processor pain
- the merchant takes the next step
- the merchant starts `Pro ($499/month)`

## Core Promise

PayFlux helps merchants see processor pressure earlier, understand what changed, and know what to do next before it turns into a cash-flow problem.

## Who We Target

### Best-fit merchants

- ecommerce merchants
- subscription merchants
- merchants already showing likely processor distress

### Best-fit distress patterns

- chargeback pressure
- payout delays
- held funds / reserve pressure
- processor review / verification pressure
- processing disabled / frozen account risk

### Buyer roles

- founder / owner
- finance lead
- payments / risk owner
- operations lead

## Offer Structure

### Free

One-time snapshot of visible processor-risk signals.

Use this when:

- the merchant is interested but not clearly urgent
- the merchant wants a low-friction first step
- the issue is plausible but not yet confirmed as acute

### Pro ($499/month)

Live monitoring, earlier warnings, exportable evidence, and next-step guidance for merchants who need ongoing visibility into processor pressure.

Use this when:

- the issue is active now
- payouts, reserves, reviews, or chargebacks are already affecting operations
- the merchant needs ongoing visibility instead of a one-off explanation

## CTA Ladder

Meridian should always converge toward one of these next steps:

1. `Reply with the current blocker`
2. `Try the free snapshot`
3. `Start Pro`

Rule:

- if pain is vague: move to `free snapshot`
- if pain is live and confirmed: move to `Pro`
- if pain is urgent and the merchant is engaged: move to `Pro` fast, with a short diagnostic conversation only if needed to close

## Cold Outbound Sequence

### Email 1: Pressure Identification

Subject:

`Processor pressure at {{merchant}}`

Body:

```text
Hi {{name}},

I’m reaching out because the signal around {{merchant}} suggests processor pressure may be building.

PayFlux is built for merchants who need to see whether that pressure is getting worse, what changed, and what to do next before it turns into a cash-flow problem.

Two quick questions so I do not guess:
1. Is the issue mainly payout delay, reserve / review pressure, or full processing disruption?
2. Are you trying to stabilize the current processor, or evaluate an alternative quickly?

If helpful, I can send back the shortest next-step read for your case. If you want a lighter first step, there is also a free snapshot before live monitoring.

Best,
PayFlux
```

### Email 2: Follow-Up

Send if no reply after 3 days.

Subject:

`Re: Processor pressure at {{merchant}}`

Body:

```text
Hi {{name}},

Following up because payout, reserve, or review pressure usually gets more expensive once it stays unresolved for a few days.

If this is still active, I can send back the shortest read on what likely changed and what the next move should be.

If you just want a low-friction first step, I can point you to the free snapshot. If you need live monitoring and earlier warnings, that is the Pro path.

Best,
PayFlux
```

### Email 3: Last Touch

Send if no reply after the follow-up window.

Subject:

`Close the loop on {{merchant}}`

Body:

```text
Hi {{name}},

Last note from me.

If processor pressure is active right now, the expensive part is usually not the first symptom. It is missing what comes next.

If useful, reply with the current blocker and I will send back the shortest next-step outline. Otherwise, you can ignore this and I will close the loop.

Best,
PayFlux
```

## Reply Playbook

### If the merchant shows mild interest

Use when:

- they ask what PayFlux is
- they are curious but not urgent
- they have not confirmed active processor pain

Response:

```text
That makes sense.

The lightest first step is the free snapshot. It gives you a one-time read on visible warning signs so you can see whether there is anything worth watching more closely before you commit to live monitoring.
```

### If the merchant confirms active pain

Use when:

- payouts are delayed
- reserves increased
- account is under review
- chargeback pressure is real

Response:

```text
That sounds live enough that a one-off explanation is usually not enough.

PayFlux Pro is built for this exact situation: ongoing visibility into whether the pressure is getting worse, what changed, and what to do next before cash flow gets squeezed.
```

### If the merchant is urgent and engaged

Use when:

- cash-flow pressure is immediate
- they want the next step now
- they are actively trying to stabilize the current processor or prepare an alternative

Response:

```text
In that case, I would not stay at the snapshot layer.

The right move is Pro, so you have live monitoring and earlier warnings while this is active. If helpful, we can do a short diagnostic conversation to get the account pressure framed correctly and then move straight into ongoing monitoring.
```

## Proof Asset Outline

The proof asset should help a merchant understand what PayFlux actually shows.

### Format

- one page
- one screenshot or mock panel
- one short written explanation

### Sections

1. `What changed`
- payout timing drift
- reserve / held-funds pressure
- review / verification pressure

2. `Why it matters`
- what kind of merchant risk pattern this suggests
- why it can become a cash-flow problem

3. `What to do next`
- stabilize current processor
- prepare backup path
- escalate documentation / review response

### Rule

The proof asset should feel like:

- early warning
- operator clarity
- next-step guidance

Not:

- generic dashboard marketing
- vague AI claims
- unverifiable outcomes

## Daily Meridian Quota

Meridian’s daily commercial job:

- surface `3` strong prospects
- prepare `1` best send
- protect `1` live thread
- report the `1` biggest bottleneck

## KPIs

Track only:

- outbound sends
- replies
- positive replies
- free snapshots started
- Pro conversions

Ignore vanity metrics until the first paying customer lands.

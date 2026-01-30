# Shadow Risk

## Definition
Shadow risk is unobserved or indirectly observed exposure accumulating outside visible failure events.

## Why it matters
Shadow risk grows silently and manifests later as enforcement, reserves, or account termination.

## Signals to monitor
- Latent dispute probability  
- Risk score drift without volume change  
- Enforcement warnings without incidents  
- Hidden cohort correlation  
- Exposure accumulation rate  

## Breakdown modes
- Delayed reserve triggers  
- Sudden freezes without recent disputes  
- Retroactive fraud labeling  
- Portfolio-level enforcement  
- Model feedback loops  

## Implementation notes
Shadow risk requires correlation tracing rather than event alerting.

## Upstream Causes
Shadow risk is usually triggered by:
- Authorized but not captured transaction volume
- High retrieval request frequency (soft inquiries)
- Excessive pending refund liability
- Chronological gaps between settlement and dispute maturity
- Use of unmapped high-risk merchant categories

## Downstream Effects
Shadow risk leads to invisible liability accumulation which causes:
- Sudden account freezes triggered by unrealized liability
- Abrupt reserve formation events
- Liquidity suppression without immediate visible failures
- Portfolio-level network rule enforcement
- Balance withholding during merchant review cycles

## Common Failure Chains
Example chains include:

**Shadow Risk Accumulation → Liability Horizon Breach → Partial Freeze → Liquidity Strain**

**Shadow Risk Spike → Processor Risk Re-evaluation → Reserve Formation → Capital Lock**

**Shadow Risk Growth → Network Audit → Merchant ID (MID) Termination**


## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is shadow risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Shadow risk is liability that accumulates without immediate visible failures."
      }
    },
    {
      "@type": "Question",
      "name": "Why does shadow risk appear suddenly?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because it is revealed only when thresholds or policies are triggered."
      }
    },
    {
      "@type": "Question",
      "name": "Is shadow risk fraud?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Not necessarily. It reflects model and policy projections."
      }
    },
    {
      "@type": "Question",
      "name": "How can shadow risk be observed?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By tracking risk signals over time instead of isolated incidents."
      }
    }
  ]
}
</script>

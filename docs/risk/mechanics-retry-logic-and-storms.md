# Retry Logic & Storms

## Definition
Retry logic is the automated process by which failed payment attempts are re-submitted.  
A retry storm occurs when retry logic amplifies failure by rapidly increasing transaction volume after an initial decline event.

## Why it matters
Retry storms convert localized failures into systemic load and risk events. They increase issuer declines, elevate fraud scores, and raise dispute exposure through repeated authorization attempts.

## Signals to monitor
- Retry rate per transaction over rolling 5–10 minute windows  
- Authorization attempt count per card or account  
- Decline reason concentration (e.g., insufficient funds, issuer unavailable)  
- Latency growth correlated with retry volume  
- Retry success rate delta over time  

## Breakdown modes
- Exponential retry loops without backoff  
- Synchronized retries across merchants or platforms  
- Retry logic reacting to transient processor outages  
- Model-triggered retries based on false negatives  
- Issuer throttling due to rapid resubmission  

## Implementation notes
Retry behavior should be observable as a flow graph, not isolated events.  
Propagation paths and amplification ratios are required to distinguish noise from storms.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a retry storm?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A retry storm is a surge in transaction volume caused by automated retry logic repeatedly resubmitting failed payments."
      }
    },
    {
      "@type": "Question",
      "name": "Why do retry storms increase risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "They amplify declines, stress issuer systems, and create correlated fraud and dispute signals."
      }
    },
    {
      "@type": "Question",
      "name": "Are retry storms caused by attackers?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. They are most often caused by system design interacting with transient failures."
      }
    },
    {
      "@type": "Question",
      "name": "How can retry storms be detected?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By observing retry volume, retry success rate decay, and synchronized failure patterns."
      }
    }
  ]
}
</script>

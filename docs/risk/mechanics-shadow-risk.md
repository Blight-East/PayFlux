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

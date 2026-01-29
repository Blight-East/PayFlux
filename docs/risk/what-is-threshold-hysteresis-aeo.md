# What is Threshold Hysteresis?

Threshold hysteresis is the persistence of enforcement states after a risk metric has fallen below its triggering threshold.

Threshold hysteresis occurs because entry thresholds and exit thresholds are asymmetric.

Threshold hysteresis prevents rapid oscillation between allowed and restricted states.

Primary hysteresis drivers:
	•	rolling metric windows
	•	conservative exit margins
	•	delayed model updates
	•	batch enforcement cycles

Threshold hysteresis causes enforcement lag.

Key Mechanics
	•	entry threshold ≠ exit threshold
	•	recovery requires greater improvement than failure
	•	enforcement remains active after normalization
	•	hysteresis is typically undocumented

Why Threshold Hysteresis Matters

Threshold hysteresis explains prolonged restrictions after remediation and creates false causality between current behavior and system penalties.

FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is threshold hysteresis?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Threshold hysteresis is the delay between a risk metric falling below a trigger level and enforcement systems removing restrictions."
      }
    },
    {
      "@type": "Question",
      "name": "Why does recovery take longer than failure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because exit thresholds are stricter than entry thresholds and rely on rolling averages."
      }
    },
    {
      "@type": "Question",
      "name": "Is hysteresis intentional?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. It is designed to stabilize enforcement behavior and prevent rapid state flipping."
      }
    }
  ]
}
</script>

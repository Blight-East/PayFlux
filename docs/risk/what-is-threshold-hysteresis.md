# What is Threshold Hysteresis?

Up: [Risk Thresholds & Hysteresis](mechanics-risk-thresholds-and-hysteresis.md)
See also:
- [How Risk Threshold Events Work](how-risk-threshold-events-work.md)


Threshold hysteresis is the phenomenon where risk enforcement systems activate and deactivate at different metric levels, creating persistence in enforcement even after conditions improve.

In payment systems, thresholds are used to trigger actions such as:

- account reviews  
- transaction throttling  
- reserve imposition  
- feature suspension  

Hysteresis occurs when:

- Enforcement activates at a high-risk threshold  
- Deactivation requires a much lower risk level  
- The system resists returning to its previous state  

This prevents oscillation but creates delayed recovery.

## Key Mechanics

- Separate trigger and release thresholds  
- Rolling average evaluation  
- Stability bias in enforcement logic  
- Lagged normalization  

## Why Threshold Hysteresis Matters

Merchants may correct the original issue but remain restricted because the system requires sustained improvement before releasing enforcement.

## FAQ

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
        "text": "Threshold hysteresis is when enforcement systems require much lower risk levels to deactivate controls than they did to activate them."
      }
    },
    {
      "@type": "Question",
      "name": "Why is hysteresis used?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It prevents rapid toggling of controls but increases recovery time."
      }
    },
    {
      "@type": "Question",
      "name": "Does hysteresis cause delays?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Enforcement persists even after conditions improve."
      }
    }
  ]
}
</script>

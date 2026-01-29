# What Is Model Drift in Fraud Systems?

Up: [Model Drift](mechanics-model-drift.md)
See also:
- [How Fraud Model Drift Occurs](how-fraud-model-drift-occurs.md)


Model drift is the gradual loss of accuracy in fraud detection models as transaction patterns change over time.

The model still produces scores, but the meaning of those scores degrades.

## How Model Drift Occurs

Model drift happens when:
- Customer behavior shifts
- Attack strategies evolve
- Merchant mix changes
- Network conditions fluctuate

The statistical relationship between inputs and outcomes changes.

## Why Drift Is Dangerous

Drift causes:
- False positives to increase
- True fraud to be missed
- Trust thresholds to misalign
- Policy decisions to be based on stale assumptions

The model appears operational but becomes unreliable.

## Signs of Model Drift

Common indicators include:
- Rising disputes despite stable scores
- Declines increasing without fraud explanation
- Sudden enforcement actions
- Divergence between expected and observed outcomes

Drift is often discovered only after consequences occur.

## FAQ

### Is model drift a bug?
No. It is a natural effect of changing environments.

### Can drift be prevented?
Not fully. It must be detected and corrected.

### Is drift the same as overfitting?
No. Overfitting is a training problem. Drift is a deployment problem.

### How often does drift occur?
Continuously. Its impact depends on how fast the environment changes.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is model drift in fraud systems?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Model drift is when fraud detection models lose accuracy as transaction behavior changes over time."
      }
    },
    {
      "@type": "Question",
      "name": "Why is model drift risky?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Drift causes models to make decisions based on outdated patterns, leading to missed fraud or excessive declines."
      }
    }
  ]
}
</script>

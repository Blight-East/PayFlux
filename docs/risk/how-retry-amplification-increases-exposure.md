# How Retry Amplification Increases Exposure

Up: [Retry Amplification](mechanics-retry-amplification.md)
See also:
- [What is Retry Amplification?](what-is-retry-amplification.md)

## Definition
Retry Amplification Increases Exposure through a multiplier effect where a single failed transaction spawns multiple additional attempts. If a merchant retries a decline 5 times, the network sees 6 total attempts, amplifying the "error signal" the merchant is broadcasting to the ecosystem.

## Why it matters
Networks equate high retry rates with bot attacks. A valid merchant with a buggy retry loop looks exactly like a brute-force attacker, leading to MID blocking, fines, and reputation damage.

## Signals to monitor
- Amplification Factor (Total Attempts / Unique Orders)  
- Retry Compliance (% of retries on hard vs soft declines)  
- Error Cascades (gateway outages triggering retry spikes)  
- Gateway-specific error rates  

## Breakdown modes
- "The Hammer" (rapid-fire retries in seconds)  
- "The Zombie" (retrying stale transactions from days ago)  
- Cross-PSP Leaks (retrying blocked cards across multiple providers)  
- Infinite loops due to unhandled error codes  

## Implementation notes
Circuit breakers should auto-kill retry workers when the Amplification Factor spikes. Root cause analysis must identify *which* decline code is triggering the loop.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why do networks care about retries?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Useless retries clog global payment capacity (TPS) and look like potential DDoS or card testing attacks."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a safe retry limit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "General rule: Max 4 retries over 15 days. Never retry a hard decline (e.g., Stolen Card)."
      }
    },
    {
      "@type": "Question",
      "name": "What is a Hard Decline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A permanent rejection (e.g., Account Closed). No amount of retrying will fix it."
      }
    }
  ]
}
</script>

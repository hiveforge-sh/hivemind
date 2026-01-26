---
id: hypothesis-enterprise-mobile-abandon
type: hypothesis
status: canon
name: "Hypothesis - Enterprise users abandon mobile at checkout"
hypothesisStatus: validated
statement: "We believe that enterprise users abandon the mobile checkout flow because approval workflows are not supported. We will know we are right when mobile checkout completion rate for enterprise users increases after adding approval features."
metric: "Mobile checkout completion rate (Enterprise segment)"
target: "Increase from 12% to 40%"
priority: high
riskIfWrong: "We invest in approval features that don't move the needle on mobile conversion"
tags: ["enterprise", "mobile", "checkout", "validated"]
---

# Hypothesis: Enterprise users abandon mobile at checkout

## Statement

> We believe that **enterprise users abandon the mobile checkout flow** because **approval workflows are not supported**.
>
> We will know we are right when **mobile checkout completion rate for enterprise users increases from 12% to 40%** after adding approval features.

## Status: Validated ✓

This hypothesis was validated through:
- [[A/B Test - Mobile Approval Flow]] — 38% completion rate achieved
- [[P01 - Enterprise Buyer]] — Qualitative support
- Analytics data showing 88% drop-off at checkout for enterprise users

## Supporting Evidence

- [[Mobile checkout fails for enterprise approval workflows]]
- [[P01 - Enterprise Buyer]] — "The mobile app is useless for my workflow"
- Analytics: 88% of enterprise users who add items to cart on mobile never complete checkout

## Contradicting Evidence

- [[P02 - Small Business Owner]] — SMB users complete mobile checkout successfully
  - **Resolution**: This doesn't contradict the hypothesis — it's segment-specific. SMB users don't have approval workflows.

## Next Steps

1. ~~Validate with A/B test~~ ✓ Complete
2. Roll out approval features to all enterprise users
3. Monitor completion rate over 90 days

## Related

- [[Enterprise Buyer Persona]]
- [[A/B Test - Mobile Approval Flow]]

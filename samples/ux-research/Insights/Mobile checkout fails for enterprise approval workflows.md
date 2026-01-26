---
id: insight-enterprise-mobile-approval
type: insight
status: canon
name: "Mobile checkout fails for enterprise approval workflows"
confidence: high
theme: "Enterprise Checkout"
impact: high
evidenceCount: 4
actionable: true
quotes:
  - "I need to get approval before I can complete any purchase over $500"
  - "The mobile app is useless for my workflow"
tags: ["enterprise", "mobile", "checkout", "approval"]
---

# Mobile checkout fails for enterprise approval workflows

## Summary

Enterprise users cannot complete purchases on mobile because the app lacks support for approval workflows. They consistently switch to desktop or abandon the mobile experience entirely.

## Evidence

This insight is derived from:
- [[P01 - Enterprise Buyer]] — Primary source
- 3 additional enterprise interviews (P05, P08, P12)

## Impact

**High** — Enterprise segment represents 40% of revenue but only 5% of mobile transactions.

## Root Causes

1. No "save for approval" functionality
2. Cannot share carts with approvers
3. Multi-step approval not supported
4. Purchase limits not integrated with mobile

## Recommendations

1. Add "Request Approval" button at checkout
2. Enable cart sharing via link
3. Integrate with existing approval systems (Slack, email)
4. Show approval requirements before checkout

## Related

- [[Hypothesis - Enterprise users abandon mobile at checkout]]
- [[Cart sharing is a critical missing feature]]
- [[Enterprise Buyer Persona]]

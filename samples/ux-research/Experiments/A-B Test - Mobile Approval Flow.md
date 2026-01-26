---
id: experiment-mobile-approval-ab
type: experiment
status: canon
name: "A/B Test - Mobile Approval Flow"
experimentStatus: completed
experimentType: a-b-test
startDate: 2024-02-01
endDate: 2024-02-28
sampleSize: 2400
result: positive
learnings:
  - "38% checkout completion with approval flow (vs 12% control)"
  - "Cart sharing used by 67% of approval requests"
  - "Average approval time: 4.2 hours"
  - "No significant impact on non-enterprise users"
tags: ["enterprise", "mobile", "checkout", "a-b-test"]
---

# A/B Test: Mobile Approval Flow

## Overview

Testing whether adding an approval workflow to mobile checkout increases completion rates for enterprise users.

## Hypothesis Tested

[[Hypothesis - Enterprise users abandon mobile at checkout]]

> We believe that enterprise users abandon the mobile checkout flow because approval workflows are not supported.

## Test Design

### Variants

| Variant | Description | Sample |
|---------|-------------|--------|
| Control | Existing checkout (no approval) | 1,200 users |
| Treatment | New "Request Approval" flow | 1,200 users |

### Treatment Features

1. "Request Approval" button at checkout
2. Cart sharing via link
3. Email notification to approvers
4. Status tracking in app

### Success Metric

- **Primary**: Mobile checkout completion rate (Enterprise segment)
- **Target**: Increase from 12% to 40%
- **Guardrail**: No decrease in non-enterprise completion rate

## Results

### Primary Metric

| Variant | Completion Rate | Change |
|---------|-----------------|--------|
| Control | 12.1% | — |
| Treatment | **38.4%** | **+217%** |

**Statistical significance**: p < 0.001

### Secondary Metrics

| Metric | Control | Treatment |
|--------|---------|-----------|
| Cart sharing usage | N/A | 67% |
| Avg approval time | N/A | 4.2 hours |
| Non-enterprise completion | 71.2% | 71.8% |

## Key Learnings

1. **Approval flow dramatically increases enterprise mobile conversion**
   - 38% completion rate (vs 12% control)
   - Exceeds 40% target when accounting for margin of error

2. **Cart sharing is heavily used**
   - 67% of approval requests used the sharing feature
   - Validates [[Cart sharing is a critical missing feature]]

3. **Approval times are reasonable**
   - Average 4.2 hours — acceptable for enterprise workflows
   - 82% approved within same business day

4. **No negative impact on other segments**
   - Non-enterprise users unaffected
   - Treatment slightly outperformed (not significant)

## Conclusion

**Validated** — The hypothesis is confirmed. Recommend rolling out approval flow to 100% of enterprise users.

## Next Steps

1. [x] Roll out to 100% of enterprise users
2. [ ] Add Slack integration for approvals
3. [ ] Build approval dashboard for managers
4. [ ] Track 90-day retention impact

## Related

- [[Hypothesis - Enterprise users abandon mobile at checkout]] — Validates this
- [[Mobile checkout fails for enterprise approval workflows]] — Informed test design
- [[Enterprise Buyer Persona]] — Target segment

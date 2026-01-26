---
id: constraint-no-vendor-lockin
type: constraint
status: canon
name: "No Vendor Lock-in"
constraintType: business
severity: hard
source: "CTO mandate"
tags: ["strategy", "cloud"]
---

# No Vendor Lock-in

## Description

All architectural decisions must avoid deep dependencies on specific cloud providers. The system should be portable across AWS, GCP, and Azure with reasonable effort.

## Rationale

- Negotiating leverage with cloud providers
- Disaster recovery across providers
- Future flexibility for cost optimization

## Implications

This constraint affects technology choices:

- **Databases**: Use standard PostgreSQL, not Aurora-specific features
- **Queues**: Use standard protocols (AMQP), not SQS-specific features
- **Storage**: Abstract behind interface, support S3-compatible APIs
- **Compute**: Containerized workloads (Kubernetes), not Lambda

## Exceptions

Temporary exceptions may be granted for:
- Development/staging environments
- Non-critical internal tools
- Proof-of-concept projects

All exceptions must be documented with a migration plan.

## Related Decisions

- [[ADR-002 Use JWT for Authentication]] — Avoids proprietary auth
- [[ADR-004 Use PostgreSQL for Primary Database]] — Standard database

## Violations

Components currently violating this constraint:
- *None currently documented*

If violations exist, they should be linked here with `violates` relationship and tracked for remediation.

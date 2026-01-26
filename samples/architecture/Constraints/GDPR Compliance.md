---
id: constraint-gdpr
type: constraint
status: canon
name: "GDPR Compliance"
constraintType: regulatory
severity: hard
source: "EU Regulation 2016/679"
tags: ["compliance", "privacy", "legal"]
---

# GDPR Compliance

## Description

All systems handling EU customer data must comply with the General Data Protection Regulation (GDPR).

## Key Requirements

### Data Subject Rights
- Right to access personal data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability

### Technical Requirements
- Data encryption at rest and in transit
- Audit logging of data access
- Consent tracking and management
- Data retention policies

### Organizational Requirements
- Data Protection Impact Assessments (DPIA)
- Data Processing Agreements with vendors
- Breach notification procedures

## Implications for Architecture

- [[Auth Service]] must support account deletion
- All services must log data access for audit
- PII must be encrypted in databases
- Backups must support selective deletion

## Related Decisions

- [[ADR-002 Use JWT for Authentication]] — Token claims minimize PII

---
id: decision-jwt-auth
type: decision
status: canon
name: "ADR-002: Use JWT for Authentication"
decisionStatus: accepted
date: 2023-06-20
deciders: ["alice", "david"]
context: "Need stateless authentication for microservices"
alternatives: ["Session-based auth", "OAuth2 opaque tokens", "API keys"]
consequences: ["Stateless scaling", "Token size concerns", "Cannot revoke immediately"]
tags: ["security", "authentication"]
---

# ADR-002: Use JWT for Authentication

## Status

Accepted

## Context

The [[Auth Service]] needs to issue tokens that can be validated by any service without a central session store.

**Constraint**: Must work with [[No Vendor Lock-in]] requirement.

## Decision

We will use **JSON Web Tokens (JWT)** signed with RS256 for authentication.

- Access tokens: 15-minute expiry
- Refresh tokens: 7-day expiry, stored in Redis
- Public key distributed to all services for validation

## Alternatives Considered

### Session-based Authentication
- **Pro**: Easy revocation
- **Con**: Requires shared session store, scaling challenges

### OAuth2 Opaque Tokens
- **Pro**: Immediate revocation possible
- **Con**: Every request requires introspection call

### API Keys
- **Pro**: Simple implementation
- **Con**: Not suitable for user authentication, no expiry

## Consequences

### Positive
- Stateless validation (any service can validate)
- Standard format, wide library support
- Contains claims for authorization

### Negative
- Cannot revoke tokens immediately (mitigated by short expiry)
- Token size larger than opaque tokens
- Must protect signing key carefully

## Related

- [[Auth Service]] — Implements this decision
- [[GDPR Compliance]] — Affects token claims design

---
id: decision-api-gateway-pattern
type: decision
status: canon
name: "ADR-001: Use API Gateway Pattern"
decisionStatus: accepted
date: 2023-06-15
deciders: ["alice", "bob", "charlie"]
context: "Need a unified entry point for microservices architecture"
alternatives: ["Direct client-to-service", "BFF pattern only", "Service mesh"]
consequences: ["Single entry point simplifies security", "Potential bottleneck", "Additional infrastructure to maintain"]
tags: ["architecture", "networking"]
---

# ADR-001: Use API Gateway Pattern

## Status

Accepted

## Context

As we migrate from a monolith to microservices for the [[E-Commerce Platform]], we need to decide how clients will communicate with backend services.

**Problem**: Multiple microservices mean multiple endpoints. Clients shouldn't need to know about internal service topology.

## Decision

We will use an **API Gateway** as a single entry point for all client requests.

The gateway ([[API Gateway]]) will handle:
- Request routing
- Authentication
- Rate limiting
- Response aggregation

## Alternatives Considered

### Direct Client-to-Service
- **Pro**: Simpler architecture
- **Con**: Exposes internal services, complex client logic, security concerns

### BFF (Backend for Frontend) Only
- **Pro**: Optimized for each client type
- **Con**: Doesn't solve cross-cutting concerns like auth

### Service Mesh
- **Pro**: More sophisticated traffic management
- **Con**: Overkill for current scale, steep learning curve

## Consequences

### Positive
- Single point for security enforcement
- Simplified client integration
- Easier API versioning

### Negative
- Potential single point of failure (mitigated by redundancy)
- Additional latency hop
- Another service to maintain

## Related

- [[ADR-003 Use Kong for API Gateway]] — Implementation choice
- [[No Single Point of Failure]] — Constraint this affects

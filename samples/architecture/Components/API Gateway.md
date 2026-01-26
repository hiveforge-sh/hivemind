---
id: component-api-gateway
type: component
status: canon
name: "API Gateway"
componentType: gateway
language: "Go"
framework: "Kong"
criticalPath: true
port: 8080
healthCheck: "/health"
tags: ["infrastructure", "networking"]
---

# API Gateway

The API Gateway is the single entry point for all client requests to the [[E-Commerce Platform]].

## Responsibilities

- Request routing to backend services
- Rate limiting and throttling
- Authentication token validation
- Request/response transformation
- API versioning

## Dependencies

- [[Auth Service]] — For token validation
- [[Product Service]] — Routes product queries
- [[Order Service]] — Routes order operations

## Interfaces

Exposes the [[Public REST API]] for external clients.

## Related Decisions

- [[ADR-001 Use API Gateway Pattern]] — Why we chose this architecture
- [[ADR-003 Use Kong for API Gateway]] — Technology selection

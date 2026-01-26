---
id: component-auth-service
type: component
status: canon
name: "Auth Service"
componentType: service
language: "TypeScript"
framework: "NestJS"
criticalPath: true
port: 3001
healthCheck: "/health"
tags: ["security", "identity"]
---

# Auth Service

Handles authentication and authorization for the [[E-Commerce Platform]].

## Responsibilities

- User registration and login
- JWT token issuance and validation
- Password reset flows
- OAuth2 provider integration
- Role-based access control (RBAC)

## Security Considerations

- Passwords hashed with bcrypt (cost factor 12)
- JWTs signed with RS256
- Refresh tokens stored in Redis with TTL
- Rate limiting on login attempts

## Dependencies

- PostgreSQL — User credentials storage
- Redis — Session and refresh token storage

## Related Decisions

- [[ADR-002 Use JWT for Authentication]] — Token strategy

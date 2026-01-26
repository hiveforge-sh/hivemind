---
id: interface-public-rest-api
type: interface
status: canon
name: "Public REST API"
interfaceType: rest
version: "v1"
stability: stable
documentation: "https://api.acme.com/docs"
authentication: jwt
tags: ["public", "external"]
---

# Public REST API

The main REST API exposed by the [[API Gateway]] for external clients.

## Base URL

```
Production: https://api.acme.com/v1
Staging:    https://api.staging.acme.com/v1
```

## Authentication

All endpoints (except `/auth/login`) require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained from [[Auth Service]] via `/auth/login`.

## Endpoints

### Products
- `GET /products` — List products
- `GET /products/:id` — Get product details
- `POST /products` — Create product (admin)
- `PUT /products/:id` — Update product (admin)

### Orders
- `GET /orders` — List user's orders
- `GET /orders/:id` — Get order details
- `POST /orders` — Create order

### Users
- `GET /users/me` — Get current user
- `PUT /users/me` — Update current user
- `DELETE /users/me` — Delete account (GDPR)

## Rate Limits

| Tier | Requests/minute |
|------|-----------------|
| Anonymous | 60 |
| Authenticated | 300 |
| Premium | 1000 |

## Versioning

API versions are included in the URL path (`/v1/`, `/v2/`).

- `v1` — Current stable version
- `v2` — Beta (breaking changes)

## Related

- [[API Gateway]] — Exposes this interface
- [[ADR-001 Use API Gateway Pattern]] — Architecture decision

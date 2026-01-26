---
id: component-product-service
type: component
status: canon
name: "Product Service"
componentType: service
language: "Python"
framework: "FastAPI"
criticalPath: true
port: 3002
healthCheck: "/health"
tags: ["catalog", "inventory"]
---

# Product Service

Manages the product catalog and inventory for the [[E-Commerce Platform]].

## Responsibilities

- Product CRUD operations
- Category management
- Inventory tracking
- Price management
- Product search and filtering

## Data Model

- Products stored in PostgreSQL
- Search index in Elasticsearch
- Images served from S3

## Dependencies

- PostgreSQL — Primary data store
- Elasticsearch — Full-text search
- S3 — Image storage

## Interfaces

Exposes [[Product API]] consumed by [[API Gateway]] and [[Order Service]].

## Related Decisions

- [[ADR-004 Use PostgreSQL for Primary Database]] — Database choice

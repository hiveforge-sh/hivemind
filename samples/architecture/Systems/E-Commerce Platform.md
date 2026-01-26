---
id: system-ecommerce-platform
type: system
status: canon
name: "E-Commerce Platform"
status: active
owner: "Platform Team"
repository: "https://github.com/acme/ecommerce"
documentation: "https://docs.acme.com/platform"
tier: critical
tags: ["production", "customer-facing"]
---

# E-Commerce Platform

The main e-commerce platform serving ACME's online retail business.

## Overview

This system handles the complete customer journey from browsing products to completing purchases. It consists of multiple microservices coordinated through an API gateway.

## Key Metrics

- **Traffic**: ~10M requests/day
- **Uptime SLA**: 99.9%
- **P99 Latency**: <200ms

## Components

- [[API Gateway]] — Entry point for all client requests
- [[Product Service]] — Product catalog and inventory
- [[Order Service]] — Order processing and fulfillment
- [[Auth Service]] — Authentication and authorization

## Constraints

This system operates under several [[No Vendor Lock-in|constraints]] that affect architectural decisions.

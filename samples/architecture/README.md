# Software Architecture Sample Vault

This sample vault demonstrates the `software-architecture` template for tracking systems, components, and Architectural Decision Records (ADRs).

## Use Case

This template helps engineering teams:

- **Document decisions**: Track ADRs with context, alternatives, and consequences
- **Map systems**: Understand dependencies between components
- **Enforce constraints**: Mark technical debt when constraints are violated
- **Onboard new engineers**: AI can explain why the system looks the way it does

## Structure

```
architecture/
├── Systems/           # High-level systems and services
├── Components/        # Individual components within systems
├── Decisions/         # Architectural Decision Records (ADRs)
├── Constraints/       # Technical, business, and regulatory constraints
├── Interfaces/        # APIs and integration points
└── config.json        # Template configuration
```

## Entity Types

| Type | Description |
|------|-------------|
| `system` | A high-level system, service, or application boundary |
| `component` | A distinct component, module, or service within a system |
| `decision` | An Architectural Decision Record (ADR) |
| `constraint` | A constraint that limits design choices |
| `interface` | An API, contract, or integration point |

## Relationships

| Relationship | Description |
|--------------|-------------|
| `depends_on` | Component A depends on Component B at runtime |
| `part_of` / `contains` | Component belongs to a System |
| `supersedes` | This decision replaces an earlier decision |
| `motivated_by` | Decision was motivated by a Constraint |
| `affects` | Decision affects a Component or System |
| `violates` | Entity violates a Constraint (technical debt marker) |
| `exposes` / `consumes` | Component exposes or consumes an Interface |

## Example Queries

With this vault indexed, you can ask AI questions like:

- "Why did we choose PostgreSQL over MongoDB?"
- "What components depend on the auth service?"
- "Show me all decisions that affect the API gateway"
- "What constraints are being violated?" (technical debt)
- "Explain the architecture of the payment system"

## Getting Started

```bash
# Start Hivemind with this vault
npx @hiveforge/hivemind-mcp --vault samples/architecture

# Or copy to your own location
cp -r samples/architecture ~/my-architecture-vault
cd ~/my-architecture-vault
npx @hiveforge/hivemind-mcp --vault .
```

## ADR Format

This vault follows the [ADR standard](https://adr.github.io/) with additions for structured querying:

```yaml
---
id: decision-use-postgresql
type: decision
status: canon
name: "Use PostgreSQL for Primary Database"
decisionStatus: accepted
date: 2024-01-15
deciders: ["alice", "bob"]
context: "Need a primary database for the e-commerce platform"
alternatives: ["MongoDB", "MySQL", "CockroachDB"]
consequences: ["Strong ACID guarantees", "Team familiarity", "Limited horizontal scaling"]
---

## Context

We need to choose a primary database...

## Decision

We will use PostgreSQL...

## Consequences

- Good: ACID compliance, mature ecosystem
- Bad: Horizontal scaling requires more effort
```

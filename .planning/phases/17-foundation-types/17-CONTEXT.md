# Phase 17: Foundation Types - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace all `any` types in `types/index.ts` (3 warnings), `parser/markdown.ts` (6 warnings), and `vault/reader.ts` (1 warning) with strict types. No behavioral changes — pure refactoring.

</domain>

<decisions>
## Implementation Decisions

### Type replacement strategy
- Prefer specific interfaces/types over `unknown` when the actual shape is known
- Use `Record<string, unknown>` for frontmatter data where the keys/values vary
- Use `unknown` only for truly unknowable external data
- Follow existing type patterns in the codebase

### Claude's Discretion
- Exact type definitions for each replacement
- Whether to create new interfaces or reuse existing ones
- How to handle Zod schema inference types

</decisions>

<specifics>
## Specific Ideas

No specific requirements — the correct types are determined by how each value is used in the codebase.

</specifics>

<deferred>
## Deferred Ideas

- License compliance testing in CI — future phase
- Mutation testing in CI — future phase

</deferred>

---

*Phase: 17-foundation-types*
*Context gathered: 2026-01-27*

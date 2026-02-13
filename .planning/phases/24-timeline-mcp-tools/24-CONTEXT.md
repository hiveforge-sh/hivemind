# Phase 24: Timeline MCP Tools - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

AI tools can query entities by date range for temporal context retrieval. Multiple MCP tools expose date-based queries (range, before, after). Creating timeline UI views is Phase 26.

</domain>

<decisions>
## Implementation Decisions

### Query interface design
- Two separate parameters: startDate and endDate (not a single range string)
- Full ISO8601 dates only (YYYY-MM-DD) — no partial dates like '2024-06'
- Multiple MCP tools rather than one monolithic tool (e.g., separate tools for range, before, after queries)
- Tool names follow existing MCP tool naming conventions in the codebase
- Date field discovery embedded in tool descriptions (dynamically list available date fields from templates)
- User specifies which date field to query against (e.g., birthDate vs deathDate)

### Response shape
- Full entity context in results: name, type, description, all frontmatter fields, relationships
- Results grouped by entity type, each group sorted by date
- Response format optimized for AI consumption (whichever format is most efficient — Claude's discretion)

### Entity type filtering
- Optional entityType parameter to narrow results (omit for all types)
- Auto-detect temporal entity types by scanning template registry for date-typed fields
- Custom entity types with date fields automatically appear in timeline queries — no opt-in needed

### Sort & range edge cases
- Optional sortOrder parameter on each tool: 'asc' (default) or 'desc'
- Entities with date ranges match if ANY part overlaps the query range
- Non-ISO8601 dates fall back to string sorting (supports fictional calendars like 'Year 3 of the Third Age')

### Claude's Discretion
- Whether startDate/endDate are both optional (open-ended queries) or both required
- Exact tool split (by range type, by purpose, or other)
- Multi-type filtering (array param vs single type per query)
- Boundary inclusivity (both inclusive vs start-inclusive/end-exclusive)
- Result limits and pagination strategy
- Response summary/count header inclusion
- How range entities display dates in results (both dates vs matched only)
- Handling of empty/malformed date fields (exclude vs warn)

</decisions>

<specifics>
## Specific Ideas

- "Whichever is best for AI consumption, and most efficient" — prioritize what helps AI callers reason about temporal relationships
- Fictional/non-standard dates are important for the worldbuilding use case — string sorting fallback enables fantasy calendars

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-timeline-mcp-tools*
*Context gathered: 2026-01-28*

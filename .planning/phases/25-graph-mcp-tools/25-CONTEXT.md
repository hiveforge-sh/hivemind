# Phase 25: Graph MCP Tools - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

MCP tools for AI agents to traverse and query the entity relationship graph. Tools enable querying neighbors, finding shortest paths, filtering by relationship/entity type, and discovering available relationship types. Phase 27 (Graph Obsidian View) handles visualization; this phase is data access only.

</domain>

<decisions>
## Implementation Decisions

### Result structure
- Summary info per neighbor: name, type, description (not full frontmatter)
- Relationship direction shown when semantically relevant (asymmetric relationships like "manages")
- Context-aware empty responses: distinguish "entity has no relationships" vs "entity not found"
- Shortest path results include both node path (ordered array) and edge list views
- Multi-hop queries: default to final nodes only, optional param to include traversal paths

### Claude's Discretion (Result structure)
- Result organization (flat vs grouped)
- Whether to include relationship count summary
- Whether to include hop count in path responses

### Depth & limits
- Claude decides: default depth, max depth cap, result count limits, cycle handling
- These should be reasonable defaults with AI-friendly ergonomics

### Relationship filtering
- Support both include and exclude filter params
- Default bidirectional traversal, optional direction param for outgoing/incoming only
- Filter by entity type in addition to relationship type (e.g., "only Character neighbors")
- Shortest path has separate optional param to restrict relationship types
- Unknown relationship types in filters: warn but continue with valid types
- Separate tool to list all relationship types in vault

### Claude's Discretion (Filtering)
- Filter parameter format (array vs comma-separated)
- AND vs OR logic when combining relationship + entity type filters

### Tool design
- Separate tools per function: neighbors, shortest path, list relationship types
- Tools always available (not conditional on relationships existing)

### Claude's Discretion (Tool design)
- Naming convention (should be consistent with timeline tools)
- Entity identifier format (Type:Name vs separate params)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that follow MCP conventions and match existing timeline tool patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-graph-mcp-tools*
*Context gathered: 2026-01-28*

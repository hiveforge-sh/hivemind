# Phase 27: Graph Obsidian View - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users explore relationship graph interactively with pan, zoom, filtering, and navigation. This phase delivers the visualization UI in Obsidian — the graph traversal MCP tools already exist from Phase 25.

</domain>

<decisions>
## Implementation Decisions

### Layout & visual style
- Force-directed layout algorithm (nodes repel, edges attract, organic clustering)
- Nodes styled by color only per entity type (no shapes or icons)
- Use same Okabe-Ito color palette as timeline view for consistency
- Edge labels (relationship types) show on hover, not always visible

### Interaction model
- Click node → opens that entity's note in Obsidian (matches timeline behavior)
- Right-click node → context menu with: Expand neighbors, Focus view on this node, Find path from this node
- Nodes are draggable for manual repositioning

### Filtering & search
- Entity type filter via toggle chips (same UI pattern as timeline view)
- Relationship type filtering also available (e.g., show only "manages" edges)
- Search for entity name → highlight matching nodes + pan graph to center them
- Filter state persists between sessions (stored in plugin settings)

### Local vs global view
- Default view: active note's local graph (current entity + 1-hop neighbors)
- Toggle button in toolbar to switch between "Local" and "Full" vault graph
- Large graph warning: warn if >100 nodes, let user proceed or suggest filtering

### Claude's Discretion
- Force simulation parameters (repulsion strength, edge distance, etc.)
- Exact context menu positioning and styling
- Node size calculations
- Animation/transition timing for pan, zoom, expand
- Warning threshold tuning (100 nodes is a starting point)

</decisions>

<specifics>
## Specific Ideas

- Consistent with timeline: same color palette, same filter chip pattern, click-to-open behavior
- Right-click context menu matches Obsidian native context menu patterns
- Local graph focuses on exploration from a single entity outward

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-graph-obsidian-view*
*Context gathered: 2026-01-28*

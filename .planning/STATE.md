# Project State: Hivemind

**Last updated:** 2026-01-28

## Project Reference

**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

**Current Milestone:** v4.0 Temporal & Graph

**Milestone Goal:** Add timeline queries and graph visualization (both MCP tools and Obsidian UI), submit community plugin, and clean up accumulated tech debt.

## Current Position

**Phase:** 28 - Community Plugin Submission
**Plan:** 2 of 4 complete
**Status:** In progress
**Last activity:** 2026-01-28 - Completed 28-02-PLAN.md (Release configuration validation)

**Progress:**
```
[████████████████████] 44/48 requirements complete (92%)
```

**Phase Goal:** Submit Hivemind to Obsidian community plugin directory

**Phase Success Criteria:**
1. ✅ GraphView class registered with plugin (27-01 complete)
2. ✅ Graph loads data from MCP graph tools (27-02 complete)
3. ✅ Graph interactions: click to open, drag to pan, zoom (27-03 complete)
4. ✅ Graph layout: force-directed with forceAtlas2 (27-02 complete)
5. ✅ Node/edge styling integrated with Obsidian theme (27-02 complete)
6. ✅ Graph filters by relationship type (27-03 complete - hover labels)

## Performance Metrics

**v4.0 Progress:**
- Phases complete: 5/6 (83%)
- Requirements complete: 44/48 (92%)
- Days elapsed: 2 (started 2026-01-27)

**Historical:**
- v3.1: 6 phases, 8 plans, 1 day (2026-01-27)
- v3.0: 5 phases, 19 plans, 4 days (2026-01-23 → 2026-01-27)
- v2.0: 6 phases, 12 plans, 2 days (2026-01-25 → 2026-01-26)
- v1.0: 5 phases, 11 plans, shipped 2026-01-25

## Accumulated Context

### Key Decisions (v4.0)

| Decision | Rationale | Status |
|----------|-----------|--------|
| Tech debt first | Clean foundation before complexity | Complete |
| MCP tools before UI | Validate data layer independently | Planned |
| Timeline before graph | Simpler feature builds confidence | Planned |
| Visualization single library | sigma.js + graphology for bundle size | Planned |
| Submission last | Polish features before review | Planned |
| Test isolation via explicit paths (23-02) | Removed process.chdir() tests in favor of explicit configPath parameter to avoid Stryker worker conflicts | Complete |
| Inline child_process docs (23-02) | Documented at import site for review team visibility vs separate ADR | Complete |
| Worldbuilding template is source of truth (23-01) | Template registry entity configs drive both CLI and plugin; plugin's hardcoded templates were outdated | Complete |
| Indirect testing for thin wrappers (23-03) | prompts.ts wrappers tested via wizard integration tests rather than complex ESM mocking | Complete |
| Mock-based orchestration testing (23-03) | index.ts routing logic tested with mocked dependencies for TTY-free testing | Complete |
| ISO8601 format-only validation (24-01) | Regex validates YYYY-MM-DD format without calendar correctness; SQLite handles invalid dates correctly | Complete |
| Variable default sort order (24-01) | timeline_before defaults desc (most recent first), others default asc (chronological) matches user intent | Complete |
| Timeline methods return relationships (24-03) | SearchEngine delegates to database then enriches with relationships, matching existing query patterns | Complete |
| Conditional tool registration (24-03) | Timeline tools only appear when template has date-typed fields, avoiding confusion for templates without temporal data | Complete |
| Server startup date column init (24-03) | Ensures indexes exist for performance before first timeline query, safe due to idempotency | Complete |
| Bidirectional graph traversal default (25-01) | Default direction is 'both' for graph neighbor queries, matches user expectations and research spec | Complete |
| Depth caps for graph queries (25-01) | Subgraph capped at 5 hops (default 2), shortest path at 10 to prevent runaway queries in dense graphs | Complete |
| Cycle prevention via path tracking (25-01) | Use path NOT LIKE pattern for SQLite-native cycle detection without additional data structures | Complete |
| Two-stage CTE for depth filtering (25-01) | Group by MIN(depth) first, then filter WHERE depth = N to ensure shortest path to each node | Complete |
| Graph methods enrich with full node details (25-03) | SearchEngine delegates to database then fetches full GraphNode objects, matching timeline pattern | Complete |
| Always-available graph tool registration (25-03) | Graph tools always registered (unlike conditional timeline tools), as relationships are core to all templates | Complete |
| Entity ID resolution with multiple formats (25-03) | Support Type:name format, direct ID, and name search for flexible entity identification | Complete |
| vis-timeline standalone build (26-01) | Use standalone import for ESNext bundler optimization, enabling tree-shaking via esbuild | Complete |
| ItemView lifecycle pattern (26-01) | Follow ValidationSidebarView pattern for TimelineView: onOpen with placeholder, onClose with cleanup | Complete |
| Timeline view placement (26-01) | Timeline opens in right sidebar via getRightLeaf matching existing validation sidebar | Complete |
| Broad date range for timeline query (26-02) | Use 0001-01-01 to 9999-12-31 to fetch all temporal data at once, simpler than incremental loading for v4.0 | Complete |
| Multiple date field naming support (26-02) | Check start_date, date, startDate for start; end_date, endDate for end to accommodate different frontmatter conventions | Complete |
| Filter entities without dates (26-02) | Remove items without valid start dates from timeline rather than showing null/undefined dates | Complete |
| Error-specific UI feedback (26-02) | MCP connection errors show "Connect to MCP" button, other errors show "Retry" button for better UX | Complete |
| DataSet filtering for timeline (26-03) | Use DataSet filtering + setItems() for entity type toggles rather than vis-timeline native group visibility (not available) | Complete |
| Filter state persistence (26-03) | Persist timeline filter preferences in plugin settings (timelineFilterTypes array) for session continuity | Complete |
| Okabe-Ito color palette (26-03) | Use scientifically validated color-blind accessible palette (8 distinct colors) for entity types | Complete |
| MCP error via exception (26-03) | Catch "MCP server not connected" from callMCPTool rather than checking private mcpProcess field | Complete |
| sigma.js v3.0.2 for graph rendering (27-01) | Use sigma.js WebGL renderer for high performance with large graphs, well-maintained library | Complete |
| Pre-installed graph algorithm packages (27-01) | Install graphology-shortest-path and graphology-communities-louvain upfront for future features (GVIEW-10, GVIEW-11) to avoid dependency churn | Complete |
| Memory-safe renderer cleanup (27-01) | Add renderer.kill() and graph.clear() in GraphView.onClose() to prevent memory leaks per sigma.js best practices | Complete |
| Local mode via neighbors query (27-02) | Use hvmd_graph_get_neighbors for local mode showing active file entity + neighbors at depth 1 for focused view | Complete |
| Full vault mode deferred (27-02) | Defer full vault graph to 27-03, local mode provides core value while full vault needs additional UX for large graphs | Complete |
| ForceAtlas2 inferred settings (27-02) | Use inferSettings with 50 iterations for balance of layout quality and performance per graphology recommendations | Complete |
| Okabe-Ito palette reuse (27-02) | Reuse exact timeline Okabe-Ito colors for graph nodes to maintain consistency across views and accessibility | Complete |
| Large graph warning threshold (27-02) | Show warning for >100 nodes for proactive performance communication before lag occurs | Complete |
| Edge labels on hover only (27-03) | Show relationship type labels only when edge is hovered to prevent visual clutter in dense graphs | Complete |
| Focus on node behavior (27-03) | Focus action opens file and switches to local view mode for seamless zoom-in exploration | Complete |
| Dynamic graph expansion (27-03) | Expand neighbors adds to existing graph with layout recalc, preserving user's mental map | Complete |
| Path finding deferred (27-03) | "Find path to..." shows placeholder notice, full implementation deferred to 27-05 for proper UI | Complete |
| Debounced search 200ms (27-04) | Balance responsiveness with performance, preventing excessive re-renders during typing | Complete |
| Pink search highlight color (27-04) | #FF69B4 Okabe-Ito adjacent color, distinct from entity type colors while maintaining accessibility | Complete |
| Case-insensitive substring search (27-04) | User-friendly search matching partial node names without exact case | Complete |
| Inline filter chip colors (27-04) | Apply Okabe-Ito colors dynamically via style attribute for consistency with graph node colors | Complete |
| Bidirectional Dijkstra for path finding (27-05) | Use graphology-shortest-path bidirectional locally instead of MCP for instant client-side path computation | Complete |
| Pink highlight for paths (27-05) | Reuse #FF69B4 pink for both path and search highlights for visual consistency | Complete |
| Two-click path selection (27-05) | Right-click "Find path to..." then click target node, matching expand/focus interaction pattern | Complete |
| Louvain community detection (27-05) | Use graphology-communities-louvain for cluster identification with Okabe-Ito palette coloring | Complete |
| Auto-restore layout on load (27-05) | Automatically restore saved layout positions from settings for seamless graph continuity | Complete |
| Cluster detection on toggle (27-05) | Auto-detect communities when cluster mode enabled, one-click workflow | Complete |
| styles.css in release assets (28-02) | All three files (main.js, manifest.json, styles.css) required for Obsidian community plugin validation | Complete |
| Bare semver tag format maintained (28-02) | Kept ${version} format without v prefix matching manifest.json, established since 3.0.1 per PLUG-03 | Complete |
| Kept hivemind-mcp plugin ID (28-02) | Existing ID meets all Obsidian validation rules (no obsidian/plugin keywords), no need to change | Complete |
| License compliance verified (28-02) | All production dependencies MIT or Apache-2.0 compatible, zero GPL/AGPL per community requirements | Complete |

### Active Concerns

**Research flags:**
- Phase 24 (Timeline MCP): HIGH — Date timezone handling requires cross-timezone testing, migration strategy for existing vaults
- Phase 27 (Graph View): HIGH — Bundle size monitoring critical (sigma.js + graphology ~60KB), template registry integration affects both plugin and server
- Phase 28 (Submission): LOW — child_process usage now documented with security scope and MCP protocol justification (23-02)

**Technical constraints:**
- Obsidian Sync 5MB per-file limit (current main.js ~150KB, sigma.js adds ~60KB)
- Timeline queries require date-typed fields in template registry
- ISO8601 YYYY-MM-DD format required for all date inputs
- Template registry must be shared (no duplication between CLI and plugin)

### Blockers

None currently.

### Open Questions

1. **Date field migration:** How to handle vaults with non-standard date field names (date, created, timestamp)? (Research during Phase 24)
2. **Bundle size thresholds:** What's the actual bundle size with sigma.js + graphology? (Measure during Phase 27)
3. **Temporal types caching:** Should discoverTemporalTypes() cache results? (Currently O(n) scan each call) (Consider during Phase 24-02)

### TODOs

**Phase 23 (Complete):**
- ✅ Plan 01: Template registry deduplication (DEBT-01, DEBT-02)
- ✅ Plan 02: Stryker exclusions and plugin documentation (DEBT-04, DEBT-05)
- ✅ Plan 03: CLI init test coverage 91.17% (DEBT-03)

**Phase 24 (Complete):**
- ✅ Plan 01: Date field discovery and validation schemas (24-01)
- ✅ Plan 02: Timeline database queries (24-02)
- ✅ Plan 03: Timeline MCP server integration (24-03)

**Phase 25 (Complete):**
- ✅ Plan 01: Graph database traversal methods (25-01)
- ✅ Plan 02: Graph MCP tool definitions (25-02)
- ✅ Plan 03: Graph MCP server integration (25-03)

**Phase 26 (Complete):**
- ✅ Plan 01: Timeline view infrastructure (vis-timeline install, TimelineView class)
- ✅ Plan 02: Timeline data loading (MCP integration, vis-timeline rendering)
- ✅ Plan 03: Timeline interactions and filtering (click navigation, swim lanes, Okabe-Ito colors)

**Phase 27 (Complete):**
- ✅ Plan 01: Graph view infrastructure (sigma.js install, GraphView class)
- ✅ Plan 02: Graph data loading (MCP integration, sigma.js rendering)
- ✅ Plan 03: Graph interactions (click navigation, context menu, hover labels, expand neighbors)
- ✅ Plan 04: Graph filtering and search (entity type filters, node search with highlighting)
- ✅ Plan 05: Shortest path, clusters, layout persistence (bidirectional Dijkstra, Louvain, layout save/restore)

**Phase 28 (In progress):**
- ✅ Plan 01: Research and preparation (Obsidian validation rules, license compliance requirements)
- ✅ Plan 02: Release configuration validation (styles.css asset, manifest.json validation, license check)
- ⬜ Plan 03: Documentation and README
- ⬜ Plan 04: Plugin manifest and release artifacts

**Future:**
- Add bundle size monitoring to CI (Phase 27)
- Build cross-timezone test suite for date queries (Phase 24-03)

## Session Continuity

**Completing v4.0 requires:**
1. Phase 23: Clean tech debt (5 requirements, 5 complete) ✅ PHASE COMPLETE
2. Phase 24: Timeline MCP tools (6 requirements, 6 complete) ✅ PHASE COMPLETE
3. Phase 25: Graph MCP tools (5 requirements, 5 complete) ✅ PHASE COMPLETE
4. Phase 26: Timeline Obsidian view (6 requirements, 6 complete) ✅ PHASE COMPLETE
5. Phase 27: Graph Obsidian view (15 requirements, 15 complete) ✅ PHASE COMPLETE
6. Phase 28: Community plugin submission (6 requirements)

**Last session:** 2026-01-28
**Stopped at:** Completed 28-02-PLAN.md (Release configuration validation)
**Resume file:** None

**Next action:** Phase 28 Plan 03 (Documentation and README) - prepare user-facing documentation

**Context for future sessions:**
- Phase 23 complete: Template registry unified, plugin docs added, CLI test coverage 91%
- Phase 24 complete: Timeline MCP tools fully integrated and tested (814 tests passing)
  - Date field discovery and validation (discoverTemporalTypes, validateDateField)
  - Database timeline queries with generated column indexes
  - SearchEngine timeline methods with relationship enrichment
  - MCP server conditional tool registration
  - 25 integration tests using research template
  - All four query tools working (range, before, after, exact)
- Phase 25 complete: Graph MCP tools fully integrated and tested (893 tests passing)
  - Graph traversal database methods: queryNeighbors, querySubgraph, queryShortestPath, getEdgeBetween
  - SQLite recursive CTEs for multi-hop BFS traversal with cycle prevention
  - Graph MCP tool definitions with Zod schemas (25-02)
  - SearchEngine graph methods with full node enrichment
  - MCP server always-available graph tool registration
  - Entity ID resolution (Type:name format, direct ID, name search)
  - Result formatting grouped by relationship type/entity type
  - 26 integration tests using worldbuilding template
  - All four query tools working (neighbors, subgraph, path, list_types)
- Phase 26 Plan 01 complete: Timeline view infrastructure (2 min)
  - vis-timeline@8.5.0 and vis-data@8.0.3 installed
  - TimelineView class created following ItemView pattern
  - View registered with plugin, accessible via command palette
  - Placeholder content ready for data loading
  - Research: .planning/phases/26-timeline-obsidian-view/26-RESEARCH.md
- Phase 26 Plan 02 complete: Timeline data loading (3 min)
  - TimelineView loads data from MCP timeline_query_range tool
  - Data transformation from MCP response to vis-timeline format
  - Support for both point events (date only) and range spans (start_date + end_date)
  - Multiple date field naming conventions (start_date, date, startDate)
  - Timeline auto-scales via vis-timeline native behavior
  - Error handling for MCP connection, empty data, and fetch failures
  - Summary: .planning/phases/26-timeline-obsidian-view/26-02-SUMMARY.md
- Phase 26 Plan 03 complete: Timeline interactions and filtering (4 min)
  - Click timeline item to open note in Obsidian workspace (TVIEW-04)
  - Filter timeline by entity type using toggle chips (TVIEW-05)
  - Swim lanes group entities by type with count labels (TVIEW-06)
  - DataSet filtering with setItems() for dynamic visibility
  - Filter state persistence via plugin settings (timelineFilterTypes)
  - Obsidian theme integration using CSS variables
  - Okabe-Ito accessible color palette for entity types (8 colors)
  - Summary: .planning/phases/26-timeline-obsidian-view/26-03-SUMMARY.md
- Phase 26 COMPLETE: All 6 requirements met (9 min total)
- Phase 27 Plan 01 complete: Graph view infrastructure (4 min)
  - sigma.js@3.0.2 and graphology@0.26.0 installed
  - Graph algorithm packages pre-installed (forceAtlas2, shortest-path, louvain)
  - GraphView class created following ItemView pattern
  - Command palette integration ("Hivemind: Open graph view")
  - Memory-safe lifecycle with renderer.kill() in onClose()
  - Summary: .planning/phases/27-graph-obsidian-view/27-01-SUMMARY.md
- Phase 27 Plan 02 complete: Graph data loading and rendering (4 min)
  - GraphNode, GraphEdge, GraphData interfaces for MCP integration
  - loadGraphData method calling hvmd_graph_get_neighbors for local mode
  - Transformation methods for MCP response formats
  - Full sigma.js rendering pipeline with graphology
  - ForceAtlas2 layout with inferSettings (50 iterations)
  - Okabe-Ito node coloring via node reducer (8 colors)
  - Local/Full view mode toolbar toggle
  - Large graph warning for >100 nodes
  - Error handling with MCP connection detection
  - Summary: .planning/phases/27-graph-obsidian-view/27-02-SUMMARY.md
- Phase 27 Plan 03 complete: Graph interactions (4 min)
  - Click-to-open note navigation via clickNode handler (GVIEW-04)
  - Right-click context menu with Expand/Focus/Path/Open options
  - Edge hover labels showing relationship types (GVIEW-03)
  - Expand neighbors functionality via MCP neighbor query
  - Focus on node switches to local view centered on entity
  - Path finding placeholders for future phase 27-05
  - Event binding pattern: bindEvents() method
  - Hover state management with hoveredEdge tracking
  - Summary: .planning/phases/27-graph-obsidian-view/27-03-SUMMARY.md
- Phase 27 Plan 04 complete: Graph filtering and search (5 min)
  - Entity type filter chips with counts and Okabe-Ito coloring (GVIEW-06)
  - Node search input with debounced input (200ms delay)
  - Pink (#FF69B4) highlighting for search results with larger node size
  - Camera pan animation to first search result
  - Clear button to reset search and highlights
  - Filter state persistence via plugin settings (graphFilterTypes)
  - Case-insensitive substring matching for user-friendly search
  - Summary: .planning/phases/27-graph-obsidian-view/27-04-SUMMARY.md
- Phase 27 Plan 05 complete: Shortest path, clusters, layout persistence (5 min)
  - Shortest path highlighting with bidirectional Dijkstra algorithm (GVIEW-10)
  - Two-click path selection: right-click "Find path to..." then click target
  - Louvain community detection with cluster coloring (GVIEW-11)
  - Layout position persistence in plugin settings (GVIEW-12)
  - Auto-restore layout on graph load
  - Clear Path button to remove path highlights
  - By Type/Clusters toggle for color mode switching
  - Save/Restore layout buttons for manual layout management
  - Summary: .planning/phases/27-graph-obsidian-view/27-05-SUMMARY.md
- Phase 27 COMPLETE: All 15 requirements met (22 min total)
- Phase 28 Plan 01 complete: Research and preparation
  - Research: .planning/phases/28-community-plugin-submission/28-RESEARCH.md
- Phase 28 Plan 02 complete: Release configuration validation (2.5 min)
  - Added styles.css to GitHub release assets in .releaserc.json
  - Validated manifest.json (hivemind-mcp ID meets all Obsidian rules)
  - License compliance verified: 23 MIT + 4 Apache-2.0, zero GPL/AGPL
  - Confirmed tag format alignment (${version} bare semver per PLUG-03)
  - Summary: .planning/phases/28-community-plugin-submission/28-02-SUMMARY.md
- All tech debt cleaned (DEBT-01 through DEBT-05)
- Research context available at C:\Users\Preston\git\hivemind\.planning\research\SUMMARY.md

---
*Roadmap created: 2026-01-27*

# Project State: Hivemind

**Last updated:** 2026-01-28

## Project Reference

**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

**Current Milestone:** v4.0 Temporal & Graph

**Milestone Goal:** Add timeline queries and graph visualization (both MCP tools and Obsidian UI), submit community plugin, and clean up accumulated tech debt.

## Current Position

**Phase:** 27 - Graph Obsidian View
**Plan:** 1 of 3 complete
**Status:** In progress
**Last activity:** 2026-01-28 - Completed 27-01-PLAN.md (Graph view infrastructure)

**Progress:**
```
[██████--------------] 30/39 requirements complete (77%)
```

**Phase Goal:** Build interactive graph visualization in Obsidian plugin using sigma.js

**Phase Success Criteria:**
1. ✅ GraphView class registered with plugin (27-01 complete)
2. ⬜ Graph loads data from MCP graph tools (27-02 planned)
3. ⬜ Graph interactions: click to open, drag to pan, zoom (27-03 planned)
4. ⬜ Graph layout: force-directed with forceAtlas2 (27-03 planned)
5. ⬜ Node/edge styling integrated with Obsidian theme (27-03 planned)
6. ⬜ Graph filters by relationship type (27-03 planned)

## Performance Metrics

**v4.0 Progress:**
- Phases complete: 4/6 (66%)
- Requirements complete: 30/39 (77%)
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

**Phase 27 (In Progress):**
- ✅ Plan 01: Graph view infrastructure (sigma.js install, GraphView class)
- ⬜ Plan 02: Graph data loading (MCP integration, sigma.js rendering)
- ⬜ Plan 03: Graph interactions and layout (click navigation, force-directed layout, theming)

**Future:**
- Add bundle size monitoring to CI (Phase 27)
- Build cross-timezone test suite for date queries (Phase 24-03)

## Session Continuity

**Completing v4.0 requires:**
1. Phase 23: Clean tech debt (5 requirements, 5 complete) ✅ PHASE COMPLETE
2. Phase 24: Timeline MCP tools (6 requirements, 6 complete) ✅ PHASE COMPLETE
3. Phase 25: Graph MCP tools (5 requirements, 5 complete) ✅ PHASE COMPLETE
4. Phase 26: Timeline Obsidian view (6 requirements, 6 complete) ✅ PHASE COMPLETE
5. Phase 27: Graph Obsidian view (12 requirements)
6. Phase 28: Community plugin submission (6 requirements)

**Last session:** 2026-01-28
**Stopped at:** Completed 27-01-PLAN.md (Graph view infrastructure)
**Resume file:** None

**Next action:** Phase 27 Plan 02 (Graph data loading) - load graph data from MCP and render with sigma.js

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
- Graph MCP tools ready for Phase 27-02 (data loading)
- All tech debt cleaned (DEBT-01 through DEBT-05)
- Research context available at C:\Users\Preston\git\hivemind\.planning\research\SUMMARY.md

---
*Roadmap created: 2026-01-27*

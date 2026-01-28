# Project State: Hivemind

**Last updated:** 2026-01-28

## Project Reference

**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

**Current Milestone:** v4.0 Temporal & Graph

**Milestone Goal:** Add timeline queries and graph visualization (both MCP tools and Obsidian UI), submit community plugin, and clean up accumulated tech debt.

## Current Position

**Phase:** 25 - Graph MCP Tools
**Plan:** 1 of 3 in progress (plan 02 complete)
**Status:** In progress
**Last activity:** 2026-01-28 - Completed 25-02-PLAN.md (Graph MCP tool definitions)

**Progress:**
```
[███-----------------] 14/39 requirements complete (36%)
```

**Phase Goal:** Add graph traversal MCP tools for relationship queries and pathfinding

**Phase Success Criteria:**
1. ✅ Graph tools use Zod schemas for input validation (25-02 complete)
2. ✅ Tool definitions match MCP spec format (25-02 complete)
3. ✅ Tool descriptions include available relationship types (25-02 complete)
4. ⬜ Four graph query tools working (neighbors, subgraph, path, list_types)
5. ⬜ Graph queries use SQLite recursive CTEs for traversal

## Performance Metrics

**v4.0 Progress:**
- Phases complete: 2/6
- Requirements complete: 13/39
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

**Phase 25 (In Progress):**
- ⬜ Plan 01: Graph database traversal methods (25-01)
- ✅ Plan 02: Graph MCP tool definitions (25-02)
- ⬜ Plan 03: Graph MCP server integration (25-03)

**Future:**
- Add bundle size monitoring to CI (Phase 27)
- Build cross-timezone test suite for date queries (Phase 24-03)

## Session Continuity

**Completing v4.0 requires:**
1. Phase 23: Clean tech debt (5 requirements, 5 complete) ✅ PHASE COMPLETE
2. Phase 24: Timeline MCP tools (6 requirements)
3. Phase 25: Graph MCP tools (5 requirements)
4. Phase 26: Timeline Obsidian view (6 requirements)
5. Phase 27: Graph Obsidian view (12 requirements)
6. Phase 28: Community plugin submission (6 requirements)

**Last session:** 2026-01-28
**Stopped at:** Completed 25-02-PLAN.md (Graph MCP tool definitions)
**Resume file:** None

**Next action:** Continue Phase 25 (Graph MCP Tools) - plans 01 and 03 remaining

**Context for future sessions:**
- Phase 23 complete: Template registry unified, plugin docs added, CLI test coverage 91%
- Phase 24 complete: Timeline MCP tools fully integrated and tested (814 tests passing)
  - Date field discovery and validation (discoverTemporalTypes, validateDateField)
  - Database timeline queries with generated column indexes
  - SearchEngine timeline methods with relationship enrichment
  - MCP server conditional tool registration
  - 25 integration tests using research template
  - All four query tools working (range, before, after, exact)
- Phase 25 progress: Tool definitions complete (25-02)
  - Zod validation schemas for neighbors, subgraph, path, list_types
  - generateGraphTools() with dynamic relationship type discovery
  - 26 unit tests passing
  - Pattern matches Phase 24 timeline-tools.ts exactly
- Timeline tools ready for Phase 26 (Timeline Obsidian UI)
- All tech debt cleaned (DEBT-01 through DEBT-05)
- Research context available at C:\Users\Preston\git\hivemind\.planning\research\SUMMARY.md

---
*Roadmap created: 2026-01-27*

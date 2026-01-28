# Project State: Hivemind

**Last updated:** 2026-01-28

## Project Reference

**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

**Current Milestone:** v4.0 Temporal & Graph

**Milestone Goal:** Add timeline queries and graph visualization (both MCP tools and Obsidian UI), submit community plugin, and clean up accumulated tech debt.

## Current Position

**Phase:** 24 - Timeline MCP Tools
**Plan:** 1 of 3 complete
**Status:** In progress
**Last activity:** 2026-01-28 - Completed 24-01-PLAN.md (Date field discovery and validation)

**Progress:**
```
[██------------------] 7/39 requirements complete (18%)
```

**Phase Goal:** Add timeline query database layer and MCP tools for temporal queries.

**Phase Success Criteria:**
1. ✅ Plugin uses template registry instead of duplicated FRONTMATTER_TEMPLATES constant
2. ✅ Template initialization pattern unified between CLI and Obsidian plugin (no duplication)
3. ✅ cli/init modules have test coverage above 80% (lines) - 91% achieved
4. ✅ process.chdir() Stryker exclusion resolved or documented with justification
5. ✅ child_process import resolved or documented with Obsidian review team justification

## Performance Metrics

**v4.0 Progress:**
- Phases complete: 1/6
- Requirements complete: 7/39
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

**Phase 24 (In Progress):**
- ✅ Plan 01: Date field discovery and validation schemas (24-01)
- ⏳ Plan 02: Timeline database queries (next)

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
**Stopped at:** Completed 24-01-PLAN.md
**Resume file:** None

**Next action:** Continue Phase 24 with Plan 02 (Timeline database queries).

**Context for future sessions:**
- Phase 23 complete: Template registry unified, plugin docs added, CLI test coverage 91%
- Phase 24 Plan 01 complete: Date field discovery and validation (TDD, 27 tests)
- Timeline foundations ready: discoverTemporalTypes(), validateDateField(), 4 Zod schemas, generateTimelineTools()
- ISO8601 format validation (YYYY-MM-DD only, no calendar correctness)
- Variable default sort order per query intent (before=desc, others=asc)
- All tech debt cleaned (DEBT-01 through DEBT-05)
- Clean foundation for temporal and graph features
- Research context available at C:\Users\Preston\git\hivemind\.planning\research\SUMMARY.md

---
*Roadmap created: 2026-01-27*

---
phase: 07-migration
plan: 02
subsystem: database
tags: [sqlite, better-sqlite3, schema-migration, template-system]

# Dependency graph
requires:
  - phase: 07-01
    provides: Metadata table for schema versioning
  - phase: 06-05
    provides: Template initialization infrastructure
provides:
  - Template-aware database schema with template_id column
  - Automatic schema migration via drop/recreate
  - GraphBuilder integration with template ID
affects: [07-04, 08-dynamic-tools, multi-template-support]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Schema migration via drop/recreate (markdown is source of truth)
    - Optional templateId parameter with default 'worldbuilding'
    - Preserve workflows/assets tables during knowledge graph migration

key-files:
  created: []
  modified:
    - src/graph/database.ts
    - src/graph/builder.ts
    - src/server.ts
    - src/types/index.ts
    - tests/graph/builder.test.ts

key-decisions:
  - "Schema migration drops and recreates nodes/relationships/FTS tables only"
  - "Preserve workflows and assets tables during migration"
  - "Template ID defaults to 'worldbuilding' for backwards compatibility"
  - "GraphNode.templateId is optional field"
  - "Schema version check on every database initialization"

patterns-established:
  - "Migration pattern: version check -> drop tables -> recreate with new schema"
  - "Template ID flows: config -> GraphBuilder -> database"
  - "Preserve non-knowledge-graph tables during migration"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 7 Plan 2: Template-Aware Database Summary

**Nodes table with template_id column, schema migration via drop/recreate, and GraphBuilder template integration**

## Performance

- **Duration:** 4 min 21 sec
- **Started:** 2026-01-26T02:50:44Z
- **Completed:** 2026-01-26T02:55:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Nodes table includes template_id column (default: 'worldbuilding')
- Schema version checking triggers automatic migration on mismatch
- GraphBuilder accepts and passes templateId to database
- All existing tests pass including 3 new template ID tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Add template_id Column to Nodes Table** - `3632996` (feat)
2. **Task 2: Update GraphBuilder to Pass Template ID** - `d23a952` (feat)

## Files Created/Modified
- `src/graph/database.ts` - Added template_id column, schema migration logic, preserve workflows/assets
- `src/graph/builder.ts` - Added templateId property and setTemplateId() method
- `src/server.ts` - Call setTemplateId() after template initialization
- `src/types/index.ts` - Added optional templateId field to GraphNode
- `tests/graph/builder.test.ts` - Added 3 template ID tests (default, constructor, setter)

## Decisions Made

**Schema migration strategy: Drop and recreate**
- Rationale: Markdown is source of truth, simple rebuild is safer than ALTER TABLE with SQLite constraints
- Impact: Next vault scan rebuilds graph from markdown files

**Preserve workflows and assets tables**
- Rationale: ComfyUI data is not regenerated from markdown, must be preserved
- Impact: Migration only touches knowledge graph tables (nodes, relationships, nodes_fts)

**Optional templateId in GraphNode interface**
- Rationale: Backwards compatibility for existing code that doesn't check templateId
- Impact: Existing queries work without modification

**Default templateId to 'worldbuilding'**
- Rationale: Backwards compatibility for existing vaults without config
- Impact: Zero-config migration for existing users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Initial test failures in ComfyUI workflow tests**
- Issue: Schema migration dropped workflows and assets tables
- Resolution: Modified migrateSchema() to preserve non-knowledge-graph tables
- Verification: All 156 tests pass

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 7 remaining plans:**
- 07-04: Template-specific MCP tool registration can now filter by template_id
- 07-05: Backwards compatibility testing validated with existing template_id defaults

**Multi-template support foundation complete:**
- Database can store nodes from multiple templates simultaneously
- Template ID tracked for filtering and tool generation
- Schema migration handles future schema changes automatically

**No blockers** - all infrastructure working as designed.

---
*Phase: 07-migration*
*Completed: 2026-01-26*

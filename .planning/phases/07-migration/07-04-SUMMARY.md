---
phase: 07-migration
plan: 04
subsystem: api
tags: [mcp, templates, deprecation, auto-detection]

# Dependency graph
requires:
  - phase: 07-01
    provides: GraphNode template_id column, schema migration
  - phase: 07-02
    provides: Template-aware database schema, GraphBuilder integration
provides:
  - Generic query_entity tool for any entity type
  - Deprecation wrappers for legacy tools
  - Template auto-detection at server startup
  - Database persistence of detected template
affects: [08-dynamic-tools, template-driven-formatting]

# Tech tracking
tech-stack:
  added: []
  patterns: [deprecation-metadata, auto-detection]

key-files:
  created: []
  modified: [src/server.ts, src/templates/loader.ts]

key-decisions:
  - "Deprecation metadata included in response object as _meta field"
  - "Template detection runs before template initialization at startup"
  - "Detected template stored in database for persistence across restarts"
  - "initializeTemplates accepts templateOverride to bypass config"
  - "Legacy tools delegate to generic handler with type parameter"

patterns-established:
  - "Generic entity handlers with type-based routing"
  - "Deprecation warnings in MCP tool responses"
  - "Auto-detection with fallback to defaults"

# Metrics
duration: 4min
completed: 2026-01-26
---

# Phase 7 Plan 4: Template-Driven MCP Tools Summary

**Generic query_entity tool with deprecation wrappers for legacy tools, plus template auto-detection at server startup**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-26T02:59:03Z
- **Completed:** 2026-01-26T03:02:37Z
- **Tasks:** 3/3
- **Files modified:** 2

## Accomplishments
- Generic handleQueryEntity method accepts type parameter for any entity
- query_character and query_location now wrappers with deprecation metadata
- New query_entity tool available with type and id parameters
- Template auto-detection runs at startup when no config exists
- Detected template logged and persisted to database
- All snapshot tests updated to include deprecation warnings
- Complete backwards compatibility maintained

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Generic handleQueryEntity Method** - `6ff1796` (feat)
2. **Task 2: Refactor Legacy Tools as Deprecation Wrappers** - `45267bd` (feat)
3. **Task 3: Integrate Template Detection at Startup** - `22e8722` (feat)

**Plan metadata:** To be committed with this summary

## Files Created/Modified
- `src/server.ts` - Added handleQueryEntity, formatEntityWithRelationships, formatGenericEntity; refactored legacy handlers to delegate; added query_entity tool; integrated template detection at startup
- `src/templates/loader.ts` - Updated initializeTemplates to accept templateOverride parameter; simplified activateTemplate
- `tests/migration/__snapshots__/parity.test.ts.snap` - Updated snapshots to include _meta.deprecated fields

## Decisions Made

1. **Deprecation via _meta field**: MCP SDK doesn't have native deprecation support, so we add _meta object to responses with deprecated flag, message, sunset date, and replacement tool name
2. **Tool descriptions show deprecation**: Tool listing includes [DEPRECATED - use query_entity] prefix for immediate visibility to AI clients
3. **Sunset date 2027-01-01**: Gives one year for migration, aligns with v3.0.0 removal
4. **Template override parameter**: initializeTemplates accepts optional templateOverride to use detected template instead of config
5. **Database persistence**: Detected template stored via database.setActiveTemplate() for consistency across restarts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all implementations worked as designed, tests passed on first run after snapshot updates.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 8 (Dynamic MCP Tools):
- Generic entity handler foundation in place
- Template detection working automatically
- Deprecation path established for migration to dynamic tools
- query_entity demonstrates per-type routing pattern for future dynamic generation

Blockers: None

---
*Phase: 07-migration*
*Completed: 2026-01-26*

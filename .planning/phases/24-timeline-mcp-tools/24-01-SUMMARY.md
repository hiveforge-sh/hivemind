---
phase: 24-timeline-mcp-tools
plan: 01
subsystem: mcp-tools
tags: [timeline, date-fields, validation, zod, tdd]

requires:
  - "Template registry (Phase 23)"
  - "Template type system (Phase 17)"

provides:
  - "Date field discovery from template registry"
  - "Zod validation schemas for timeline queries"
  - "MCP tool definition generator for timeline tools"

affects:
  - "Phase 24-02: Timeline database layer will use these schemas"
  - "Phase 24-03: Timeline MCP tool registration will use generateTimelineTools()"

tech-stack:
  added:
    - "ISO8601 date validation (YYYY-MM-DD regex)"
  patterns:
    - "Template registry integration for runtime introspection"
    - "Zod schema composition with shared defaults"
    - "TDD with RED-GREEN-REFACTOR cycle"

key-files:
  created:
    - path: "src/mcp/timeline-tools.ts"
      exports: ["discoverTemporalTypes", "validateDateField", "QueryTimelineRangeArgsSchema", "QueryTimelineBeforeArgsSchema", "QueryTimelineAfterArgsSchema", "QueryTimelineExactArgsSchema", "generateTimelineTools"]
    - path: "tests/mcp/timeline-tools.test.ts"
      coverage: "27 tests, 100% coverage of public API"

decisions:
  - decision: "ISO8601 format validation without calendar correctness"
    rationale: "SQLite handles string comparison correctly even with invalid dates like 2024-13-45; simpler regex avoids complex date parsing"
    alternatives: ["Full calendar validation with date parsing library"]
    impact: "Validation remains simple and fast; edge cases handled at database layer"

  - decision: "Default sortOrder varies by query type"
    rationale: "timeline_before defaults to desc (most recent first), after/range/exact default to asc (chronological order)"
    alternatives: ["Consistent default across all tools"]
    impact: "Better UX - users get intuitive default ordering per query intent"

  - decision: "Limit range 1-1000 with default 100"
    rationale: "Prevents unbounded result sets while allowing bulk queries when needed"
    alternatives: ["Smaller limit (50)", "No upper limit"]
    impact: "Balances performance and flexibility"

metrics:
  duration: "6 minutes"
  completed: "2026-01-28"
---

# Phase 24 Plan 01: Timeline Date Field Discovery Summary

**One-liner:** Date field introspection from template registry with ISO8601 Zod validation schemas for timeline MCP tools.

## What Was Built

Created the foundational module for timeline MCP tools that discovers which entity types have date fields and validates all date inputs.

**Core functionality:**
1. **discoverTemporalTypes()** - Scans active template's entity types for date-typed fields
2. **validateDateField()** - Validates field exists on entity type and is date type
3. **Zod schemas** - Four validation schemas (range, before, after, exact) with ISO8601 date format
4. **generateTimelineTools()** - Creates MCP tool definitions with dynamic descriptions

**Key features:**
- Returns empty array when no active template (graceful degradation)
- Filters entity types to only those with date fields
- ISO8601 YYYY-MM-DD validation (format only, not calendar correctness)
- Shared schema properties with tool-specific overrides
- Dynamic tool descriptions including available date fields per entity type

## Technical Details

**Date field discovery algorithm:**
```typescript
// For each entity type in active template
for (const entityType of activeTemplate.entityTypes) {
  // Extract date fields
  const dateFields = entityType.fields
    .filter((field) => field.type === 'date')
    .map((field) => ({
      name: field.name,
      required: field.required ?? false,
      description: field.description,
    }));

  // Only include types with date fields
  if (dateFields.length > 0) {
    temporalTypes.push({ entityType: entityType.name, dateFields });
  }
}
```

**Validation schema structure:**
- All schemas share: `dateField`, `entityType?`, `sortOrder?`, `limit?`
- Range tool adds: `startDate`, `endDate` (both required)
- Before/After/Exact tools add: `date` (required)
- Default sort order: `before` = desc, others = asc
- Limit range: 1-1000, default 100

**ISO8601 regex:**
```typescript
const ISO8601DateRegex = /^\d{4}-\d{2}-\d{2}$/;
```
Accepts: `2024-06-15`, `2024-13-45` (invalid but passes)
Rejects: `June 2024`, `2024/06/15`, `15-06-2024`, ``

## Deviations from Plan

### Refactoring Applied

**Deviation:** Extracted common schema properties and helper function during REFACTOR phase

**What was done:**
- Created `commonProperties` object for shared schema fields
- Created `buildDateFieldsDescription()` helper function
- Reduced code duplication by ~30 lines while maintaining functionality

**Rationale:** Plan specified TDD with refactor phase; identified clear duplication in tool generation that could be cleaned up without changing behavior

**Files modified:** `src/mcp/timeline-tools.ts` (refactor commit: dca9d12)

**Impact:** More maintainable code, easier to add new timeline tools in future phases

## Testing

**Test coverage:** 27 tests, all passing

**Test categories:**
1. **discoverTemporalTypes** (4 tests)
   - Empty array when no active template
   - Correctly identifies entity types with date fields
   - Excludes entity types without date fields
   - Handles mixed field types

2. **validateDateField** (4 tests)
   - Returns true for valid date fields
   - Returns false for missing entity types
   - Returns false for non-date fields
   - Returns false for missing fields

3. **Zod validation schemas** (15 tests)
   - Accepts valid ISO8601 dates
   - Rejects invalid formats
   - Accepts invalid calendar dates (format-only validation)
   - Applies correct default values
   - Validates limit ranges
   - Validates sortOrder enum

4. **generateTimelineTools** (4 tests)
   - Generates 4 tool definitions
   - Includes date fields in descriptions
   - Follows ToolDefinition interface
   - Generates correct input schemas

**TDD workflow:**
1. RED: Created 27 failing tests (commit cc84aae, previous session)
2. GREEN: Implemented all functions to pass tests (commit 285f6e2)
3. REFACTOR: Reduced duplication (commit dca9d12)

## Integration Points

**Dependencies:**
- `templateRegistry.getActive()` - Runtime template introspection
- `FieldConfig` type - Field metadata from template system
- `ToolDefinition` interface - MCP tool structure

**Used by (planned):**
- Phase 24-02: Timeline database queries will validate dates using these schemas
- Phase 24-03: MCP tool registration will call `generateTimelineTools()`
- Phase 26: Obsidian timeline view will use same validation schemas

## Decisions Made

**1. ISO8601 format validation only**
- Decision: Use regex `/^\d{4}-\d{2}-\d{2}$/` without calendar validation
- Rationale: SQLite string comparison works correctly even with invalid dates; simpler validation
- Alternative considered: Full date parsing with validation library
- Impact: Fast, simple validation; edge cases handled at database layer

**2. Variable default sort order**
- Decision: `before` defaults to desc, others default to asc
- Rationale: Matches user intent - "before X" usually wants most recent, "after X" wants chronological
- Alternative considered: Consistent default (asc) across all tools
- Impact: Better UX, less need for explicit sortOrder parameter

**3. Limit range 1-1000**
- Decision: Enforce minimum 1, maximum 1000, default 100
- Rationale: Prevents unbounded queries while allowing bulk operations
- Alternative considered: Smaller max (100), or no max
- Impact: Balances performance and flexibility

## Next Phase Readiness

**Blockers:** None

**Required for next phase (24-02):**
- ✅ Zod schemas exported and ready for database layer integration
- ✅ discoverTemporalTypes() available for dynamic column creation
- ✅ validateDateField() ready for runtime field validation

**Recommendations:**
1. Phase 24-02 should use `discoverTemporalTypes()` to initialize date columns
2. Database queries should validate inputs with exported Zod schemas
3. Consider caching temporal types discovery result (currently scans registry each call)

**Open questions:**
- Should we cache temporal types discovery? (Currently O(n) scan on each call)
- Do we need a separate "overlap" query for events with start_date and end_date ranges?

## Commits

1. **test(24-02): add failing tests for timeline database queries** (cc84aae) - Previous session
   - Created 27 tests for all public functions
   - Tests fail as expected (TDD RED phase)

2. **feat(24-01): implement timeline date field discovery and validation** (285f6e2)
   - Implemented discoverTemporalTypes()
   - Implemented validateDateField()
   - Created 4 Zod validation schemas
   - Implemented generateTimelineTools()
   - All 27 tests passing (TDD GREEN phase)

3. **refactor(24-01): reduce duplication in timeline tool generation** (dca9d12)
   - Extracted common properties object
   - Created buildDateFieldsDescription() helper
   - Reduced code duplication
   - All tests still passing (TDD REFACTOR phase)

## Files Modified

**Created:**
- `src/mcp/timeline-tools.ts` (390 lines, refactored to 357 lines)
- `tests/mcp/timeline-tools.test.ts` (542 lines)

**Modified:** None

## Lessons Learned

**What went well:**
- TDD cycle produced clean, well-tested code
- Template registry integration was straightforward
- Zod schemas compose nicely with shared properties
- Refactoring phase caught obvious duplication early

**What could improve:**
- Could add performance test for temporal types discovery with large templates
- Documentation could include example MCP tool registration usage

**Reusable patterns:**
- Template registry introspection pattern (scan entityTypes for field type)
- Zod schema composition with spread operator
- Helper function extraction for description building

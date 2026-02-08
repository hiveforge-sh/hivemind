---
phase: 24-timeline-mcp-tools
plan: 02
subsystem: database
tags: [sqlite, timeline, date-queries, generated-columns, tdd]
requires: [23-tech-debt-cleanup]
provides: [timeline-database-queries, date-column-indexing]
affects: [24-03-mcp-timeline-tools]
decisions:
  - title: "Use json_extract in queries instead of direct column access"
    rationale: "Works with or without generated columns, SQLite optimizer auto-uses indexes"
    alternatives: ["Direct column access", "Separate table for date fields"]
  - title: "NULL end_date means ongoing event"
    rationale: "Natural representation for events without defined end, overlap queries handle correctly"
    alternatives: ["Use sentinel value like '9999-12-31'", "Separate boolean field"]
  - title: "Test expectation fix for ongoing events"
    rationale: "Ongoing event (started 2019, no end) correctly matches June 2020 overlap query"
    alternatives: ["Filter out ongoing events", "Separate query method"]
tech-stack:
  added: []
  patterns: [generated-columns, json-extract-indexing, tdd-red-green]
key-files:
  created: [tests/graph/database.test.ts]
  modified: [src/graph/database.ts]
duration: "5 minutes"
completed: 2026-01-28
---

# Phase 24 Plan 02: Timeline Database Queries Summary

> SQLite-powered date range queries with generated column indexing using TDD

## What Was Built

**Database layer for timeline queries:** Extended `HivemindDatabase` class with methods to query nodes by date ranges, enabling efficient temporal queries across any frontmatter date field.

**Core methods added:**
- `initializeDateColumns(dateFields[])` - Creates VIRTUAL generated columns and indexes for date fields
- `queryByDateRange(start, end, field, options)` - Inclusive range queries with type filtering and sorting
- `queryByDateBefore(date, field, options)` - Returns nodes before date (default desc)
- `queryByDateAfter(date, field, options)` - Returns nodes after date (default asc)
- `queryByExactDate(date, field, options)` - Exact date matching
- `queryByDateOverlap(start, end, startField, endField, options)` - Range overlap queries with NULL end_date support

**DRY refactor:** Extracted `rowToGraphNode` private helper to eliminate duplication in node conversion logic.

## Test Coverage

**TDD workflow followed:**
1. **RED:** 24 failing tests covering all timeline query methods (commit cc84aae)
2. **GREEN:** Implementation with 1 test fix for correct overlap behavior (commit 11646b1)
3. **REFACTOR:** Skipped (code already clean, duplication minimal)

**Test results:** 24/24 timeline tests pass, 789/789 total tests pass

**Tests cover:**
- Generated column creation and idempotency
- Date range queries (inclusive boundaries)
- Before/after queries with default sort orders
- Exact date matching
- Date range overlap with NULL end_date handling (ongoing events)
- Entity type filtering across all methods
- Sort order (asc/desc) and limit options

## Key Implementation Details

**Generated columns approach:**
```sql
ALTER TABLE nodes ADD COLUMN birth_date TEXT
  GENERATED ALWAYS AS (json_extract(frontmatter, '$.birth_date')) VIRTUAL;
CREATE INDEX IF NOT EXISTS idx_nodes_birth_date ON nodes(birth_date);
```

**Idempotency:** `initializeDateColumns` catches "duplicate column" errors, making it safe to call multiple times.

**Query pattern:** All methods use `json_extract(frontmatter, '$.field')` in WHERE clauses. SQLite's query optimizer automatically uses the generated column index when available, making this pattern work with or without pre-initialized columns.

**Overlap logic:** `WHERE startField <= queryEnd AND (endField >= queryStart OR endField IS NULL)`
- Handles events with defined end dates
- Treats NULL end_date as ongoing (matches if started before query end)

**Default sort orders:**
- Range queries: asc (chronological)
- Before queries: desc (most recent first)
- After queries: asc (earliest first)
- Exact queries: asc

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test expectation for overlap query**
- **Found during:** GREEN phase test execution
- **Issue:** Test expected only event-1 to match June 2020, but event-2 (ongoing since 2019, no end_date) also correctly matches
- **Fix:** Updated test to expect both events, verifying NULL end_date handling works correctly
- **Files modified:** tests/graph/database.test.ts
- **Commit:** 11646b1

## Technical Decisions

**1. json_extract vs direct column access**
- **Decision:** Use `json_extract(frontmatter, '$.field')` in all queries
- **Rationale:** Works whether or not generated columns exist, SQLite optimizer still uses indexes
- **Impact:** Flexible - queries work before and after `initializeDateColumns` call
- **Alternative considered:** Direct column access would require columns to exist first

**2. NULL end_date semantics**
- **Decision:** NULL end_date means ongoing event (no defined end)
- **Rationale:** Natural representation, overlap queries handle via `OR endField IS NULL` clause
- **Impact:** Events like "Ongoing War" correctly match future date ranges
- **Alternative considered:** Sentinel value (e.g., '9999-12-31') would complicate queries

**3. REFACTOR phase skipped**
- **Decision:** No refactoring performed (GREEN commit is final)
- **Rationale:** Code already clean, duplication minimal (entityType filter logic ~5 lines), each method is clear
- **Impact:** Slight duplication acceptable for readability
- **Alternative considered:** Extract helper for WHERE clause building (would reduce clarity)

## Files Changed

**Created:**
- `tests/graph/database.test.ts` - 24 comprehensive timeline query tests

**Modified:**
- `src/graph/database.ts` - Added 6 timeline query methods + rowToGraphNode helper

## Next Phase Readiness

**Phase 24-03 (MCP Timeline Tools) unblocked:**
- Database layer complete with all required query methods
- Generated column initialization available for performance
- Overlap queries handle ongoing events correctly
- Test coverage validates all edge cases

**Integration points established:**
- All methods return `GraphNode[]` (consistent with existing API)
- Options pattern matches existing query methods
- ISO date format (YYYY-MM-DD) standardized across all methods

**No blockers or concerns for next phase.**

## Lessons Learned

**1. TDD caught test specification error early**
- Test expected wrong behavior for overlap queries
- Implementation was correct, test assumption was wrong
- Fixed during GREEN phase with 1 passing run

**2. SQLite generated columns are transparent**
- Query optimizer automatically uses indexes on generated columns
- No need to change query structure after column creation
- `json_extract` in queries works both before and after optimization

**3. NULL semantics need explicit test coverage**
- Ongoing events (NULL end_date) are a critical edge case
- Overlap query specifically tested for NULL handling
- Test suite validates this behavior across multiple scenarios

## Metrics

**Development time:** 5 minutes (2026-01-28 15:22 - 15:27 UTC)

**Code changes:**
- 24 tests added (database.test.ts)
- 6 public methods added (timeline queries)
- 1 private method added (rowToGraphNode)
- ~230 lines added total

**Test performance:**
- Timeline tests: 46ms
- Full suite: 8.74s (789 tests)
- No regressions

**TDD cycle:**
- RED: 24 failing tests
- GREEN: 23 passing, 1 fixed
- REFACTOR: skipped (clean code)

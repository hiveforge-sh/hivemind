---
phase: 25-graph-mcp-tools
plan: 02
subsystem: mcp
tags: [mcp, graph, zod, validation, tools]
requires: [24-03]
provides: [graph-tool-definitions, graph-validation-schemas]
affects: [25-03]
tech-stack:
  added: []
  patterns: [zod-validation, mcp-tool-generation]
key-files:
  created: [src/mcp/graph-tools.ts, tests/unit/mcp/graph-tools.test.ts]
  modified: []
decisions: []
metrics:
  duration: 3min
  completed: 2026-01-28
---

# Phase 25 Plan 02: Graph MCP Tool Definitions Summary

**One-liner:** Zod validation schemas and MCP tool definitions for graph traversal (neighbors, subgraph, path, relationship types)

## What Was Built

Created `src/mcp/graph-tools.ts` with complete MCP tool definitions and Zod validation schemas for graph traversal operations. Followed the established Phase 24 timeline-tools.ts pattern exactly.

### Files Created

**src/mcp/graph-tools.ts** (320 lines)
- Four Zod validation schemas:
  - `QueryGraphNeighborsArgsSchema` - 1-hop neighbor queries with direction/filter support
  - `QueryGraphSubgraphArgsSchema` - multi-hop subgraph exploration with depth control (max 5)
  - `QueryGraphPathArgsSchema` - shortest path finding with max depth 10
  - `ListRelationshipTypesArgsSchema` - relationship type discovery (no params)
- `generateGraphTools()` function that:
  - Calls `templateRegistry.getRelationshipTypes()` to discover available relationship types
  - Dynamically includes relationship types in tool descriptions when template active
  - Returns 4 MCP ToolDefinition objects matching MCP spec format
  - Handles no-template case gracefully (tools still available, no type hints)
- All schemas exported with type aliases for use by server

**tests/unit/mcp/graph-tools.test.ts** (354 lines)
- 26 comprehensive unit tests covering:
  - Tool generation (4 tools with correct structure)
  - Zod schema validation (defaults, required fields, enums, ranges)
  - Relationship type discovery integration
  - No-template edge case handling
- All tests passing

## Technical Decisions

### Validation Schema Design

**Decision:** Use comprehensive Zod schemas with strict numeric ranges and enum validation

**Rationale:** Following Phase 24 timeline-tools.ts pattern. Prevents invalid queries from reaching database layer.

**Ranges chosen:**
- Neighbors: limit 1-100 (default 50)
- Subgraph: depth 1-5 (default 2), limit 1-200 (default 100)
- Path: maxDepth 1-10 (default 6)

These limits prevent runaway queries while being generous for typical worldbuilding use cases.

### Tool Description Strategy

**Decision:** Dynamically include available relationship types in tool descriptions

**Rationale:** Helps AI agents discover valid filter values without separate discovery call. Pattern established in Phase 24 timeline tools.

**Implementation:** Try/catch around `templateRegistry.getRelationshipTypes()` - if no template active, tools still work but lack relationship type hints.

### Direction Parameter

**Decision:** Enum with 'outgoing', 'incoming', 'both' (default 'both')

**Rationale:** Explicit direction control for asymmetric relationships (manages, parent_of, etc.). Default 'both' handles bidirectional relationships naturally.

### Filter Arrays

**Decision:** Support both `includeRelationships` and `excludeRelationships` arrays

**Rationale:** Flexible querying - either whitelist or blacklist relationship types. Matches CONTEXT.md decision and Phase 25 research recommendations.

## Deviations from Plan

None - plan executed exactly as written.

## Test Coverage

All 26 unit tests passing:

**generateGraphTools() tests (7 tests):**
- Returns 4 tools
- Each tool has correct name, description, inputSchema
- Relationship types appear in descriptions when template active
- Works without active template

**Schema validation tests (19 tests):**
- Valid arguments parse correctly
- Default values apply
- Required fields enforced
- Invalid enums rejected
- Out-of-range numbers rejected
- Array filters validated

## Integration Points

**Upstream dependencies:**
- `templateRegistry.getRelationshipTypes()` - relationship type discovery
- Phase 24 timeline-tools.ts - established tool generation pattern

**Downstream consumers:**
- Phase 25-03 will wire these tools to SearchEngine graph query methods
- MCP server will register these tools alongside timeline and entity tools

## Next Phase Readiness

**Ready for Phase 25-03:** Yes

Phase 25-03 needs to:
1. Add graph traversal methods to SearchEngine (queryGraphNeighbors, etc.)
2. Wire graph-tools.ts into MCP server alongside existing tools
3. Implement graph traversal logic using SQLite recursive CTEs (per research)

**Blockers:** None

**Concerns:** None - schemas validated, tests passing, pattern matches Phase 24

## Performance Notes

- Zod validation overhead: negligible (< 1ms per query)
- Depth/limit caps prevent runaway queries
- Schema compilation happens once at tool registration

## What We Learned

**Pattern consistency wins:** Following Phase 24 timeline-tools.ts pattern exactly meant zero architectural decisions and straightforward implementation.

**Relationship type discovery:** Template registry provides O(1) relationship type lookup - no need to scan frontmatter.

**Test setup:** Using `initializeTemplates()` and `templateRegistry.activate()` in tests matches integration test pattern from Phase 24.

---

**Completion:** 2026-01-28
**Duration:** 3 minutes
**Status:** ✅ Complete - All schemas validated, all tests passing

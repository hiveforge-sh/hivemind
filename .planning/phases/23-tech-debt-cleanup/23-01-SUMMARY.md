---
phase: 23
plan: 01
subsystem: template-registry
tags: [templates, obsidian, deduplication, debt-cleanup]

# Dependency tracking
requires:
  - "Phase 18: Template system data layer"
  - "Phase 16: Obsidian plugin commands"
provides:
  - "Unified frontmatter template generation"
  - "Single source of truth for entity field definitions"
affects:
  - "Phase 27: Graph view (needs consistent entity schemas)"
  - "Future: Template marketplace (needs registry patterns)"

# Technical stack
tech-stack:
  added: []
  patterns:
    - "Template registry builder pattern"
    - "Field default value derivation from type metadata"

# Artifacts
key-files:
  created:
    - "tests/templates/frontmatter-builder.test.ts"
  modified:
    - "src/templates/registry.ts"
    - "src/templates/builtin/worldbuilding.ts"
    - "obsidian-plugin/main.ts"

decisions:
  - name: "Worldbuilding template is source of truth"
    rationale: "Template registry entity configs drive both CLI and plugin; plugin's hardcoded templates were outdated"
    date: "2026-01-28"

# Metrics
metrics:
  duration: "10 minutes"
  completed: "2026-01-28"
---

# Phase 23 Plan 01: Deduplicate Frontmatter Templates Summary

**One-liner:** Unified frontmatter template generation via registry, eliminating 150+ lines of hardcoded duplication from Obsidian plugin.

## What Was Accomplished

### Objective Achieved
Eliminated DEBT-01 (hardcoded FRONTMATTER_TEMPLATES duplication) and DEBT-02 (divergent initialization patterns) by deriving all frontmatter templates from the template registry's entity type configurations. The Obsidian plugin now uses the same template source as the CLI.

### Tasks Completed

#### Task 1: Add Frontmatter Template Builder to Registry
**Status:** Complete
**Commit:** `fed5bb4`

Added three methods to `TemplateRegistry`:
1. `buildFrontmatterTemplate(entityTypeName)` - Generates complete frontmatter object for a specific entity type
2. `buildAllFrontmatterTemplates()` - Generates frontmatter for all entity types in active template
3. `getFieldDefaultValue(field)` - Private helper that derives default values from field type metadata

**Key implementation details:**
- Base fields (id, type, status, title, tags, aliases) auto-added to all entities
- Asset type correctly omits `importance` field
- Nested objects (appearance, personality, background) have proper sub-field structure
- Default value logic: uses `field.default` if present, otherwise derives from `field.type`

**Field completeness fix:**
Added missing `background` field to character entity in worldbuilding.ts (plugin templates had it but template config didn't).

**Test coverage:**
Created comprehensive test suite with 10 tests covering all entity types, error cases, and edge cases.

#### Task 2: Replace Plugin FRONTMATTER_TEMPLATES with Registry Calls
**Status:** Complete
**Commit:** `a486d59`

**Changes:**
- Removed 150+ line FRONTMATTER_TEMPLATES constant
- Replaced 7 usage sites across 4 plugin workflows:
  1. Auto-merge frontmatter (line ~626)
  2. Bulk folder frontmatter add (line ~743)
  3. Fix missing fields command (line ~1095)
  4. Bulk fix all files (lines ~1158, ~1192)
  5. Add frontmatter modal (line ~2203)
  6. Entity type selector modal (line ~2489)
- Added error handling for template build failures
- All error paths gracefully skip files or show notices

**Verification:**
- `npm run build` in obsidian-plugin: SUCCESS
- `npm test` (650 tests): ALL PASS
- `grep -r "FRONTMATTER_TEMPLATES" obsidian-plugin/`: ZERO RESULTS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added missing 'background' field to worldbuilding template**
- **Found during:** Task 1 test writing
- **Issue:** Plugin's FRONTMATTER_TEMPLATES had `background` field for characters, but worldbuilding.ts entity config didn't define it
- **Fix:** Added `background` field to character entity type in worldbuilding.ts
- **Files modified:** `src/templates/builtin/worldbuilding.ts`
- **Commit:** `fed5bb4` (included in Task 1)

**Rationale:** The worldbuilding template is the canonical source of truth. The plugin's hardcoded templates were outdated and incomplete. Making worldbuilding.ts complete ensures consistency.

## Technical Decisions

### Decision 1: Hardcode Nested Object Structures in getFieldDefaultValue
**Context:** Character entity has nested objects (appearance, personality, background) with specific sub-fields, but the template config only marks them as `type: 'record'` without defining sub-fields.

**Options:**
1. Add full nested field definitions to template config (sub-fields within fields)
2. Hardcode known nested structures in registry builder method
3. Return empty objects for all record types

**Chosen:** Option 2 (hardcode in registry)

**Rationale:**
- Template config would become significantly more complex with nested field definitions
- Only 3 specific nested objects need custom structure (all on character entity)
- Hardcoding is pragmatic for v3.x; can be made configurable in v4.0 if needed
- Other record types correctly use empty object default

**Trade-offs:**
- Pro: Simple, works immediately, minimal config complexity
- Con: Less flexible; adding new nested objects requires code change
- Mitigation: All entity types are in built-in templates (controlled codebase)

### Decision 2: Registry Initialization Remains in Plugin onload()
**Context:** Plugin already registers and activates worldbuilding template in `onload()`.

**No change made:** Left initialization exactly as-is.

**Rationale:**
- Plugin initialization is already correct and uses shared pattern
- Objective was to deduplicate FRONTMATTER_TEMPLATES, not refactor init flow
- Init happens once at plugin load; has zero performance impact

## Impact & Value

### Lines of Code Removed
- **FRONTMATTER_TEMPLATES constant:** 150 lines
- **Net reduction:** 118 lines (accounting for new registry methods)

### Duplication Eliminated
- 7 entity type definitions no longer duplicated between plugin and CLI
- Field definitions are now single source of truth in worldbuilding.ts

### Maintenance Burden Reduced
- Adding new entity fields: update worldbuilding.ts only (was: update both template + plugin)
- New entity types: automatic in plugin once added to template
- Field changes: single update location

### Phase 27 Unblocked
The graph view feature (Phase 27) requires consistent entity schemas across CLI and plugin. This plan ensures both use identical field definitions, preventing graph query mismatches.

## Verification Results

### Build Verification
```
cd obsidian-plugin && npm run build
✓ TypeScript compilation: PASS
✓ esbuild bundle: SUCCESS
```

### Test Verification
```
npm test
✓ 650 tests passed
✓ New frontmatter-builder test suite: 10/10 tests pass
✓ No regressions in existing tests
```

### Code Search Verification
```
grep -r "FRONTMATTER_TEMPLATES" obsidian-plugin/
→ 0 results (constant fully removed)
```

### Template Output Verification
Test suite validates generated templates match original hardcoded structure for all 7 entity types:
- ✓ Base fields correct (id, type, status, title, importance, tags, aliases)
- ✓ Asset type has no importance field
- ✓ Character nested objects (appearance, personality, background) have correct structure
- ✓ All entity-specific fields present with correct default values

## Next Phase Readiness

**Phase 27 (Graph View):** READY
- Entity schemas now consistent between CLI and plugin
- Template registry provides single source of truth
- Graph queries can rely on field definitions matching across contexts

**Phase 24 (Additional debt cleanup):** READY
- Registry builder pattern established
- Can be extended for other deduplication tasks

## Files Changed

### Created (1)
- `tests/templates/frontmatter-builder.test.ts` - Comprehensive test suite for new builder methods

### Modified (3)
- `src/templates/registry.ts` - Added buildFrontmatterTemplate(), buildAllFrontmatterTemplates(), getFieldDefaultValue()
- `src/templates/builtin/worldbuilding.ts` - Added missing background field to character entity
- `obsidian-plugin/main.ts` - Removed FRONTMATTER_TEMPLATES, replaced 7 usage sites with registry calls

### Commits (2)
1. `fed5bb4`: feat(23-01): add frontmatter template builder to registry
2. `a486d59`: feat(23-01): replace plugin FRONTMATTER_TEMPLATES with registry calls

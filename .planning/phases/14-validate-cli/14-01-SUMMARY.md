---
phase: 14-validate-cli
plan: 01
subsystem: cli
tags: [validation, zod, gray-matter, picomatch, frontmatter]

# Dependency graph
requires:
  - phase: 13-folder-mapping
    provides: FolderMapper with async static factory and template config support
  - phase: 11-template-system
    provides: SchemaFactory for dynamic Zod schema generation from entity configs
provides:
  - Validation types (ValidationResult, ValidationIssue, ValidationSummary)
  - ValidationScanner for markdown file discovery with exclusion support
  - validateFile function for frontmatter validation against template schemas
  - initializeTemplateRegistry for builtin template registration
affects: [14-validate-cli-formatters, 14-validate-cli-integration, 15-fix-cli]

# Tech tracking
tech-stack:
  added: []
  patterns: [discriminated unions for issue types, schema-based validation, async factory pattern]

key-files:
  created:
    - src/cli/validate/types.ts
    - src/cli/validate/scanner.ts
    - src/cli/validate/validator.ts
  modified: []

key-decisions:
  - "Use discriminated union for ValidationIssue types (type-safe issue classification)"
  - "Reuse VaultReader patterns for file discovery (no duplication)"
  - "Optional folder mismatch detection (warning, not error)"
  - "Skip files without frontmatter when --skip-missing flag set"

patterns-established:
  - "Validation infrastructure: types → scanner → validator pattern"
  - "Issue classification: missing_frontmatter, missing_field, invalid_type, schema_error, folder_mismatch"
  - "Template registry initialization before validation (same as CLI fix command)"

# Metrics
duration: 2 min
completed: 2026-01-27
---

# Phase 14 Plan 01: Validation Infrastructure Summary

**Validation types, file scanner, and frontmatter validator using template schemas with Zod**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-27T01:06:06Z
- **Completed:** 2026-01-27T01:08:23Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created ValidationIssue discriminated union with 5 issue types
- ValidationScanner discovers markdown files using VaultReader patterns
- Frontmatter validator using SchemaFactory and gray-matter
- Template registry initialization following CLI patterns
- Folder mismatch detection using FolderMapper (optional warning)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create validation types module** - `b2b6b75` (feat)
2. **Task 2: Create validation scanner module** - `e3e4ec8` (feat)
3. **Task 3: Create frontmatter validator module** - `2aaaff4` (feat)

## Files Created/Modified
- `src/cli/validate/types.ts` - Validation result types and CLI options
- `src/cli/validate/scanner.ts` - File discovery with exclusion support
- `src/cli/validate/validator.ts` - Frontmatter validation against template schemas

## Decisions Made

**1. Discriminated union for ValidationIssue**
- Each issue type has a unique `type` field and type-specific properties
- Enables type-safe handling in formatters (TypeScript narrows types)
- Example: `missing_field` includes `field` property, `invalid_type` includes `actual` and `validTypes`

**2. Reuse VaultReader file discovery patterns**
- Copied `findMarkdownFiles` and `shouldExclude` logic from VaultReader
- No duplication of exclusion handling (hidden files, .obsidian, etc.)
- Supports user-provided ignore patterns via picomatch

**3. Optional folder mismatch detection**
- Only warns when folder mapping is exact (`confidence === 'exact'`)
- Doesn't fail validation (just adds warning to issues)
- Gracefully handles FolderMapper errors (folder mappings are optional)

**4. Skip missing frontmatter flag**
- When `--skip-missing` set, files without frontmatter return `{ valid: true, issues: [] }`
- Allows users to focus on validating files that already have frontmatter
- Matches CONTEXT.md requirement for configurable missing frontmatter handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all infrastructure already existed in codebase.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for next plan: 14-02 (Output formatters for validation results).

Infrastructure modules are complete and tested (TypeScript compilation passes). Formatters can now consume ValidationResult[] and produce human-readable or JSON output.

**Next dependencies:**
- Formatters will import types from `./types.js`
- CLI integration will import scanner and validator
- Fix CLI (Phase 15) will use scanner to find files needing frontmatter

---
*Phase: 14-validate-cli*
*Completed: 2026-01-27*

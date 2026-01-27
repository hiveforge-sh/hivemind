---
phase: 15-fix-cli
plan: 01
subsystem: cli
tags: [fix, frontmatter, id-generation, validation]

# Dependency graph
requires:
  - phase: 14-validate-cli
    provides: ValidationScanner, validateFile, validation types
  - phase: 13-folder-mapping
    provides: FolderMapper, ResolveResult types
provides:
  - FixOptions, FileOperation, FixResult, FixSummary types
  - ID generation with collision detection algorithm
  - FileFixer class for vault analysis and frontmatter generation
affects: [15-02, 15-03, obsidian-plugin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse ValidationScanner for file discovery"
    - "Async initialization pattern for FileFixer"
    - "ID collision handling: base -> prefixed -> numbered"

key-files:
  created:
    - src/cli/fix/types.ts
    - src/cli/fix/id-generator.ts
    - src/cli/fix/fixer.ts
  modified: []

key-decisions:
  - "ID collision algorithm: try base ID, then type-prefixed, then numbered"
  - "Reuse ValidationScanner instead of duplicating file discovery"
  - "FileFixer generates operations without modifying files"
  - "Preserve existing frontmatter values when adding missing fields"

patterns-established:
  - "Fix operation types as discriminated FileOperation records"
  - "Async static factory via initialize() method"

# Metrics
duration: 4min
completed: 2026-01-27
---

# Phase 15 Plan 01: Fix Command Core Infrastructure Summary

**Types, ID generator with collision detection, and FileFixer class for frontmatter generation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-27T02:14:37Z
- **Completed:** 2026-01-27T02:18:54Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments

- Created fix types module with FixOptions, FileOperation, FixResult, FixSummary
- Built ID generator with slugification and three-stage collision detection
- Implemented FileFixer class that reuses ValidationScanner and FolderMapper

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fix types module** - `d95f743` (feat)
2. **Task 2: Create ID generator with collision detection** - `9f5e7cd` (feat)
3. **Task 3: Create FileFixer class** - `395223e` (feat)

## Files Created/Modified

- `src/cli/fix/types.ts` - FixOptions, FileOperation, FixResult, FixSummary interfaces
- `src/cli/fix/id-generator.ts` - slugifyFilename, collectExistingIds, generateUniqueId functions
- `src/cli/fix/fixer.ts` - FileFixer class with initialize() and analyze() methods

## Decisions Made

- **ID collision algorithm**: Base ID first, then `{type}-{id}`, then `{type}-{id}-{n}` per CONTEXT.md
- **Reuse existing infrastructure**: ValidationScanner for file discovery, FolderMapper for type resolution
- **Preserve existing values**: When file has partial frontmatter, only add missing required fields
- **Required fields**: id, type, status, tags, name (matches validation requirements)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Core fix infrastructure complete, ready for formatter/writer in 15-02
- FileFixer.analyze() returns FileOperation[] for command handler to process
- ID generator handles collision detection across entire vault scan

---
*Phase: 15-fix-cli*
*Completed: 2026-01-27*

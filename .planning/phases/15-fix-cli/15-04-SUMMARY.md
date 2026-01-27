---
phase: 15-fix-cli
plan: 04
subsystem: cli
tags: [inquirer, interactive-prompts, folder-mapping, type-resolution]

# Dependency graph
requires:
  - phase: 15-fix-cli
    provides: FileFixer class with type resolution
provides:
  - Interactive type selection for ambiguous folder mappings
  - getAmbiguousFiles() API for CLI prompting
  - resolveAmbiguousType() and processPendingAmbiguous() methods
  - Once-per-folder prompting workflow
affects: [obsidian-plugin, bulk-operations]

# Tech tracking
tech-stack:
  added: []
  patterns: [pending-resolution-pattern, folder-grouping-prompts]

key-files:
  created: []
  modified:
    - src/cli/fix/types.ts
    - src/cli/fix/fixer.ts
    - src/cli/fix/index.ts
    - tests/cli/fix/integration.test.ts

key-decisions:
  - "Ambiguous files stored during analyze(), prompted after, then processed"
  - "Type selection grouped by folder (prompt once, apply to all files)"
  - "typeResolutions Map tracks user's folder→type selections"

patterns-established:
  - "Pending resolution pattern: analyze() returns null, stores for later resolution"
  - "Folder grouping: unique folders only, batch prompts by folder path"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 15 Plan 04: Interactive Ambiguous Type Selection

**Interactive folder-to-type prompting using @inquirer/prompts - one prompt per ambiguous folder, selection applies to all files in that folder**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T03:20:25Z
- **Completed:** 2026-01-27T03:24:01Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- FileFixer exposes ambiguous files via getAmbiguousFiles() API
- CLI prompts user once per ambiguous folder (not per file)
- User's type selection applies to all files in that folder
- --yes mode uses first type without prompting (existing behavior preserved)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ambiguous tracking types and update FileFixer** - `26e6b3b` (feat)
2. **Task 2: Wire interactive prompting in CLI** - `83fc6be` (feat)
3. **Task 3: Add integration tests for ambiguous prompting** - `3d0af9c` (test)

## Files Created/Modified
- `src/cli/fix/types.ts` - Added AmbiguousFile interface
- `src/cli/fix/fixer.ts` - Added ambiguous tracking and resolution methods
- `src/cli/fix/index.ts` - Wired interactive prompts after analyze()
- `tests/cli/fix/integration.test.ts` - Added 4 tests for ambiguous handling

## Decisions Made

**Pending resolution pattern:**
- FileFixer.analyze() returns null for ambiguous files (instead of auto-selecting first type)
- Files stored in pendingAmbiguous[] array for later resolution
- CLI calls getAmbiguousFiles() to get unique folders, prompts user, calls resolveAmbiguousType()
- processPendingAmbiguous() creates operations with resolved types

**Folder grouping approach:**
- Track unique folders in ambiguousFiles[] (one entry per folder, not per file)
- Map folder→types for prompting
- typeResolutions Map stores user's selections
- resolveEntityType() checks typeResolutions before folder mapping

**--yes mode preservation:**
- In --yes mode, ambiguous case uses first type (no prompting)
- Existing behavior unchanged for automation/CI workflows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. All tests passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Fix command complete with interactive type selection. Ready for Phase 16 (Obsidian Commands) which will use the same FolderMapper infrastructure for in-editor type selection.

Ambiguous type handling workflow is now complete:
- Analyze() detects ambiguous files
- CLI prompts once per folder
- User selection applies to all files in folder
- --yes mode skips prompts and uses first type

---
*Phase: 15-fix-cli*
*Completed: 2026-01-27*

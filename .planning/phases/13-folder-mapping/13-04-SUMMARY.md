---
phase: 13-folder-mapping
plan: 04
subsystem: templates
tags: [folder-mapper, template-registry, obsidian-plugin, cli, integration]

# Dependency graph
requires:
  - phase: 13-03
    provides: FolderMapper.createFromTemplate() helper and template folderMappings field
provides:
  - templateRegistry.getFolderMappings() accessor method
  - Obsidian plugin wired to template config (not hardcoded defaults)
  - CLI fix command using async FolderMapper with template config
  - Integration tests verifying template mappings flow
affects: [14-validate-cli, 15-fix-cli, 16-obsidian-commands]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Template config flowing to runtime consumers via registry accessors"]

key-files:
  created: []
  modified:
    - src/templates/registry.ts
    - obsidian-plugin/main.ts
    - src/cli.ts
    - tests/templates/folder-mapper.test.ts

key-decisions:
  - "getFolderMappings() returns FolderMappingRule[] | undefined (optional field handling)"
  - "Obsidian plugin initializes template registry with worldbuilding as default"
  - "CLI fix command uses first type when resolveType() returns multiple matches"
  - "Integration tests use lowercase paths for DEFAULT_FOLDER_MAPPINGS (case-sensitive)"

patterns-established:
  - "Registry accessors follow consistent pattern: throw if no active, return field value"
  - "Template config retrieved via registry, passed to createFromTemplate()"

# Metrics
duration: 3min
completed: 2026-01-27
---

# Phase 13 Plan 04: Template Config to Runtime Consumers Summary

**Template registry getFolderMappings() accessor enables CLI and Obsidian plugin to use configured folder mappings instead of hardcoded defaults**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-27T00:21:23Z
- **Completed:** 2026-01-27T00:24:48Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- templateRegistry.getFolderMappings() accessor for retrieving active template's mappings
- Obsidian plugin retrieves folder mappings from template registry instead of using hardcoded defaults
- CLI fix command migrated from LegacyFolderMapper to async FolderMapper with template config
- Integration tests verify createFromTemplate() correctly uses template mappings

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getFolderMappings() accessor to TemplateRegistry** - `56d5b8a` (feat)
2. **Task 2: Wire Obsidian plugin to use template folderMappings** - `8f5acd8` (feat)
3. **Task 3: Update CLI fix command to use async FolderMapper with template config** - `1eb7470` (feat)
4. **Task 4: Add integration test for createFromTemplate with template mappings** - `9e02699` (test)

## Files Created/Modified
- `src/templates/registry.ts` - Added getFolderMappings() accessor following same pattern as getEntityTypes()
- `obsidian-plugin/main.ts` - Initialize templateRegistry and pass folderMappings to FolderMapper
- `src/cli.ts` - Replaced LegacyFolderMapper with async FolderMapper using template config
- `tests/templates/folder-mapper.test.ts` - Added integration tests for createFromTemplate()

## Decisions Made
- **getFolderMappings() returns optional value:** Consistent with template schema where folderMappings is optional. Returns undefined when not configured.
- **Obsidian plugin defaults to worldbuilding:** Template registry initialized with worldbuilding template if not already registered. Future Phase 16 will enable dynamic template switching.
- **Ambiguous type handling in CLI:** When resolveType() returns multiple types (ambiguous), fix command uses the first type (most specific due to sorting).
- **Test paths use lowercase for defaults:** DEFAULT_FOLDER_MAPPINGS uses lowercase patterns, so fallback tests must use lowercase paths to match case-sensitive glob patterns.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Test failures for fallback behavior:**
- **Issue:** Initial tests expected `vault/Characters/alice.md` (capital C) to match when falling back to defaults
- **Root cause:** DEFAULT_FOLDER_MAPPINGS uses lowercase patterns (`characters`), FolderMapper matching is case-sensitive
- **Resolution:** Updated test expectations to use lowercase paths (`vault/characters/alice.md`)
- **Verification:** All 48 tests pass, full test suite passes (484 tests)

## Next Phase Readiness

**Gap closure complete:** Users can now configure folder mappings in config.json and those mappings flow to:
- CLI fix command (via FolderMapper.createFromTemplate with template config)
- Obsidian plugin (via templateRegistry.getFolderMappings())

**Ready for Phase 14:**
- Validate command can verify folder mappings configuration
- Fix command can leverage template-specific mappings
- Obsidian plugin can use custom template mappings

**No blockers:** All infrastructure complete, runtime consumers wired correctly.

---
*Phase: 13-folder-mapping*
*Completed: 2026-01-27*

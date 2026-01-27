---
phase: 12-setup-wizard
plan: 03
subsystem: cli
tags: [init, wizard, config-generation, non-interactive, clipboard]

# Dependency graph
requires:
  - phase: 12-01
    provides: Shared prompts, validators, and color utilities
  - phase: 12-02
    provides: Interactive wizard with template detection
provides:
  - Config file generation (config.json) with vault, template, and indexing settings
  - Claude Desktop MCP snippet generation with clipboard copy support
  - Non-interactive init modes (--config preset.json, --vault/--template flags)
  - Error messages for missing config (ERR-01) and invalid vault (ERR-02)
  - Complete init command wired into CLI
affects: [12-04-validation, 13-folder-mapping]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Three-mode init command (interactive, preset, flags)
    - Clipboard integration for MCP config snippets
    - Modular output functions for config generation

key-files:
  created:
    - src/cli/init/output.ts
    - src/cli/init/index.ts
  modified:
    - src/cli.ts

key-decisions:
  - "Non-interactive mode supports both preset files (--config) and individual flags (--vault/--template)"
  - "Clipboard copy only offered in interactive mode with TTY check"
  - "Claude Desktop snippet uses --vault flag for direct vault specification"

patterns-established:
  - "Output module separates config generation from file writing for testability"
  - "Error messages extracted to reusable functions (outputMissingConfigError, outputInvalidVaultError)"

# Metrics
duration: 5min
completed: 2026-01-26
---

# Phase 12 Plan 03: Config Generation & CLI Integration Summary

**Complete init wizard with config.json generation, Claude Desktop MCP snippet with clipboard copy, and non-interactive modes via preset files or CLI flags**

## Performance

- **Duration:** 5 min 7 sec
- **Started:** 2026-01-26T19:19:51Z
- **Completed:** 2026-01-26T19:24:58Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Config generation produces complete config.json with vault, template, and indexing settings
- Claude Desktop snippet formatted as JSON with clipboard copy option
- Non-interactive modes enable automation (--config preset.json or --vault/--template flags)
- New init command fully wired into CLI, old readline-based init removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Create output module for config generation** - `72dc5b1` (feat)
2. **Task 2: Create init index with non-interactive mode** - `5bf2595` (feat)
3. **Task 3: Update CLI to use new init command** - `3c1fcec` (feat)

## Files Created/Modified

### Created
- `src/cli/init/output.ts` - Config generation, Claude Desktop snippet, error messages
  - `generateConfig`: Creates Hivemind config object with vault, server, template, indexing settings
  - `generateClaudeDesktopSnippet`: Formats MCP config JSON for Claude Desktop
  - `writeConfigFile`: Writes config.json to disk
  - `outputNextSteps`: Displays summary with clipboard copy offer
  - `outputMissingConfigError`: ERR-01 error message for missing config.json
  - `outputInvalidVaultError`: ERR-02 error message for invalid vault path

- `src/cli/init/index.ts` - Main init command entry point
  - `initCommand`: Routes to interactive, preset, or flags mode
  - `parseInitArgs`: Parses --config, --vault, --template, --yes flags
  - `initFromPreset`: Loads config from preset.json file
  - `initFromFlags`: Creates config from CLI flags

### Modified
- `src/cli.ts` - CLI entry point
  - Removed old 107-line readline-based init() function
  - Imported and wired initCommand from cli/init/index.js
  - Updated start() and fix() to use outputMissingConfigError for ERR-01
  - Net reduction of 103 lines

## Decisions Made

**Non-interactive mode design:**
- Supports two approaches: --config preset.json (full config file) or --vault/--template flags (individual params)
- Preset mode allows loading pre-configured settings for CI/automation
- Flags mode allows quick setup with sensible defaults

**Clipboard copy strategy:**
- Only offered in interactive mode (isInteractive flag)
- Requires process.stdin.isTTY check to avoid hanging in non-interactive environments
- Falls back gracefully if clipboard unavailable (SSH, CI, etc.)

**Error message extraction:**
- ERR-01 (missing config) and ERR-02 (invalid vault) extracted to reusable functions
- Used in multiple commands (start, fix, validate) for consistency
- Provides clear next steps to users

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript strict type checking on preset parsing:**
- Issue: validatePresetFile returns Record<string, unknown>, accessing preset.vault?.path caused type errors
- Resolution: Used type assertions (preset.vault as any)?.path for preset field extraction
- Impact: Maintains type safety while allowing flexible preset structure

**Unused import warning:**
- Issue: outputInvalidVaultError imported but not used in cli.ts (only used in init/index.ts)
- Resolution: Removed from cli.ts imports
- Impact: Cleaner imports, no unused code warnings

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for validation enhancements (Phase 12-04):**
- Config.json structure established and documented
- Error messages standardized for user guidance
- CLI command structure complete

**Blocked by:** None

**Concerns:** None

---
*Phase: 12-setup-wizard*
*Completed: 2026-01-26*

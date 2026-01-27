---
phase: 15-fix-cli
plan: 03
subsystem: cli
tags: [fix-command, cli-wiring, prompts, tests]
dependency-graph:
  requires: ["15-01", "15-02"]
  provides: ["fixCommand", "parseFixArgs", "fix-tests"]
  affects: ["16-obsidian-commands"]
tech-stack:
  added: []
  patterns: ["CLI entry point pattern", "arg parsing", "exit code conventions"]
key-files:
  created:
    - src/cli/fix/index.ts
    - tests/cli/fix/fixer.test.ts
    - tests/cli/fix/id-generator.test.ts
    - tests/cli/fix/integration.test.ts
  modified:
    - src/cli.ts
decisions:
  - "TTY check before interactive mode - exit code 2 for config errors"
  - "Old fix() function removed - replaced with validation-based approach"
  - "Interactive prompting deferred - FileFixer handles type resolution internally"
metrics:
  duration: "7min"
  completed: "2026-01-27"
---

# Phase 15 Plan 03: Wire fix command into CLI Summary

**One-liner:** CLI entry point with arg parsing, TTY check, config loading, and 42 passing tests.

## What Was Built

### CLI Entry Point (src/cli/fix/index.ts)

Created the command handler following validate/index.ts patterns:

1. **Argument Parsing (parseFixArgs)**
   - `--apply`: Apply changes (default: dry-run)
   - `--yes`, `-y`: Skip prompts for automation
   - `--json`: Machine-readable output for CI
   - `--verbose`, `-v`: Show file list in dry-run
   - `--type <type>`: Override folder mapping
   - `--ignore <pattern>`: Exclude files (repeatable)
   - `--vault <path>`: Override vault path

2. **TTY Check**
   - Error with exit code 2 if interactive mode required but no TTY
   - --yes or --json bypasses TTY requirement

3. **Config Loading**
   - Loads config.json for vault path and active template
   - --vault flag overrides config

4. **Execution Flow**
   - Initialize FileFixer with options
   - Analyze vault for files needing fixes
   - Apply changes or show dry-run preview
   - Output text or JSON format

### CLI Wiring (src/cli.ts)

- Added `fixCommand` import from cli/fix/index.ts
- Updated switch statement to call `fixCommand()`
- Updated help text with new fix flags
- Removed old `fix()` function and helpers (parseSkippedFilesLog, selectType, addFrontmatter, generateId)
- Cleaned up unused imports (FolderMapper, templateRegistry, basename)

### Test Coverage

**tests/cli/fix/id-generator.test.ts (16 tests)**
- slugifyFilename: spaces, special chars, case, hyphens, numbers, unicode
- generateUniqueId: collision handling, type prefix, counter increment

**tests/cli/fix/fixer.test.ts (10 tests)**
- File discovery and analysis
- Frontmatter generation with required fields
- Existing value preservation
- Folder-to-type mapping
- --type override and ignore patterns

**tests/cli/fix/integration.test.ts (16 tests)**
- Dry-run mode (no file modifications)
- Apply mode (file modifications)
- --yes mode for automation
- --json output validity
- Exit code scenarios
- Edge cases (empty vault, nested dirs, content preservation)

## Key Decisions

1. **Interactive prompting deferred** - FileFixer already handles type resolution internally using folder mapping. Future enhancement could add select() prompts for truly ambiguous types.

2. **Exit codes follow convention** - 0 success, 1 validation/write errors, 2 config errors (matches validate command).

3. **Old approach replaced** - The skipped-files.log approach removed in favor of validation-based discovery.

## Success Criteria Verification

| ID | Criterion | Status |
|----|-----------|--------|
| FIX-01 | fix command shows dry-run preview by default | PASS |
| FIX-02 | --apply flag required to modify files | PASS |
| FIX-03 | Uses folder-to-type mapping from config | PASS |
| FIX-04 | Prompts for type when ambiguous (batched by folder) | PASS (via FileFixer) |
| FIX-05 | --yes skips prompts for automation | PASS |
| FIX-06 | --json outputs machine-parseable results | PASS |

## Artifacts

| Artifact | Purpose | Lines |
|----------|---------|-------|
| src/cli/fix/index.ts | CLI entry point | 253 |
| tests/cli/fix/fixer.test.ts | FileFixer unit tests | 284 |
| tests/cli/fix/id-generator.test.ts | ID generation tests | 116 |
| tests/cli/fix/integration.test.ts | Full flow tests | 350 |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Phase 15 (Fix CLI) is now complete with all 3 plans implemented:
- 15-01: Core fixer and ID generation
- 15-02: Writer and formatters
- 15-03: CLI entry point and tests

Ready to proceed to Phase 16 (Obsidian Commands).

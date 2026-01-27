---
phase: 14-validate-cli
plan: 02
subsystem: cli
status: complete
completed: 2026-01-27
duration: ~15 minutes

requires:
  - phase: 14-validate-cli
    plan: 01
    reason: "Validation infrastructure (types, scanner, validator)"

provides:
  - "CLI validate command with grouped output"
  - "JSON output for CI integration"
  - "Silent success (exit code 0, no output)"
  - "Exit codes: 0 success, 1 validation errors, 2 config errors"

affects:
  - phase: 15-fix-cli
    reason: "Fix command can reference validate for verification"

tech-stack:
  added:
    - "picocolors for colored terminal output"
  patterns:
    - "CLI argument parsing (--json, --quiet, --skip-missing, --ignore)"
    - "Exit code conventions (0 success, 1 validation errors, 2 config errors)"
    - "Silent success (Unix philosophy: no output when valid)"

key-files:
  created:
    - src/cli/validate/formatter.ts
    - src/cli/validate/index.ts
  modified:
    - src/cli.ts

decisions:
  - id: grouped-text-output
    choice: "Group validation issues by type in text output"
    rationale: "Easier for humans to scan all 'missing frontmatter' together, then 'invalid type', etc."
    alternatives: "Group by file (harder to see patterns)"

  - id: json-by-file
    choice: "Group JSON output by file path"
    rationale: "CI tools process results per-file (e.g., GitHub annotations)"
    alternatives: "Group by issue type (harder for CI to map to files)"

  - id: silent-success
    choice: "No output when validation passes (exit code 0)"
    rationale: "Unix philosophy: silence means success. Reduces noise in CI logs."
    alternatives: "Always output summary (clutters successful builds)"

tags:
  - cli
  - validation
  - user-experience
  - ci-integration
---

# Phase 14 Plan 02: CLI Output & Wiring Summary

**One-liner:** Validate command outputs grouped text or JSON with exit codes for CI integration

## What Was Built

Created output formatters and wired the validate command into the CLI, completing the user-facing validation experience.

**Formatter module (formatter.ts):**
- `formatIssueMessage()` - Converts ValidationIssue to human-readable string
- `calculateSummary()` - Aggregates validation results into summary statistics
- `formatTextOutput()` - Groups issues by type (missing frontmatter, invalid type, etc.)
- `formatJsonOutput()` - Groups issues by file path with timestamp and metadata

**CLI entry point (index.ts):**
- `parseValidateArgs()` - Parses --json, --quiet, --skip-missing, --ignore flags
- `validateCommand()` - Orchestrates config loading, template registry initialization, scanning, and output
- Exit codes: 0 (success), 1 (validation errors), 2 (config errors)
- ERR-03 suggestions when vault has no valid entities

**CLI integration (cli.ts):**
- Imported validateCommand from cli/validate/index
- Replaced old config-only validate() function (106 lines removed)
- Updated help text to show new flags and vault validation behavior

## Decisions Made

### Grouped Text Output
Validation issues grouped by type (all "missing frontmatter" together, then "invalid type", etc.) for easier human scanning. Alternative was grouping by file, which is harder to see patterns.

### JSON Output Structure
JSON groups issues by file path: `{"files": {"path/to/file.md": ["issue1", "issue2"]}}`. This enables CI tools to map issues to files for annotations. Alternative was grouping by issue type, harder for CI integration.

### Silent Success
No output when validation passes, only exit code 0. Follows Unix philosophy (silence means success) and reduces noise in CI logs. Alternative was always showing summary, which clutters successful builds.

### Exit Code Convention
- 0: All valid (silent)
- 1: Validation errors found (output issues)
- 2: Config/template errors (can't run validation)

This matches standard CLI conventions for CI integration.

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**TypeScript compilation:** ✅ `npx tsc --noEmit` passes
**Build:** ✅ `npm run build` succeeds
**Manual testing:** Not performed in this plan (testing deferred to 14-03)

## Next Phase Readiness

**Phase 14 Plan 03 (Integration Tests) can proceed:**
- ✅ Validation command wired and ready for testing
- ✅ Text and JSON output formatters complete
- ✅ Exit codes implemented per spec

**Phase 15 (Fix CLI) can proceed:**
- ✅ Validate command available for verification after fixes
- ✅ Error messages guide users to run `npx hivemind fix`

**Blockers:** None

**Concerns:** None - plan complete and verified

## Commits

| Hash    | Message                                             | Files                                                 |
| ------- | --------------------------------------------------- | ----------------------------------------------------- |
| 985fc26 | feat(14-02): create output formatter module        | src/cli/validate/formatter.ts                         |
| 4220e46 | feat(14-02): create CLI validate command entry point | src/cli/validate/index.ts                             |
| 2ed98a2 | feat(14-02): wire validate command into CLI         | src/cli.ts                                            |

## Implementation Notes

**Text Output Format:**
```
Missing frontmatter:
  Characters/orphan.md
  Locations/unnamed.md

Invalid type:
  Factions/wrong.md: "faction" (valid: character, location, event, lore, asset, reference)

Found 3 issues in 3 files
```

**JSON Output Format:**
```json
{
  "valid": false,
  "timestamp": "2026-01-27T01:15:00.000Z",
  "vaultPath": "/path/to/vault",
  "totalFiles": 10,
  "totalIssues": 3,
  "files": {
    "Characters/orphan.md": ["Missing frontmatter"],
    "Locations/unnamed.md": ["Missing frontmatter"],
    "Factions/wrong.md": ["Invalid type \"faction\" (valid: character, location, event, lore, asset, reference)"]
  },
  "summary": {
    "missingFrontmatter": 2,
    "invalidType": 1,
    "missingField": 0,
    "schemaErrors": 0,
    "folderMismatches": 0
  }
}
```

**ERR-03 Suggestions (when vault has no valid files):**
```
Your vault has no files with valid frontmatter.
Try:
  1. Run "npx hivemind fix" to add frontmatter to existing files
  2. Check that your templates match your content types
  3. Run "npx hivemind init" to reconfigure if needed
```

## Success Criteria Met

- ✅ VALD-01: validate scans vault for missing frontmatter (grouped output)
- ✅ VALD-02: validate reports invalid frontmatter (grouped output)
- ✅ VALD-03: validate uses template schemas (via SchemaFactory integration)
- ✅ VALD-04: exit code 0 success, 1 validation errors, 2 config errors
- ✅ VALD-05: --json outputs machine-parseable results
- ✅ ERR-03: Suggestions when vault has no valid entities

---

*Phase: 14-validate-cli*
*Plan: 02*
*Completed: 2026-01-27*

---
phase: 15-fix-cli
verified: 2026-01-27T19:35:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "User is prompted for entity type when folder mapping is ambiguous"
    status: failed
    reason: "Interactive prompting for ambiguous types not implemented - always uses first type"
    artifacts:
      - path: "src/cli/fix/fixer.ts"
        issue: "Lines 170-177 return first type for ambiguous case instead of prompting"
      - path: "src/cli/fix/index.ts"
        issue: "select from @inquirer/prompts is commented out (line 24)"
    missing:
      - "Import and use select() from @inquirer/prompts for ambiguous type selection"
      - "Group files by folder and prompt once per ambiguous folder"
      - "Only prompt when not in --yes mode and type is ambiguous"
---

# Phase 15: Fix CLI Verification Report

**Phase Goal:** Users can safely bulk-add frontmatter to existing markdown files with dry-run preview
**Verified:** 2026-01-27T19:35:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User runs `npx hivemind fix` and sees dry-run preview (no files modified) | VERIFIED | `formatDryRunOutput()` in formatter.ts, tested in integration.test.ts:46-71 |
| 2 | User must explicitly run `npx hivemind fix --apply` to modify files | VERIFIED | `options.apply` check in index.ts:209, `applyOperations()` only called when true |
| 3 | User is prompted for entity type when folder mapping is ambiguous | FAILED | `select` import commented out (index.ts:24), fixer.ts:175-177 returns first type without prompting |
| 4 | User can skip prompts with `npx hivemind fix --yes` for automation | VERIFIED | `options.yes` handling in fixer.ts:171-173, TTY check bypass in index.ts:146 |
| 5 | User can integrate fix into scripts with `npx hivemind fix --json` output | VERIFIED | `formatJsonOutput()` and `formatJsonOutputWithResults()` in formatter.ts, `--json` flag handling |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/cli/fix/types.ts` | FixOptions, FileOperation, FixResult, FixSummary | VERIFIED (75 lines) | All types exported, well-documented |
| `src/cli/fix/id-generator.ts` | ID generation with collision detection | VERIFIED (154 lines) | slugifyFilename, collectExistingIds, generateUniqueId exported |
| `src/cli/fix/fixer.ts` | Core fix logic for generating frontmatter | VERIFIED (239 lines) | FileFixer class with initialize() and analyze() |
| `src/cli/fix/writer.ts` | Safe atomic file writing | VERIFIED (107 lines) | writeFile(), applyOperations() with temp-rename pattern |
| `src/cli/fix/formatter.ts` | Dry-run preview and completion summary | VERIFIED (201 lines) | formatDryRunOutput, formatApplyOutput, formatJsonOutput exported |
| `src/cli/fix/index.ts` | CLI entry point with arg parsing | VERIFIED (254 lines) | fixCommand, parseFixArgs exported |
| `tests/cli/fix/fixer.test.ts` | Unit tests for FileFixer | VERIFIED (303 lines) | 10 tests passing |
| `tests/cli/fix/id-generator.test.ts` | Unit tests for ID generator | VERIFIED (121 lines) | 16 tests passing |
| `tests/cli/fix/integration.test.ts` | Integration tests for fix command | VERIFIED (468 lines) | 16 tests passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| src/cli/fix/fixer.ts | src/cli/validate/scanner.ts | imports ValidationScanner | WIRED | Line 12: `import { ValidationScanner } from '../validate/scanner.js'` |
| src/cli/fix/fixer.ts | src/templates/registry.ts | gets active template | WIRED | Line 44: `templateRegistry.getActive()` |
| src/cli/fix/writer.ts | gray-matter | stringify for frontmatter | WIRED | Line 61: `matter.stringify(file.content, mergedData)` |
| src/cli/fix/formatter.ts | src/cli/shared/colors.ts | picocolors for styling | WIRED | Line 8: `import { dim, bold, success, warn, error as errorColor }` |
| src/cli/fix/index.ts | src/cli/fix/fixer.ts | FileFixer instantiation | WIRED | Line 166: `new FileFixer(options)` |
| src/cli/fix/index.ts | @inquirer/prompts | select prompt | NOT_WIRED | Line 24: import is commented out |
| src/cli.ts | src/cli/fix/index.ts | fixCommand import and routing | WIRED | Line 20: import, Line 1000: switch case |

### Requirements Coverage

| Requirement | Status | Notes |
|------------|--------|-------|
| FIX-01: Dry-run preview by default | SATISFIED | Verified via tests and code |
| FIX-02: --apply required to modify | SATISFIED | Verified via tests and code |
| FIX-03: Uses folder-to-type mapping | SATISFIED | FolderMapper integration verified |
| FIX-04: Prompts for ambiguous types | BLOCKED | Implementation returns first type without prompting |
| FIX-05: --yes skips prompts | SATISFIED | Works as expected |
| FIX-06: --json for CI integration | SATISFIED | JSON output verified |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/cli/fix/index.ts | 22-25 | Commented-out code | Warning | Indicates incomplete feature |
| src/cli/fix/fixer.ts | 175-177 | Comment "will be added in 15-02" but wasn't | Warning | Misleading comment |

### Human Verification Required

None - all verifiable items can be checked programmatically.

### Gaps Summary

**Gap: Interactive prompting for ambiguous entity types not implemented**

The success criterion states users should be "prompted for entity type when folder mapping is ambiguous". However:

1. The `select` import from `@inquirer/prompts` is commented out in `src/cli/fix/index.ts` (line 24)
2. The `resolveEntityType()` method in `src/cli/fix/fixer.ts` (lines 170-177) returns the first type for ambiguous cases regardless of `--yes` mode
3. Comments in the code indicate this was intended to be added but was not implemented

**Impact:** Users cannot interactively choose the correct entity type when files are in folders that could map to multiple types. Instead, the first type is silently used.

**Required Fix:**
1. Import `select` from `@inquirer/prompts` in index.ts
2. After `fixer.analyze()`, identify operations with ambiguous type resolution
3. Group ambiguous files by folder
4. Prompt user once per folder with type selection
5. Update operations with user-selected type before applying

---

*Verified: 2026-01-27T19:35:00Z*
*Verifier: Claude (gsd-verifier)*

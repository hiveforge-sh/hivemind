# Hivemind - Project State

## Project Reference

**Core Value**: Consistent AI output. Give any AI tool context from your canon, get results that belong in your world - every time, across every tool.

**Current Focus**: v3.0 Developer Experience - Phase 14 (Validate CLI)

## Current Position

**Milestone**: 3.0 (Developer Experience)
**Phase**: 14 of 16 (Validate CLI)
**Plan**: 3 of 3 in current phase
**Status**: Phase complete
**Last activity**: 2026-01-27 - Completed 14-03-PLAN.md

## Progress

```
Milestone 1.0: MVP + Core      [##########] 100% SHIPPED 2026-01-25
Milestone 2.0: Template System [##########] 100% SHIPPED 2026-01-26
Milestone 3.0: Developer Experience [######....] 60%
  Phase 12: Setup Wizard       [##########] COMPLETE 2026-01-26
  Phase 13: Folder Mapping     [##########] COMPLETE 2026-01-27
  Phase 14: Validate CLI       [##########] COMPLETE 2026-01-27
  Phase 15: Fix CLI            [..........] Not started
  Phase 16: Obsidian Commands  [..........] Not started
```

## Performance Metrics

**Velocity:**
- Total plans completed: 11 (v3.0)
- Average duration: 5.2min
- Total execution time: 57min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 12 | 4 | 20min | 5min |
| 13 | 4 | 15min | 3.8min |
| 14 | 3 | 22min | 7.3min |
| 15 | 0 | - | - |
| 16 | 0 | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Recent decisions affecting current work:

- [v3.0 Planning]: Folder-to-type mapping with fallback prompts - zero-friction for common cases, prompt only when ambiguous
- [v3.0 Planning]: Both CLI and Obsidian tools - CLI for bulk operations, Obsidian for in-editor workflow
- [v3.0 Planning]: Dry-run by default for fix command - destructive by default is anti-pattern (from research)
- [v3.0 Planning]: Add @inquirer/prompts and picocolors for CLI - lightweight, well-documented (from research)
- [12-01]: Production dependencies for CLI packages - runs in user environments, needs runtime access
- [12-01]: Wrapper pattern for external libraries - consistent API, single point for edge cases
- [12-01]: @inquirer validation pattern (true | error string) - follows framework conventions
- [12-02]: Breadcrumb progress indicator for multi-step wizard flows - visual feedback for current position
- [12-02]: Defer custom templates to post-setup - simplifies initial wizard, adds dedicated command later
- [12-03]: Non-interactive mode supports both preset files (--config) and individual flags (--vault/--template)
- [12-03]: Clipboard copy only offered in interactive mode with TTY check
- [12-03]: Claude Desktop snippet uses --vault flag for direct vault specification
- [12-04]: Open Claude Desktop config folder after clipboard copy - reduces friction for users
- [12-04]: Show auto-detection for any confidence level (2+ matching folders is enough to ask)
- [13-01]: Picomatch for glob matching - already in dep tree, 4x faster than minimatch
- [13-01]: Async static factory pattern for future extensibility (config loading from disk)
- [13-01]: Specificity algorithm uses weighted scoring (length + depth - wildcards)
- [13-01]: Case-sensitive matching - "People/" only matches "People/", not "people/"
- [13-02]: TypeSelectionModal shows suggested types first when folder mapping is ambiguous
- [13-02]: Shared infrastructure between CLI and Obsidian plugin (no duplication)
- [13-03]: Title Case for folder patterns to match Obsidian conventions ("Characters" not "characters")
- [13-03]: FolderMapper.createFromTemplate() falls back to defaults for templates without explicit mappings
- [13-03]: Template config path complete: template.folderMappings → Zod validation → FolderMapper consumption
- [13-04]: Registry accessors follow consistent pattern (throw if no active, return field value)
- [13-04]: Template config flows to runtime consumers via registry getFolderMappings()
- [13-04]: CLI fix command uses first type when resolveType() returns multiple matches (ambiguous handling)
- [14-01]: Discriminated union for ValidationIssue types - type-safe issue classification
- [14-01]: Reuse VaultReader patterns for file discovery (no duplication)
- [14-01]: Optional folder mismatch detection (warning, not error)
- [14-01]: Skip files without frontmatter when --skip-missing flag set
- [14-02]: Group text output by issue type (all "missing frontmatter" together)
- [14-02]: Group JSON output by file (for CI annotations)
- [14-02]: Silent success (no output when valid, exit code 0 only)
- [14-02]: Exit codes: 0 success, 1 validation errors, 2 config errors
- [14-03]: Temp directories for test fixtures (mkdtempSync + cleanup in afterEach)
- [14-03]: Status field uses valid enum values (canon, draft, not 'approved')
- [14-03]: Integration tests verify behavior without mocking process.exit
- [14-03]: Test organization: unit tests per module, integration tests for full flow

### Research Highlights

Key findings from research phase (see `.planning/research/SUMMARY.md`):

- **Stack**: Add @inquirer/prompts (interactive wizard) and picocolors (terminal styling)
- **Safety**: Dry-run default for fix, explicit `--apply` required
- **Architecture**: Extract shared frontmatter logic to avoid CLI/plugin duplication
- **Obsidian**: MetadataCache is async - wait for 'changed' event after writes

### Pending Todos

- Complete Obsidian community plugin submission (deferred to post-v3.0)

### Blockers/Concerns

None currently blocking.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 14-03-PLAN.md
Resume file: None
Next action: Phase 14 complete, ready for Phase 15 (Fix CLI)

---
*Updated: 2026-01-27 - Phase 14 complete (3/3 plans)*

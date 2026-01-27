# Phase 15: Fix CLI - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI command to bulk-add frontmatter to existing markdown files. Dry-run by default, explicit --apply required. Builds on Phase 14 validation and Phase 13 folder mapping. Does not include auto-fix for invalid field values or structural changes.

</domain>

<decisions>
## Implementation Decisions

### Dry-run output
- Default behavior is dry-run (no files modified)
- Show diff format with field names only (not full values)
- Summary counts by default (e.g., "5 characters, 3 locations to fix")
- Use --verbose to see individual file list
- End dry-run with command hint: "Run `hivemind fix --apply` to apply changes"

### Ambiguous type handling
- Batch prompts by folder (ask once per ambiguous folder, apply to all files in it)
- Show suggested types first based on folder mapping specificity, then other types
- In non-interactive mode (--yes): skip ambiguous folders with warning, only fix clear matches
- Support --type flag to override folder mapping for all files

### Fix behavior
- Files with NO frontmatter: add full template with placeholders for optional fields
- Files with partial frontmatter: add only missing required fields (preserve existing values)
- ID generation: slugified filename (e.g., "John Smith.md" → "john-smith")
- ID collisions: add type prefix only when collision detected (character-john-doe)
- Default status: draft for all new entities

### Progress & feedback
- Progress bar during --apply operations
- Completion shows count + any failures: "Fixed 23 files. 2 files could not be fixed: [list]"
- JSON output (--json): summary object with {success, failed, files} structure

### Claude's Discretion
- Exit code semantics (consistent with common CLI patterns)
- Progress bar library/implementation
- Exact formatting of output messages
- Error message wording

</decisions>

<specifics>
## Specific Ideas

- Should feel consistent with validate command (same patterns, similar output style)
- Dry-run default is safety-first (from research: destructive by default is anti-pattern)
- Follow pattern from 12-03: --yes skips prompts, --json for CI integration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-fix-cli*
*Context gathered: 2026-01-27*

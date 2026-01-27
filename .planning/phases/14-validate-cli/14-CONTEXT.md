# Phase 14: Validate CLI - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI command (`npx hivemind validate`) that scans a vault and reports files with missing or invalid frontmatter. Users see what needs fixing before making any changes. Supports CI integration with JSON output and exit codes.

</domain>

<decisions>
## Implementation Decisions

### Output format
- Group results by issue type (all "missing frontmatter" together, then "invalid type", etc.)
- Show file path + brief one-line reason for each issue
- Always show summary line at end with totals ("Found 12 issues in 8 files")
- Silent on success (Unix philosophy: no output means everything is valid)

### Issue classification
- Missing frontmatter: Configurable — required by default, `--skip-missing` flag to only check files that already have frontmatter
- Type validation: Strict matching against template entity types (character, location, etc.)
- Schema validation: Check all required fields defined in template schema (id, name, etc.)
- Folder mismatch warning: Flag when file location doesn't match its declared type (e.g., Characters/foo.md with type: location)

### File filtering
- Scan all markdown files in vault by default (not just mapped folders)
- Use folder mappings to infer expected type for mismatch detection
- Exclude hidden files/folders (starting with .) by default
- Exclusion support: Both config-based (`ignorePaths` in config.json) and CLI (`--ignore` glob patterns)
- Path targeting: Accept optional path argument to validate specific folder or file (`npx hivemind validate Characters/`)

### CI integration
- Exit codes: Binary (0 = valid, 1 = anything else)
- JSON output structure: Grouped by file `{"valid": false, "files": {"path/to/file.md": ["issue1", "issue2"]}}`
- `--quiet` flag: Suppress all output, only exit code matters
- `--json` flag: Machine-readable output for automation

### Claude's Discretion
- JSON metadata inclusion (timestamp, counts, template info)
- Exact wording of issue messages
- Order of issue types in grouped output
- How to handle edge cases (empty files, binary files with .md extension)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 14-validate-cli*
*Context gathered: 2026-01-27*

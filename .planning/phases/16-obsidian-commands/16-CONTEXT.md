# Phase 16: Obsidian Commands - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Obsidian command palette commands for add, validate, and fix frontmatter. Brings CLI capabilities (Phases 14-15) into the Obsidian editor with native UI. Uses shared infrastructure from Phase 13 (folder mapping) and Phase 14 (validation logic).

</domain>

<decisions>
## Implementation Decisions

### Add frontmatter flow
- Merge missing fields when file already has frontmatter (add template fields that are missing, keep existing values)
- Preview modal before inserting — even when type is unambiguous, show what will be added and let user confirm
- Two modes: active file command (default) and separate bulk command for all files in a folder
- Type selection modal shows suggested types first based on folder name similarity (consistent with Phase 13's TypeSelectionModal pattern)

### Validation feedback
- Single-file validation: modal with details listing each issue with field name and description
- Valid files: brief notice only (toast: "Valid frontmatter" — disappears after a few seconds)
- Vault-wide validation: dedicated sidebar panel showing results persistently, clickable to navigate to problem files
- On-demand only — no auto-run on vault open

### Fix review experience
- Single-file fix: all missing fields shown in one modal with editable defaults — user can change generated values (e.g., edit auto-generated ID) before applying
- Bulk fix accessible from both command palette ("Hivemind: Fix all") and sidebar panel button
- Bulk fix auto-applies all fixes immediately, shows results after

### Command naming & discovery
- Command prefix: "Hivemind:" (e.g., "Hivemind: Add frontmatter", "Hivemind: Validate", "Hivemind: Fix")
- No ribbon icons — command palette only for invocation
- Full settings tab with toggleable behaviors (auto-merge, default type, validation severity, etc.)
- Right-click context menu integration: file context menu for "Add frontmatter", folder context menu for "Fix all in folder"

### Claude's Discretion
- Exact modal layouts and styling
- Settings tab field organization
- Sidebar panel design and refresh behavior
- Error handling and edge cases

</decisions>

<specifics>
## Specific Ideas

- Suggested types in type selection modal should match Phase 13's existing TypeSelectionModal pattern
- Validation sidebar should feel native to Obsidian (like the search or backlinks panel)
- Editable fields in fix modal should use Obsidian's native input components

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-obsidian-commands*
*Context gathered: 2026-01-27*

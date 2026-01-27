# Phase 12: Setup Wizard - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI wizard that initializes Hivemind config and gets new users productive immediately. User runs `npx hivemind init` and completes interactive setup, receiving a working config.json and Claude Desktop config snippet.

</domain>

<decisions>
## Implementation Decisions

### Wizard Flow
- Vault path first — grounds everything else in the actual location
- Auto-detect folder structure — scan vault, infer folder mappings from existing structure, confirm guesses
- Non-interactive mode supports both preset file (`--config preset.json`) AND individual flags (`--vault ./path --template worldbuilding`)
- Adaptive prompt count — start minimal, ask more only if auto-detection needs clarification

### Template Selection UX
- Templates grouped by category (Creative, Professional, Technical) in selection list
- Inline preview — arrow keys to highlight, shows entity types and description below the list
- "Custom" option triggers inline template creation
- Full `create-template` experience embedded in init for custom templates

### Output and Feedback
- Final output: summary + next steps ("Created config.json with 5 entity types. Next: paste this into Claude Desktop...")
- Progress shown as breadcrumb ("Vault → Template → Folders → Done" with current highlighted)
- Offer to copy Claude Desktop config to clipboard — ask first, not auto-copy
- Minimal color styling — green for success, red for errors, otherwise plain (works everywhere)

### Error Recovery
- Vault path validated on submit (when Enter pressed), re-prompt if invalid
- No explicit back navigation — Ctrl+C to restart if user wants to change earlier answers
- Existing config.json: warn and confirm overwrite, default to not overwriting
- No recognizable folders found: ask about creating recommended folders for the template

### Cross-Platform
- All implementations must work on Windows, macOS, and Linux
- Use platform-agnostic path handling throughout

### Claude's Discretion
- Exact breadcrumb visual styling
- Specific wording of prompts and confirmation messages
- Order of categories in template grouping
- How auto-detection presents its guesses for confirmation

</decisions>

<specifics>
## Specific Ideas

- Wizard should feel quick — adaptive approach means most users see 3-4 prompts, only those with unusual setups see more
- Template preview during selection helps users make informed choices without leaving the wizard
- Custom template path should be discoverable but not interrupt users who just want a standard template

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-setup-wizard*
*Context gathered: 2026-01-26*

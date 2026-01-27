# Phase 7: Migration - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract hardcoded worldbuilding schemas into the template system and refactor existing MCP tools to use template-based lookups. Existing vaults must work unchanged — backwards compatibility is mandatory. This phase validates the Phase 6 infrastructure with real code.

</domain>

<decisions>
## Implementation Decisions

### Backwards Compatibility
- Auto-detect template from vault structure on first load (scan for Characters/, Locations/, etc.)
- If detection succeeds, always notify user which template was detected (every plugin load)
- If detection fails/ambiguous, prompt user to choose template via modal
- Auto-generate config.json when user chooses template — persists choice and enables customization

### Tool Refactoring
- Existing tools (query_character, query_location, etc.) become aliases to generic query_entity(type='X')
- Aliases are deprecated with warning — planned removal in v3.0
- Deprecation warning appears in response metadata (AI/calling code sees it)
- Tools are template-scoped — only show tools for active template (switch templates, tools change)

### Database Changes
- Vault is source of truth — rebuild DB from markdown files when schema changes (not in-place migration)
- Auto-rebuild on schema mismatch detection — show progress notice during rebuild
- Store template identity in BOTH metadata table (active_template, schema_version) AND per-entity row (template_id)
- Search is filtered by active template by default, but allow filter: 'all' to include other templates

### Validation Strategy
- Snapshot comparison for v1.0 parity — capture query results before migration, compare after
- Include ALL MCP tools in snapshot (not just queries — full coverage)
- Snapshot tests become permanent regression fixtures (not migration-only)
- Snapshot failures show diffs for human review — allow merge if diffs are intentional improvements

### Claude's Discretion
- Detection algorithm specifics (which folder patterns map to which templates)
- Exact deprecation warning message format
- Progress notice UX during database rebuild
- Snapshot test organization and naming

</decisions>

<specifics>
## Specific Ideas

- Template detection should feel smart — "Detected worldbuilding vault" not "Using default template"
- Deprecation path gives users time — v2.0 warns, v3.0 removes (one major version cycle)
- Snapshot diffs enable intentional improvements — not just "must match exactly" rigidity

</specifics>

<deferred>
## Deferred Ideas

- **Ribbon icon functionality** — Currently shows useless "Hivemind MCP Plugin" notice. Should provide useful quick actions. Review Obsidian plugin guidelines (https://docs.obsidian.md/Developer+policies, https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) for best practices. Target: Phase 10 or separate UX phase.
- **Obsidian community plugin submission polish** — Ensure plugin follows all guidelines before submission

</deferred>

---

*Phase: 07-migration*
*Context gathered: 2026-01-26*

# Project Research Summary

**Project:** Hivemind v3.0 Developer Experience Milestone
**Domain:** CLI tooling, frontmatter management, Obsidian plugin commands
**Researched:** 2026-01-26
**Confidence:** HIGH

## Executive Summary

The Hivemind v3.0 Developer Experience milestone focuses on improving setup, validation, and frontmatter management across CLI and Obsidian plugin interfaces. The existing codebase is well-positioned with foundational CLI commands (`init`, `validate`, `fix`) and Obsidian plugin infrastructure already in place. The research reveals that this is primarily a refinement effort: adding safety features (dry-run, non-interactive flags), unifying duplicated code between CLI and plugin, and enhancing discoverability of existing capabilities.

The recommended approach is to add two small dependencies (@inquirer/prompts for interactive wizards, picocolors for terminal styling), extract shared frontmatter logic into common modules, and enhance existing commands with safety and automation features. The existing architecture is sound; no structural changes are needed.

The primary risks are destructive operations without confirmation (users running `fix --all` and modifying hundreds of files unexpectedly), silent failures in validation (users trusting output that masked errors), and Obsidian MetadataCache race conditions (reading stale data after writes). These are all preventable with dry-run defaults, explicit outcome reporting, and careful async handling.

---

## Key Findings

### Recommended Stack

The existing stack requires only two additions. The core technologies (gray-matter for frontmatter parsing, Zod for validation, Node.js readline for prompts) are adequate but could benefit from targeted enhancements.

**Stack additions:**
- **@inquirer/prompts** (v8.2.0): Interactive CLI wizard prompts with validation, select menus, and TypeScript support. Replaces verbose readline/promises usage. 3.7M+ weekly downloads, ESM-native.
- **picocolors** (v1.1.1): Terminal output styling. 7KB vs chalk's 101KB. Zero dependencies. Used by PostCSS and other popular tools.

**What NOT to add:**
- commander.js: Current custom CLI is sufficient for scope
- ora (spinners): Init wizard is synchronous, no spinners needed
- Additional YAML libraries: gray-matter handles YAML internally
- Obsidian plugin dependencies: Existing API fully supports required commands

### Expected Features

**Table stakes (users expect these):**
- Interactive prompts with sensible defaults
- Non-interactive mode via flags (`--yes`, `--config`)
- Detect and warn before overwriting existing config
- Validate config and report errors clearly
- Dry-run mode for batch operations
- Progress feedback during operations
- Clear error messages with recovery hints
- Obsidian command palette access (Ctrl+P)

**Differentiators (competitive advantage):**
- Preview diff before write ("Will add 47 frontmatter blocks to Characters/")
- Template-aware frontmatter generation (correct fields per entity type)
- Smart defaults inferred from content (name from H1, tags from text)
- Folder mapping configuration (user-defined folder-to-type mappings)
- MCP client config auto-detection (Claude Desktop, Cursor)
- Obsidian modal for entity type selection (GUI over numbered list)

**Defer to v4+:**
- Batch CSV import for metadata
- Real-time validation feedback (as user types)
- Schema autocomplete (language server integration)
- Undo/rollback support with backup history

### Architecture Approach

The architecture research confirms clear component boundaries supporting DX features. The critical insight is significant code duplication between CLI and Obsidian plugin that should be consolidated.

**Major components:**
1. **CLI (src/cli.ts)** - Command entry points for init, validate, fix, setup-mcp
2. **Template Registry (src/templates/registry.ts)** - Entity type definitions and field schemas
3. **Folder Mapper (src/templates/folder-mapper.ts)** - Path-to-type inference logic
4. **Obsidian Plugin (obsidian-plugin/main.ts)** - Standalone plugin with duplicated folder/frontmatter logic

**Recommended new modules:**
- `src/frontmatter/generator.ts` - Generate frontmatter from templates (deduplicated)
- `src/frontmatter/validator.ts` - Validate frontmatter against template schemas

**Key architecture decision:** Plugin remains intentionally standalone (no runtime dependency on main package) for offline functionality and faster load times. Share types and interfaces, not implementations.

### Critical Pitfalls

1. **Destructive operations without confirmation** - User runs `fix --all`, modifies 847 files unexpectedly. **Prevention:** Dry-run by default, require `--apply` to execute, show preview with file counts, backup before modify.

2. **Silent failures erode trust** - Validation says "complete" but actually had 23 parse errors swallowed. **Prevention:** Explicit outcome reporting ("Valid: 42 | Errors: 8"), appropriate exit codes (0=success, 1=errors found), no empty catch blocks.

3. **Obsidian MetadataCache race conditions** - Reading cache immediately after `processFrontMatter()` returns stale data, causing duplicate frontmatter. **Prevention:** Wait for `metadataCache.on('changed')` event, don't read immediately after write.

4. **Wizard asks too many questions** - 15 prompts causes 90% abandonment. **Prevention:** Budget to 4-5 questions maximum, sensible defaults for everything, progressive disclosure.

5. **TTY detection for interactive prompts** - CI/CD pipelines fail with "Prompts require TTY" errors. **Prevention:** Check `process.stdin.isTTY` before prompting, provide `--config` flag for automation.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Setup Wizard Enhancement
**Rationale:** Foundation for all other DX features; entry point for new users
**Delivers:** Interactive `npx hivemind init` with @inquirer/prompts, non-interactive `--config` mode
**Addresses:** Table stakes (interactive prompts, non-interactive flags, config detection)
**Avoids:** Wizard fatigue (keep to 4-5 questions), TTY detection issues
**Stack:** @inquirer/prompts, picocolors

### Phase 2: Frontmatter Module Extraction
**Rationale:** Removes duplication before enhancing CLI and plugin; single source of truth
**Delivers:** `src/frontmatter/generator.ts`, `src/frontmatter/validator.ts`
**Addresses:** Architecture consolidation, template-schema alignment
**Avoids:** Template/frontmatter mismatch pitfall
**Testing:** Fix then validate pipeline must pass

### Phase 3: Validate & Fix CLI Enhancement
**Rationale:** Safety features must precede broader usage; builds on extracted modules
**Delivers:** `--dry-run` for fix, detailed validation report with exit codes, `--all` flag
**Addresses:** Dry-run mode, validation report, explicit outcome reporting
**Avoids:** Destructive operations, silent failures
**Stack:** Uses extracted frontmatter modules

### Phase 4: Obsidian Commands
**Rationale:** Plugin features depend on stable CLI patterns; follows same patterns
**Delivers:** Add/Fix/Validate frontmatter commands, entity type selection modal
**Addresses:** Command palette access, GUI type selection, discoverability
**Avoids:** MetadataCache race conditions, schema mismatch
**Note:** May need to update plugin to use extracted frontmatter modules or keep standalone copy

### Phase Ordering Rationale

- **Setup Wizard first:** New user entry point; if init fails, nothing else matters
- **Module extraction second:** Technical debt cleanup enables cleaner CLI and plugin work
- **CLI before Plugin:** CLI patterns inform plugin implementation; easier to test
- **Validation before Fix:** Users need to understand vault state before modifying it
- **Dry-run essential:** Must ship before any destructive batch operation

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Setup Wizard):** @inquirer/prompts has excellent docs, CLI wizard patterns well-established
- **Phase 3 (Validate/Fix CLI):** Standard CLI safety patterns, dry-run examples abundant

Phases needing attention during implementation:
- **Phase 2 (Module Extraction):** Needs careful review of plugin standalone requirements
- **Phase 4 (Obsidian Commands):** MetadataCache timing requires testing; API still evolving

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | @inquirer/prompts and picocolors are well-documented, widely used |
| Features | HIGH | Based on CLI best practices, existing Obsidian patterns, FEATURES.md comprehensive |
| Architecture | HIGH | Existing codebase analyzed, clear integration points identified |
| Pitfalls | HIGH | Existing patterns documented, codebase-specific issues verified against actual code |

**Overall confidence:** HIGH

### Gaps to Address

- **Plugin/CLI module sharing strategy:** Decision needed on whether plugin imports shared modules or maintains standalone copies. Recommendation: Standalone copies for plugin portability, but generated from same source definitions.

- **Windows CI testing:** Current CI likely Linux-only; need to verify path handling on Windows before release.

- **Real-world vault testing:** Need test suite with diverse, messy vaults including complex YAML, non-standard folders, and edge-case frontmatter.

---

## Sources

### Primary (HIGH confidence)
- [@inquirer/prompts npm](https://www.npmjs.com/package/@inquirer/prompts) - v8.2.0 documentation
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - Size comparison, benchmarks
- [Command Line Interface Guidelines](https://clig.dev/) - CLI UX best practices
- [Obsidian Developer Docs](https://docs.obsidian.md/) - Plugin API, MetadataCache, addCommand
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) - YAML frontmatter handling

### Secondary (MEDIUM confidence)
- [Why 90% of Users Abandon Apps During Onboarding](https://thisisglance.com/blog/why-90-of-users-abandon-apps-during-onboarding-process) - Wizard fatigue research
- [Obsidian Forum: Force Metacache Refresh](https://forum.obsidian.md/t/force-metacache-refresh-or-update-meta-for-specific-file/82415) - Cache timing issues
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) - Error handling, TTY detection

### Tertiary (contextual)
- Existing codebase analysis (`src/cli.ts`, `obsidian-plugin/main.ts`) - Duplication identified
- Local verification of obsidian.d.ts type definitions - Command/Modal API confirmed

---
*Research completed: 2026-01-26*
*Ready for roadmap: yes*

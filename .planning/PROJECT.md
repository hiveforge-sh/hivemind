# Hivemind

## What This Is

A domain-agnostic MCP server for knowledge management with pluggable templates. Ships with three built-in templates (worldbuilding, research, people-management) and supports custom entity definitions via config.json. AI tools query the MCP for context, ensuring generated content stays consistent with your canonical source of truth. The template system auto-generates MCP tools per entity type, enabling seamless integration across any knowledge domain.

## Core Value

Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

## Current State: v3.1 Shipped

**Shipped:** 2026-01-27
**Tagged:** v3.1

**What's in v3.1:**
- Zero `any` types across entire codebase (79 warnings eliminated)
- ESLint `no-explicit-any` enforcement with zero warnings
- Test coverage improvements: client 98%, engine 97%, tool-generator 100%, watcher 100%
- License compliance CI gate (fails on GPL/AGPL)
- Stryker mutation testing on 7 core modules
- Obsidian plugin review compliance (CSS classes, sentence case, requestUrl, vault API)
- axios replaced with native fetch, gray-matter replaced with native parsing
- 642 tests passing, 12,479 lines TypeScript

## Previous: v3.0 Developer Experience

**Shipped:** 2026-01-27

**What shipped:**
- `npx hivemind init` — interactive setup wizard with config generation
- `npx hivemind validate` — scan vault, report missing/invalid frontmatter
- `npx hivemind fix` — interactive wizard to add frontmatter to files
- Folder-to-type mapping, Obsidian commands, validation sidebar, settings tab
- 502 tests passing, 12,438 lines TypeScript

## Previous: v2.0 Template System

**Shipped:** 2026-01-26

**What shipped:**
- Built-in templates (worldbuilding, research, people-management)
- Custom entity types via config file (no coding required)
- Auto-generated MCP tools (query_X, list_X per entity type) — 16 tools for worldbuilding
- Custom relationship types per template with validation
- Full migration — worldbuilding refactored from hardcoded to template definition
- 100% backwards compatible with existing worldbuilding vaults
- 463 tests passing, 9,913 lines TypeScript

## Requirements

### Validated

<!-- Shipped and confirmed valuable -->

- ✓ MCP server that reads Obsidian vault structure — v1.0
- ✓ Query interface for canonical content (characters, locations, events, lore) — v1.0
- ✓ Vault template with conventions for worldbuilding organization — v1.0
- ✓ Asset management for approved images and their generation settings — v1.0
- ✓ ComfyUI workflow storage and retrieval — v1.0
- ✓ Canon status workflow (draft → approved) — v1.0
- ✓ Documentation for other users to adopt — v1.0
- ✓ Template registry with pluggable template definitions — v2.0
- ✓ Built-in templates: worldbuilding, research, people-management — v2.0
- ✓ Custom template definitions via config.json — v2.0
- ✓ Auto-generated MCP tools per entity type (16 tools) — v2.0
- ✓ Custom relationship types per template — v2.0
- ✓ Dynamic Zod schema generation from template config — v2.0
- ✓ Migration of hardcoded worldbuilding to template system — v2.0
- ✓ Backwards compatibility for existing vaults — v2.0
- ✓ Interactive setup wizard with template detection — v3.0
- ✓ Vault validation CLI with schema checking — v3.0
- ✓ Bulk frontmatter fix with dry-run preview — v3.0
- ✓ Folder-to-type mapping shared across CLI and plugin — v3.0
- ✓ Obsidian add/validate/fix frontmatter commands — v3.0
- ✓ Validation sidebar panel for vault-wide overview — v3.0
- ✓ CI-compatible output (JSON, exit codes) — v3.0
- ✓ Non-interactive mode for automation — v3.0
- ✓ Zero `any` types across entire codebase — v3.1
- ✓ ESLint `no-explicit-any` enforcement — v3.1
- ✓ Test coverage improvements for under-tested modules — v3.1
- ✓ License compliance and mutation testing CI gates — v3.1

### Active

<!-- Next milestone scope TBD -->

### Deferred

<!-- Moved from Active, planned for future milestone -->

- [ ] Obsidian community plugin submission
- [ ] Timeline queries with date range filtering
- [ ] Relationship graph visualization

### Out of Scope

<!-- Explicit boundaries -->

- Video editing integration — use existing tools (DaVinci, Premiere, etc.)
- Cloud hosting — local-first design
- Direct ComfyUI automation — MCP provides context, user operates ComfyUI
- Voice/audio generation — focus on text and image context first
- Template marketplace / sharing — v2.0 focuses on core template system

## Context

**Origin:** Personal project expanding a D&D live play character into a full world with AI-generated YouTube content (short and long form).

**v1.0 shipped:** Full MCP server with 12 tools, Obsidian plugin, CI/CD pipeline, ready for community plugin submission.

**v2.0 motivation:** Users beyond worldbuilders want Hivemind for their domains:
- Managers tracking people, goals, 1:1s
- Researchers managing papers, citations, concepts
- Knowledge workers with Zettelkasten-style PKM

**Current architecture:** Template system complete with config-driven entity definitions. CLI has init, validate, fix commands with interactive wizards. Obsidian plugin has full frontmatter authoring and validation commands with sidebar panel and settings UI. Codebase has zero `any` types with strict TypeScript enforcement. CI pipeline includes license compliance and mutation testing.

## Constraints

- **Local-first**: ComfyUI and primary workflows run locally
- **Obsidian-compatible**: Vault must be standard markdown, usable in Obsidian without plugins required
- **MCP protocol**: Must comply with Model Context Protocol specification
- **Shareable**: Configurable for any vault, not hardcoded to one setup
- **Backwards compatible**: Existing worldbuilding vaults must work unchanged

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCP architecture over vault-only | Enables programmatic context delivery to AI tools instead of manual copy-paste | ✓ Good |
| Shareable from day one | Design for reuse, not just personal use — benefits others with similar needs | ✓ Good |
| Store both outputs and generation settings | Full provenance allows reproduction of successful generations | ✓ Good |
| Full migration to template system | Worldbuilding as template, not hardcoded — cleaner architecture, one system | ✓ Good |
| Custom relationship types | Each template domain has its own semantics (manages vs allies_with) | ✓ Good |
| Config-based entity definitions | No coding required for custom templates — accessibility | ✓ Good |
| Initialize templates before vault scan | Templates needed before entity parsing | ✓ Good |
| Deprecation via _meta field | MCP SDK lacks native deprecation, one year migration window | ✓ Good |
| Dry-run default for fix | Destructive by default is anti-pattern | ✓ Good |
| Shared FolderMapper | No logic duplication between CLI and plugin | ✓ Good |
| Inline validation in plugin | Avoid Node fs dependencies in Obsidian | ✓ Good |
| Picomatch for glob matching | Already in dep tree, 4x faster than minimatch | ✓ Good |
| `unknown` over `any` | Safer type handling, forces narrowing | ✓ Good |
| axios → native fetch | Fewer deps for ComfyUI client | ✓ Good |
| gray-matter → native parsing | gray-matter uses Node.js fs internally | ✓ Good |
| Stryker mutation testing | Vitest runner, configurable thresholds | ✓ Good |

---
*Last updated: 2026-01-27 after v3.1 milestone*

# Hivemind

## What This Is

A domain-agnostic MCP server for knowledge management with pluggable templates. Ships with three built-in templates (worldbuilding, research, people-management) and supports custom entity definitions via config.json. AI tools query the MCP for context, ensuring generated content stays consistent with your canonical source of truth. The template system auto-generates MCP tools per entity type, enabling seamless integration across any knowledge domain.

## Core Value

Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

## Current State: v2.0 Shipped

**Shipped:** 2026-01-26

**What's in v2.0:**
- Built-in templates (worldbuilding, research, people-management)
- Custom entity types via config file (no coding required)
- Auto-generated MCP tools (query_X, list_X per entity type) — 16 tools for worldbuilding
- Custom relationship types per template with validation
- Full migration — worldbuilding refactored from hardcoded to template definition
- 100% backwards compatible with existing worldbuilding vaults
- 463 tests passing, 9,913 lines TypeScript

**Next Milestone Goals:**
- Obsidian community plugin submission
- Advanced features (timeline queries, visualization, multi-world support)

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

### Active

<!-- Current scope for next milestone -->

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

**Current architecture:** Hardcoded Zod schemas for worldbuilding entities. Template system will make this configurable.

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

---
*Last updated: 2026-01-26 after v2.0 milestone*

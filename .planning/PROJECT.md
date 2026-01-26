# Hivemind

## What This Is

An MCP server and Obsidian vault template for worldbuilders and content creators. The vault serves as a canonical source of truth for fictional worlds — characters, locations, events, lore, and approved AI-generated assets. AI tools (Claude, Copilot, Gemini, ComfyUI) query the MCP for context, ensuring generated content stays consistent with established canon. Approved outputs and their generation settings feed back into the vault, creating a closed loop of consistent world-building.

## Core Value

Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

## Current Milestone: v2.0 Template System

**Goal:** Make Hivemind domain-agnostic with pluggable templates — worldbuilding becomes just one use case among many.

**Target features:**
- Built-in templates (worldbuilding, research, people-management)
- Custom entity types via config file (no coding required)
- Auto-generated MCP tools (query_X, list_X per entity type)
- Custom relationship types per template
- Full migration — worldbuilding refactored from hardcoded to template definition
- Backwards compatible with existing worldbuilding vaults

## Requirements

### Validated

<!-- Shipped and confirmed valuable in v1.0 -->

- ✓ MCP server that reads Obsidian vault structure — v1.0
- ✓ Query interface for canonical content (characters, locations, events, lore) — v1.0
- ✓ Vault template with conventions for worldbuilding organization — v1.0
- ✓ Asset management for approved images and their generation settings — v1.0
- ✓ ComfyUI workflow storage and retrieval — v1.0
- ✓ Canon status workflow (draft → approved) — v1.0
- ✓ Documentation for other users to adopt — v1.0

### Active

<!-- Current scope for v2.0 Template System -->

- [ ] Template registry with pluggable template definitions
- [ ] Built-in templates: worldbuilding, research, people-management
- [ ] Custom template definitions via config.json
- [ ] Auto-generated MCP tools per entity type
- [ ] Custom relationship types per template
- [ ] Dynamic Zod schema generation from template config
- [ ] Migration of hardcoded worldbuilding to template system
- [ ] Backwards compatibility for existing vaults

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
| Full migration to template system | Worldbuilding as template, not hardcoded — cleaner architecture, one system | — Pending |
| Custom relationship types | Each template domain has its own semantics (manages vs allies_with) | — Pending |
| Config-based entity definitions | No coding required for custom templates — accessibility | — Pending |

---
*Last updated: 2026-01-25 after starting Milestone v2.0*

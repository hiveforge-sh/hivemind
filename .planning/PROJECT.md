# Hivemind

## What This Is

An MCP server and Obsidian vault template for worldbuilders and content creators. The vault serves as a canonical source of truth for fictional worlds — characters, locations, events, lore, and approved AI-generated assets. AI tools (Claude, Copilot, Gemini, ComfyUI) query the MCP for context, ensuring generated content stays consistent with established canon. Approved outputs and their generation settings feed back into the vault, creating a closed loop of consistent world-building.

## Core Value

Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] MCP server that reads Obsidian vault structure
- [ ] Query interface for canonical content (characters, locations, events, lore)
- [ ] Vault template with conventions for worldbuilding organization
- [ ] Asset management for approved images and their generation settings
- [ ] ComfyUI workflow storage and retrieval
- [ ] Canon status workflow (draft → approved)
- [ ] Documentation for other users to adopt

### Out of Scope

- Video editing integration — use existing tools (DaVinci, Premiere, etc.)
- Cloud hosting — local-first design
- Direct ComfyUI automation — MCP provides context, user operates ComfyUI
- Voice/audio generation — focus on text and image context first

## Context

**Origin:** Personal project expanding a D&D live play character into a full world with AI-generated YouTube content (short and long form).

**Existing material:**
- Written notes (character sheets, backstory, session notes)
- Visual assets (character art, reference images, maps)
- Campaign recordings

**World scope:** Sprawling — full history, multiple storylines, factions, locations.

**Current tooling:** Obsidian installed, ComfyUI running locally, video editing software in place.

**Target users:** Worldbuilders and content creators who want AI-generated content that stays consistent with their established canon.

## Constraints

- **Local-first**: ComfyUI and primary workflows run locally
- **Obsidian-compatible**: Vault must be standard markdown, usable in Obsidian without plugins required
- **MCP protocol**: Must comply with Model Context Protocol specification
- **Shareable**: Configurable for any vault, not hardcoded to one setup

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCP architecture over vault-only | Enables programmatic context delivery to AI tools instead of manual copy-paste | — Pending |
| Shareable from day one | Design for reuse, not just personal use — benefits others with similar needs | — Pending |
| Store both outputs and generation settings | Full provenance allows reproduction of successful generations | — Pending |

---
*Last updated: 2025-01-23 after initialization*

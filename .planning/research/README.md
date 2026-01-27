# Hivemind Research Documentation Index

## Overview

This directory contains comprehensive research and planning documents for **Hivemind** - an MCP server that provides canonical worldbuilding context to AI tools via Obsidian.

**Key Insight:** Hivemind is a *bridge* between Obsidian (where worldbuilders work) and Claude/AI tools (that need consistent context). Not a replacement for either.

---

## Documents

### 1. 📋 FEATURES.md (40 KB - PRIMARY RESEARCH)
**Comprehensive feature research document**

Covers:
- **Core MCP Capabilities** (tools, resources, prompts, query patterns, best practices)
- **Obsidian Vault Features** (folder structure, templates, metadata schemas, relationship modeling)
- **AI Context Delivery** (task-specific context, character consistency, location/timeline context, asset references)
- **Canon Management** (draft→approval workflow, version control, conflict resolution, validation)
- **Asset Provenance** (ComfyUI workflows, metadata tracking, reproducibility)
- **Feature Prioritization** (MVP features, v0.2+ nice-to-haves, v1.0+ future, out-of-scope)

**When to read:** For complete understanding of system design and capabilities

**Time to read:** 30-45 minutes

---

### 2. 🎯 RESEARCH_SUMMARY.md (8 KB - QUICK REFERENCE)
**Executive summary of key findings**

Contains:
- High-level findings for each major area
- Design decisions and rationale
- Risk assessment and mitigations
- Implementation roadmap phases
- Source validation

**When to read:** To quickly understand what research validated and why

**Time to read:** 5-10 minutes

---

### 3. ✅ IMPLEMENTATION_CHECKLIST.md (12 KB - ACTIONABLE)
**Phase-by-phase implementation guide**

Contains:
- MVP checklist (v0.1)
- Phase 1 detailed tasks (Week 1-2)
- Phase 2 expansion tasks (Week 3-4)
- Phase 3 polish tasks (Week 5+)
- Code patterns ready to copy
- Success criteria

**When to read:** To understand what to build and in what order

**Time to read:** 10-15 minutes

---

### 4. 🏗️ ARCHITECTURE.md (In vault)
**System design and component diagrams**

See: `.planning/research/ARCHITECTURE.md`

---

### 5. 📚 STACK.md (In vault)
**Technology choices and justification**

See: `.planning/research/STACK.md`

---

## Quick Navigation by Role

### 👨‍💻 Developer: "How do I build this?"
1. Start: RESEARCH_SUMMARY.md (understand scope)
2. Deep dive: FEATURES.md section "Core MCP Capabilities" + "Obsidian Vault Features"
3. Build: IMPLEMENTATION_CHECKLIST.md
4. Reference: FEATURES.md section "Query Patterns" for API design

### 🏛️ Architect: "What's the overall design?"
1. Overview: RESEARCH_SUMMARY.md
2. Design details: ARCHITECTURE.md
3. Feature scope: FEATURES.md section "Feature Prioritization"
4. Constraints: FEATURES.md section "Out of Scope"

### 🧪 QA: "What should I test?"
1. Scope: IMPLEMENTATION_CHECKLIST.md section "Testing & Validation"
2. Success criteria: IMPLEMENTATION_CHECKLIST.md
3. Data formats: FEATURES.md section "Obsidian Vault Features"
4. Edge cases: FEATURES.md section "Risks & Mitigations"

### 📝 Product Manager: "What's the vision?"
1. Quick overview: RESEARCH_SUMMARY.md
2. MVP scope: FEATURES.md section "Feature Prioritization" → MVP
3. Roadmap: RESEARCH_SUMMARY.md section "Implementation Roadmap"
4. Risks: RESEARCH_SUMMARY.md section "Risks & Mitigations"

### 🎨 Designer: "What does the user experience look like?"
1. System overview: FEATURES.md "What MCP is"
2. User workflows: FEATURES.md section "Canon Management"
3. Data templates: FEATURES.md section "Note Types & Templates"
4. Context examples: FEATURES.md section "AI Context Delivery"

---

## Key Research Findings (TL;DR)

### ✅ Validated
- MCP can expose worldbuilding data without modifying Obsidian
- Obsidian YAML + wikilinks sufficient for relationship modeling
- Claude's 200K token context window sufficient for world context
- Existing tools (ComfyUI, Dataview) integrate without reimplementation
- Git-based approval workflow works for collaborative worldbuilding

### 🎯 Design Decisions Made
1. **Single source of truth:** Obsidian vault (not external DB)
2. **Architecture:** MCP server as read-only bridge
3. **Relationships:** Bidirectional via wikilinks + YAML metadata
4. **Approval:** Git-based (main = canon, features = proposals)
5. **Assets:** Embed metadata in images; version workflows

### 📊 Feature Scope
- **MVP (v0.1):** Basic queries, templates, manual approval
- **v0.2-0.3:** Filtered queries, consistency checks, ComfyUI integration
- **v1.0+:** Multi-world, web UI, collaboration features

### 🚫 Out of Scope
- Replace Obsidian (it's not an editor)
- External storage (vault is source of truth)
- Arbitrary code execution
- Auto-generate complete worlds
- Real-time multiplayer editing

---

## How This Fits Together

```
User (Worldbuilder)
        ↓
Obsidian Vault (Source of Truth)
        ↓
Git Repository (Version Control)
        ↓
Hivemind MCP Server (Bridge)
        ↓
Claude / AI Tools (Context Consumers)
```

**Data Flow:**
1. Worldbuilder edits characters/locations in Obsidian
2. Changes committed to git
3. Hivemind MCP server reads from git
4. Claude queries MCP for context
5. Claude generates consistent content (dialogue, images, plot)
6. Results go back to worldbuilder

---

## Research Sources

Research conducted January 2025 using:
- 1000+ MCP server examples (MCPMarket.io)
- 5+ Obsidian worldbuilding vault templates
- Official MCP documentation (modelcontextprotocol.io)
- Claude API docs (platform.claude.com)
- ComfyUI workflow documentation
- Leading worldbuilding tools (World Anvil, Reality Forge, Urdr)

---

## Implementation Timeline (Estimated)

| Phase | Weeks | Focus | Deliverable |
|-------|-------|-------|-------------|
| Research | 1 | Validation | ✓ This directory |
| MVP | 1-2 | Core MCP server | Basic queries, templates |
| Expansion | 3-4 | Enhanced features | Consistency checking, ComfyUI |
| Polish | 5+ | Performance | Web UI, analytics |

---

## Success Metrics

### MVP Success
- ✅ Claude can query character data
- ✅ Context stays within token limits
- ✅ Consistency checks work
- ✅ Templates easy to use
- ✅ Approval workflow functional

### v1.0 Success
- ✅ Multi-user collaborative worldbuilding
- ✅ 1000+ entities handled smoothly
- ✅ Web interface for browsing
- ✅ Full asset provenance tracking
- ✅ Community adoption (external vaults)

---

## Open Questions for Implementation

1. **What MCP runtime?** (TypeScript, Python, Rust?)
   - Decision point: language expertise, deployment target

2. **How to handle vault changes?** (git hooks, polling, file watcher?)
   - Design point: latency vs. system load

3. **Where to cache?** (in-process, Redis, persistent file?)
   - Performance point: memory vs. responsiveness

4. **How to validate consistency?** (strict rules or warnings?)
   - UX point: helpful vs. annoying

5. **When to integrate ComfyUI?** (v0.1, v0.2, v1.0?)
   - Scope point: complexity vs. time to MVP

See IMPLEMENTATION_CHECKLIST.md "Key Files to Create" for answers.

---

## Contributing to These Docs

When updating:
- Keep FEATURES.md as canonical detailed reference
- Sync summaries to RESEARCH_SUMMARY.md
- Update checklist when scope changes
- Add new findings to appropriate sections
- Keep code examples up-to-date with implementation

---

**Last Updated:** January 2025  
**Status:** ✅ Complete Research Phase  
**Next:** Implementation Planning & Phase 1 Development

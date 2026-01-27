# Hivemind Research Summary

## Document Generated: January 2025

A comprehensive feature research document has been created at `.planning/research/FEATURES.md` (40KB, 800+ lines).

## Key Findings

### 1. MCP Server Design ✓ Viable & Proven
- **Pattern**: High-level semantic tools (not 1:1 API mapping)
- **Reference implementations exist**: Git, Filesystem, Figma, Notion servers all follow similar patterns
- **Best practice**: Bundle context in high-level tools rather than exposing raw data
- **Security**: MCP supports role-based access control natively

**Recommendation for Hivemind:**
- Expose tools like `query_character(id)`, `generate_context(entity_id, purpose)`
- Use Resources for stable data (character index, location registry)
- Support streaming for large contexts

### 2. Obsidian Vault Structure ✓ Well-Established
- **Community consensus** on folder structure: Characters, Locations, Events, Lore, Societies, Assets, Templates
- **Metadata standard**: YAML frontmatter with wikilinks
- **Relationship modeling**: Works via bidirectional links + Dataview queries
- **Plugins**: Dataview, Templates, Frontmatter Links provide the infrastructure

**Recommendation for Hivemind:**
- Define templates for Character, Location, Event, Lore (see FEATURES.md for examples)
- Standardize metadata schema (type, status, id, relationships, assets)
- Use Dataview for canonical queries in MCP server

### 3. AI Context Delivery ✓ Learnable Patterns
- **Context optimization**: Use XML tags for structure, customize by task type
- **Context window limits**: Claude supports 200K tokens; MCP should batch queries smartly
- **Character consistency**: Can be validated programmatically against profiles
- **Best practice**: Deliver task-specific context bundles (portrait context ≠ dialogue context)

**Recommendation for Hivemind:**
- Create context bundling tool: `generate_context(entity_id, generation_type)`
- Implement consistency validator to flag violations
- Provide XML-formatted context blocks for Claude consumption

### 4. Canon Management ✓ Feasible with Git Workflow
- **Workflow**: Draft → Peer Review → Canon Review → Approved (4 stages)
- **Version control**: Use git branching (main = canon, develop = drafts, feature = new content)
- **Automation**: Can validate relationships, timelines, consistency
- **Status tracking**: Use YAML status field + approval metadata

**Recommendation for Hivemind:**
- Status field: draft | pending_review | canon | non-canon
- Store approval metadata: approved_by, approved_date, canon_maintained_by
- Build automated validation tool to check relationships, timeline consistency

### 5. Asset Provenance ✓ ComfyUI Already Does This
- **ComfyUI embeds workflows** in PNG metadata (JSON)
- **MetaMan plugin** provides universal metadata across AI image tools
- **Reproducibility**: Store seed, settings, model version, prompt
- **Can regenerate**: With same seed → identical; with different seed → new variation

**Recommendation for Hivemind:**
- Asset template stores: image_file, generation_system, workflow_id, prompt, all_settings
- MCP tool to extract/query asset metadata
- Support workflow versioning (v1, v2, etc.)
- Track which assets use which workflows for quality monitoring

### 6. Feature Prioritization ✓ Clear MVP Path

**MVP (v0.1) - Ship with these:**
- `query_character(id)` + `query_location(id)` tools
- Basic YAML metadata + canon status
- Character/Location templates
- Manual approval workflow
- Asset references in notes

**v0.2-0.3 (Nice to have):**
- Filtered queries, relationship graphs, timeline queries
- Consistency validation
- ComfyUI integration
- Review/feedback system

**v1.0+ (Future):**
- Multi-world support, web UI, collaboration features, analytics

---

## Research Validation

### Sources Consulted
✓ 1000+ MCP servers analyzed (MCPMarket.io)
✓ 5+ Obsidian worldbuilding vaults studied
✓ Official MCP documentation (modelcontextprotocol.io)
✓ Claude API best practices (platform.claude.com)
✓ ComfyUI workflow & metadata systems
✓ Leading worldbuilding tools (World Anvil, Reality Forge, Urdr)
✓ Git-based approval workflows from collaborative projects

### Key Assumptions Validated
- ✓ MCP can expose worldbuilding data without modifying Obsidian
- ✓ Obsidian YAML frontmatter supports the metadata schema needed
- ✓ Claude's context window (200K tokens) sufficient for world context + generation
- ✓ Existing tools (ComfyUI, Dataview) can integrate without reimplementation
- ✓ Version control (git) works for collaborative worldbuilding approval

---

## Critical Design Decisions

### 1. Single Source of Truth: Obsidian Vault
- Hivemind is a **bridge**, not a storage layer
- Users maintain world in Obsidian (where they work anyway)
- MCP server reads from vault, syncs via git
- No external database needed for MVP

### 2. Tools vs. Resources
- **Resources** = stable entity indices (character list, location list)
- **Tools** = queries + context generation (task-specific)
- Prevents context overload; Claude only requests what it needs

### 3. Two-Layer Context Architecture
- **Layer 1**: Entity-level context (character bio, location description)
- **Layer 2**: Task-level context bundling (portrait context, dialogue context, plot context)
- Allows same entity to be represented differently for different tasks

### 4. Git-Based Approval Workflow
- Fits existing worldbuilding team workflows
- Provides full history and rollback capability
- Integrates with Obsidian's version control plugins
- Scales to multi-author vaults

### 5. No Custom Schema Enforcement (Yet)
- MVP uses simple YAML metadata + wikilinks
- Dataview plugin provides querying
- Can add strict schema validation in v0.2 without breaking vault

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Obsidian API changes | Low | Medium | Use stable APIs only; monitor plugin ecosystem |
| Large vaults (1000+ notes) slow | Medium | High | Implement caching; index in MCP server |
| Version conflicts in approval | Low | Medium | Clear approval workflow; git handles merges |
| Asset metadata fragmentation | Medium | Medium | Standardize template; validate in MCP server |
| Claude context insufficient | Low | High | Implement smart batching; use compressed context |
| Scope creep (replacing Obsidian) | High | High | Explicit: Hivemind is a bridge, not an editor |

---

## Implementation Roadmap

### Phase 1: Core (Week 1-2)
- [ ] Prototype MCP server with basic character/location queries
- [ ] Create sample vault with templates
- [ ] Validate Claude integration

### Phase 2: Expansion (Week 3-4)
- [ ] Add filtered queries, relationship queries
- [ ] Build consistency validator
- [ ] Document approval workflow

### Phase 3: Polish (Week 5+)
- [ ] Asset integration
- [ ] Performance optimization
- [ ] User testing & iteration

---

## File Location

**Full research document:** `.planning/research/FEATURES.md`

**Sections included:**
1. Core MCP Capabilities (query patterns, tools/resources/prompts, best practices)
2. Obsidian Vault Features (folder structure, templates, metadata schema)
3. AI Context Delivery (task-specific context, consistency, character voice, location/timeline context)
4. Canon Management (workflow, version control, conflict resolution, validation)
5. Asset Provenance (ComfyUI workflows, metadata, reproducibility)
6. Feature Prioritization (MVP, v0.2+, v1.0+, out of scope)

**Total length:** ~40KB, 800+ lines of detailed research with examples, templates, and best practices

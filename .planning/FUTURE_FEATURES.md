# Future Features Specification

**Version:** 1.0  
**Created:** 2026-02-12  
**Status:** Pending (Post v4.0)

This document specifies features that are not complete in v4.0 and are candidates for future milestones. Features are organized by priority tier and include rationale, complexity estimates, and success criteria.

---

## Table of Contents

1. [v4.0 Incomplete](#v40-incomplete)
2. [Deferred Features](#deferred-features)
3. [Future Milestone Candidates](#future-milestone-candidates)
4. [Out of Scope](#out-of-scope)

---

## v4.0 Incomplete

### Phase 28: Community Plugin Submission (REMAINING WORK)

**Status:** 2/3 plans complete, 5/6 requirements met

#### PLUG-05: Submit PR to obsidian-releases ⬜

**Description:** Submit pull request to Obsidian's obsidian-releases repository to add Hivemind to the community plugins directory.

**Requirements:**
- Fork obsidian-releases repository
- Add entry to `community-plugins.json`:
  ```json
  {
    "id": "hivemind-mcp",
    "name": "Hivemind",
    "author": "HiveForge",
    "description": "MCP server that gives AI tools structured context from your vault, with pluggable templates, HybridRAG search, and ComfyUI image generation.",
    "repo": "hiveforge-sh/hivemind"
  }
  ```
- Create PR with title: "Add plugin: Hivemind"
- Provide PR description confirming guidelines compliance
- Document PR URL in `.planning/phases/28-community-plugin-submission/28-03-SUMMARY.md`

**Blockers:** Requires screenshot capture for timeline and graph views before submission

**Manual steps:**
1. Capture screenshots:
   - `docs/images/timeline-view.png` - Timeline visualization with entity swim lanes
   - `docs/images/graph-view.png` - Graph visualization with node-link diagram
2. Add screenshots to README.md (placeholders already exist)
3. Submit PR following instructions in `.github/PLUGIN_SUBMISSION.md`
4. Wait for automated validation and review feedback

**Success criteria:**
- PR submitted to https://github.com/obsidianmd/obsidian-releases
- PR URL documented in 28-03-SUMMARY.md
- Automated CI validation passes
- Community plugin listing live within 24-48 hours of approval

**Complexity:** LOW (mostly procedural)  
**Estimate:** 30 minutes (screenshot capture + PR submission)

---

## Deferred Features

Features explicitly deferred from v4.0 that should be reconsidered for future milestones.

### Timeline Enhancements

#### TVIEW-D1: Combine Timeline with Dataview Queries

**Priority:** MEDIUM  
**Complexity:** HIGH  
**Estimated effort:** 3-5 days

**Description:** Enable users to query timeline data using Dataview plugin syntax.

**Use case:**
- "Show timeline of all events tagged #war"
- "Display character timeline filtered by `status: alive`"
- Integrate Hivemind's temporal queries with Dataview's powerful filtering DSL

**Why deferred:** Dataview integration adds significant complexity and requires understanding Dataview's plugin API. Timeline core features (range queries, visual view) provide value independently.

**Requirements:**
1. Detect if Dataview plugin is installed and active
2. Parse Dataview query syntax in timeline view filter input
3. Convert Dataview query to Hivemind MCP timeline query parameters
4. Merge Dataview metadata filters with timeline date filters
5. Display combined results in timeline view
6. Error handling for invalid Dataview queries

**Success criteria:**
- User enters Dataview query in timeline filter: `WHERE file.tags contains "#war"`
- Timeline displays only events matching both date range AND Dataview query
- Performance remains <500ms for queries on 1000+ notes
- Error messages clearly indicate Dataview vs timeline query issues

**Dependencies:**
- Dataview plugin installed in Obsidian
- Dataview API for programmatic queries
- Timeline MCP tools (already implemented in Phase 24)

**Risks:**
- Dataview plugin API changes could break integration
- Performance impact of double-filtering (Dataview + timeline)
- User confusion about query syntax (which language to use?)

---

#### TVIEW-D2: Double-Click Timeline to Create Note

**Priority:** LOW  
**Complexity:** MEDIUM  
**Estimated effort:** 2-3 days

**Description:** Double-click empty space on timeline to create a new note with date auto-populated.

**Use case:**
- User sees gap in timeline, double-clicks June 15, 2024
- Modal appears: "Create new event for 2024-06-15?"
- User confirms, new note created with `date: 2024-06-15` in frontmatter
- User prompted for entity type (event, character, location, etc.)

**Why deferred:** Timeline as read-only view is simpler and maintains vault-as-source-of-truth principle. Note creation can be done through standard Obsidian workflows.

**Requirements:**
1. Detect double-click events on timeline canvas (not on existing items)
2. Calculate clicked date based on timeline scale and mouse position
3. Show modal with date confirmation and entity type selector
4. Generate note filename and frontmatter template
5. Create note in appropriate folder (based on folder mappings)
6. Open newly created note in active pane
7. Refresh timeline view to show new item

**Success criteria:**
- Double-click empty timeline space opens creation modal
- Modal shows correct date based on click position
- New note appears in vault with valid frontmatter
- Timeline refreshes and displays new item without manual reload
- Works across all entity types (character, location, event, etc.)

**Dependencies:**
- Timeline view infrastructure (Phase 26 complete)
- Folder mapping system (Phase 13 complete)
- Template registry for frontmatter generation (Phase 23 complete)

**Risks:**
- Date calculation accuracy with different timeline scales
- Accidental note creation from double-click (vs intentional pan)
- Undo/redo complexity for timeline-created notes

---

### Graph Enhancements

#### GVIEW-D1: Multiple Layout Algorithm Options

**Priority:** MEDIUM  
**Complexity:** MEDIUM  
**Estimated effort:** 2-3 days

**Description:** Provide multiple graph layout algorithms (hierarchical, circular, grid) in addition to ForceAtlas2.

**Use case:**
- Hierarchical layout: Show reporting structure (manager → team members)
- Circular layout: Show relationship cycles (character A → B → C → A)
- Grid layout: Ordered visualization for large graphs
- Radial layout: Focus on one entity with concentric rings of neighbors

**Why deferred:** ForceAtlas2 provides good default layout for most graphs. Additional algorithms add UI complexity and bundle size.

**Requirements:**
1. Add layout selector dropdown to graph view toolbar
2. Implement layout algorithms:
   - Hierarchical (using graphology-layout-dagre)
   - Circular (using graphology-layout-circular)
   - Grid (custom implementation or graphology-layout-grid)
   - Radial (using graphology-layout-radial)
3. Persist selected layout in plugin settings
4. Animate transitions between layouts smoothly
5. Provide layout-specific options (e.g., direction for hierarchical)

**Success criteria:**
- User selects layout from dropdown, graph rerenders with new algorithm
- Layout choice persists across Obsidian restarts
- Transitions animate smoothly (300ms duration)
- All layouts work with graphs of 1000+ nodes
- Layout-specific settings accessible via gear icon next to dropdown

**Dependencies:**
- Graph view infrastructure (Phase 27 complete)
- graphology-layout-* packages (additional ~20KB bundle size)

**Bundle impact:** +20-30KB for layout algorithm libraries

**Risks:**
- Performance degradation with complex layouts on large graphs
- User confusion about which layout to use for which scenario
- Bundle size approaching Obsidian Sync limit (currently ~210KB, limit 5MB)

---

### Template System Enhancements

#### Community Template Sharing

**Priority:** HIGH  
**Complexity:** HIGH  
**Estimated effort:** 2-3 weeks

**Description:** Enable users to discover, install, and share custom templates via a community marketplace or registry.

**Use case:**
- User searches for "project management" template
- Finds community-contributed template with task, milestone, project entities
- Installs template with one command: `npx hivemind install-template project-management`
- Template appears in available templates list in settings
- Template auto-updates when maintainer publishes new version

**Why deferred:** Core template system (v2.0) must stabilize before enabling community contributions. Need infrastructure for hosting, versioning, and validating community templates.

**Requirements:**

**Phase 1: Template Package Format**
1. Define template package structure:
   ```
   my-template/
   ├── template.json          # Template definition
   ├── README.md              # Usage instructions
   ├── sample-vault/          # Example vault
   ├── LICENSE                # Template license
   └── .hivemind-template     # Marker file
   ```
2. Template metadata schema:
   ```json
   {
     "id": "project-management",
     "version": "1.0.0",
     "minHivemindVersion": "4.0.0",
     "author": "username",
     "license": "MIT",
     "homepage": "https://github.com/user/template",
     "keywords": ["project", "task", "milestone"]
   }
   ```
3. Validation rules:
   - ID uniqueness check
   - Semantic versioning enforcement
   - Required fields (entityTypes, relationshipTypes)
   - License compatibility (MIT, Apache-2.0, CC0)

**Phase 2: CLI Commands**
1. `npx hivemind search-templates <query>` - Search template registry
2. `npx hivemind install-template <id>` - Install from registry or GitHub
3. `npx hivemind list-templates` - Show installed templates
4. `npx hivemind uninstall-template <id>` - Remove template
5. `npx hivemind validate-template <path>` - Validate template definition
6. `npx hivemind publish-template <path>` - Submit to registry (Phase 3)

**Phase 3: Template Registry**
1. Host template registry (GitHub repo or dedicated site)
2. Submission process:
   - Fork registry repo
   - Add template entry to `templates.json`
   - Submit PR with validation checks
3. Automated validation in CI:
   - Schema validation
   - License check
   - Sample vault smoke test
4. Template versioning and deprecation policy
5. Download metrics and popularity ranking

**Phase 4: Plugin Integration**
1. Template browser in Obsidian settings
2. One-click install from plugin UI
3. Template update notifications
4. Template compatibility warnings (minHivemindVersion)

**Success criteria:**
- User discovers templates via CLI or plugin UI
- Templates install correctly with dependencies
- Sample vaults provide working examples
- Template validation catches common errors pre-publication
- Registry CI prevents malicious or broken templates from being published
- Users can contribute templates without Hivemind core changes

**Dependencies:**
- Stable template system (v2.0 complete)
- Clear template API and versioning guidelines
- Infrastructure for hosting registry (GitHub pages or dedicated site)

**Risks:**
- Security: Malicious templates with code execution
- Quality: Low-quality templates polluting registry
- Maintenance: Abandoned templates breaking with Hivemind updates
- Versioning: Template incompatibilities causing vault corruption

**Mitigation:**
- Manual review for first 50 templates (establish quality bar)
- Automated CI validation for schema, licenses, sample vaults
- Template deprecation policy (unmaintained for 6+ months)
- Template pinning: Users pin to specific version, opt-in to updates

---

### MCP Server Enhancements

#### Vector Search with Embeddings

**Priority:** MEDIUM  
**Complexity:** HIGH  
**Estimated effort:** 1-2 weeks

**Description:** Add vector similarity search using embeddings for semantic query matching.

**Use case:**
- User asks Claude: "Find notes similar to my concept of 'temporal paradox'"
- MCP server generates embedding for query
- SQLite vector search finds semantically similar notes
- Results ranked by cosine similarity, not just keyword match

**Why deferred:** Full-text search (FTS5) provides good results for most queries. Vector search adds significant complexity and requires embedding model deployment.

**Requirements:**
1. Choose embedding model:
   - Local: sentence-transformers (all-MiniLM-L6-v2, ~80MB)
   - API: OpenAI text-embedding-3-small, Cohere embed-english-v3.0
2. Generate embeddings for all vault notes on initial index
3. Store embeddings in SQLite (BLOB column or separate table)
4. Implement vector similarity search:
   - Cosine similarity calculation
   - Approximate nearest neighbor (if >10K notes)
5. Hybrid search combining keyword + vector:
   - Weighted fusion of FTS5 score + cosine similarity
   - Configurable weights (default 50/50)
6. Incremental embedding updates on file changes
7. MCP tool: `search_vault_semantic(query, limit)`

**Success criteria:**
- Query "notes about time travel" finds relevant notes without exact keyword match
- Semantic search handles synonyms and related concepts
- Performance <500ms for queries on 10K notes
- Embeddings regenerate automatically on note content changes
- Hybrid search outperforms pure keyword search in user testing

**Dependencies:**
- Embedding model or API access
- SQLite extensions for vector operations (sqlite-vss or custom)
- Updated indexing pipeline to generate embeddings

**Bundle impact:**
- Local model: +80MB for model file
- API-based: No bundle impact, requires API key

**Risks:**
- Model size increases server startup time
- Embedding generation slow for large vaults (10K notes = 5-10 minutes)
- API costs for cloud-based embeddings
- Accuracy depends heavily on embedding model quality

**Alternatives considered:**
- BM25 + vector hybrid (current approach, not planned for v4.0)
- Pure vector search (rejects exact match queries poorly)
- Cross-encoder reranking (too slow for real-time)

---

#### Multi-Vault Support

**Priority:** LOW  
**Complexity:** HIGH  
**Estimated effort:** 2-3 weeks

**Description:** Support querying multiple vaults simultaneously from a single MCP server instance.

**Use case:**
- User has "Campaign World" vault (worldbuilding) and "Session Notes" vault (timeline)
- Single MCP server queries both vaults
- AI can answer: "What character from Campaign World appeared in last session?"
- Cross-vault relationships and searches

**Why deferred:** Single-vault use case covers 95% of users. Multi-vault adds significant architectural complexity.

**Requirements:**
1. Config schema supports multiple vault paths:
   ```json
   {
     "vaults": [
       { "id": "campaign", "path": "/path/to/campaign", "template": "worldbuilding" },
       { "id": "sessions", "path": "/path/to/sessions", "template": "research" }
     ]
   }
   ```
2. Database schema includes vault_id foreign key on nodes/edges
3. MCP tools accept optional `vault` parameter:
   - `query_character(name: "Alice", vault: "campaign")`
   - `search_vault(query: "dragon", vault: "all")` - searches all vaults
4. File watchers run concurrently for all vaults
5. Cross-vault relationships via explicit vault references:
   - `[[campaign:Alice]]` links to Alice in campaign vault from sessions vault
6. Graph visualization filters by vault
7. Search results grouped by vault

**Success criteria:**
- MCP server indexes multiple vaults on startup
- Queries can target specific vault or search all vaults
- Cross-vault links render correctly in graph visualization
- File watchers detect changes in all vaults
- Performance scales linearly with number of vaults (2 vaults = 2x indexing time)

**Dependencies:**
- Vault reader/watcher refactor to support multiple instances
- Database schema migration for vault_id column
- MCP tool schema updates for optional vault parameter

**Risks:**
- Namespace collisions: Entity "Alice" exists in both vaults
- Performance: Indexing N vaults takes N times longer
- Complexity: Cross-vault relationship validation and consistency
- UX confusion: Which vault am I querying?

**Alternatives considered:**
- Run separate MCP servers per vault (current recommendation)
- Vault merging: Copy notes from multiple vaults into one (not scalable)
- Workspace mode: Switch active vault without restarting server (simpler alternative)

---

## Future Milestone Candidates

Features that could form the basis of future milestones (v5.0, v6.0, etc.).

### v5.0 Candidate: Advanced Querying

**Theme:** Expressive query language and advanced filtering

**Potential features:**
1. **Query DSL** - Domain-specific language for complex queries:
   ```
   FIND character WHERE age > 30 AND faction = "Rebellion"
   FIND event WHERE date BETWEEN "2024-01-01" AND "2024-12-31" AND participants INCLUDE "Alice"
   ```
2. **Saved queries** - Name and reuse complex queries
3. **Query builder UI** - Visual query construction in Obsidian plugin
4. **Aggregations** - Count, sum, avg, group by for analytics
5. **Computed fields** - Derive fields from other fields at query time

**Rationale:** Power users need expressive queries beyond simple filters. Current MCP tools are granular (query_character, query_location), but lack composability.

**Risks:** Query language design is hard. Need to balance expressiveness vs simplicity.

**Estimated effort:** 6-8 weeks

---

### v5.0 Candidate: Collaboration Features

**Theme:** Multi-user workflows and synchronization

**Potential features:**
1. **Conflict resolution** - Detect and resolve conflicting edits in canon workflow
2. **Review assignments** - Assign notes to reviewers for approval
3. **Comment threads** - Inline comments on notes (via Obsidian Comments plugin integration)
4. **Change notifications** - Notify users when notes they care about change
5. **Sync protocol** - Push/pull changes between vaults (not real-time, git-style)

**Rationale:** Teams (game masters, research groups, content teams) need collaborative workflows. Current design is single-user.

**Risks:** Collaboration is fundamentally complex. Risk of scope creep into "Obsidian Sync alternative."

**Estimated effort:** 8-12 weeks

---

### v6.0 Candidate: Content Generation

**Theme:** AI-assisted content creation with canon grounding

**Potential features:**
1. **Canon-aware prompts** - Auto-inject relevant canon into AI prompts
2. **Templated generation** - Generate notes from templates with AI content
3. **Batch generation** - "Generate 10 NPCs for this faction"
4. **Content validation** - AI checks new content for canon conflicts
5. **Interactive refinement** - Iterative AI content improvement with user feedback

**Rationale:** Hivemind provides canon context to AI. Next step: Use AI to create content that respects canon.

**Risks:** Content quality depends on AI model. May generate bland or repetitive content.

**Estimated effort:** 6-10 weeks

---

### v6.0 Candidate: Enhanced Visualizations

**Theme:** Additional visualization types and interactivity

**Potential features:**
1. **Gantt chart view** - Timeline with dependencies and milestones
2. **Heatmap view** - Visualize note density over time or by type
3. **Sankey diagram** - Flow visualization for relationships
4. **3D graph** - WebGL 3D graph for large vaults (educational, not practical)
5. **Map view** - Geographic visualization for location entities
6. **Export visualizations** - Save graph/timeline as PNG/SVG

**Rationale:** Different visualization types reveal different insights. Users may want to export for presentations.

**Risks:** Visualization complexity increases bundle size and maintenance burden.

**Estimated effort:** 4-6 weeks

---

## Out of Scope

Features explicitly rejected and will not be implemented.

### Video Editing Integration

**Reason:** Video editing is a specialized domain requiring dedicated tools (DaVinci Resolve, Premiere Pro). Hivemind's value is providing context, not orchestrating video workflows.

**Alternative:** Use Hivemind to query canon, copy results to video editing tool manually or via scripts.

---

### Cloud Hosting / SaaS

**Reason:** Local-first is a core constraint. Cloud hosting introduces hosting costs, privacy concerns, and data sovereignty issues.

**Alternative:** Users can self-host MCP server on their own infrastructure if needed.

---

### Direct ComfyUI Automation

**Reason:** ComfyUI is a complex tool with its own UX. Hivemind should provide context (workflows, prompts, references), not replace ComfyUI's UI.

**Alternative:** Use Hivemind to store/retrieve workflows, operate ComfyUI manually.

---

### Voice/Audio Generation

**Reason:** Voice generation (TTS, voice cloning) is orthogonal to knowledge management. Focus on text and image context first.

**Alternative:** Use Hivemind to query canon for character voices/dialogue, feed to voice tools manually.

---

### Real-Time Collaborative Editing

**Reason:** Requires operational transformation or CRDTs, synchronization servers, and fundamentally changes architecture from local-first to client-server.

**Alternative:** Use git for asynchronous collaboration, Obsidian Sync for file synchronization (not real-time editing).

---

### Auto-Update Checker in Plugin

**Reason:** Obsidian handles plugin updates natively. Redundant to implement custom update checking.

**Alternative:** Rely on Obsidian's built-in update mechanism.

---

### Graph Editing (Drag Edges, Create Nodes)

**Reason:** Vault is source of truth. Graph editing in UI introduces sync conflicts between graph state and markdown files.

**Alternative:** Edit relationships in markdown files (frontmatter or wikilinks), graph reflects those changes.

---

### Timeline Editing/Dragging

**Reason:** Similar to graph editing - introduces data mutation complexity. Timeline should be read-only view.

**Alternative:** Edit dates in note frontmatter, timeline updates automatically.

---

### Custom Calendar Systems

**Reason:** Scope creep. D&D worlds with 13-month years, fantasy calendars, etc. are complex and domain-specific.

**Alternative:** Use ISO8601 dates in frontmatter, add custom calendar details in note content or via computed fields (future feature).

---

### 3D Graph Visualization

**Reason:** Gimmick with poor UX. 2D graph with good layout algorithms is more usable than 3D graph requiring camera controls.

**Alternative:** Stick with 2D graph, use clustering and filtering to handle density.

---

## Appendix: Prioritization Framework

Features are prioritized using the **ICE framework** (Impact, Confidence, Ease):

- **Impact:** How much value does this feature provide? (1-10)
- **Confidence:** How confident are we in the impact estimate? (0-1)
- **Ease:** How easy is this to implement? (1-10, inverted for complexity)

**ICE Score = (Impact × Confidence) / Ease**

Example scores for deferred features:

| Feature | Impact | Confidence | Ease | ICE Score |
|---------|--------|------------|------|-----------|
| TVIEW-D1 (Dataview) | 7 | 0.7 | 3 | 1.63 |
| TVIEW-D2 (Double-click) | 4 | 0.8 | 6 | 0.53 |
| GVIEW-D1 (Layouts) | 6 | 0.9 | 5 | 1.08 |
| Template Sharing | 9 | 0.6 | 2 | 2.70 |
| Vector Search | 7 | 0.5 | 3 | 1.17 |
| Multi-Vault | 4 | 0.6 | 2 | 1.20 |

**Interpretation:** Template Sharing has highest ICE score (2.70), suggesting it should be next priority after v4.0 completes.

---

**End of Future Features Specification v1.0**  
*Last updated: 2026-02-12*

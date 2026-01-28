# Roadmap: Hivemind

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-01-25)
- ✅ **v2.0 Template System** - Phases 6-11 (shipped 2026-01-26)
- ✅ **v3.0 Developer Experience** - Phases 12-16 (shipped 2026-01-27)
- ✅ **v3.1 Type Safety & Quality** - Phases 17-22 (shipped 2026-01-27)
- 🚧 **v4.0 Temporal & Graph** - Phases 23-28 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-25</summary>

- [x] Phase 1: MVP Foundation (3/3 plans)
- [x] Phase 2: Vault Templates (2/2 plans)
- [x] Phase 3: Canon Workflow (2/2 plans)
- [x] Phase 4: Asset Management (2/2 plans)
- [x] Phase 5: ComfyUI Integration (2/2 plans)

</details>

<details>
<summary>✅ v2.0 Template System (Phases 6-11) - SHIPPED 2026-01-26</summary>

- [x] Phase 6: Template Infrastructure Core (5/5 plans)
- [x] Phase 7: Migration (5/5 plans)
- [x] Phase 8: Dynamic MCP Tools (1/1 plan)
- [x] Phase 9: Relationship System (merged into Phase 8)
- [x] Phase 10: Built-in Templates (merged into Phase 8)
- [x] Phase 11: Server Integration Fix (1/1 plan)

</details>

<details>
<summary>✅ v3.0 Developer Experience (Phases 12-16) - SHIPPED 2026-01-27</summary>

- [x] Phase 12: Setup Wizard (4/4 plans)
- [x] Phase 13: Folder Mapping (4/4 plans)
- [x] Phase 14: Validate CLI (3/3 plans)
- [x] Phase 15: Fix CLI (4/4 plans)
- [x] Phase 16: Obsidian Commands (4/4 plans)

</details>

<details>
<summary>✅ v3.1 Type Safety & Quality (Phases 17-22) - SHIPPED 2026-01-27</summary>

- [x] Phase 17: Foundation Types (1/1 plan)
- [x] Phase 18: Template System & Data Layer (2/2 plans)
- [x] Phase 19: Server & MCP (2/2 plans)
- [x] Phase 20: ComfyUI, CLI & Enforcement (1/1 plan)
- [x] Phase 21: Test Coverage (1/1 plan)
- [x] Phase 22: CI Quality Gates (1/1 plan)

</details>

<details open>
<summary>🚧 v4.0 Temporal & Graph (Phases 23-28) - IN PROGRESS</summary>

### Phase 23: Tech Debt Cleanup

**Goal:** Clean accumulated technical debt before adding temporal and graph complexity.

**Dependencies:** None

**Requirements:** DEBT-01, DEBT-02, DEBT-03, DEBT-04, DEBT-05

**Plans:** 3 plans

Plans:
- [x] 23-01-PLAN.md — Deduplicate FRONTMATTER_TEMPLATES using template registry (DEBT-01, DEBT-02)
- [x] 23-02-PLAN.md — Resolve/document process.chdir() and child_process exclusions (DEBT-04, DEBT-05)
- [x] 23-03-PLAN.md — Add cli/init test coverage above 80% (DEBT-03)

**Success Criteria:**
1. ✅ Plugin uses template registry instead of duplicated FRONTMATTER_TEMPLATES constant
2. ✅ Template initialization pattern unified between CLI and Obsidian plugin (no duplication)
3. ✅ cli/init modules have test coverage above 80% (lines) — 91.17% achieved
4. ✅ process.chdir() Stryker exclusion resolved or documented with justification
5. ✅ child_process import resolved or documented with Obsidian review team justification

**Status:** Complete (2026-01-28)

---

### Phase 24: Timeline MCP Tools

**Goal:** AI tools can query entities by date range for temporal context retrieval.

**Dependencies:** Phase 23

**Requirements:** TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06

**Success Criteria:**
1. Claude can query "show me all events between June 2024 and August 2024" and receive sorted results
2. MCP tool validates ISO8601 date format (YYYY-MM-DD) and rejects malformed input with clear error
3. Results include date field with full entity context (name, type, description)
4. Timeline queries only work on entity types with date fields (skip types without dates)
5. Queries return results in ascending or descending order based on user preference

**Status:** Pending

---

### Phase 25: Graph MCP Tools

**Goal:** AI tools can traverse relationship graph for discovering connected entities.

**Dependencies:** Phase 23

**Requirements:** GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-04, GRAPH-05

**Success Criteria:**
1. Claude can query "show me all entities connected to Character:john" and receive neighbors with relationship types
2. Subgraph queries support configurable depth (1-hop, 2-hop, 3-hop) with reasonable performance
3. Relationship types included in results (e.g., "Character:alice manages Character:bob")
4. Shortest path tool finds path between any two entities in vault graph
5. Graph traversal filtered by relationship type (e.g., only "manages" edges, skip "allies_with")

**Status:** Pending

---

### Phase 26: Timeline Obsidian View

**Goal:** Users visualize temporal relationships on interactive chronological axis.

**Dependencies:** Phase 24

**Requirements:** TVIEW-01, TVIEW-02, TVIEW-03, TVIEW-04, TVIEW-05, TVIEW-06

**Success Criteria:**
1. User opens timeline panel and sees entities with dates displayed on chronological axis
2. Range items (start and end dates) displayed as spans, not just points
3. Timeline auto-adjusts scale based on data (days for short ranges, years for long ranges)
4. Clicking timeline item opens corresponding note in active pane
5. User filters timeline by entity type and sees only selected types
6. Swim lanes group entities by type for easier visual scanning

**Status:** Pending

---

### Phase 27: Graph Obsidian View

**Goal:** Users explore relationship graph interactively with pan, zoom, filtering, and navigation.

**Dependencies:** Phase 25

**Requirements:** GVIEW-01, GVIEW-02, GVIEW-03, GVIEW-04, GVIEW-05, GVIEW-06, GVIEW-07, GVIEW-08, GVIEW-09, GVIEW-10, GVIEW-11, GVIEW-12

**Success Criteria:**
1. User opens graph panel and sees interactive node-link diagram with smooth pan and zoom
2. Node labels show entity names clearly at default zoom level
3. Edge labels show relationship types (e.g., "manages", "located_in")
4. Clicking node opens corresponding note in active pane
5. Local graph view focuses on one entity plus connected neighbors (not full vault graph)
6. User filters by entity type and graph updates in real-time without reload
7. User searches for entity name and matching nodes highlight in graph
8. User expands/collapses nodes to progressively explore large subgraphs
9. Nodes styled by entity type with distinct colors and shapes
10. User selects two nodes and shortest path highlights between them
11. Clusters auto-detected and visually grouped for dense relationship areas
12. Workspace mode saves layout configurations and restores on reopen

**Status:** Pending

---

### Phase 28: Community Plugin Submission

**Goal:** Hivemind accepted into Obsidian community plugin directory for public distribution.

**Dependencies:** Phase 26, Phase 27

**Requirements:** PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, PLUG-06

**Success Criteria:**
1. README includes purpose, installation, usage instructions, and screenshots of timeline and graph views
2. manifest.json validated against Obsidian schema with no errors
3. GitHub release tag matches manifest.json version exactly (e.g., both "1.0.0", not "v1.0.0" vs "1.0.0")
4. Release artifacts include main.js and styles.css at root level
5. PR submitted to obsidian-releases community-plugins.json with all required fields
6. CI license gate passes with no GPL/AGPL dependencies in final bundle

**Status:** Pending

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-5 | v1.0 | 11/11 | Complete | 2026-01-25 |
| 6-11 | v2.0 | 12/12 | Complete | 2026-01-26 |
| 12-16 | v3.0 | 19/19 | Complete | 2026-01-27 |
| 17-22 | v3.1 | 8/8 | Complete | 2026-01-27 |
| 23 | v4.0 | 3/3 | Complete | 2026-01-28 |
| 24 | v4.0 | 0/? | Pending | — |
| 25 | v4.0 | 0/? | Pending | — |
| 26 | v4.0 | 0/? | Pending | — |
| 27 | v4.0 | 0/? | Pending | — |
| 28 | v4.0 | 0/? | Pending | — |

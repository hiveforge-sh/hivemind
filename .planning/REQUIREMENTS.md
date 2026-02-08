# Requirements: Hivemind v4.0

**Defined:** 2026-01-27
**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

## v4.0 Requirements

### Timeline MCP Tools

- [x] **TIME-01**: MCP tool queries entities by date range (start, end)
- [x] **TIME-02**: MCP tool queries entities by exact date
- [x] **TIME-03**: Results sorted by date (ascending/descending)
- [x] **TIME-04**: ISO date format (YYYY-MM-DD) validated on input
- [x] **TIME-05**: Date field returned in query results with entity context
- [x] **TIME-06**: Timeline queries are entity-type aware (only query types with date fields)

### Timeline Obsidian View

- [ ] **TVIEW-01**: Visual timeline panel showing entities on chronological axis
- [ ] **TVIEW-02**: Range items displayed for entities with start and end dates
- [ ] **TVIEW-03**: Multiple timeline scales (auto-adjust days to years based on data)
- [ ] **TVIEW-04**: Click timeline item to open corresponding note in vault
- [ ] **TVIEW-05**: Filter timeline by entity type
- [ ] **TVIEW-06**: Grouped swim lanes per entity type

### Graph MCP Tools

- [x] **GRAPH-01**: MCP tool returns neighbors of an entity (1-hop connections)
- [x] **GRAPH-02**: MCP tool returns subgraph around entity (configurable depth)
- [x] **GRAPH-03**: Relationship types included in traversal results
- [x] **GRAPH-04**: MCP tool finds shortest path between two entities
- [x] **GRAPH-05**: Filter graph traversal by relationship type

### Graph Obsidian View

- [ ] **GVIEW-01**: Interactive node-link graph panel with pan and zoom
- [ ] **GVIEW-02**: Node labels showing entity names
- [ ] **GVIEW-03**: Edge labels showing relationship types (typed edges)
- [ ] **GVIEW-04**: Click node to open corresponding note in vault
- [ ] **GVIEW-05**: Local graph view (focus on one entity + connected neighbors)
- [ ] **GVIEW-06**: Filter by entity type with live update
- [ ] **GVIEW-07**: Search and highlight nodes
- [ ] **GVIEW-08**: Expand/collapse nodes for progressive disclosure
- [ ] **GVIEW-09**: Custom node styling by entity type (colors/shapes)
- [ ] **GVIEW-10**: Shortest path highlighting between two selected nodes
- [ ] **GVIEW-11**: Cluster detection with auto-grouping
- [ ] **GVIEW-12**: Workspace mode with persistent layout configurations

### Community Plugin Submission

- [ ] **PLUG-01**: README with purpose, usage, and screenshots
- [ ] **PLUG-02**: manifest.json validated against Obsidian schema
- [ ] **PLUG-03**: GitHub release tag matches manifest.json version exactly
- [ ] **PLUG-04**: Release contains main.js and styles.css
- [ ] **PLUG-05**: PR submitted to obsidian-releases community-plugins.json
- [ ] **PLUG-06**: No GPL/AGPL dependencies (CI gate verified)

### Tech Debt

- [x] **DEBT-01**: Deduplicate FRONTMATTER_TEMPLATES from plugin (use template registry)
- [x] **DEBT-02**: Unify template registry initialization between CLI and plugin
- [x] **DEBT-03**: Add test coverage for cli/init modules
- [x] **DEBT-04**: Resolve process.chdir() Stryker exclusion
- [x] **DEBT-05**: Resolve Obsidian plugin child_process import for review team

## Future Requirements

### Deferred

- **TVIEW-D1**: Combine timeline with Dataview queries
- **TVIEW-D2**: Double-click timeline to create new note with date auto-populated
- **GVIEW-D1**: Multiple layout algorithm options (hierarchical, circular, grid)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom calendar systems (13-month years) | Scope creep — use ISO dates, custom calendars in note content |
| Timeline editing/dragging | Vault is source of truth, timeline is read-only view |
| Recurring events | Complex scheduling logic, not core knowledge management |
| 3D graph visualization | Gimmick, poor UX for actual use |
| Graph editing (drag edges, create nodes) | Read-only view, edit relationships in markdown |
| Real-time collaborative editing | Out of scope — single-user, vault is source of truth |
| Auto-update checker in plugin | Obsidian handles this natively |
| Calendar grid view | Different UX paradigm, not timeline |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIME-01 | Phase 24 | Complete |
| TIME-02 | Phase 24 | Complete |
| TIME-03 | Phase 24 | Complete |
| TIME-04 | Phase 24 | Complete |
| TIME-05 | Phase 24 | Complete |
| TIME-06 | Phase 24 | Complete |
| TVIEW-01 | Phase 26 | Pending |
| TVIEW-02 | Phase 26 | Pending |
| TVIEW-03 | Phase 26 | Pending |
| TVIEW-04 | Phase 26 | Pending |
| TVIEW-05 | Phase 26 | Pending |
| TVIEW-06 | Phase 26 | Pending |
| GRAPH-01 | Phase 25 | Complete |
| GRAPH-02 | Phase 25 | Complete |
| GRAPH-03 | Phase 25 | Complete |
| GRAPH-04 | Phase 25 | Complete |
| GRAPH-05 | Phase 25 | Complete |
| GVIEW-01 | Phase 27 | Pending |
| GVIEW-02 | Phase 27 | Pending |
| GVIEW-03 | Phase 27 | Pending |
| GVIEW-04 | Phase 27 | Pending |
| GVIEW-05 | Phase 27 | Pending |
| GVIEW-06 | Phase 27 | Pending |
| GVIEW-07 | Phase 27 | Pending |
| GVIEW-08 | Phase 27 | Pending |
| GVIEW-09 | Phase 27 | Pending |
| GVIEW-10 | Phase 27 | Pending |
| GVIEW-11 | Phase 27 | Pending |
| GVIEW-12 | Phase 27 | Pending |
| PLUG-01 | Phase 28 | Pending |
| PLUG-02 | Phase 28 | Pending |
| PLUG-03 | Phase 28 | Pending |
| PLUG-04 | Phase 28 | Pending |
| PLUG-05 | Phase 28 | Pending |
| PLUG-06 | Phase 28 | Pending |
| DEBT-01 | Phase 23 | Complete |
| DEBT-02 | Phase 23 | Complete |
| DEBT-03 | Phase 23 | Complete |
| DEBT-04 | Phase 23 | Complete |
| DEBT-05 | Phase 23 | Complete |

**Coverage:**
- v4.0 requirements: 39 total
- Mapped to phases: 39
- Unmapped: 0
- Coverage: 100%

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after roadmap creation*

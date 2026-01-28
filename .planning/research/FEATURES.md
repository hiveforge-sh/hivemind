# Feature Landscape: Timeline, Graph, and Plugin Submission

**Domain:** Knowledge management with temporal and relational queries
**Researched:** 2026-01-27
**Overall confidence:** MEDIUM (verified with current sources, some specifics need implementation testing)

## Executive Summary

Timeline queries, graph visualization, and community plugin submission represent three distinct feature categories for v4.0:

1. **Timeline queries** - Date-range filtering is table stakes for knowledge management, with visual timeline views as differentiators
2. **Graph visualization** - Interactive exploration is expected, with expand/collapse and filtering as core capabilities
3. **Plugin submission** - Structured PR process with validation requirements, mostly procedural

The primary complexity lies in the UX design for timeline and graph features, not the underlying query mechanisms. Hivemind already has the data structures (entities with dates, relationships between entities) - this milestone adds queryability and visualization.

---

## 1. Timeline Queries & Visualization

### Table Stakes (Must Have)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Date range filtering (MCP tool) | Standard query pattern for temporal data | **Low** | SQL WHERE with date comparison, already have date fields in frontmatter |
| ISO date format support (YYYY-MM-DD) | Standard for Obsidian/Dataview compatibility | **Low** | Frontmatter already uses this format |
| Sort by date (ascending/descending) | Basic temporal ordering | **Low** | SQL ORDER BY |
| Query by single date | "What happened on this date?" | **Low** | Equality comparison |
| Query by date range | "What happened between X and Y?" | **Low** | BETWEEN or >= AND <= |
| Return results with date context | Include the date field in response | **Low** | Already part of entity schema |

**Dependencies:** Existing frontmatter date fields (already validated in v3.0), SQLite FTS5 already in use.

**Rationale:** Date-range queries are fundamental for worldbuilding (events chronology), research (publication dates), and people-management (1:1 meeting history). Users expect to filter by time as easily as by entity type.

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Visual timeline view in Obsidian | See temporal relationships at a glance | **Medium** | Integration with vis-timeline or similar library |
| Timeline view with range items | Visualize events with start/end dates, not just points | **Medium** | vis-timeline supports this natively |
| Multiple timeline scales | Auto-adjust from days to years based on data | **Low-Medium** | vis-timeline handles this automatically |
| Click to navigate | Click timeline item to open note in Obsidian | **Medium** | Requires Obsidian vault API integration |
| Filter timeline by entity type | Show only characters, or only events, etc. | **Medium** | Combine with existing entity type filtering |
| Combine with Dataview queries | "Show timeline of all events tagged #war" | **High** | Integration with Dataview plugin if present |
| Grouped timelines | Separate swim lanes per entity type | **Medium-High** | vis-timeline supports grouping |
| Double-click to create | Create new note with date auto-populated | **Medium** | Similar to Timeline View plugin pattern |

**Value:** Obsidian has multiple timeline plugins ([Timeline View](https://github.com/b-camphart/timeline-view), [Chronos](https://github.com/clairefro/obsidian-plugin-chronos), [Auto Timelines](https://github.com/April-Gras/obsidian-auto-timelines)), but none integrate with MCP servers. Hivemind can bridge MCP temporal queries with visual timeline rendering, creating a unique "query from AI, visualize in Obsidian" workflow.

### Anti-Features (Deliberately NOT Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Custom calendar systems | Scope creep - D&D worlds with 13-month years, etc. | Use ISO dates only, users can add custom calendar in note content if needed |
| Timeline editing/dragging | Introduces data mutation complexity in UI | Keep timeline read-only, edit dates in note frontmatter |
| Recurring events | Complex scheduling logic out of scope | Single date or date range only |
| Timeline animations/transitions | Eye candy without value, performance cost | Static rendering with zoom/pan only |
| Timeline snapshots/versions | Version control is git's job | Don't duplicate git functionality |
| Calendar view (month grid) | Different UX paradigm, not timeline | Focus on linear timeline, not calendar grids |

**Rationale:** Timeline features should enhance existing workflows (query → visualize), not replace them (edit in UI). Obsidian vault remains source of truth, timeline is read-only view.

---

## 2. Relationship Graph Visualization

### Table Stakes (Must Have)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Node-link diagram | Standard graph representation | **Low** | Cytoscape.js or vis-network |
| Pan and zoom | Basic navigation for any graph | **Low** | Library provides this |
| Node labels | Identify entities | **Low** | Entity name from frontmatter |
| Edge labels | Show relationship type | **Low** | Relationship type from schema |
| Click node to open note | Navigate from graph to content | **Medium** | Obsidian vault API |
| Local graph view | Focus on one entity + connected neighbors | **Medium** | Query 1-hop or 2-hop relationships from SQLite |
| Filter by entity type | Show only characters, hide locations, etc. | **Medium** | Combine with existing type filtering |
| Search/highlight nodes | Find specific entity in large graph | **Medium** | Library search + visual highlight |

**Dependencies:** Relationship data already in SQLite (extracted from markdown links), entity metadata in frontmatter.

**Rationale:** Interactive graph navigation is expected in modern knowledge management tools. Obsidian has built-in graph view, but it shows file-level links. Hivemind can show **entity-level semantic relationships** (e.g., "character X allies_with character Y") with typed edges.

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Typed relationship edges | Show "manages" vs "allies_with" vs "located_in" | **Low** | Already in template system, just visualize |
| MCP graph traversal tools | AI can query "who is connected to X?" | **Medium** | New MCP tools: get_neighbors, get_subgraph |
| Expand/collapse nodes | Progressive disclosure for large graphs | **Medium** | Cytoscape.js has extension for this |
| Custom node styling by type | Different colors/shapes for characters vs locations | **Medium** | CSS + entity type metadata |
| Filtering with live update | Toggle filters, graph updates immediately | **Medium** | Library + reactive state management |
| Shortest path highlighting | "How are X and Y connected?" | **Medium-High** | Graph algorithm + visual highlight |
| Cluster detection | Auto-group tightly connected entities | **High** | Community detection algorithm (Louvain, etc.) |
| Workspace mode (persistent layouts) | Save graph view configurations | **High** | Requires state persistence |

**Value:** Obsidian's graph view is file-based. Hivemind's graph is **semantic** - relationships have meaning defined by the template system. This enables typed queries ("show all characters who are allies") that vanilla Obsidian cannot do.

### Anti-Features (Deliberately NOT Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| 3D graph visualization | Gimmick, poor UX for actual use | 2D with good layout algorithms |
| Graph editing (drag edges, create nodes) | Data mutation in UI, source of truth conflicts | Read-only graph, edit relationships in markdown |
| Physics-based layout only | Can create unstable/unpredictable layouts | Offer multiple layout algorithms (force-directed, hierarchical, circular) |
| Showing all nodes by default | "Hairball" anti-pattern - too cluttered | Start with local view or filtered subset |
| Real-time collaborative editing | Complex CRDT/OT, out of scope | Single-user, vault is source of truth |
| Graph-level search across all vaults | Privacy/security boundary violation | One graph per vault |

**Rationale:** Graph visualization is for **exploration**, not **authoring**. The vault (markdown files) remains the canonical source. Graph should reveal patterns and connections, not become a second editing interface that conflicts with markdown.

---

## 3. Obsidian Community Plugin Submission

### Table Stakes (Must Have)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| README.md with purpose and usage | Required by Obsidian submission guidelines | **Low** | Documentation already exists, may need formatting |
| LICENSE file | Required - Obsidian reviews this | **Low** | Already have MIT license |
| manifest.json with correct fields | Plugin metadata - id, name, author, version, minAppVersion | **Low** | Already exists in plugin codebase |
| GitHub release matching version | Release tag must exactly match manifest.json version | **Low** | CI/CD automation |
| main.js and styles.css in release | Required files for plugin installation | **Low** | Build process already produces these |
| Submission to obsidian-releases repo | PR to community-plugins.json | **Low** | One-time manual PR |
| No GPL/AGPL dependencies | License compliance enforced by Obsidian | **Low** | Already have license compliance CI gate (v3.1) |

**Dependencies:** None - these are procedural requirements, not technical features.

**Rationale:** Community plugin submission is a structured process with clear documentation. Compliance is binary - either you meet requirements or you don't. No novel engineering required.

### Differentiators (None - Process is Standardized)

Community plugin submission is not a competitive feature. All plugins go through the same review process. Differentiation comes from **plugin functionality**, not submission mechanics.

### Anti-Features (Deliberately NOT Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-update checker in plugin | Obsidian handles this natively | Let Obsidian's plugin manager handle updates |
| Custom installation flow | Obsidian has standard install from community list | Follow standard Obsidian installation |
| Bundled dependencies in release | Increases size, potential license issues | Keep bundle minimal, tree-shake unused code |
| Beta/alpha channel in community repo | Community repo is for stable releases | Use GitHub releases for pre-release versions |
| Plugin marketplace features (reviews, ratings) | Not part of Obsidian plugin system | Rely on GitHub stars and community discussion |

**Rationale:** Obsidian's plugin ecosystem has established conventions. Don't fight the platform - align with how users expect Obsidian plugins to behave.

---

## Feature Dependencies

### Timeline → Graph
Timeline view could **optionally** show relationship connections (e.g., "Character X met Character Y on this date"), but this is not required for MVP. Timeline can stand alone as temporal filtering.

### Graph → Timeline
Graph nodes could **optionally** show temporal metadata (e.g., node size based on number of events associated), but this is not required for MVP. Graph can stand alone as relational exploration.

### Both → Plugin Submission
Timeline and graph features increase plugin value proposition, making community submission more compelling. However, plugin can be submitted at any time - even before timeline/graph features ship, if CLI and validation features alone are deemed useful.

**Recommended sequencing:**
1. MCP timeline query tools (date range filtering)
2. MCP graph traversal tools (get neighbors, get subgraph)
3. Obsidian visual timeline view
4. Obsidian interactive graph panel
5. Community plugin submission (after visual features are polished)

**Rationale:** Build query capabilities first (MCP tools), then visualizations (Obsidian UI). This allows testing query logic independently before adding UI complexity. Submit to community after UI is polished to make good first impression.

---

## Complexity Assessment

| Feature Category | Overall Complexity | Risk Factors |
|-----------------|-------------------|--------------|
| MCP timeline query tools | **Low** | SQL date filtering is straightforward |
| MCP graph traversal tools | **Low-Medium** | Graph queries are well-understood, SQLite supports recursive CTEs |
| Obsidian timeline view | **Medium** | Library integration, Obsidian API usage, date parsing edge cases |
| Obsidian graph view | **Medium-High** | Graph layout performance, filter state management, visual complexity |
| Community plugin submission | **Low** | Procedural, not technical |

**Critical path:** Graph visualization is the highest complexity. If scope must be cut, defer advanced graph features (expand/collapse, clustering) to post-v4.0.

---

## Known Pitfalls

### Timeline-Specific

1. **Date parsing timezone shifts** - When no time+timezone is provided, libraries may assume midnight UTC and convert to local time, causing dates to shift by one day. ([Common mistakes in date/time formatting](https://codeblog.jonskeet.uk/2015/05/05/common-mistakes-in-datetime-formatting-and-parsing/))
   - **Prevention:** Use date-only comparisons (no time component), ensure ISO format (YYYY-MM-DD) without time.

2. **MCP date handling footgun** - AI agents may make subtle errors with date queries that go undetected. ([MCP: Dates are a Footgun](https://www.danielcorin.com/til/mcp/dates-are-a-footgun/))
   - **Prevention:** Explicit tool descriptions with date format examples, validation in tool implementation.

3. **Missing date fields** - Not all entities will have dates (e.g., characters vs events).
   - **Prevention:** Make timeline queries entity-type aware, filter to types that have date fields.

### Graph Visualization-Specific

4. **Graph hairball** - Too many nodes renders as useless tangle. ([Graph visualization at scale](https://cambridge-intelligence.com/visualize-large-networks/))
   - **Prevention:** Start with local view (1-hop neighbors), limit default node count, require filtering for large graphs.

5. **Performance degradation** - Cytoscape.js and vis-network slow down with 1000+ nodes.
   - **Prevention:** Lazy loading, viewport culling, limit visible nodes to ~500 max.

6. **Layout instability** - Force-directed layouts can be unpredictable, nodes "bounce around".
   - **Prevention:** Offer multiple layout algorithms (hierarchical, circular, grid), allow layout locking.

7. **Clutter from overlapping labels** - Node labels covering each other. ([Graph visualization UX mistakes](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/))
   - **Prevention:** Label visibility toggle, show labels on hover only, smart label positioning.

### Obsidian Plugin Submission

8. **GitHub release tag format** - Tag must match manifest.json version exactly (1.2.3, not v1.2.3).
   - **Prevention:** CI validation that compares git tag to manifest.json before release.

9. **Validation workflow failures** - Obsidian's validate-plugin-entry.yml will auto-reject PRs that don't meet schema.
   - **Prevention:** Run local validation before submitting PR, check obsidian-releases repo for examples.

---

## MVP Recommendation

### Phase 1: Timeline Queries (MCP Tools)
1. **MCP tool: query_by_date_range** - Filter entities by date field
2. **MCP tool: query_by_date** - Filter entities by exact date
3. Date validation and error handling

**Defer to later:**
- Visual timeline in Obsidian (can query via MCP without UI)
- Timeline view customization (scales, grouping, etc.)

### Phase 2: Graph Queries (MCP Tools)
1. **MCP tool: get_neighbors** - Get directly connected entities (1-hop)
2. **MCP tool: get_subgraph** - Get subgraph around entity (configurable depth)
3. Return relationship types in results

**Defer to later:**
- Visual graph in Obsidian (can query via MCP without UI)
- Advanced graph algorithms (shortest path, clustering)

### Phase 3: Obsidian Visualizations
1. Timeline view panel (read-only, vis-timeline integration)
2. Graph view panel (read-only, Cytoscape.js or vis-network)
3. Basic filtering (by entity type)

**Defer to later:**
- Advanced timeline features (grouping, double-click create)
- Advanced graph features (expand/collapse, clustering, workspace mode)

### Phase 4: Plugin Submission
1. README polish (screenshots, usage examples)
2. Release automation (git tag → GitHub release)
3. Submit PR to obsidian-releases

**Defer to never:**
- Custom update mechanisms (Obsidian handles this)
- Beta channels in community repo

**Rationale:** Prioritize MCP query tools first (enables AI interaction), then visualizations (enhances UX), then submission (distribution). Each phase delivers value independently - don't block submission on "perfect" visualizations.

---

## Sources

### Timeline & Date Queries
- [Obsidian Timeline Plugins](https://www.obsidianstats.com/tags/timeline)
- [Timeline View Plugin](https://github.com/b-camphart/timeline-view)
- [Chronos Timeline Plugin](https://github.com/clairefro/obsidian-plugin-chronos)
- [vis-timeline Documentation](https://visjs.github.io/vis-timeline/docs/timeline/)
- [Dataview Date Query Examples](https://forum.obsidian.md/t/dataview-query-frontmatter-date/53319)
- [Common Date/Time Mistakes](https://codeblog.jonskeet.uk/2015/05/05/common-mistakes-in-datetime-formatting-and-parsing/)
- [MCP: Dates are a Footgun](https://www.danielcorin.com/til/mcp/dates-are-a-footgun/)
- [World Anvil Timelines](https://www.worldanvil.com/features/timelines)
- [LegendKeeper Timeline Maker](https://www.legendkeeper.com/timeline-maker)

### Graph Visualization
- [Juggl Plugin (Cytoscape.js)](https://github.com/HEmile/juggl)
- [Cytoscape.js Documentation](https://js.cytoscape.org/)
- [Graph Visualization at Scale](https://cambridge-intelligence.com/visualize-large-networks/)
- [Graph Visualization UX](https://cambridge-intelligence.com/graph-visualization-ux-how-to-avoid-wrecking-your-graph-visualization/)
- [Cytoscape.js Expand/Collapse Extension](https://github.com/iVis-at-Bilkent/cytoscape.js-expand-collapse)
- [Obsidian Graph View Documentation](https://help.obsidian.md/plugins/graph)
- [Extended Graph Plugin](https://github.com/ElsaTam/obsidian-extended-graph/)
- [Graph Visualization Anti-Patterns](https://livebook.manning.com/book/graph-databases-in-action/chapter-10/v-9/)
- [Knowledge Graph Visualization Guide](https://datavid.com/blog/knowledge-graph-visualization)

### Obsidian Plugin Submission
- [Submit Your Plugin (Obsidian Docs)](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Submission Requirements (Obsidian Docs)](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Plugin Guidelines (Obsidian Docs)](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [obsidian-releases Repository](https://github.com/obsidianmd/obsidian-releases)

### MCP Server Patterns
- [MCP Tool Descriptions Best Practices](https://www.merge.dev/blog/mcp-tool-description)
- [Obsidian MCP Server Examples](https://github.com/cyanheads/obsidian-mcp-server)
- [MCP Server Best Practices for 2026](https://www.cdata.com/blog/mcp-server-best-practices-2026)

---

**Research confidence:**
- Timeline queries: **HIGH** (verified with Dataview docs, vis-timeline docs, multiple plugin examples)
- Graph visualization: **MEDIUM-HIGH** (verified with Cytoscape.js docs, Juggl plugin, graph UX research)
- Plugin submission: **HIGH** (official Obsidian documentation, validation workflow)
- Feature complexity: **MEDIUM** (based on library capabilities and existing Hivemind architecture)

**Open questions:**
- Performance threshold for graph rendering in Obsidian context (needs profiling with real vaults)
- Optimal default graph layout algorithm for knowledge graphs (may need user preference)
- Timeline view UX for entities without dates (filter out? show separately? needs design decision)

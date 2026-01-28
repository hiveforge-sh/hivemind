# Project Research Summary

**Project:** Hivemind v4.0 - Timeline Queries, Graph Visualization, Obsidian Community Plugin Submission
**Domain:** Knowledge management MCP server with temporal and relational query capabilities
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

Hivemind v4.0 adds three complementary capabilities to an existing MCP server + Obsidian plugin system: timeline queries for temporal exploration, graph visualization for relationship discovery, and community plugin submission for distribution. The recommended approach prioritizes **lightweight, purpose-built solutions** over feature-rich libraries to maintain the sub-5MB bundle size required for Obsidian Sync compatibility.

The critical insight: **avoid heavyweight visualization libraries**. Use sigma.js + graphology (~60KB) for graph visualization with WebGL rendering to handle 1000+ node vaults. Build custom timeline visualization with native DOM/CSS (0KB overhead) rather than vis-timeline (~500KB). This keeps the plugin lean while delivering performant visualizations. For the MCP server, no new dependencies are needed—existing SQLite with recursive CTEs handles timeline queries and graph traversal efficiently.

Key risks center on **date timezone handling** (ambiguous YAML dates cause cross-timezone query inconsistencies), **SQLite date query performance** (requires dedicated indexed columns, not JSON extraction), and **Obsidian plugin review requirements** (manifest version mismatches, child_process usage needs justification, bundle size limits). All are mitigatable with proper indexing, ISO8601 UTC standardization, and disciplined dependency management backed by existing v3.1 CI gates for license compliance.

## Key Findings

### Recommended Stack

The research strongly recommends **sigma.js + graphology** for graph visualization and **custom timeline implementation** for temporal views, both integrated into the existing Obsidian plugin. The MCP server requires no new dependencies—existing SQLite handles temporal and graph queries.

**Core stack additions:**
- **sigma.js (v3.0.2)**: WebGL-based graph rendering for 1000+ node performance — MIT licensed, ~50KB minified, significantly faster than Canvas-based alternatives (Cytoscape.js, vis-network)
- **graphology (latest)**: Graph data structure required by sigma.js — MIT licensed, ~11.5KB minified, provides manipulation APIs for building graphs from MCP relationship data
- **Custom timeline (native DOM + CSS)**: Zero bundle impact timeline rendering — Avoids vis-timeline's 300-500KB overhead, timelines for knowledge graphs are simple enough for native implementation

**Critical constraint:** Obsidian Sync has a 5MB per-file limit. The Excalidraw plugin (~8MB) fails to sync for paying users. Current Obsidian plugin main.js is ~150KB. Adding sigma.js + graphology adds ~60-70KB (well within budget), while vis-timeline + vis-network would add ~1-1.5MB (dangerous territory).

**Rejected alternatives:**
- vis-timeline/vis-network: Too heavy (~1MB combined), features beyond needs
- Cytoscape.js: Performance issues at 1000+ nodes, Canvas-based (no WebGL)
- D3.js: Requires custom implementation, steeper learning curve, larger bundle
- React/Vue/Svelte: Obsidian uses native APIs, framework overhead unnecessary

### Expected Features

Based on analysis of existing Obsidian timeline/graph plugins and knowledge management tools, features fall into three clear tiers.

**Must have (table stakes):**
- Date range filtering (MCP tool) — Standard query pattern for temporal data, low complexity
- Graph node-link diagram with pan/zoom — Standard graph representation, libraries provide this
- Local graph view (focus on one entity) — Users expect to explore connections incrementally
- ISO date format support (YYYY-MM-DD) — Dataview/Obsidian compatibility requirement
- Click navigation (graph/timeline → note) — Core UX expectation in Obsidian ecosystem
- Filter by entity type — Basic organization for multi-template vaults

**Should have (differentiators):**
- Typed relationship edges — Hivemind's unique value: show "manages" vs "allies_with" vs "located_in" semantically
- MCP graph traversal tools — AI can query "who is connected to X?" programmatically
- Visual timeline view in Obsidian — See temporal relationships at a glance (not just raw query results)
- Expand/collapse graph nodes — Progressive disclosure for large vaults
- Custom node styling by type — Different colors/shapes for characters vs locations vs events

**Defer to v2+ (anti-features for MVP):**
- Timeline editing/dragging — Introduces data mutation complexity, vault is source of truth
- Custom calendar systems — Scope creep (D&D 13-month years), use ISO dates only
- 3D graph visualization — Gimmick with poor UX, 2D with good layout is superior
- Graph editing (drag edges, create nodes) — Source of truth conflicts with markdown
- Real-time collaborative editing — Complex CRDT/OT, out of scope for single-user vault model

### Architecture Approach

The architecture follows a **hybrid search strategy** combining vector RAG (semantic relevance) with GraphRAG (structured relationships), both served via MCP tools and visualized in the Obsidian plugin. Timeline and graph capabilities layer on top of existing vault-to-SQLite infrastructure without breaking current functionality.

**Major components:**
1. **MCP Timeline Tools** — New tools (query_entities_by_date_range) built on existing SQLite schema with dedicated date columns for indexing performance, returns JSON for visualization
2. **MCP Graph Traversal** — New tools (get_relationship_graph) using SQLite recursive CTEs to traverse relationships up to N levels, outputs graphology-compatible format
3. **Obsidian Timeline View** — Custom ItemView component using native DOM rendering, queries MCP for date-range data, renders chronological items with filtering
4. **Obsidian Graph View** — ItemView with sigma.js renderer, queries MCP for subgraphs, renders in WebGL canvas with expand/collapse and type-based styling
5. **Incremental Indexing** — Extend existing file watcher to extract date fields into dedicated SQLite columns (not JSON blobs) for query performance

**Data flow:**
```
User (Obsidian) → Timeline/Graph View → MCP request → SQLite query → JSON response → Visualization
```

**Critical architectural decision:** Plugin reads relationship types from template registry (not hardcoded), avoiding the existing tech debt where FRONTMATTER_TEMPLATES are duplicated between plugin and server. This ensures graph visualization works correctly across all templates (worldbuilding, research, personal).

### Critical Pitfalls

Research identified 16 pitfalls across three categories (timeline, graph, submission), with 6 critical issues that could cause data corruption, review rejection, or system failure.

1. **Date timezone ambiguity corrupts timeline queries** — YAML date-only values default to midnight UTC, causing "June 15" to appear as "June 14" in Los Angeles or "June 16" in Tokyo. **Prevention:** Store dates in ISO8601 UTC format (YYYY-MM-DDTHH:MM:SSZ), normalize to UTC before SQLite comparison, cross-timezone testing required.

2. **SQLite date query performance without proper indexing** — Date fields stored in JSON blob require extraction per row, causing 8-second queries on 50K entities. **Prevention:** Dedicated date columns (date_created, date_modified) with CREATE INDEX, use BETWEEN not LIKE, run EXPLAIN QUERY PLAN to verify index usage.

3. **Graph visualization bundle size explosion** — vis-network alone is 1.2MB, pushing main.js toward 5MB Obsidian Sync limit. **Prevention:** Use sigma.js + graphology (~60KB total), lazy load graph view, tree-shake aggressively, monitor bundle size in CI.

4. **Obsidian plugin review manifest version mismatch** — Git tag `v1.2.0` vs manifest.json `1.2.0` (no `v` prefix) causes automated rejection. **Prevention:** Automated version bumping script, CI validates package.json = manifest.json = git tag, release checklist.

5. **GPL/AGPL dependency in transitive tree** — Graph library dependency chains can include GPL utilities, failing v3.1 license CI gate. **Prevention:** Pre-audit with `npx license-checker --failOn "GPL;AGPL"` before adding dependencies, maintain CI enforcement.

6. **child_process import fails plugin review** — Current plugin uses child_process to spawn MCP server (flagged tech debt in PROJECT.md), requires security review justification. **Prevention:** Document necessity or redesign to connect to user-run server via network, communicate with review team early.

**Moderate pitfalls** (7-11): Date range edge cases (inclusive vs exclusive), graph performance without virtualization, CORS with requestUrl vs fetch, timeline overcrowding, template relationship data mismatch.

**Integration-specific pitfalls** (15-16): Timeline tools duplicating existing query_X tools, backward compatibility with vaults using non-standard date field names.

## Implications for Roadmap

Based on combined research, the recommended approach is **four sequential phases** that prioritize query capabilities (MCP tools) before visualizations (Obsidian UI), allowing testing of data layer independently before adding UI complexity.

### Phase 1: Timeline Query Foundation (MCP Tools)

**Rationale:** Build temporal query capabilities first without UI dependencies. This enables AI interaction via MCP immediately and validates date handling before visualization complexity.

**Delivers:**
- MCP tools: query_entities_by_date_range, query_by_date
- SQLite schema migration: dedicated date columns with indexes
- ISO8601 UTC date normalization
- Date validation in `hivemind validate` command

**Addresses:**
- Table stakes: Date range filtering, ISO date format support (FEATURES.md)
- Architecture: MCP Timeline Tools component (ARCHITECTURE.md)
- Stack: No new dependencies, existing SQLite + better-sqlite3 (STACK.md)

**Avoids:**
- Pitfall #1: Date timezone ambiguity (critical)
- Pitfall #2: SQLite date query performance (critical)
- Pitfall #7: Date range edge cases (moderate)

**Research flag:** HIGH — Date timezone handling requires careful design, cross-timezone testing, migration strategy for existing vaults with varied date field names.

---

### Phase 2: Graph Traversal Foundation (MCP Tools)

**Rationale:** Build graph query capabilities independent of visualization. Enables AI to query relationships programmatically before adding UI rendering complexity.

**Delivers:**
- MCP tools: get_relationship_graph, get_neighbors (with depth limiting)
- SQLite recursive CTE queries for graph traversal
- Graphology-compatible JSON output format
- Relationship type filtering

**Addresses:**
- Differentiators: MCP graph traversal tools, typed relationship edges (FEATURES.md)
- Architecture: MCP Graph Traversal component (ARCHITECTURE.md)
- Stack: Existing SQLite with recursive CTEs (STACK.md)

**Avoids:**
- Pitfall #14: Graph tools returning too much data (minor)
- Pitfall #15: Timeline/graph tools duplicating existing query_X tools (integration)

**Research flag:** MEDIUM — Graph traversal patterns well-documented, but integration with existing relationship schema and template system needs careful testing.

---

### Phase 3: Visual Timeline & Graph Views (Obsidian Plugin)

**Rationale:** Add visualization after query foundations are solid. This phase has highest risk (bundle size, performance, library integration) so it's isolated after data layer is proven.

**Delivers:**
- Obsidian Timeline View (custom DOM rendering)
- Obsidian Graph View (sigma.js + graphology)
- Bundle size monitoring in CI
- Performance testing with 5,000+ node vaults
- Template registry integration (remove FRONTMATTER_TEMPLATES duplication)

**Addresses:**
- Differentiators: Visual timeline view, expand/collapse graph nodes, custom node styling (FEATURES.md)
- Must haves: Graph node-link diagram, local graph view, click navigation (FEATURES.md)
- Architecture: Obsidian Timeline/Graph View components (ARCHITECTURE.md)
- Stack: sigma.js v3.0.2, graphology, custom timeline (STACK.md)

**Avoids:**
- Pitfall #3: Bundle size explosion (critical)
- Pitfall #5: GPL/AGPL dependency (critical)
- Pitfall #8: Graph performance degradation (moderate)
- Pitfall #9: CORS with requestUrl (moderate)
- Pitfall #10: Timeline overcrowding (moderate)
- Pitfall #11: Template relationship data mismatch (moderate)

**Research flag:** HIGH — Complex integration with highest risk. Library selection, bundle optimization, performance testing with large vaults, license auditing all critical. Template registry deduplication touches both plugin and server.

---

### Phase 4: Community Plugin Submission

**Rationale:** Submit after visual features are polished to make strong first impression. Allows addressing child_process tech debt and ensuring compliance before review.

**Delivers:**
- README polish (screenshots, usage examples)
- Release automation (version consistency, git tagging)
- child_process resolution (document or remove)
- License compliance verification
- Submission PR to obsidian-releases

**Addresses:**
- Procedural: Community plugin submission requirements (FEATURES.md)
- Architecture: Distribution model (ARCHITECTURE.md)
- Stack: Obsidian plugin submission requirements (STACK.md)

**Avoids:**
- Pitfall #4: Manifest version mismatch (critical)
- Pitfall #6: child_process review rejection (critical)

**Research flag:** MEDIUM — Well-documented submission process, but child_process exception requires review team communication. Unknown precedent for approval.

---

### Phase Ordering Rationale

- **Query tools before visualizations:** Validates data layer independently, enables testing with MCP clients before UI complexity. Follows FEATURES.md MVP recommendation.
- **Timeline before graph:** Timeline queries are simpler (date range filtering), graph traversal is more complex (recursive CTEs, relationship types). Build confidence with simpler feature first.
- **Visualization as single phase:** Timeline and graph views share common concerns (bundle size, performance, template integration). Combining allows unified approach to library selection, lazy loading, and CI monitoring.
- **Submission last:** Polish UI first, then submit. Avoid review comments on incomplete features. Address child_process tech debt before scrutiny.

**Dependency flow:**
```
Phase 1 (Timeline MCP) → Phase 3 (Timeline View) → Phase 4 (Submission)
Phase 2 (Graph MCP)    → Phase 3 (Graph View)    ↗
```

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1 (Timeline MCP):** HIGH — Date timezone handling patterns require cross-timezone test design, migration strategy for existing vaults with varied date field names (date, created, timestamp, when), ISO8601 normalization approach.

- **Phase 3 (Visualization):** HIGH — Library bundle size actual measurements (not just specs), performance profiling with 5K+ node vaults, lazy loading implementation strategy, template registry integration plan (affects both plugin and server).

- **Phase 4 (Submission):** MEDIUM — child_process exception precedent research (contact review team or analyze approved plugins), release automation implementation.

**Phases with standard patterns (skip deep research):**

- **Phase 2 (Graph MCP):** MEDIUM — SQLite recursive CTEs well-documented, graphology output format straightforward, existing relationship schema provides foundation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Clear recommendations (sigma.js, custom timeline), library comparisons validated across multiple sources, bundle size measurements available |
| Features | MEDIUM-HIGH | Table stakes verified with Obsidian plugin ecosystem analysis, differentiators informed by template system capabilities, MVP scoping clear |
| Architecture | HIGH | Hybrid search pattern well-documented, component boundaries leverage existing system, integration points identified, data flow validated |
| Pitfalls | MEDIUM-HIGH | Critical issues identified with concrete prevention strategies, but cross-timezone testing and child_process exception outcome uncertain |

**Overall confidence:** HIGH

Research is comprehensive with multiple source verification for critical decisions. Stack recommendations based on performance comparisons and bundle size analysis. Architecture leverages existing Hivemind components effectively. Pitfalls identified with concrete detection and prevention strategies.

### Gaps to Address

**During planning/implementation:**

1. **Obsidian plugin review specific requirements** — Official docs partially inaccessible during WebSearch. Action: Fetch complete submission guidelines directly, communicate with review team early about child_process usage.

2. **child_process exception precedent** — Unknown how many plugins successfully use child_process with approval. Action: Research existing approved plugins (search GitHub for "obsidian plugin child_process"), contact review team for guidance before submission.

3. **Graph library bundle size actual measurements** — Recommendations based on published specs. Action: Bundle sigma.js + graphology in test branch, measure actual main.js size, compare to alternatives if over budget.

4. **SQLite date column migration strategy** — Adding date columns to existing production databases requires careful approach. Action: Test migration with various vault sizes (100, 1000, 10000 entities), validate backward compatibility with v1.0-v3.1 vaults.

5. **Cross-timezone date handling validation** — Timezone handling patterns require real-world testing. Action: Build test suite with dates spanning UTC-12 to UTC+12, test query results across timezone contexts, validate with users in different regions.

**During execution:**

6. **Template registry integration impact** — Removing FRONTMATTER_TEMPLATES duplication touches both plugin and server. Action: Careful refactoring with integration tests, ensure all three templates (worldbuilding, research, personal) work correctly in graph view.

7. **Performance thresholds for large vaults** — Need empirical data on graph rendering limits. Action: Profile with 1K, 5K, 10K node vaults, establish frame rate targets (30+ FPS), implement progressive rendering if needed.

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [sigma.js official site](https://www.sigmajs.org/) — Graph library capabilities, API documentation
- [graphology official site](https://graphology.github.io/) — Graph data structure, bundle size (11.5KB)
- [Obsidian Plugin Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) — Official guidelines, manifest validation
- [SQLite Date And Time Functions](https://sqlite.org/lang_datefunc.html) — Date query patterns, timezone handling
- [Bundle size monitoring](https://bundlephobia.com/) — Dependency size verification

**Architecture Research:**
- [MCP Spec](https://modelcontextprotocol.io/) — Protocol patterns, transport layer
- [GraphRAG vs Vector RAG](https://arxiv.org/html/2408.04948v1) — HybridRAG approach
- [Local-First Software](https://www.inkandswitch.com/local-first/) — Architecture principles
- [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin) — Plugin structure, best practices

**Features Research:**
- [Obsidian Timeline Plugins](https://www.obsidianstats.com/tags/timeline) — Feature comparison (Timeline View, Chronos, Auto Timelines)
- [Dataview Date Query Examples](https://forum.obsidian.md/t/dataview-query-frontmatter-date/53319) — User expectations, date format patterns
- [Juggl Plugin](https://github.com/HEmile/juggl) — Graph visualization precedent in Obsidian

**Pitfalls Research:**
- [Common Date/Time Mistakes - Jon Skeet](https://codeblog.jonskeet.uk/2015/05/05/common-mistakes-in-datetime-formatting-and-parsing/) — Timezone handling best practices
- [Graph visualization at scale - Cambridge Intelligence](https://cambridge-intelligence.com/visualize-large-networks/) — Performance patterns, virtualization strategies
- [Excalidraw 5MB issue](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/2349) — Bundle size limits, Obsidian Sync constraints

### Secondary (MEDIUM confidence)

**Performance Comparisons:**
- [sigma.js vs Cytoscape.js performance](https://weber-stephen.medium.com/the-best-libraries-and-methods-to-render-large-network-graphs-on-the-web-d122ece2f4dc) — Library benchmarks
- [Comparison of JavaScript Graph Libraries](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/) — Feature matrix
- [Force-Directed Graph - WebGL & Canvas with PIXI.js](https://observablehq.com/@dianaow/force-directed-graph-webgl-canvas-with-pixi-js) — WebGL rendering patterns

**Community Forum Evidence:**
- [Obsidian Graph View Performance](https://forum.obsidian.md/t/obsidian-with-very-large-vaults-performance-results/30635) — User reports on large vaults
- [Using GitHub actions to release plugins](https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877) — Release automation patterns
- [child_process Security Concerns](https://forum.obsidian.md/t/when-i-use-child-process-in-nodejs-i-get-the-following-error-and-i-dont-know-why/56211) — Review team stance

### Tertiary (LOW confidence, needs validation)

- [MCP: Dates are a Footgun](https://www.danielcorin.com/til/mcp/dates-are-a-footgun/) — AI agent date handling issues (community blog)
- [Timeliner GitHub](https://github.com/zz85/timeliner) — Lightweight timeline alternative (unmaintained)
- [Arbitrary Code Execution via child_process](https://github.com/blacksmithgu/obsidian-dataview/issues/615) — Security precedent (needs verification)

---

*Research completed: 2026-01-27*
*Ready for roadmap: yes*

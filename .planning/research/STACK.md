# Stack Research: Hivemind v4.0

**Project:** Hivemind MCP Server
**Focus:** Timeline queries, graph visualization, Obsidian community plugin submission
**Researched:** 2026-01-27
**Overall Confidence:** HIGH

## Executive Summary

Research focused on stack additions for three new capabilities: timeline/date-range queries, relationship graph visualization, and Obsidian community plugin submission. Key finding: **avoid heavyweight visualization libraries** in the Obsidian plugin to stay under the 5MB Obsidian Sync limit. Recommend lightweight, purpose-built solutions over feature-rich but bloated alternatives.

---

## Recommended Stack Additions

### Timeline Visualization (Obsidian Plugin)

**DO NOT ADD: vis-timeline**
- Version: 8.5.0
- License: Apache-2.0 / MIT (dual-licensed) ✓
- Bundle size: ~300-500KB minified
- **WHY NOT:** Heavyweight library with features beyond our needs. Contributes to bundle bloat when combined with graph visualization. Risk of exceeding 5MB Obsidian Sync limit.

**RECOMMENDED: Custom Timeline Implementation**
- **Approach:** Use native DOM + CSS for timeline rendering
- **Why:**
  - Zero bundle size impact
  - Timeline UI is simple: horizontal axis with date markers, vertical items
  - Full control over styling to match Obsidian's UI
  - No dependency management
- **Complexity:** LOW - timelines for knowledge graphs are simpler than project management tools
- **Integration:** Query MCP server for entities in date range, render in Obsidian view

**Alternative if custom is inadequate: Timeliner**
- Version: Latest (lightweight, no npm package)
- License: MIT-compatible ✓
- Bundle size: <10KB (entire library embedded in single JS file)
- Why: Designed for embedding, minimal dependencies, easy styling
- Source: [GitHub - zz85/timeliner](https://github.com/zz85/timeliner)

### Graph Visualization (Obsidian Plugin)

**RECOMMENDED: sigma.js + graphology**

#### sigma.js
- **Version:** 3.0.2 (latest stable, published March 2024)
- **License:** MIT ✓
- **Bundle size:** ~50KB minified + gzipped (estimated, not explicitly documented)
- **Why needed:**
  - WebGL-based rendering = handles large graphs (1000+ nodes) performantly
  - Designed specifically for network visualization (not general charting)
  - Modern TypeScript codebase with active maintenance (updated Jan 2026)
  - Significantly faster than Canvas-based alternatives (Cytoscape.js)
- **Integration:** Render knowledge graph relationships in interactive Obsidian panel
- **Installation:** `npm install sigma`
- **Sources:**
  - [Sigma.js official site](https://www.sigmajs.org/)
  - [sigma - npm](https://www.npmjs.com/package/sigma)
  - [Performance comparison](https://weber-stephen.medium.com/the-best-libraries-and-methods-to-render-large-network-graphs-on-the-web-d122ece2f4dc)

#### graphology
- **Version:** Latest stable (actively maintained)
- **License:** MIT ✓
- **Bundle size:** 11.5KB minified + gzipped
- **Why needed:**
  - Required dependency for sigma.js (graph data structure library)
  - Provides graph manipulation APIs (add/remove nodes, traverse, query)
  - sigma.js uses graphology as its data backend
- **Integration:** Build graph structure from MCP relationship data, pass to sigma.js for rendering
- **Installation:** `npm install graphology`
- **Sources:**
  - [Graphology official site](https://graphology.github.io/)
  - [Bundle size reference](https://bestofjs.org/projects/graphology)

**Combined bundle impact:** ~60-70KB minified + gzipped - acceptable for Obsidian plugin

**Why NOT Cytoscape.js:**
- Version: 3.33.1
- License: MIT ✓
- **Performance issues:** Users report ~1000 nodes + ~5000 edges causes browser overload
- **Architecture:** Canvas-based, no WebGL, no multithreading support
- **Documentation:** Better than sigma.js, but not worth performance cost
- **Use case mismatch:** Designed for biological/scientific graphs, overkill for knowledge graphs
- **Source:** [Cytoscape.js vs sigma.js comparison](https://javascriptio.com/view/1032021/cytoscape-js-large-data-performance-vs-sigma-js)

**Why NOT D3.js:**
- Requires custom graph layout implementation
- Steeper learning curve for network visualization
- Larger bundle size when including necessary modules
- Sigma.js is purpose-built for exactly our use case

**Why NOT vis-network:**
- Version: 10.0.2
- License: Apache-2.0 ✓
- Paired with vis-timeline creates excessive bundle size
- Sigma.js has superior performance for large graphs
- Adds ~400-600KB to bundle (estimated)

### MCP Server: Timeline Query Support

**NO NEW DEPENDENCIES REQUIRED**

Existing stack handles this:
- **SQLite + better-sqlite3:** Already supports date range queries via WHERE clauses
- **Zod:** Already validates date fields in schemas
- **TypeScript:** Type-safe date handling

**Implementation approach:**
- Add MCP tool: `query_entities_by_date_range(entity_type, start_date, end_date, date_field)`
- SQL: `SELECT * FROM entities WHERE date_field BETWEEN ? AND ? ORDER BY date_field`
- Return structured JSON for Obsidian plugin to render

### MCP Server: Graph Traversal Support

**NO NEW DEPENDENCIES REQUIRED**

Existing stack handles this:
- **SQLite:** Already stores relationships table
- **Recursive CTEs:** SQLite supports graph traversal queries
- **better-sqlite3:** Handles complex queries efficiently

**Implementation approach:**
- Add MCP tool: `get_relationship_graph(entity_id, depth, relationship_types?)`
- Use recursive CTE to traverse relationships up to N levels
- Return nodes + edges in format compatible with graphology

**Example SQL:**
```sql
WITH RECURSIVE graph(id, depth) AS (
  SELECT entity_id, 0 FROM relationships WHERE entity_id = ?
  UNION ALL
  SELECT r.related_id, g.depth + 1
  FROM relationships r JOIN graph g ON r.entity_id = g.id
  WHERE g.depth < ?
)
SELECT * FROM graph;
```

---

## Obsidian Community Plugin Submission Requirements

### Build & Bundle Configuration

**Current setup (GOOD):**
- esbuild for bundling ✓
- TypeScript compilation ✓
- External dependencies properly declared ✓
- Production build creates minified main.js ✓

**Required files for submission:**
1. **manifest.json** - Must include: id, name, version, minAppVersion, description, author
2. **main.js** - Bundled plugin code (keep under 5MB for Obsidian Sync compatibility)
3. **styles.css** - Optional styling
4. **LICENSE** - Required for new plugins (MIT recommended, already in project)
5. **README.md** - Must describe plugin purpose and usage

**Version management:**
- Git tag must exactly match manifest.json version (e.g., `1.0.0` not `v1.0.0`)
- Use semantic versioning
- Update versions.json for backward compatibility tracking

**Sources:**
- [Submit your plugin - Obsidian Developer Docs](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [GitHub - obsidian-releases](https://github.com/obsidianmd/obsidian-releases)

### Submission Process

1. **Prepare repository:**
   - Ensure LICENSE file exists (MIT ✓ - already in project)
   - Create GitHub release with exact version tag matching manifest.json
   - Release must include: manifest.json, main.js, styles.css (if used)

2. **Submit to obsidian-releases:**
   - Fork https://github.com/obsidianmd/obsidian-releases
   - Edit community-plugins.json, add entry at end:
     ```json
     {
       "id": "hivemind-obsidian",
       "name": "Hivemind MCP",
       "author": "HiveForge",
       "description": "MCP integration for knowledge management with timeline and graph visualization",
       "repo": "hiveforge-sh/hivemind"
     }
     ```
   - Open pull request using submission checklist template
   - Wait for automated validation (checks manifest match, release files, etc.)

3. **Review process:**
   - Review may take several weeks due to high volume
   - Reviewers check for: code quality, security, proper externals, no "Obsidian" in name
   - May request changes or improvements
   - Once approved, plugin appears in community list

**Key validation rules:**
- id, name, description must match between community-plugins.json and manifest.json
- No "Obsidian" in plugin name (redundant)
- GitHub release tag must exactly match version in manifest.json
- main.js must be present in release

**Source:** [Plugin submission process](https://github.com/obsidianmd/obsidian-releases/pulls)

### Bundle Size Constraints

**CRITICAL: 5MB Obsidian Sync Limit**
- Obsidian Sync has a 5MB per-file limit
- Plugin main.js files exceeding 5MB cannot sync for paying users
- Example: Excalidraw plugin (~8MB) fails to sync for Obsidian Sync users
- **Best practice:** Keep main.js under 2MB for headroom
- **Production builds:** Must minify (esbuild with `--minify` in production mode ✓)

**Current Obsidian plugin main.js size:** Unknown (need to measure after sigma.js addition)

**Estimated impact of additions:**
- sigma.js: ~50KB
- graphology: ~11.5KB
- Custom timeline (no library): 0KB
- **Total new dependencies:** ~60-70KB (well within budget)

**Mitigation if size becomes issue:**
- Use esbuild's tree-shaking (already enabled ✓)
- Ensure production builds exclude sourcemaps (already configured ✓)
- Consider code-splitting if main.js exceeds 3MB (unlikely with current plan)

**Sources:**
- [Excalidraw 5MB issue](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/2349)
- [Obsidian Sync file size limits](https://help.obsidian.md/Plans+and+storage+limits)
- [Plugin minification discussion](https://forum.obsidian.md/t/plugin-js-minification/82011)

---

## What NOT to Add

### vis-timeline (for timeline visualization)
**Why avoid:**
- Bundle size: ~300-500KB minified
- Features overkill: Designed for complex project timelines with zoom, pan, drag-drop editing
- Our use case: Simple chronological view of entities with dates
- **Verdict:** Custom implementation with native DOM is 0KB and sufficient

### vis-network (for graph visualization)
**Why avoid:**
- Bundle size: ~400-600KB minified (estimated)
- Performance: Canvas-based, slower than WebGL alternatives
- Pairing with vis-timeline creates ~1MB bundle overhead
- sigma.js is faster, lighter, better for knowledge graphs
- **Verdict:** sigma.js + graphology is superior choice

### Cytoscape.js (for graph visualization)
**Why avoid:**
- Performance issues: Struggles with 1000+ nodes
- Architecture limitations: No WebGL, no multithreading
- Use case mismatch: Designed for biological/chemical networks
- sigma.js is demonstrably faster for large graphs
- **Verdict:** Performance cost not justified despite better documentation

### D3.js (for either timeline or graph)
**Why avoid:**
- Massive bundle size if including necessary modules
- Requires significant custom implementation
- Steeper learning curve
- Purpose-built alternatives (sigma.js, custom timeline) are simpler
- **Verdict:** Overkill for our specific needs

### Chart.js / ECharts / Highcharts (general charting libraries)
**Why avoid:**
- Designed for statistical charts (bar, line, pie), not network graphs
- No built-in graph layout algorithms
- Would require custom graph rendering implementation
- **Verdict:** Wrong tool for the job

### React/Vue/Svelte frameworks (for Obsidian plugin UI)
**Why avoid:**
- Obsidian uses its own component system
- Adding framework adds 50-100KB+ to bundle
- Framework overhead unnecessary for plugin views
- **Verdict:** Use Obsidian's native APIs (already in place ✓)

### moment.js (for date handling)
**Why avoid:**
- Massive bundle size (~70KB minified)
- Native JavaScript Date + Intl APIs are sufficient
- Modern browsers support date formatting natively
- **Verdict:** No date library needed

### axios (for HTTP in MCP server)
**Why avoid:**
- Project already uses native fetch ✓
- No HTTP client needed for plugin (uses MCP protocol over stdio)
- **Verdict:** Already avoided correctly

### gray-matter (for frontmatter parsing in plugin)
**Why avoid:**
- Project milestone context says "native frontmatter parsing (no gray-matter)"
- Obsidian provides native APIs for reading frontmatter
- Adding external parser adds bundle size unnecessarily
- **Verdict:** Use Obsidian's built-in APIs

---

## Integration Notes

### Obsidian Plugin Architecture

**Current external dependencies (from esbuild.config.mjs):**
- obsidian (core API)
- electron
- @codemirror/* (editor integration)
- @lezer/* (syntax parsing)
- builtin Node modules

**New additions integrate as:**
1. **sigma.js + graphology:** Bundled into main.js (not external)
   - Import in graph view component
   - Initialize sigma renderer with canvas element
   - Populate graphology graph from MCP data
   - Attach to Obsidian ItemView for panel display

2. **Custom timeline:** Native code (no imports)
   - Implement in timeline view component
   - Use DOM manipulation (document.createElement, etc.)
   - Style with CSS (bundled into styles.css)
   - Query MCP for date range data

### MCP Server Architecture

**No dependencies added** - use existing stack:
- SQLite: Add new query patterns (date ranges, graph traversal)
- better-sqlite3: Execute complex queries efficiently
- Zod: Validate date inputs for new MCP tools
- @modelcontextprotocol/sdk: Register new tools (query_by_date_range, get_relationship_graph)

**New MCP tools:**
```typescript
// Add to tool generator
{
  name: "query_entities_by_date_range",
  inputSchema: {
    entity_type: z.string(),
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    date_field: z.string()
  }
}

{
  name: "get_relationship_graph",
  inputSchema: {
    entity_id: z.string(),
    depth: z.number().min(1).max(5),
    relationship_types: z.array(z.string()).optional()
  }
}
```

### Data Flow

```
Timeline Query Flow:
User (Obsidian)
  → Obsidian plugin timeline view
  → MCP request (query_entities_by_date_range)
  → MCP server SQLite query
  → JSON response (entities with dates)
  → Obsidian plugin renders custom timeline

Graph Query Flow:
User (Obsidian)
  → Obsidian plugin graph view
  → MCP request (get_relationship_graph)
  → MCP server recursive CTE query
  → JSON response (nodes + edges)
  → Plugin builds graphology graph
  → sigma.js renders in WebGL canvas
```

### Build Process Integration

**No changes needed to MCP server build:**
- Uses existing TypeScript → dist/ pipeline
- No new dependencies to compile

**Obsidian plugin build modifications:**
1. Add sigma + graphology to package.json dependencies
2. esbuild automatically bundles them into main.js
3. Keep existing externals (obsidian, electron, codemirror)
4. Production build minifies automatically ✓

**Bundle size monitoring:**
- Run `npm run build` in production mode
- Check main.js file size: `ls -lh obsidian-plugin/main.js`
- **Target:** Keep under 2MB (currently unknown, measure after implementation)
- **Hard limit:** Stay under 5MB for Obsidian Sync compatibility

### Testing Strategy

**MCP Server:**
- Add Vitest tests for date range queries
- Test recursive CTE graph traversal with mock data
- Validate JSON output format for graphology compatibility

**Obsidian Plugin:**
- Manual testing in development vault
- Test with large graphs (1000+ nodes) to verify sigma.js performance
- Test timeline with various date ranges and formats
- Verify bundle size stays under limits

### License Compatibility

**All recommendations are MIT or Apache-2.0 licensed:**
- sigma.js: MIT ✓
- graphology: MIT ✓
- Project license: MIT ✓
- **CI gate:** No GPL/AGPL dependencies ✓

**No license compliance issues expected.**

---

## Version Matrix

| Dependency | Version | License | Bundle Impact | Purpose |
|------------|---------|---------|---------------|---------|
| sigma | 3.0.2 | MIT | ~50KB | Graph rendering (WebGL) |
| graphology | latest | MIT | ~11.5KB | Graph data structure |
| **Total new** | - | - | **~60-70KB** | Graph visualization |

**Existing dependencies (unchanged):**
- better-sqlite3: 12.6.2 (MIT)
- zod: 4.3.6 (MIT)
- @modelcontextprotocol/sdk: 1.0.4 (MIT)
- obsidian: latest (Obsidian API)
- esbuild: 0.27.2 (MIT)
- TypeScript: 5.3.3 (Apache-2.0)

---

## Next Steps for Implementation

1. **Add dependencies to Obsidian plugin:**
   ```bash
   cd obsidian-plugin
   npm install sigma graphology
   ```

2. **Verify bundle size:**
   ```bash
   npm run build
   ls -lh main.js
   ```
   - If over 2MB, investigate tree-shaking or code-splitting
   - If over 5MB, reconsider library choices

3. **Implement MCP tools in server:**
   - Add date range query tool
   - Add graph traversal tool
   - Update tool generator to register new tools

4. **Implement Obsidian views:**
   - Create TimelineView component (custom implementation)
   - Create GraphView component (sigma.js + graphology)
   - Register views in plugin main.ts

5. **Test integration:**
   - Query MCP from Obsidian plugin
   - Render timeline with real data
   - Render graph with real relationships

6. **Prepare for submission:**
   - Ensure manifest.json is correct
   - Create GitHub release with exact version tag
   - Submit PR to obsidian-releases repository

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bundle size exceeds 5MB | LOW | HIGH | Monitor size, already under budget with current plan |
| sigma.js documentation gaps | MEDIUM | LOW | Active community, TypeScript types available, examples exist |
| Graph performance with 10K+ nodes | LOW | MEDIUM | sigma.js designed for this scale, fallback: pagination or filtering |
| Obsidian plugin rejection | LOW | MEDIUM | Follow submission checklist, existing plugin structure is solid |
| Date query performance on large vaults | LOW | LOW | SQLite indexed queries are fast, existing FTS5 proves performance |

---

## Sources

**Timeline Libraries:**
- [vis-timeline npm](https://www.npmjs.com/package/vis-timeline)
- [Lightweight timeline alternatives](https://themeselection.com/javascript-timeline-library/)
- [Timeliner GitHub](https://github.com/zz85/timeliner)

**Graph Libraries:**
- [sigma.js official](https://www.sigmajs.org/)
- [graphology official](https://graphology.github.io/)
- [Performance comparison: sigma.js vs Cytoscape.js](https://weber-stephen.medium.com/the-best-libraries-and-methods-to-render-large-network-graphs-on-the-web-d122ece2f4dc)
- [Cytoscape.js npm](https://www.npmjs.com/package/cytoscape)
- [Graph library comparison](https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool)

**Obsidian Plugin Submission:**
- [Submit your plugin - Obsidian Docs](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [obsidian-releases GitHub](https://github.com/obsidianmd/obsidian-releases)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)

**Bundle Size & Performance:**
- [Excalidraw 5MB issue](https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/2349)
- [Obsidian Sync limits](https://help.obsidian.md/Plans+and+storage+limits)
- [Bundle size monitoring](https://bundlephobia.com/)
- [Graphology bundle size](https://bestofjs.org/projects/graphology)

**Build Configuration:**
- [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [esbuild plugin for Obsidian](https://github.com/eth-p/esbuild-plugin-obsidian)
- [Plugin development workflow](https://medium.com/@lukasbach/a-more-streamlined-development-workflow-for-obsidian-plugins-2a74b0c57c0f)

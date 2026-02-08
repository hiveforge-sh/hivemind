# Architecture Patterns for Timeline Queries & Graph Visualization

**Domain:** Knowledge Graph MCP Server + Obsidian Plugin
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

Timeline queries and graph visualization integrate naturally with Hivemind's existing architecture. The MCP server already has SQLite storage with date fields, a graph builder extracting relationships, and a tool generator for dynamic MCP tools. Graph visualization requires new Obsidian ItemView components but leverages existing graph data. Timeline queries need SQL enhancements and new MCP tools but use existing database schema.

**Key insight:** Both features are *data presentation layers* over existing infrastructure, not architectural rewrites.

## Current Architecture (Baseline)

### MCP Server Components

```
src/server.ts
├─ Tool Registration
│  ├─ Dynamic tools via tool-generator.ts
│  └─ Static tools (search_vault, etc.)
├─ Database Layer (graph/database.ts)
│  ├─ SQLite with FTS5 for search
│  ├─ nodes table (entities)
│  └─ relationships table (edges)
├─ Graph Builder (graph/builder.ts)
│  ├─ Extracts wikilinks
│  ├─ Infers relationship types from templates
│  └─ Creates bidirectional edges
├─ Search Engine (search/engine.ts)
│  ├─ FTS5 full-text search
│  └─ Graph traversal integration
└─ Template System (templates/)
   ├─ Registry for active template
   ├─ Schema factory for validation
   └─ Folder mapper for auto-detection
```

### Obsidian Plugin Architecture

```
obsidian-plugin/main.ts
├─ Standalone Plugin (no runtime dep on @hiveforge/hivemind-mcp)
├─ Settings UI
├─ Frontmatter Templates
├─ Folder Detection (uses shared FolderMapper)
└─ Future: Custom Views (timeline, graph)
```

**Critical constraint:** Obsidian plugin is intentionally standalone for portability. Cannot import MCP server code at runtime. Shares static utilities only (e.g., FolderMapper, template types).

## Integration Architecture

### Timeline Queries Integration

Timeline queries query entities with date fields and order results chronologically. Existing infrastructure provides 90% of requirements.

#### Component Changes

| Component | Modification Type | Changes Needed |
|-----------|------------------|----------------|
| **graph/database.ts** | EXTEND | Add `queryByDateRange()` method |
| **mcp/tool-generator.ts** | EXTEND | Generate `timeline_<entityType>` tools for date-enabled entities |
| **search/engine.ts** | MINOR EXTEND | Add date filtering to existing search |
| **server.ts** | EXTEND | Register timeline tools, handle tool calls |

#### New Components Needed

**NONE.** Timeline queries are a query pattern, not a component.

#### Data Flow

```
1. MCP Client Request
   └─> timeline_event { start: "2020-01-01", end: "2020-12-31" }

2. Server Tool Handler
   └─> Parse args, validate date format

3. Database Layer
   └─> SELECT * FROM nodes
       WHERE type = 'event'
       AND json_extract(frontmatter, '$.date') BETWEEN ? AND ?
       ORDER BY json_extract(frontmatter, '$.date')

4. Format Response
   └─> Group by date, format as markdown timeline

5. Return to Client
   └─> Markdown timeline with chronological ordering
```

#### SQL Strategy for Date Queries

**Storage:** Dates already stored as ISO 8601 strings in frontmatter JSON (worldbuilding template has `date`, `date_start`, `date_end` fields on events).

**Indexing:** Create functional index on extracted date field for performance:
```sql
CREATE INDEX IF NOT EXISTS idx_event_date
ON nodes(json_extract(frontmatter, '$.date'))
WHERE type = 'event';
```

**Query pattern:**
```sql
SELECT * FROM nodes
WHERE type = ?
AND json_extract(frontmatter, '$.date') >= ?
AND json_extract(frontmatter, '$.date') < ?
ORDER BY json_extract(frontmatter, '$.date')
```

**Performance:** With index, date range queries are O(log n + k) where k is result set size. For vaults with <10k entities, performance is sub-millisecond.

**Source:** [SQLite Date & Time Functions](https://www.sqlitetutorial.net/sqlite-date/), [Best Practices for SQLite Date Functions](https://www.slingacademy.com/article/best-practices-for-using-sqlite-date-and-time-functions/)

#### Timeline Tool Generation

Extend `tool-generator.ts` to detect date fields in entity type configs and auto-generate timeline tools.

**Detection logic:**
```typescript
function hasDateFields(entityType: EntityTypeConfig): boolean {
  return entityType.fields.some(f =>
    f.type === 'date' ||
    f.name === 'date' ||
    f.name === 'date_start'
  );
}
```

**Generated tool schema:**
```typescript
{
  name: "timeline_event",
  description: "Query events within a date range, ordered chronologically",
  inputSchema: {
    type: "object",
    properties: {
      start: { type: "string", description: "Start date (YYYY-MM-DD)" },
      end: { type: "string", description: "End date (YYYY-MM-DD)" },
      limit: { type: "number", default: 50 }
    },
    required: ["start", "end"]
  }
}
```

**Source:** [MCP Tool Schema](https://www.merge.dev/blog/mcp-tool-schema), [Model Context Protocol Guide](https://publicapis.io/blog/mcp-model-context-protocol-guide)

### Graph Visualization Integration

Graph visualization renders the existing knowledge graph in Obsidian. Requires new UI components but no changes to graph data structure.

#### Component Changes

| Component | Modification Type | Changes Needed |
|-----------|------------------|----------------|
| **obsidian-plugin/main.ts** | EXTEND | Register graph view, add ribbon icon |
| **graph/database.ts** | NONE | Already exposes `getAllNodes()`, `getRelationships()` |
| **server.ts** | NONE | Graph data already accessible via query_X tools |

#### New Components Needed

**1. Obsidian Graph View (obsidian-plugin/views/graph-view.ts)**
- Extends `ItemView`
- Renders force-directed graph using Cytoscape.js or D3.js
- Filters by entity type, status, relationship type
- Handles node click → open note

**2. Optional: Graph Data MCP Resource (src/mcp/resources/graph.ts)**
- Exposes entire graph as MCP resource for external clients
- Format: JSON with nodes/edges arrays
- Use case: External visualization tools, LLM context

#### Obsidian ItemView Pattern

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_GRAPH = 'hivemind-graph-view';

export class GraphView extends ItemView {
  private graphContainer: HTMLElement;
  private graphInstance: any; // Cytoscape instance

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_GRAPH;
  }

  getDisplayText(): string {
    return 'Hivemind Graph';
  }

  getIcon(): string {
    return 'git-fork'; // Use built-in Obsidian icon
  }

  async onOpen(): Promise<void> {
    // 1. Create container
    this.graphContainer = this.containerEl.children[1];
    this.graphContainer.empty();

    // 2. Load graph data from vault
    const graphData = await this.loadGraphData();

    // 3. Initialize Cytoscape
    this.graphInstance = cytoscape({
      container: this.graphContainer,
      elements: graphData,
      layout: { name: 'cose' }, // force-directed
      style: [/* styling */]
    });

    // 4. Handle node click
    this.graphInstance.on('tap', 'node', (evt) => {
      const filePath = evt.target.data('filePath');
      this.app.workspace.openLinkText(filePath, '', false);
    });
  }

  async onClose(): Promise<void> {
    this.graphInstance?.destroy();
  }

  private async loadGraphData(): Promise<any> {
    // Read .hive/cache.db from vault root
    // Query nodes and relationships tables
    // Transform to Cytoscape format
  }
}
```

**Registration in main.ts:**
```typescript
this.registerView(
  VIEW_TYPE_GRAPH,
  (leaf) => new GraphView(leaf)
);

this.addRibbonIcon('git-fork', 'Open Hivemind Graph', () => {
  this.activateView();
});

async activateView() {
  const { workspace } = this.app;

  let leaf: WorkspaceLeaf | null = null;
  const leaves = workspace.getLeavesOfType(VIEW_TYPE_GRAPH);

  if (leaves.length > 0) {
    leaf = leaves[0];
  } else {
    leaf = workspace.getRightLeaf(false);
    await leaf.setViewState({
      type: VIEW_TYPE_GRAPH,
      active: true,
    });
  }

  workspace.revealLeaf(leaf);
}
```

**Source:** [Obsidian Views Documentation](https://docs.obsidian.md/Plugins/User+interface/Views), [Obsidian ItemView Reference](https://docs.obsidian.md/Reference/TypeScript+API/ItemView)

#### Graph Visualization Library Choice

**Recommendation: Cytoscape.js**

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Cytoscape.js** | Built-in graph algorithms, excellent for graph-specific viz, good performance (<5k nodes), permissive MIT license | Less flexible than D3 | **RECOMMENDED** |
| D3.js | Maximum customization, industry standard | Steep learning curve, more code required | Use if custom layouts needed |
| Vis.js (vis-network) | Simple API, good defaults | Less active development | Fallback option |
| Sigma.js | WebGL performance (50k+ nodes) | Overkill for typical vaults | Only if performance issues |

**Justification:** Cytoscape.js is purpose-built for graph visualization with built-in layout algorithms (force-directed, hierarchical, circular). Used by obsidian-better-graph-view and other Obsidian graph plugins. MIT licensed, actively maintained.

**Installation:**
```bash
npm install cytoscape @types/cytoscape
```

**Source:** [Cytoscape.js](https://js.cytoscape.org/), [Graph Visualization Libraries Comparison](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/)

#### Data Access Pattern

**Challenge:** Obsidian plugin cannot import MCP server code at runtime.

**Solution 1: Direct SQLite Access (Recommended)**
- Read `.hive/cache.db` directly from vault using better-sqlite3
- Query nodes/relationships tables
- Transform to visualization format
- **Pros:** No IPC overhead, works offline, simple
- **Cons:** Duplicates database schema knowledge

**Solution 2: MCP Resource Endpoint**
- Add `graph://vault` MCP resource to server
- Plugin connects to MCP server, fetches resource
- **Pros:** Single source of truth, leverages MCP protocol
- **Cons:** Requires MCP server running, more complex

**Recommendation:** Use Solution 1 (direct SQLite access) for MVP. The database schema is stable, and duplicating read-only queries is acceptable. Consider Solution 2 if external clients need graph data.

### Timeline Visualization in Obsidian

Timeline visualization displays events on a chronological axis in Obsidian. Requires new ItemView similar to graph view.

#### New Components Needed

**Obsidian Timeline View (obsidian-plugin/views/timeline-view.ts)**
- Extends `ItemView`
- Renders timeline using Vis.js Timeline component
- Filters by entity type, date range
- Handles item click → open note

#### Timeline Library Choice

**Recommendation: Vis.js Timeline**

Vis.js Timeline is a powerful, customizable timeline component that displays data in time, supporting ranges, editing, and automatic time scale adjustment from milliseconds to years.

**Alternatives considered:**
- Chart.js: Not designed for timeline visualizations (bar/line charts)
- Custom D3: Too much implementation effort

**Installation:**
```bash
npm install vis-timeline @types/vis-timeline
```

**Example implementation:**
```typescript
import { Timeline } from 'vis-timeline/standalone';

export class TimelineView extends ItemView {
  private timeline: Timeline;

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];

    // Load events from database
    const events = await this.loadEvents();

    // Transform to vis-timeline format
    const items = events.map(e => ({
      id: e.id,
      content: e.title,
      start: e.properties.date || e.properties.date_start,
      end: e.properties.date_end,
      type: e.properties.date_end ? 'range' : 'point'
    }));

    // Create timeline
    this.timeline = new Timeline(container, items, {
      orientation: 'top',
      zoomable: true,
      moveable: true,
      onSelect: (props) => {
        const event = events.find(e => e.id === props.items[0]);
        this.app.workspace.openLinkText(event.filePath, '', false);
      }
    });
  }
}
```

**Source:** [Vis.js Timeline Documentation](https://visjs.github.io/vis-timeline/docs/timeline/), [Vis.js GitHub](https://github.com/visjs/vis-timeline)

## Component Boundaries

### Clear Separation of Concerns

| Layer | Components | Responsibility | Dependencies |
|-------|-----------|----------------|--------------|
| **Data** | database.ts, builder.ts | Store and index entities/relationships | SQLite, template registry |
| **Query** | engine.ts, tool-generator.ts | Query data, generate MCP tools | Data layer, template registry |
| **Protocol** | server.ts | MCP server, tool registration/handling | Query layer, MCP SDK |
| **Visualization** | Obsidian views | Render data in Obsidian UI | Data layer (direct SQLite) OR Protocol layer (MCP resources) |

### Data Flow: Query → Visualization

```
┌─────────────────────────────────────────────────────────┐
│                      MCP CLIENT                          │
│              (Claude, Cline, etc.)                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ timeline_event { start, end }
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  MCP SERVER (server.ts)                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Tool Handler (parseTimelineToolName)          │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Query Engine (queryByDateRange)                │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   SQLite (nodes table with date index)           │   │
│  └────────────┬─────────────────────────────────────┘   │
└───────────────┼──────────────────────────────────────────┘
                │
                │ [{ id, title, date, content }, ...]
                ▼
┌─────────────────────────────────────────────────────────┐
│              FORMATTER (formatTimeline)                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Markdown timeline
                 ▼
┌─────────────────────────────────────────────────────────┐
│                     MCP CLIENT                           │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│              OBSIDIAN PLUGIN (local)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │   TimelineView.onOpen()                          │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   loadEvents() → SQLite query                    │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   better-sqlite3 (.hive/cache.db)                │   │
│  └────────────┬─────────────────────────────────────┘   │
│               │                                          │
│               │ [{ id, date, title }, ...]               │
│               ▼                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Vis.js Timeline rendering                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Build Order Recommendations

Based on existing dependencies and integration complexity.

### Phase 1: Timeline Queries (MCP Server)

**Why first:** No new dependencies, extends existing patterns, provides value immediately to MCP clients.

**Build order:**
1. Add `queryByDateRange()` to database.ts (new method, existing patterns)
2. Extend tool-generator.ts to detect date fields and generate timeline tools
3. Add timeline tool handler to server.ts (similar to existing query tool handler)
4. Add date field index to schema initialization
5. Write formatter for timeline output (similar to existing formatEntityList)

**Estimated complexity:** LOW (extends existing patterns, no new libraries)

### Phase 2: Graph Visualization (Obsidian Plugin)

**Why second:** Requires new UI component and library integration, but provides high user value.

**Build order:**
1. Add Cytoscape.js dependency to obsidian-plugin
2. Create GraphView class extending ItemView
3. Implement loadGraphData() with direct SQLite access
4. Add view registration and ribbon icon in main.ts
5. Add graph styling and filters (type, status)

**Estimated complexity:** MEDIUM (new component type, new library, but clear patterns)

### Phase 3: Timeline Visualization (Obsidian Plugin)

**Why third:** Similar to graph view but less critical, builds on Phase 2 learnings.

**Build order:**
1. Add Vis.js Timeline dependency
2. Create TimelineView class (similar to GraphView)
3. Implement loadEvents() with date filtering
4. Add view registration and ribbon icon
5. Add timeline controls (zoom, pan, filter)

**Estimated complexity:** MEDIUM (similar to Phase 2)

### Phase 4: Community Plugin Submission (Optional)

**Why last:** Requires all features complete, validated, documented.

**Build order:**
1. Prepare submission package (validate with `hivemind validate`)
2. Write submission documentation (features, screenshots, usage)
3. Submit to community registry (if Hivemind has one) or publish as standalone
4. Handle review feedback, iterate

**Estimated complexity:** LOW-MEDIUM (mostly process, not code)

**Source:** [Claude Code Plugin Marketplace](https://code.claude.com/docs/en/plugin-marketplaces), [Plugin Submission Process](https://deepwiki.com/logseq/marketplace/3-plugin-submission-process)

## Architectural Patterns to Follow

### Pattern 1: Tool Generator Extends, Not Replaces

**What:** tool-generator.ts already generates query_X and list_X tools. Timeline tools follow same pattern.

**Why:** Consistency, maintainability, automatic template integration.

**Implementation:**
```typescript
// tool-generator.ts
export function generateTimelineTool(entityType: EntityTypeConfig): ToolDefinition | null {
  if (!hasDateFields(entityType)) return null;

  const dateField = entityType.fields.find(f =>
    f.type === 'date' || f.name === 'date' || f.name === 'date_start'
  );

  return {
    name: `timeline_${entityType.name}`,
    description: `Query ${entityType.pluralName.toLowerCase()} within a date range, ordered chronologically`,
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: `Start date (${dateField.description || 'YYYY-MM-DD'})` },
        end: { type: 'string', description: 'End date' },
        limit: { type: 'number', default: 50, minimum: 1, maximum: 500 }
      },
      required: ['start', 'end']
    }
  };
}

// server.ts tool handler
if (toolName.startsWith('timeline_')) {
  const entityType = toolName.replace('timeline_', '');
  const args = TimelineArgsSchema.parse(request.params.arguments);
  const results = this.database.queryByDateRange(entityType, args.start, args.end, args.limit);
  return formatTimeline(entityType, results);
}
```

### Pattern 2: ItemView for Custom Obsidian Views

**What:** All custom visualization views extend `ItemView` with consistent lifecycle.

**Why:** Obsidian API best practice, workspace integration, proper cleanup.

**Implementation structure:**
```typescript
export class CustomView extends ItemView {
  // 1. Identify view
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'Display Name'; }
  getIcon(): string { return 'icon-id'; }

  // 2. Lifecycle hooks
  async onOpen(): Promise<void> {
    // Initialize viz, load data
  }

  async onClose(): Promise<void> {
    // Cleanup, destroy instances
  }

  // 3. Data loading
  private async loadData() {
    // Direct SQLite or MCP resource
  }
}
```

### Pattern 3: Direct SQLite Access for Plugin Views

**What:** Obsidian views read `.hive/cache.db` directly using better-sqlite3.

**Why:** No MCP server dependency, works offline, simpler than IPC.

**Implementation:**
```typescript
import Database from 'better-sqlite3';
import { join } from 'path';

private async loadGraphData() {
  const dbPath = join(this.app.vault.adapter.basePath, '.hive', 'cache.db');
  const db = new Database(dbPath, { readonly: true });

  const nodes = db.prepare('SELECT * FROM nodes').all();
  const edges = db.prepare('SELECT * FROM relationships').all();

  db.close();

  return this.transformToCytoscapeFormat(nodes, edges);
}
```

**Trade-off:** Duplicates database schema knowledge between server and plugin. Acceptable because:
- Schema is stable (version controlled)
- Views are read-only
- Eliminates runtime dependency on MCP server

## Architectural Anti-Patterns to Avoid

### Anti-Pattern 1: Duplicating Graph Building Logic

**What goes wrong:** Plugin re-implements relationship inference, link parsing, etc.

**Why bad:** Drift between server and plugin graph representations, maintenance burden.

**Instead:** Plugin reads pre-built graph from database. Server owns graph building.

### Anti-Pattern 2: Synchronous SQLite Queries on UI Thread

**What goes wrong:** Large graph queries block Obsidian UI, causing freezes.

**Why bad:** Poor user experience, especially on large vaults.

**Instead:**
```typescript
// BAD
const nodes = db.prepare('SELECT * FROM nodes').all();

// GOOD
async loadGraphData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const db = new Database(dbPath, { readonly: true });
      const nodes = db.prepare('SELECT * FROM nodes').all();
      db.close();
      resolve(nodes);
    }, 0);
  });
}
```

### Anti-Pattern 3: Recursive CTE for Graph Traversal

**What goes wrong:** SQLite recursive CTEs are slow for large graphs with multiple paths to nodes.

**Why bad:** Performance degrades significantly with graph size, revisits nodes multiple times.

**Instead:** For MVP, fetch all relationships and traverse in-memory. For advanced features (shortest path, centrality), implement graph algorithms in TypeScript or use closure table pattern.

**Source:** [SQLite BFS Graph Traversal](https://sqlite.org/forum/info/3b309a9765636b79), [SQLite Recursive CTEs](https://sqlite.org/lang_with.html)

### Anti-Pattern 4: Over-Abstracting Visualization Libraries

**What goes wrong:** Creating generic "GraphRenderer" interface supporting multiple libraries.

**Why bad:** Premature abstraction, maintenance overhead, no real benefit.

**Instead:** Choose one library (Cytoscape.js), use it directly. If needed later, refactor.

## Plugin Submission Patterns

### Pattern: Validation Before Submission

**What:** Use `hivemind validate` CLI command to check template config, markdown files, frontmatter before submission.

**Implementation:**
```bash
# In CI or pre-submission
npx hivemind validate

# Should check:
# - Template schema validity
# - Folder mappings correctness
# - Frontmatter field types
# - Relationship type validity
```

### Pattern: Sample Vault as Documentation

**What:** Include `samples/worldbuilding` with example notes demonstrating all features.

**Why:** Provides working examples, tests plugin in real scenario, improves discoverability.

**Structure:**
```
samples/worldbuilding/
├── Characters/
│   ├── Aragorn.md
│   └── Gandalf.md
├── Events/
│   ├── Battle of Helm's Deep.md
│   └── Council of Elrond.md
├── Locations/
│   └── Rivendell.md
└── config.json  # Template config
```

## Scalability Considerations

### At 100 Entities (Typical Personal Vault)

| Concern | Approach | Rationale |
|---------|----------|-----------|
| Timeline queries | Direct SQL with date index | Sub-millisecond query time |
| Graph rendering | Full graph load in-memory | <100 nodes renders instantly in Cytoscape |
| FTS5 search | Existing implementation | Already optimized |

### At 1,000 Entities (Large Personal Vault)

| Concern | Approach | Rationale |
|---------|----------|-----------|
| Timeline queries | Same (SQL with index) | Still sub-10ms query time |
| Graph rendering | Filter by type/status before render | Cytoscape handles 1k nodes well |
| FTS5 search | Same | FTS5 designed for this scale |

### At 10,000+ Entities (Team Vault or Database)

| Concern | Approach | Mitigation |
|---------|----------|------------|
| Timeline queries | Consider pagination | Add LIMIT/OFFSET to timeline tools |
| Graph rendering | Lazy loading or viewport culling | Fetch visible subgraph only, render on-demand |
| FTS5 search | Consider rank cutoff | Limit results to top N by relevance |

**Recommendation:** Build for 1,000 entity scale (covers 95% of vaults). Add optimizations if users report performance issues.

**Source:** [Obsidian Performance Best Practices](https://forum.obsidian.md), [Cytoscape.js Performance](https://js.cytoscape.org/)

## Summary: Integration Points

### Timeline Queries
- **Integration point:** Tool generator (auto-generate timeline tools)
- **Data source:** Existing nodes table with JSON frontmatter
- **New infrastructure:** Date field index, queryByDateRange method
- **Breaking changes:** NONE

### Graph Visualization
- **Integration point:** Obsidian plugin views
- **Data source:** Existing relationships table
- **New infrastructure:** GraphView ItemView component, Cytoscape.js
- **Breaking changes:** NONE

### Timeline Visualization
- **Integration point:** Obsidian plugin views
- **Data source:** Existing nodes table filtered by date
- **New infrastructure:** TimelineView ItemView component, Vis.js
- **Breaking changes:** NONE

All features are additive, non-breaking extensions of existing architecture.

## Sources

**SQLite & Date Queries:**
- [SQLite Date & Time Functions](https://www.sqlitetutorial.net/sqlite-date/)
- [Best Practices for SQLite Date Functions](https://www.slingacademy.com/article/best-practices-for-using-sqlite-date-and-time-functions/)
- [SQLite Recursive CTEs](https://sqlite.org/lang_with.html)
- [SQLite BFS Graph Traversal](https://sqlite.org/forum/info/3b309a9765636b79)

**Graph Visualization:**
- [Cytoscape.js](https://js.cytoscape.org/)
- [Graph Visualization Libraries Comparison](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/)
- [Top 10 JavaScript Libraries for Knowledge Graph Visualization](https://www.getfocal.co/post/top-10-javascript-libraries-for-knowledge-graph-visualization)
- [D3.js](https://d3js.org/)

**Timeline Visualization:**
- [Vis.js Timeline](https://visjs.github.io/vis-timeline/docs/timeline/)
- [Vis.js GitHub](https://github.com/visjs/vis-timeline)

**Obsidian Plugin Development:**
- [Obsidian Views Documentation](https://docs.obsidian.md/Plugins/User+interface/Views)
- [Obsidian ItemView Reference](https://docs.obsidian.md/Reference/TypeScript+API/ItemView)
- [Obsidian 3D Graph Plugin](https://github.com/chthollyphile/obsidian-3d-graph-view-plugin)
- [Obsidian Chronos Timeline Plugin](https://github.com/clairefro/obsidian-plugin-chronos)

**MCP Protocol:**
- [MCP Tool Schema](https://www.merge.dev/blog/mcp-tool-schema)
- [Model Context Protocol Guide](https://publicapis.io/blog/mcp-model-context-protocol-guide)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)

**Plugin Submission:**
- [Claude Code Plugin Marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
- [Plugin Submission Process](https://deepwiki.com/logseq/marketplace/3-plugin-submission-process)

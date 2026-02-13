# Phase 27: Graph Obsidian View - Research

**Researched:** 2026-01-28
**Domain:** Interactive graph visualization with sigma.js + graphology in Obsidian plugin
**Confidence:** HIGH

## Summary

Phase 27 delivers an interactive graph visualization panel in Obsidian using sigma.js (WebGL-based renderer) and graphology (graph data structure library). The standard approach combines sigma.js v3.x for high-performance rendering with graphology's force-directed layout algorithms and graph manipulation utilities. This pairing is the established modern stack for JavaScript graph visualization, offering superior performance over Canvas/SVG alternatives while maintaining TypeScript support and extensive customization options.

Key architectural decisions follow the established timeline view pattern (Phase 26): ItemView lifecycle, MCP data loading, filter chip UI, and Obsidian theme integration. The force-directed layout algorithm (ForceAtlas2) provides organic clustering without manual positioning, while sigma.js's event system enables all required interactions (click-to-open, right-click menus, drag, pan, zoom).

**Primary recommendation:** Use sigma.js v3.0.2 + graphology v0.26.0 with ForceAtlas2 layout. Implement as Obsidian ItemView following Phase 26's patterns. Enable all interactions through sigma.js events, style nodes with Okabe-Ito palette using nodeReducer, and persist filter/layout state in plugin settings.

## Standard Stack

The established libraries/tools for interactive graph visualization in TypeScript/JavaScript:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sigma.js | v3.0.2 | WebGL graph rendering | Industry standard for large graphs (thousands of nodes). WebGL rendering outperforms Canvas/SVG by order of magnitude. TypeScript support, active maintenance. |
| graphology | v0.26.0 | Graph data structure | De facto graph library for JavaScript. Powers sigma.js as data backend. Comprehensive algorithms, event emission, TypeScript types. |
| graphology-layout-forceatlas2 | latest | Force-directed layout | Standard algorithm from Gephi, proven for readable network layouts. Handles organic clustering automatically. |

**Bundle size impact:**
- sigma.js: ~969 KB unpacked (significantly smaller minified+gzipped, estimated ~60-80 KB)
- graphology: ~11.5 KB minified+gzipped
- Total estimated: ~70-90 KB minified+gzipped (within Obsidian's 5MB per-file limit, current main.js ~150KB)

**Sources:**
- [Sigma.js Official Site](https://www.sigmajs.org/)
- [Graphology Documentation](https://graphology.github.io/)
- [npm package: sigma v3.0.2](https://www.npmjs.com/package/sigma)
- [npm package: graphology v0.26.0](https://www.npmjs.com/package/graphology)

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| graphology-shortest-path | latest | Dijkstra, A*, bidirectional search | Requirement GVIEW-10: shortest path highlighting between two nodes |
| graphology-communities-louvain | latest | Community detection | Requirement GVIEW-11: cluster detection with auto-grouping |
| @sigma/utils | latest | Helper utilities | fitViewportToNodes for centering on search results |

**Installation:**
```bash
npm install sigma graphology graphology-layout-forceatlas2 graphology-shortest-path graphology-communities-louvain
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sigma.js | vis-network | vis-network: easier API, better docs, but 10x slower performance on large graphs (>1000 nodes). sigma.js chosen for performance per STATE.md. |
| sigma.js | Cytoscape.js | Cytoscape: excellent for biological networks, more complex API. Used by Juggl plugin. sigma.js lighter weight, simpler for knowledge graphs. |
| ForceAtlas2 | D3-force | D3-force: more customizable but requires manual integration. ForceAtlas2 proven, well-tested, native graphology support. |

**Sources:**
- [Library Comparison: Cylynx](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/)
- [Memgraph: Graph Visualization Tools](https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool)

## Architecture Patterns

### Recommended Project Structure

Building on existing Phase 26 timeline view patterns:

```
obsidian-plugin/
├── main.ts                    # Plugin entry, register GraphView
├── styles.css                 # Graph view styles, node colors
└── [future: src/views/]
    └── GraphView.ts           # (potential refactor location)
```

Current pattern: all code in main.ts, follows timeline implementation.

### Pattern 1: ItemView Lifecycle

**What:** Obsidian plugin views extend ItemView class with onOpen/onClose lifecycle methods.

**When to use:** All custom visualization panels (timeline, graph, validation sidebar).

**Example (from Phase 26 timeline):**
```typescript
// Source: obsidian-plugin/main.ts (lines 751-858)
class TimelineView extends ItemView {
  plugin: HivemindPlugin;
  private timeline: Timeline | null = null;
  private items: DataSet<TimelineItem> | null = null;
  private groups: DataSet<{id: string; content: string; order: number}> | null = null;
  private activeFilters: Set<string> = new Set();

  constructor(leaf: WorkspaceLeaf, plugin: HivemindPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_TIMELINE;
  }

  getDisplayText(): string {
    return 'Hivemind Timeline';
  }

  getIcon(): string {
    return 'clock';
  }

  async onOpen() {
    // 1. Get container, clear previous content
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    // 2. Check MCP connection
    if (!this.plugin.mcpProcess) {
      // Show connection UI
      return;
    }

    // 3. Load data via MCP
    const items = await this.loadTimelineData();

    // 4. Create UI components
    this.createFilterToolbar(container, typeCountMap);
    const vizContainer = container.createDiv({cls: 'hvmd-timeline-container'});

    // 5. Initialize visualization library
    this.timeline = new Timeline(vizContainer, items, groups, options);

    // 6. Bind event handlers
    this.timeline.on('select', (props) => {
      // Open note on click
    });
  }

  async onClose() {
    // Cleanup visualization instance
    if (this.timeline) {
      this.timeline.destroy();
      this.timeline = null;
    }
  }
}

// Register view type
this.registerView(
  VIEW_TYPE_TIMELINE,
  (leaf) => new TimelineView(leaf, this)
);

// Activate view
async activateTimelineView() {
  const { workspace } = this.app;
  let leaf = workspace.getLeavesOfType(VIEW_TYPE_TIMELINE)[0];
  if (!leaf) {
    leaf = workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_TIMELINE });
  }
  workspace.revealLeaf(leaf);
}
```

**For Graph View:** Identical pattern, replace Timeline with sigma.js Sigma instance.

**Sources:**
- [Obsidian Developer Docs: Views](https://docs.obsidian.md/Plugins/User+interface/Views)
- [Obsidian API: ItemView](https://docs.obsidian.md/Reference/TypeScript+API/ItemView)

### Pattern 2: MCP Data Loading

**What:** Call MCP tools to fetch entity data, transform to visualization format.

**When to use:** Loading graph nodes/edges, timeline items, any vault-wide data queries.

**Example (from Phase 26):**
```typescript
// Source: obsidian-plugin/main.ts (lines 859-903)
private async callMCPTool(toolName: string, args: Record<string, unknown>): Promise<MCPResponse> {
  if (!this.mcpProcess || !this.mcpStdin) {
    throw new Error('MCP server not connected');
  }

  const requestId = this.requestId++;
  const request = {
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  };

  // Send request, await response
  this.mcpStdin.write(JSON.stringify(request) + '\n');

  return new Promise((resolve, reject) => {
    this.pendingRequests.set(requestId, { resolve, reject });
  });
}

// Usage in TimelineView
private async loadTimelineData(): Promise<TimelineItem[]> {
  const response = await this.plugin.callMCPTool('hvmd_timeline_get_dated_entities', {});
  const result = JSON.parse(response.content[0].text);

  return result.entities.map(entity => ({
    id: entity.path,
    content: entity.title,
    start: new Date(entity.start_date || entity.date),
    end: entity.end_date ? new Date(entity.end_date) : undefined,
    group: entity.type,
    entityPath: entity.path,
    className: `timeline-${entity.type}`
  }));
}
```

**For Graph View:** Call Phase 25 graph MCP tools (hvmd_graph_get_neighbors, hvmd_graph_shortest_path, etc.).

**Expected data structure from Phase 25:**
```typescript
// From hvmd_graph_get_neighbors tool
{
  nodes: [
    { id: "Entity:Name", title: "Entity Name", type: "character", path: "..." },
    // ...
  ],
  edges: [
    { source: "Entity1:Name1", target: "Entity2:Name2", relationshipType: "manages" },
    // ...
  ]
}
```

### Pattern 3: Force-Directed Layout

**What:** Use ForceAtlas2 to automatically position nodes based on graph structure.

**When to use:** Initial layout, after adding/removing nodes, when layout becomes messy.

**Example:**
```typescript
// Source: graphology-layout-forceatlas2 documentation
import forceAtlas2 from 'graphology-layout-forceatlas2';

// Create graphology instance from MCP data
const graph = new Graph();
nodes.forEach(node => graph.addNode(node.id, { label: node.title, type: node.type }));
edges.forEach(edge => graph.addEdge(edge.source, edge.target, { type: edge.relationshipType }));

// Apply layout (synchronous for <1000 nodes, use worker for larger)
const positions = forceAtlas2(graph, {
  iterations: 50,
  settings: {
    gravity: 1,
    scalingRatio: 10,
    slowDown: 1,
    barnesHutOptimize: true,  // Enable for >1000 nodes
    barnesHutTheta: 0.5,
    linLogMode: false,
    strongGravityMode: false,
    edgeWeightInfluence: 1
  }
});

// Assign positions to graph
positions.forEach((pos, node) => {
  graph.setNodeAttribute(node, 'x', pos.x);
  graph.setNodeAttribute(node, 'y', pos.y);
});

// Create sigma renderer
const container = document.getElementById('sigma-container');
const renderer = new Sigma(graph, container, {
  renderEdgeLabels: false,  // Enable on hover only
  enableEdgeClickEvents: true,
  enableEdgeHoverEvents: true
});
```

**Key parameters (per CONTEXT.md discretion):**
- `iterations`: 50-100 for initial layout, fewer for incremental updates
- `gravity`: Controls how tightly nodes cluster (1-10, higher = tighter)
- `scalingRatio`: Spreads nodes apart (1-20, higher = more spread)
- `barnesHutOptimize`: Enable for >1000 nodes (huge performance gain)

**Sources:**
- [Graphology ForceAtlas2 Docs](https://graphology.github.io/standard-library/layout-forceatlas2.html)
- [Medium: Visualizing Graphs with ForceAtlas2](https://medium.com/@guillaume-brioudes/visualizing-graphs-in-javascript-with-graphology-and-forceatlas2-11e257c394e0)

### Pattern 4: Node Styling with Reducers

**What:** Use sigma.js nodeReducer to dynamically transform node appearance without modifying graph data.

**When to use:** Filtering, highlighting search results, entity type coloring, selection states.

**Example:**
```typescript
// Source: sigma.js customization documentation
const renderer = new Sigma(graph, container, {
  nodeReducer: (node, data) => {
    const res = { ...data };

    // Apply entity type colors (Okabe-Ito palette per CONTEXT.md)
    const colorMap = {
      character: '#56B4E9',   // Sky blue
      location: '#009E73',    // Green
      event: '#E69F00',       // Orange
      faction: '#F0E442',     // Yellow
      item: '#0072B2',        // Dark blue
      concept: '#D55E00',     // Red-orange
      default: '#888888'      // Gray fallback
    };
    res.color = colorMap[data.type] || colorMap.default;

    // Highlight filtered nodes
    if (!activeFilters.has(data.type)) {
      res.hidden = true;  // Hide filtered out types
    }

    // Search highlighting
    if (searchTerm && data.label.toLowerCase().includes(searchTerm.toLowerCase())) {
      res.highlighted = true;
      res.color = '#CC79A7';  // Pink highlight (8th Okabe-Ito color)
    }

    // Size by degree (optional, per discretion)
    const degree = graph.degree(node);
    res.size = 5 + Math.sqrt(degree) * 2;

    return res;
  },

  edgeReducer: (edge, data) => {
    const res = { ...data };
    const source = graph.source(edge);
    const target = graph.target(edge);

    // Hide edges if either endpoint hidden
    if (graph.getNodeAttribute(source, 'hidden') ||
        graph.getNodeAttribute(target, 'hidden')) {
      res.hidden = true;
    }

    // Relationship type coloring (optional)
    res.color = '#cccccc';  // Default edge color

    return res;
  }
});

// Update rendering when filters change
function applyFilters() {
  renderer.refresh();  // Re-runs reducers, updates display
}
```

**Okabe-Ito palette (color-blind safe, per Phase 26 pattern):**
- Character: #56B4E9 (Sky blue)
- Location: #009E73 (Green)
- Event: #E69F00 (Orange)
- Faction: #F0E442 (Yellow)
- Item: #0072B2 (Dark blue)
- Concept: #D55E00 (Red-orange)
- Timeline: #CC79A7 (Pink)
- Default: #888888 (Gray)

**Sources:**
- [Sigma.js Customization Docs](https://www.sigmajs.org/docs/advanced/customization/)
- [7 Helpful Sigma.js Examples - Rapidops](https://rapidops.medium.com/7-helpful-sigma-js-examples-to-master-graph-visualization-a8cadf9e9b14)

### Pattern 5: Event-Driven Interactions

**What:** Bind sigma.js events for click-to-open, right-click menus, drag, hover.

**When to use:** All user interactions (per GVIEW-04, GVIEW-08 requirements).

**Example:**
```typescript
// Source: sigma.js events documentation
const renderer = new Sigma(graph, container, {
  enableEdgeClickEvents: true,
  enableEdgeHoverEvents: true
});

// GVIEW-04: Click node to open note
renderer.on('clickNode', ({ node }) => {
  const nodePath = graph.getNodeAttribute(node, 'path');
  const file = this.plugin.app.vault.getAbstractFileByPath(nodePath);
  if (file instanceof TFile) {
    void this.plugin.app.workspace.getLeaf('tab').openFile(file);
  }
});

// Right-click context menu (per CONTEXT.md)
renderer.on('rightClickNode', ({ node, event }) => {
  event.original.preventDefault();  // Prevent default context menu

  // Create Obsidian-style menu
  const menu = new Menu();

  menu.addItem((item) => {
    item.setTitle('Expand neighbors')
      .setIcon('git-branch')
      .onClick(() => void this.expandNode(node));
  });

  menu.addItem((item) => {
    item.setTitle('Focus view on this node')
      .setIcon('focus')
      .onClick(() => void this.focusNode(node));
  });

  menu.addItem((item) => {
    item.setTitle('Find path from this node')
      .setIcon('route')
      .onClick(() => void this.startPathSelection(node));
  });

  menu.showAtMouseEvent(event.original);
});

// Hover to show edge labels (per CONTEXT.md)
let hoveredEdge: string | null = null;
renderer.on('enterEdge', ({ edge }) => {
  hoveredEdge = edge;
  renderer.setSetting('renderEdgeLabels', true);
  renderer.refresh();
});

renderer.on('leaveEdge', () => {
  hoveredEdge = null;
  renderer.setSetting('renderEdgeLabels', false);
  renderer.refresh();
});

// Drag nodes for manual repositioning (per CONTEXT.md)
// sigma.js has built-in drag support, just ensure not disabled:
// Default settings allow dragging, no extra code needed
```

**Available events:**
- Node: clickNode, rightClickNode, doubleClickNode, enterNode, leaveNode, downNode, wheelNode
- Edge: clickEdge, rightClickEdge, enterEdge, leaveEdge (requires enableEdgeClickEvents: true)
- Stage: clickStage, rightClickStage, downStage, wheelStage (for zoom)
- Lifecycle: beforeRender, afterRender, resize, kill

**Sources:**
- [Sigma.js Events Documentation](https://www.sigmajs.org/docs/advanced/events/)
- [GitHub Discussion: Right-Click Events](https://github.com/jacomyal/sigma.js/issues/296)

### Pattern 6: Camera Controls (Pan/Zoom/Fit)

**What:** Programmatic camera control for search centering, local graph focus, navigation.

**When to use:** Search result highlighting (GVIEW-07), focus view (local graph), shortest path highlighting.

**Example:**
```typescript
// Camera access
const camera = renderer.getCamera();

// Pan to node (search result centering)
function panToNode(nodeId: string) {
  const nodePos = {
    x: graph.getNodeAttribute(nodeId, 'x'),
    y: graph.getNodeAttribute(nodeId, 'y')
  };

  camera.animate(nodePos, { duration: 500 });
}

// Zoom to selection
function zoomToNodes(nodeIds: string[]) {
  // Use @sigma/utils helper
  import { fitViewportToNodes } from '@sigma/utils';

  const state = fitViewportToNodes(
    renderer.getCamera().getState(),
    nodeIds,
    graph,
    { padding: 0.1 }  // 10% padding around selection
  );

  camera.animate(state, { duration: 500 });
}

// Fit entire graph (initial load)
function fitGraph() {
  camera.animate({ x: 0.5, y: 0.5, ratio: 1 }, { duration: 0 });
  camera.fit();  // Auto-fits to graph bounds
}

// Zoom limits (prevent over-zoom)
renderer.setSetting('zoomMin', 0.1);   // Max zoom out
renderer.setSetting('zoomMax', 5);     // Max zoom in
```

**Sources:**
- [GitHub Discussion: Camera State for Zoom](https://github.com/jacomyal/sigma.js/discussions/1461)
- [Sigma.js Node and Edge Sizes](https://www.sigmajs.org/docs/advanced/sizes/)

### Anti-Patterns to Avoid

- **Modifying graph during render:** Never call graph.addNode/addEdge inside nodeReducer/edgeReducer. Reducers are read-only transforms. Build graph first, then render.
- **Forgetting edge event flags:** Edge events disabled by default. Must set `enableEdgeClickEvents: true` in Sigma constructor or edge clicks won't work.
- **Synchronous layout on large graphs:** ForceAtlas2 blocks UI for >1000 nodes. Use worker version: `forceAtlas2.worker(graph, settings)`.
- **Not cleaning up on view close:** Call `renderer.kill()` in onClose() to release WebGL context. Memory leak otherwise.
- **Assuming graph persists across reloads:** Graphology instances are in-memory only. Must reload from MCP tools on each onOpen(). Layout positions can be cached in plugin settings (GVIEW-12).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Force-directed layout | Custom physics simulation | graphology-layout-forceatlas2 | Proven algorithm from Gephi. Handles edge cases (isolated nodes, high-degree hubs, dense clusters). 15+ years of research. |
| Shortest path | BFS/DFS implementation | graphology-shortest-path (dijkstra, A*) | Handles weighted edges, negative cycles, optimizations. Thoroughly tested. |
| Community detection | K-means clustering | graphology-communities-louvain | Louvain method is gold standard for graph clustering. Handles varying densities, hierarchical communities. |
| Pan/zoom/fit | Manual camera math | sigma.js camera API + @sigma/utils | Handles viewport transforms, easing, bounds checking. fitViewportToNodes prevents reinventing. |
| WebGL rendering | Canvas or raw WebGL | sigma.js | WebGL shader management, instancing, buffer optimization. 10+ years of performance tuning. |
| Graph data structure | Arrays/objects | graphology | Event emission, iteration, serialization, multi-graph support. Type-safe, battle-tested. |

**Key insight:** Graph algorithms appear simple (just traversals/loops) but edge cases destroy naive implementations. Use vetted libraries. Focus effort on UI/UX unique to this project (Obsidian integration, entity-specific features).

## Common Pitfalls

### Pitfall 1: Edge Events Not Working

**What goes wrong:** Click/hover on edges has no effect despite event handlers registered.

**Why it happens:** Sigma.js disables edge events by default (performance optimization). Must explicitly enable.

**How to avoid:**
```typescript
const renderer = new Sigma(graph, container, {
  enableEdgeClickEvents: true,   // Required for clickEdge, rightClickEdge
  enableEdgeHoverEvents: true,   // Required for enterEdge, leaveEdge
  enableEdgeWheelEvents: true    // Required for wheelEdge (rarely needed)
});
```

**Warning signs:** Edge event handlers never fire, edges not selectable, edge labels never show.

**Sources:**
- [Sigma.js Events Documentation](https://www.sigmajs.org/docs/advanced/events/)
- [GitHub Issue #930: Edge click events not working](https://github.com/jacomyal/sigma.js/issues/930)

### Pitfall 2: Performance Degradation on Large Graphs

**What goes wrong:** Graph becomes sluggish, layout takes 10+ seconds, UI freezes.

**Why it happens:**
- Synchronous ForceAtlas2 blocks UI thread (>1000 nodes)
- High edge count (>5000 edges) strains rendering
- Too many layout iterations

**How to avoid:**
```typescript
// Use worker for large graphs
if (graph.order > 1000) {
  const layout = forceAtlas2.worker(graph, {
    settings: {
      barnesHutOptimize: true,  // CRITICAL for >1000 nodes
      barnesHutTheta: 0.5
    }
  });
  layout.start();
  setTimeout(() => layout.stop(), 5000);  // Stop after 5s
} else {
  // Synchronous for small graphs
  forceAtlas2.assign(graph, { iterations: 50, settings: {...} });
}

// Warn on large graphs (per CONTEXT.md)
if (graph.order > 100) {
  new Notice('Large graph detected. Consider filtering by entity type.');
}

// Limit visible edges if performance poor
renderer.setSetting('renderEdgeLabels', false);  // Only show on hover
```

**Warning signs:** UI freezes during layout, scroll/zoom stutters, CPU at 100%.

**Sources:**
- [GitHub Issue #967: Performance issue](https://github.com/jacomyal/sigma.js/issues/967)
- [GitHub Issue #906: Performance drop caused by edges](https://github.com/jacomyal/sigma.js/issues/906)

### Pitfall 3: Nodes Have No Position

**What goes wrong:** Nodes render in tiny cluster at (0,0), graph appears as single dot.

**Why it happens:** Graph data lacks x/y coordinates, forgot to run layout algorithm.

**How to avoid:**
```typescript
// ALWAYS run layout before rendering
const graph = new Graph();
nodes.forEach(n => graph.addNode(n.id, { label: n.title, type: n.type }));
edges.forEach(e => graph.addEdge(e.source, e.target));

// Assign positions with layout
forceAtlas2.assign(graph, { iterations: 50, settings: {...} });

// Verify nodes have positions
if (!graph.hasNodeAttribute(graph.nodes()[0], 'x')) {
  throw new Error('Layout failed to assign node positions');
}

// Now safe to render
const renderer = new Sigma(graph, container);
```

**Warning signs:** Graph renders as single point, camera.fit() doesn't help, nodes overlap perfectly.

**Sources:**
- [GitHub Issue #567: Performance optimization](https://github.com/jacomyal/sigma.js/issues/567)

### Pitfall 4: Filter State Not Persisting

**What goes wrong:** User filters graph by entity type, closes view, reopens – filters reset.

**Why it happens:** Filter state stored in component memory, not persisted to settings.

**How to avoid (following Phase 26 pattern):**
```typescript
// Add to HivemindSettings interface
interface HivemindSettings {
  // ... existing
  graphFilterTypes: string[];         // Active entity type filters
  graphFilterRelationships: string[]; // Active relationship filters (GVIEW-06)
  graphLayout: Record<string, {x: number, y: number}>;  // GVIEW-12: saved positions
}

// Save on filter change
private async saveFilterState() {
  this.plugin.settings.graphFilterTypes = Array.from(this.activeFilters);
  await this.plugin.saveSettings();
}

// Load on view open
private loadFilterState() {
  const saved = this.plugin.settings.graphFilterTypes;
  this.activeFilters = saved ? new Set(saved) : new Set();
}
```

**Warning signs:** Filters always reset to "all active", user must reconfigure every time.

### Pitfall 5: Memory Leak on View Close

**What goes wrong:** Repeated open/close of graph view causes memory growth, eventual crash.

**Why it happens:** Sigma renderer holds WebGL context, graph event listeners, animation frames. Not released on close.

**How to avoid:**
```typescript
async onClose() {
  // Critical cleanup
  if (this.renderer) {
    this.renderer.kill();  // Releases WebGL context
    this.renderer = null;
  }

  if (this.graph) {
    this.graph.clear();    // Clear event listeners
    this.graph = null;
  }

  // Cancel any pending animations/workers
  if (this.layoutWorker) {
    this.layoutWorker.stop();
    this.layoutWorker = null;
  }
}
```

**Warning signs:** Memory usage grows on each view open, Chrome DevTools shows increasing WebGL contexts, eventual "out of memory" errors.

**Sources:**
- [Sigma.js GitHub: Issues archive](https://github.com/jacomyal/sigma.js/issues)

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Graph View Setup

```typescript
// Source: Sigma.js quickstart + graphology documentation
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';

class GraphView extends ItemView {
  plugin: HivemindPlugin;
  private renderer: Sigma | null = null;
  private graph: Graph | null = null;
  private activeFilters: Set<string> = new Set();

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('hivemind-graph-view');

    // Check MCP connection
    if (!this.plugin.mcpProcess) {
      // Show connection UI (same as timeline)
      return;
    }

    // Load data from Phase 25 MCP tools
    const data = await this.loadGraphData();

    // Create graphology instance
    this.graph = new Graph();
    data.nodes.forEach(node => {
      this.graph.addNode(node.id, {
        label: node.title,
        type: node.type,
        path: node.path
      });
    });
    data.edges.forEach(edge => {
      this.graph.addEdge(edge.source, edge.target, {
        relationshipType: edge.relationshipType
      });
    });

    // Apply force-directed layout
    forceAtlas2.assign(this.graph, {
      iterations: 50,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        barnesHutOptimize: this.graph.order > 1000,
        barnesHutTheta: 0.5
      }
    });

    // Create filter toolbar
    this.createFilterToolbar(container);

    // Create sigma container
    const sigmaContainer = container.createDiv({ cls: 'hvmd-graph-container' });

    // Initialize renderer
    this.renderer = new Sigma(this.graph, sigmaContainer, {
      renderEdgeLabels: false,
      enableEdgeHoverEvents: true,
      enableEdgeClickEvents: true,
      nodeReducer: this.getNodeReducer(),
      edgeReducer: this.getEdgeReducer()
    });

    // Bind events
    this.bindEvents();

    // Fit camera
    this.renderer.getCamera().fit();
  }

  private getNodeReducer() {
    return (node: string, data: any) => {
      const res = { ...data };

      // Entity type coloring
      const colorMap = {
        character: '#56B4E9',
        location: '#009E73',
        event: '#E69F00',
        faction: '#F0E442',
        item: '#0072B2',
        concept: '#D55E00',
        default: '#888888'
      };
      res.color = colorMap[data.type] || colorMap.default;

      // Apply filters
      if (!this.activeFilters.has(data.type)) {
        res.hidden = true;
      }

      return res;
    };
  }

  private bindEvents() {
    // Click to open note
    this.renderer.on('clickNode', ({ node }) => {
      const path = this.graph.getNodeAttribute(node, 'path');
      const file = this.plugin.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        void this.plugin.app.workspace.getLeaf('tab').openFile(file);
      }
    });

    // Right-click context menu
    this.renderer.on('rightClickNode', ({ node, event }) => {
      event.original.preventDefault();
      const menu = new Menu();

      menu.addItem(item => {
        item.setTitle('Expand neighbors')
          .setIcon('git-branch')
          .onClick(() => void this.expandNode(node));
      });

      menu.addItem(item => {
        item.setTitle('Focus view on this node')
          .setIcon('focus')
          .onClick(() => void this.focusNode(node));
      });

      menu.showAtMouseEvent(event.original);
    });

    // Edge labels on hover
    this.renderer.on('enterEdge', ({ edge }) => {
      this.renderer.setSetting('renderEdgeLabels', true);
      this.renderer.refresh();
    });

    this.renderer.on('leaveEdge', () => {
      this.renderer.setSetting('renderEdgeLabels', false);
      this.renderer.refresh();
    });
  }

  async onClose() {
    if (this.renderer) {
      this.renderer.kill();
      this.renderer = null;
    }
    if (this.graph) {
      this.graph.clear();
      this.graph = null;
    }
  }
}
```

### Example 2: Search and Highlight

```typescript
// Source: Sigma.js examples, @sigma/utils
private searchNodes(query: string) {
  const matchingNodes: string[] = [];

  this.graph.forEachNode((node, attributes) => {
    if (attributes.label.toLowerCase().includes(query.toLowerCase())) {
      matchingNodes.push(node);
    }
  });

  if (matchingNodes.length === 0) {
    new Notice('No nodes found matching search.');
    return;
  }

  // Highlight matches
  this.highlightedNodes = new Set(matchingNodes);
  this.renderer.refresh();  // Triggers nodeReducer with highlight logic

  // Pan to first result
  if (matchingNodes.length > 0) {
    const camera = this.renderer.getCamera();
    const firstNode = matchingNodes[0];
    const pos = {
      x: this.graph.getNodeAttribute(firstNode, 'x'),
      y: this.graph.getNodeAttribute(firstNode, 'y')
    };
    camera.animate(pos, { duration: 500 });
  }

  new Notice(`Found ${matchingNodes.length} matching nodes.`);
}
```

### Example 3: Shortest Path Highlighting

```typescript
// Source: graphology-shortest-path documentation
import { dijkstra } from 'graphology-shortest-path';

private highlightShortestPath(sourceNode: string, targetNode: string) {
  try {
    const path = dijkstra.bidirectional(this.graph, sourceNode, targetNode);

    if (!path) {
      new Notice('No path found between selected nodes.');
      return;
    }

    // Store path for highlighting in reducer
    this.pathNodes = new Set(path);
    this.pathEdges = new Set();

    // Get edges in path
    for (let i = 0; i < path.length - 1; i++) {
      const edge = this.graph.edge(path[i], path[i + 1]);
      if (edge) this.pathEdges.add(edge);
    }

    // Trigger re-render with path highlighting
    this.renderer.refresh();

    new Notice(`Shortest path: ${path.length} nodes, ${this.pathEdges.size} edges`);
  } catch (error) {
    new Notice(`Error finding path: ${error.message}`);
  }
}

// In edgeReducer:
private getEdgeReducer() {
  return (edge: string, data: any) => {
    const res = { ...data };

    // Highlight path edges
    if (this.pathEdges && this.pathEdges.has(edge)) {
      res.color = '#CC79A7';  // Pink highlight
      res.size = 3;           // Thicker edge
    } else {
      res.color = '#cccccc';
      res.size = 1;
    }

    return res;
  };
}
```

### Example 4: Community Detection (Clusters)

```typescript
// Source: graphology-communities-louvain documentation
import louvain from 'graphology-communities-louvain';

private detectCommunities() {
  // Run Louvain algorithm
  const communities = louvain(this.graph, { resolution: 1.0 });

  // Assign community IDs to nodes
  Object.entries(communities).forEach(([node, communityId]) => {
    this.graph.setNodeAttribute(node, 'community', communityId);
  });

  // Count communities
  const uniqueCommunities = new Set(Object.values(communities));
  new Notice(`Detected ${uniqueCommunities.size} communities`);

  // Optionally: color by community instead of entity type
  this.colorMode = 'community';
  this.renderer.refresh();
}

// In nodeReducer:
if (this.colorMode === 'community') {
  const community = data.community || 0;
  const colors = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#888888'];
  res.color = colors[community % colors.length];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sigma v1.x (Canvas) | Sigma v3.x (WebGL) | 2021 (v2), 2024 (v3) | 10x performance improvement. WebGL instancing reduces memory footprint. Supports thousands of nodes smoothly. |
| Manual graph data structures | Graphology library | 2020+ | Type-safe graph manipulation. Standard library of algorithms. Event-driven updates. |
| Custom layout algorithms | graphology-layout-* packages | 2020+ | Battle-tested layouts (ForceAtlas2 from Gephi). No need to reinvent physics simulations. |
| Separate state management | Reducers for dynamic styling | 2021 (v2) | Cleaner separation: graph data vs. visual state. Performance: no graph mutation on filter/highlight. |
| Plugin-based extensibility | Modular packages (@sigma/*) | 2024 (v3) | Custom renderers (node-border, node-image) as npm packages. Cleaner dependency management. |

**Deprecated/outdated:**
- **Sigma v1.x plugins:** Old plugin system (sigma.plugins.*) incompatible with v3. Use @sigma/* packages or custom programs.
- **vis.js network:** Deprecated in 2017, replaced by vis-network. Still slower than sigma.js.
- **Custom Canvas/SVG rendering:** Obsolete for large graphs. WebGL is now standard (via sigma.js, Cytoscape.js GL, etc.).

**Sources:**
- [Ouestware: Sigma.js 3.0 Release](https://www.ouestware.com/2024/03/21/sigma-js-3-0-en/)
- [Sigma.js GitHub Changelog](https://github.com/jacomyal/sigma.js/blob/main/CHANGELOG.md)

## Open Questions

Things that couldn't be fully resolved:

1. **Exact bundle size impact after minification**
   - What we know: sigma.js package is 969KB unpacked, graphology 11.5KB minified+gzipped. Estimate ~70-90KB combined minified+gzipped.
   - What's unclear: Exact gzipped size for sigma.js (Bundlephobia didn't load dynamic content). Phase 26 added vis-timeline (similar complexity) without issues.
   - Recommendation: Proceed with installation. Monitor main.js size during build. Current main.js ~150KB, Obsidian limit 5MB – ample headroom.

2. **Progressive disclosure (expand/collapse nodes) implementation**
   - What we know: GitHub issues show interest (#366, #903) but no built-in solution. Would require custom logic: click node → load neighbors from MCP → add to graph → run incremental layout.
   - What's unclear: Best UX pattern (button? context menu?), incremental layout stability (does ForceAtlas2 work well adding nodes mid-render?).
   - Recommendation: Defer to implementation phase. Start with full graph, add expand/collapse if performance requires. Context menu "Expand neighbors" action ready per CONTEXT.md.

3. **Workspace mode layout persistence (GVIEW-12)**
   - What we know: Obsidian has core Workspaces plugin for saving pane layouts. Plugin settings can store JSON data.
   - What's unclear: Best format for storing node positions (all nodes? just visible subset?), how to handle graph schema changes (new entities added).
   - Recommendation: Store node positions as `{[nodeId]: {x, y}}` in plugin settings. On load, check if node exists, apply saved position, else use layout algorithm. Save on manual drag or via "Save layout" button.

4. **Large graph threshold for warnings**
   - What we know: CONTEXT.md suggests 100 nodes as warning threshold. Sigma.js handles thousands efficiently with WebGL + barnesHutOptimize.
   - What's unclear: User's typical vault size. 100 nodes might be too conservative for sigma.js performance.
   - Recommendation: Start with 100-node warning per CONTEXT.md. Tune based on user feedback. Enable barnesHutOptimize at 1000+ nodes (proven optimization).

## Sources

### Primary (HIGH confidence)

- Sigma.js Official Documentation - https://www.sigmajs.org/docs/ - Installation, events, customization, renderers
- Graphology Official Documentation - https://graphology.github.io/ - API reference, layout algorithms, shortest path, communities
- npm: sigma v3.0.2 - https://www.npmjs.com/package/sigma - Version, bundle size
- npm: graphology v0.26.0 - https://www.npmjs.com/package/graphology - Version, bundle size (11.5KB gzipped)
- npm: graphology-layout-forceatlas2 - https://www.npmjs.com/package/graphology-layout-forceatlas2 - Layout parameters
- npm: graphology-shortest-path - https://graphology.github.io/standard-library/shortest-path.html - Dijkstra, A*, bidirectional search
- npm: graphology-communities-louvain - https://graphology.github.io/standard-library/communities-louvain.html - Community detection
- Obsidian Developer Docs: Views - https://docs.obsidian.md/Plugins/User+interface/Views - ItemView pattern
- Obsidian Developer Docs: ItemView API - https://docs.obsidian.md/Reference/TypeScript+API/ItemView - Lifecycle methods

### Secondary (MEDIUM confidence)

- Ouestware: Sigma.js 3.0 Release - https://www.ouestware.com/2024/03/21/sigma-js-3-0-en/ - Version 3 improvements, instanced rendering
- Medium: Visualizing Graphs with Graphology and ForceAtlas2 - https://medium.com/@guillaume-brioudes/visualizing-graphs-in-javascript-with-graphology-and-forceatlas2-11e257c394e0 - Usage examples
- Rapidops: 7 Helpful Sigma.js Examples - https://rapidops.medium.com/7-helpful-sigma-js-examples-to-master-graph-visualization-a8cadf9e9b14 - Interaction patterns
- DEV Community: Exploring Network Graph Visualization - https://dev.to/gabetronic/exploring-network-graph-visualization-graphology-and-sigmajs-5fcg - Architecture overview
- Cylynx: Comparison of JS Graph Libraries - https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/ - Performance comparison (sigma.js vs vis-network vs others)
- Memgraph: Graph Visualization Tool Comparison - https://memgraph.com/blog/you-want-a-fast-easy-to-use-and-popular-graph-visualization-tool - Speed benchmarks

### Tertiary (LOW confidence, marked for validation)

- GitHub Issues: sigma.js edge events (#930), performance (#967, #906), collapsible nodes (#366, #903) - Community discussions, not official guidance
- Obsidian Forum: Workspace state persistence - Feature requests, not confirmed current behavior

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - Sigma.js + graphology documented as established pairing. Wide adoption (Gephi Lite, GraphCommons, others). TypeScript support confirmed. Bundle sizes verified via npm.
- Architecture: **HIGH** - Phase 26 timeline patterns directly applicable. ItemView, MCP loading, filter chips all proven. Official Obsidian docs confirm API.
- Layout algorithms: **HIGH** - ForceAtlas2 from Gephi, 15+ years proven. Graphology implementation documented, parameters verified.
- Interactions: **HIGH** - Sigma.js event system documented, examples available. Right-click context menu follows Obsidian patterns.
- Pitfalls: **MEDIUM** - Derived from GitHub issues, community reports. Not all officially documented but consistent patterns.

**Research date:** 2026-01-28
**Valid until:** 2026-03-28 (60 days - moderate pace of change, active maintenance)

**Libraries validated against:**
- sigma.js: v3.0.2 (latest as of 2026-01)
- graphology: v0.26.0 (latest as of 2026-01)
- Obsidian API: v1.4+ (current stable)

**Follow-up validation recommended:**
- Check for sigma.js v3.1+ if released (review changelog for breaking changes)
- Confirm bundle size after build (compare to estimate)
- Test performance with user's vault size (may need threshold tuning)

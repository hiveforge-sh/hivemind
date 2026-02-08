# Phase 26: Timeline Obsidian View - Research

**Researched:** 2026-01-28
**Domain:** Timeline visualization in Obsidian plugins, ItemView architecture, vis-timeline library integration
**Confidence:** MEDIUM

## Summary

This phase implements an interactive timeline view within Obsidian that visualizes temporal data (entities with dates) on a chronological axis. The research covered three critical areas: (1) Timeline visualization libraries for JavaScript/TypeScript, (2) Obsidian plugin custom view architecture (ItemView pattern), and (3) Visual design patterns for timelines including swim lanes, filtering, and theme integration.

Current state: Phase 24 completed the timeline MCP data layer with SearchEngine methods (queryTimelineRange, queryTimelineBefore, queryTimelineAfter, queryTimelineExact) and database queries using SQLite generated columns for date fields. The Obsidian plugin already implements custom views (ValidationSidebarView) following the ItemView pattern. The plugin's main.js is currently ~150KB with Obsidian Sync 5MB limit providing ample headroom.

The primary technical decision is timeline library selection. **vis-timeline** (v8.5.0, latest Jan 26, 2026) is the industry-standard choice with built-in TypeScript definitions, native support for groups (swim lanes), range items, and auto-scaling from milliseconds to years. The Chronos Timeline plugin (existing Obsidian plugin) already uses vis-timeline successfully, proving integration viability. Alternative lightweight libraries (Squarechip Timeline, pure CSS) lack critical features like swim lanes and range items.

Research identified key architectural patterns: (1) ItemView lifecycle management (register view, avoid storing references, use getLeavesOfType()), (2) vis-timeline groups for swim lanes with persistent ordering via plugin settings, (3) CSS variable integration for Obsidian theming (light/dark mode), and (4) color-blind safe palettes (Okabe-Ito 8-color scheme recommended for entity types).

**Primary recommendation:** Use vis-timeline v8.5.0 with ESNext build for bundler optimization, implement ItemView with containerEl.children[1] for rendering, leverage vis-timeline's native groups feature for swim lanes, persist filter and lane order preferences via plugin.saveData(), integrate with Obsidian CSS variables for theming, and use Okabe-Ito color palette for accessibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vis-timeline | 8.5.0 | Interactive timeline rendering | Industry standard (maintained Jan 2026), native groups/swim lanes, auto-scaling, TypeScript support, proven in Chronos plugin |
| Obsidian API | latest | Plugin framework and ItemView | Required for custom views, workspace management, settings storage |
| obsidian (package) | latest | TypeScript definitions | Already in obsidian-plugin devDependencies, provides full API types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vis-data | peer dep | Data management for vis-timeline | Required with ESNext build for optimal bundle size |
| esbuild | 0.27.2 | Bundler | Already in plugin for main.js compilation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vis-timeline | Squarechip Timeline | Lighter weight but lacks swim lanes, range items, and TypeScript support |
| vis-timeline | Pure CSS timelines | Zero JavaScript but non-interactive, no zoom/pan, no data binding |
| vis-timeline | D3.js timeline | More flexible but requires custom swim lane implementation, larger learning curve |
| ESNext build | Standalone build | Standalone has bundle bloat, ESNext optimizes with bundler tree-shaking |

**Installation:**
```bash
cd obsidian-plugin
npm install vis-timeline vis-data
```

## Architecture Patterns

### Recommended Project Structure
```
obsidian-plugin/
├── main.ts                      # MODIFY: Register timeline view
├── timeline-view.ts             # NEW: TimelineView class extending ItemView
├── timeline-settings.ts         # NEW: Filter/lane preferences interface
├── styles.css                   # MODIFY: Timeline theme integration
└── package.json                 # MODIFY: Add vis-timeline dependencies
```

### Pattern 1: ItemView Lifecycle Management
**What:** Extend ItemView, implement required methods, register view with factory function
**When to use:** Always for custom views in Obsidian plugins (official pattern)
**Example:**
```typescript
// Source: https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/views
import { ItemView, WorkspaceLeaf } from 'obsidian';

const VIEW_TYPE_TIMELINE = 'hivemind-timeline';

export class TimelineView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_TIMELINE;
  }

  getDisplayText(): string {
    return 'Hivemind Timeline';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    // Initialize vis-timeline here
  }

  async onClose() {
    // Cleanup timeline instance
  }
}

// In plugin onload()
this.registerView(
  VIEW_TYPE_TIMELINE,
  (leaf) => new TimelineView(leaf)
);
```

### Pattern 2: vis-timeline Groups for Swim Lanes
**What:** Use vis-timeline's native groups feature for entity type swim lanes
**When to use:** Always for swim lane visualization (built-in feature)
**Example:**
```typescript
// Source: https://visjs.github.io/vis-timeline/docs/timeline/
import { Timeline, DataSet } from 'vis-timeline/standalone';

// Define groups (swim lanes) for entity types
const groups = new DataSet([
  { id: 'event', content: 'Event (12)', order: 0 },
  { id: 'character', content: 'Character (8)', order: 1 },
  { id: 'location', content: 'Location (3)', order: 2 }
]);

// Define items with group assignment
const items = new DataSet([
  {
    id: 1,
    group: 'event',
    content: 'Battle of Helm\'s Deep',
    start: '3019-03-03',
    end: '3019-03-04',  // Range item
    type: 'range'
  },
  {
    id: 2,
    group: 'character',
    content: 'Aragorn born',
    start: '2931-03-01',
    type: 'box'  // Point item
  }
]);

const timeline = new Timeline(container, items, groups, {
  editable: false,
  selectable: true,
  zoomable: true,
  moveable: true,
  orientation: 'top'  // or 'bottom', 'both'
});
```

### Pattern 3: Obsidian Theme Integration
**What:** Use Obsidian CSS variables for theming, override vis-timeline CSS classes
**When to use:** Always for plugin UI consistency with user's theme
**Example:**
```css
/* Source: Obsidian community theme patterns */
/* styles.css - Override vis-timeline with Obsidian variables */

.vis-timeline {
  background-color: var(--background-primary);
  border-color: var(--background-modifier-border);
  font-family: var(--font-interface);
}

.vis-item {
  background-color: var(--interactive-normal);
  border-color: var(--background-modifier-border);
  color: var(--text-normal);
}

.vis-item.vis-selected {
  background-color: var(--interactive-accent);
  border-color: var(--interactive-accent);
  color: var(--text-on-accent);
}

.vis-time-axis .vis-text {
  color: var(--text-muted);
}

.vis-time-axis .vis-grid {
  border-color: var(--background-modifier-border);
}

/* Adapt to light/dark mode automatically via Obsidian's theme variables */
```

### Pattern 4: Settings Persistence
**What:** Save filter preferences and lane order using plugin.saveData()
**When to use:** Always for user preferences that should persist across sessions
**Example:**
```typescript
// Source: Obsidian plugin settings pattern
interface TimelineSettings {
  filterByTypes: string[];  // Selected entity types
  laneOrder: string[];      // Custom swim lane ordering
  textSearch: string;       // Persisted search filter
}

// In TimelineView
async saveViewState() {
  const settings: TimelineSettings = {
    filterByTypes: this.activeFilters,
    laneOrder: this.groups.map(g => g.id),
    textSearch: this.searchInput.value
  };
  await this.plugin.saveData(settings);
}

async loadViewState() {
  const settings = await this.plugin.loadData() as TimelineSettings;
  if (settings?.filterByTypes) {
    this.activeFilters = settings.filterByTypes;
  }
  // Apply loaded state to timeline
}
```

### Anti-Patterns to Avoid
- **Storing view references in plugin:** Never manage references to views in your plugin. Obsidian may call the view factory function multiple times. Use getLeavesOfType() instead.
- **Side effects in view constructor:** Avoid side effects in view constructors. Initialize in onOpen() instead.
- **Hardcoded colors:** Don't use hardcoded hex colors; use Obsidian CSS variables for theme compatibility.
- **Direct DOM manipulation after timeline init:** vis-timeline manages its own DOM; use its API (setItems, setGroups, setOptions) instead of direct DOM changes.
- **Performance with large datasets:** vis-timeline struggles with >150 items visible at once; set zoomMax to prevent users from zooming out too far and rendering all items.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timeline rendering | Custom canvas/SVG timeline | vis-timeline | Handles zoom, pan, auto-scaling, item overlap, date formatting, interaction events, groups |
| Date range scaling | Custom scale calculation logic | vis-timeline auto-scale | Automatically adjusts from milliseconds to years, handles leap years, DST, edge cases |
| Item overlap handling | Custom stacking algorithm | vis-timeline built-in | Automatically stacks overlapping items, handles range vs point items differently |
| Swim lane rendering | Custom lane layout system | vis-timeline groups | Native groups feature with drag-drop support, collapsible lanes, custom ordering |
| Color-blind palette | Custom color selection | Okabe-Ito palette | Scientifically validated 8-color scheme, safe for most color vision deficiencies |
| Theme detection | Custom light/dark detection | Obsidian CSS variables | Automatically updates with theme changes, no detection code needed |
| Settings storage | localStorage | plugin.saveData() | Obsidian-native API, syncs across devices, mobile-compatible (localStorage has iOS issues) |

**Key insight:** Timeline visualization has immense complexity in edge cases (overlapping items, varying time scales, interaction states, responsive layout). vis-timeline is mature (10+ years) with solutions for problems you won't discover until users report them. Don't underestimate "just drawing boxes on a timeline."

## Common Pitfalls

### Pitfall 1: Performance Degradation with Many Items
**What goes wrong:** Timeline becomes very slow with >150 visible items, scrolling lags, zooming takes seconds
**Why it happens:** vis-timeline renders all visible items to DOM; browser layout/paint becomes bottleneck at scale
**How to avoid:** Set zoomMax option to prevent users from zooming out beyond a threshold that keeps visible items under ~150
**Warning signs:** User reports slow scrolling, high CPU usage in dev tools during zoom operations
```typescript
const options = {
  zoomMax: 1000 * 60 * 60 * 24 * 365 * 10,  // Max zoom: 10 years visible
  zoomMin: 1000 * 60 * 60 * 24,  // Min zoom: 1 day visible
};
```

### Pitfall 2: Bundle Size Impact
**What goes wrong:** vis-timeline standalone build adds significant bundle bloat, slows plugin load time
**Why it happens:** Standalone build includes all dependencies inline; duplicates libraries if project already has moment.js, etc.
**How to avoid:** Use ESNext build with esbuild bundler for tree-shaking and dependency deduplication
**Warning signs:** main.js size increases by >200KB, bundle contains duplicate library code
```bash
# Use ESNext build, not standalone
npm install vis-timeline vis-data  # Peer dependencies managed by bundler
```

### Pitfall 3: Date Format Mismatches
**What goes wrong:** Timeline shows items at wrong dates, or fails to render items with dates
**Why it happens:** vis-timeline expects JavaScript Date objects or ISO8601 strings; custom date formats fail
**Why this matters:** Phase 24 uses ISO8601 YYYY-MM-DD format; must ensure consistency
**How to avoid:** Always use ISO8601 strings from timeline MCP queries; don't parse/reformat dates
**Warning signs:** Items appear on timeline at unexpected dates, console errors about invalid dates

### Pitfall 4: Light/Dark Mode Styling Breaks
**What goes wrong:** Timeline looks good in light mode but unreadable in dark mode (or vice versa)
**Why it happens:** vis-timeline has default styling that doesn't respect Obsidian's theme variables
**How to avoid:** Override all vis-timeline CSS classes to use Obsidian CSS variables (--background-primary, --text-normal, etc.)
**Warning signs:** User reports timeline is hard to read after switching themes, contrast issues

### Pitfall 5: Memory Leaks from Timeline Instance
**What goes wrong:** Memory usage grows over time, especially when opening/closing timeline view repeatedly
**Why it happens:** Timeline instance holds references to DOM nodes; not calling destroy() on close leaks memory
**How to avoid:** Store timeline instance as class property, call timeline.destroy() in onClose()
**Warning signs:** Browser memory profiler shows leaked detached DOM nodes, memory usage grows with view open/close cycles
```typescript
async onClose() {
  if (this.timeline) {
    this.timeline.destroy();
    this.timeline = null;
  }
}
```

## Code Examples

Verified patterns from official sources:

### Opening Timeline View from Command
```typescript
// Source: https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/views
// In plugin onload()
this.addCommand({
  id: 'open-timeline-view',
  name: 'Open timeline view',
  callback: () => {
    this.activateView(VIEW_TYPE_TIMELINE);
  }
});

async activateView(viewType: string) {
  const { workspace } = this.app;

  let leaf = workspace.getLeavesOfType(viewType)[0];

  if (!leaf) {
    // No existing leaf, create one in right sidebar
    leaf = workspace.getRightLeaf(false);
    await leaf.setViewState({ type: viewType, active: true });
  }

  // Reveal the leaf
  workspace.revealLeaf(leaf);
}
```

### Fetching Timeline Data from SearchEngine
```typescript
// Source: Existing Phase 24 SearchEngine methods
import type HivemindPlugin from './main';

async loadTimelineData() {
  const container = this.containerEl.children[1];

  // Query all timeline data (or specific range if needed)
  const results = await fetch('http://localhost:3000/api/timeline/range', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: '0001-01-01',  // Very broad range to get all data
      endDate: '9999-12-31',
    })
  });

  const data = await results.json();

  // Transform to vis-timeline format
  const items = data.nodes.map(node => {
    const dateField = node.frontmatter.start_date || node.frontmatter.date;
    const endField = node.frontmatter.end_date;

    return {
      id: node.id,
      group: node.type,
      content: `${node.name}${node.frontmatter.description ? ' - ' + node.frontmatter.description : ''}`,
      start: dateField,
      end: endField || undefined,
      type: endField ? 'range' : 'box',
      className: `timeline-item-${node.type}`
    };
  });

  this.timeline.setItems(items);
}
```

### Click Navigation to Note
```typescript
// Source: vis-timeline event handling + Obsidian API
this.timeline.on('select', (properties) => {
  if (properties.items.length > 0) {
    const itemId = properties.items[0];
    const item = this.items.get(itemId);

    // Open note in active pane
    const file = this.app.vault.getAbstractFileByPath(item.path);
    if (file instanceof TFile) {
      this.app.workspace.getLeaf('tab').openFile(file);
    }
  }
});
```

### Color-Blind Safe Palette (Okabe-Ito)
```typescript
// Source: https://personal.sron.nl/~pault/ and color-blind research
// Okabe-Ito 8-color palette - safe for most color vision deficiencies
const entityColors = {
  'event': '#E69F00',      // Orange
  'character': '#56B4E9',  // Sky Blue
  'location': '#009E73',   // Bluish Green
  'faction': '#F0E442',    // Yellow
  'item': '#0072B2',       // Blue
  'concept': '#D55E00',    // Vermillion
  'timeline': '#CC79A7',   // Reddish Purple
  'default': '#999999'     // Gray
};

// Apply to timeline items via CSS classes
items.forEach(item => {
  item.className = `timeline-${item.group}`;
});

// In styles.css
.timeline-event { background-color: #E69F00; }
.timeline-character { background-color: #56B4E9; }
// ... etc
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| vis (monolithic) | vis-timeline (modular) | 2017 | vis split into separate packages (vis-timeline, vis-network, vis-graph3d) for smaller bundles |
| Standalone builds | ESNext builds | 2020+ | Modern bundlers enable tree-shaking; ESNext builds reduce bundle size |
| @types/vis | Built-in types | 2021+ | vis-timeline includes TypeScript definitions; no separate @types package needed |
| localStorage | plugin.saveData() | 2026 | Obsidian exposed official settings API with SecretStorage for sensitive data (Jan 2026 update) |
| Manual theme detection | CSS variables | 2024+ | Obsidian themes use CSS variables; plugins inherit theme automatically |

**Deprecated/outdated:**
- **vis (monolithic library):** Replaced by vis-timeline, vis-network, vis-graph3d as separate packages. Use vis-timeline only.
- **@types/vis:** Don't install; vis-timeline includes built-in TypeScript definitions at types/index.d.ts
- **Standalone build for production:** Use ESNext build with modern bundlers for optimal size
- **localStorage for settings:** Use plugin.saveData() for Obsidian-native persistence with sync support

## Open Questions

Things that couldn't be fully resolved:

1. **vis-timeline exact bundle size**
   - What we know: vis-timeline v8.5.0 is latest (Jan 26, 2026), ESNext build optimizes with bundlers, standalone has "bundle bloat" issue
   - What's unclear: Exact minified+gzipped size in KB (Bundlephobia page couldn't be fetched, search results lacked specifics)
   - Recommendation: Measure actual bundle size during 26-01 implementation; STATE.md notes current main.js ~150KB with 5MB limit, so even 100KB addition leaves headroom

2. **Horizontal vs vertical timeline orientation**
   - What we know: vis-timeline supports orientation option ('top', 'bottom', 'both' for horizontal; vertical not explicitly documented)
   - What's unclear: Whether vertical orientation is supported, and which is better UX for Obsidian sidebar
   - Recommendation: Start with horizontal orientation: 'top' (standard convention). CONTEXT.md marks this as Claude's discretion; can adjust based on user feedback

3. **Jump-to-date feature implementation**
   - What we know: vis-timeline has moveTo(), fit(), focus() methods for navigation
   - What's unclear: Best UX pattern for jump-to-date in Obsidian context (command palette, date picker, search)
   - Recommendation: CONTEXT.md marks as discretion; implement using vis-timeline.moveTo(date) with command palette integration if time permits

4. **Swim lane collapse feature**
   - What we know: vis-timeline groups support custom templates, but collapse/expand not in basic API
   - What's unclear: Whether collapsible swim lanes require custom implementation or have plugin support
   - Recommendation: CONTEXT.md marks as discretion; skip for 26-01 (complexity vs value trade-off), can add later if users request

## Sources

### Primary (HIGH confidence)
- vis-timeline official docs: https://visjs.github.io/vis-timeline/docs/timeline/ - Timeline API, groups, items, options
- vis-timeline GitHub: https://github.com/visjs/vis-timeline - Current version (8.5.0, Jan 26, 2026), TypeScript definitions location
- Obsidian Plugin Docs (Marcus Olsson): https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/views - ItemView lifecycle, registration patterns
- Chronos Timeline Plugin GitHub: https://github.com/clairefro/obsidian-plugin-chronos - Proven vis-timeline integration in Obsidian

### Secondary (MEDIUM confidence)
- vis-timeline custom CSS examples: https://visjs.github.io/vis-timeline/examples/timeline/styling/customCss.html - Theming patterns
- Okabe-Ito palette research: https://personal.sron.nl/~pault/ - Color-blind safe categorical colors
- Obsidian theme developer docs (DeepWiki): https://deepwiki.com/obsidianmd/obsidian-developer-docs/3.1-creating-app-themes - CSS variables reference
- vis-timeline performance issues: https://github.com/almende/vis/issues/2177, https://github.com/almende/vis/issues/3522 - Community-reported performance limits (>150 items)

### Tertiary (LOW confidence)
- WebSearch: "timeline visualization javascript library 2026" - General landscape (vis.js most common)
- WebSearch: "vis-timeline groups swim lanes example 2026" - Confirmed groups feature exists
- WebSearch: "color blind safe palette categorical colors accessibility 2026" - Okabe-Ito recommendation verified by multiple sources
- WebSearch: "Obsidian timeline plugin view 2026" - Found existing plugins (Chronos, Timeline View, etc.) using similar approaches

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - vis-timeline is industry standard, proven in Chronos plugin, well-documented, actively maintained (Jan 2026)
- Architecture: HIGH - ItemView pattern is official Obsidian approach, vis-timeline groups are documented feature, plugin.saveData() is standard API
- Pitfalls: MEDIUM - Performance limits verified by GitHub issues, bundle size concerns from vis docs, other pitfalls are general best practices not timeline-specific
- Bundle size: LOW - Could not verify exact KB size from Bundlephobia; will need measurement during implementation
- UX decisions: MEDIUM - CONTEXT.md provides some decisions (toggle chips, top toolbar), leaves others to discretion (orientation, collapse)

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - vis-timeline is stable, unlikely to change significantly)

**Research limitations:**
- Bundle size specifics require actual build measurement (Bundlephobia fetch failed)
- Some UX patterns (vertical orientation, collapsible lanes) require hands-on exploration of vis-timeline API during implementation
- Integration with Phase 24's exact data structure will become clear during coding; research used general patterns

**Key assumptions:**
- Phase 24 timeline MCP tools provide data in format compatible with vis-timeline (ISO8601 dates, entity types, names, descriptions)
- Obsidian plugin settings API (plugin.saveData()) works as documented for persistence
- esbuild bundler in obsidian-plugin/esbuild.config.mjs can handle vis-timeline ESNext build with tree-shaking
- Users expect horizontal timeline (standard convention) unless vertical is explicitly better for Obsidian sidebar context

# Phase 26: Timeline Obsidian View - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive timeline visualization within Obsidian. Users see their temporal data (events, dated entities) on a chronological axis. Includes filtering by entity type, swim lanes for grouping, and navigation to notes. Uses Phase 24's timeline MCP tools as data source.

</domain>

<decisions>
## Implementation Decisions

### Visual layout
- Items display: name + short description (richer preview at a glance)
- Color coding: distinct colors per entity type for quick visual identification
- Axis orientation: Claude's discretion based on research
- Overlap handling: Claude's discretion based on typical data density

### Interaction behavior
- Navigation: both click-drag to pan AND scroll wheel pans (flexible)
- Zoom: Ctrl/Cmd + scroll wheel (matches browser/map conventions)
- Hover behavior: Claude's discretion based on Obsidian patterns
- Jump to date: Claude's discretion based on typical use patterns

### Filtering controls
- Location: top toolbar (always visible above timeline)
- Filter style: toggle chips (clickable pills that toggle on/off)
- Persistence: remember filter preferences across sessions
- Text search: yes, with highlight on matching items

### Swim lane design
- Lane order: user-draggable (full control over ordering)
- Lane labels: type name + count (e.g., "Event (12)")
- Lane selection: no bulk select, lanes are for visual grouping only
- Collapsibility: Claude's discretion based on expected lane count

### Claude's Discretion
- Timeline axis orientation (horizontal vs vertical)
- Overlap handling (stack vs cluster)
- Hover behavior (tooltip, highlight only, or preview pane)
- Jump-to-date feature inclusion
- Swim lane collapse behavior
- Exact spacing, typography, and theming integration

</decisions>

<specifics>
## Specific Ideas

- Timeline should integrate with Obsidian's theming (light/dark mode support)
- Filter preferences persisting suggests using Obsidian's settings storage API
- Distinct colors per type should respect accessibility (color blind safe palette)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-timeline-obsidian-view*
*Context gathered: 2026-01-28*

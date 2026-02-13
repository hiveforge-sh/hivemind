# Hivemind Speckit Constitution

**Version:** 4.0  
**Last Updated:** 2026-01-29  
**Status:** Living Document

This document serves as the canonical reference for the Hivemind project's architecture, decisions, and conventions. It synthesizes information from `.planning/` and project documentation to provide AI assistants and developers with a complete mental model of the system.

---

## Table of Contents

1. [Project Identity](#project-identity)
2. [Architecture](#architecture)
3. [Development Workflow](#development-workflow)
4. [Key Decisions](#key-decisions)
5. [Requirements Traceability](#requirements-traceability)
6. [Technical Constraints](#technical-constraints)
7. [Active Concerns](#active-concerns)

---

## Project Identity

### Core Value Proposition

**Consistent AI output.** Give any AI tool context from your canon, get results that belong in your world — every time, across every tool.

### What This Is

A domain-agnostic MCP (Model Context Protocol) server for knowledge management with pluggable templates. Ships with three built-in templates (worldbuilding, research, people-management) and supports custom entity definitions via config.json. AI tools query the MCP for context, ensuring generated content stays consistent with your canonical source of truth. The template system auto-generates MCP tools per entity type, enabling seamless integration across any knowledge domain.

### Origin Story

Personal project expanding a D&D live play character into a full world with AI-generated YouTube content. Initially hardcoded for worldbuilding, evolved to support managers tracking people/goals, researchers managing papers/citations, and knowledge workers with Zettelkasten-style PKM.

### Current State (v4.0)

- **Lines of code:** ~12,479 TypeScript
- **Tests:** 893 passing (coverage: branches 30%, functions 55%, lines 40%, statements 40%)
- **Zero `any` types:** Strict TypeScript with ESLint enforcement
- **CI gates:** License compliance (no GPL/AGPL), mutation testing (Stryker), conventional commits
- **Dual artifacts:** npm package (`@hiveforge/hivemind-mcp`) + Obsidian plugin
- **In progress:** Phase 28 - Community plugin submission (2/3 plans complete)

---

## Architecture

### System Topology

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Clients (Claude, Copilot)             │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (JSON-RPC 2.0)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hivemind MCP Server                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Tool Generator (Dynamic MCP Tools)                 │   │
│  │  • query_{entity_type}  • list_{entity_type}       │   │
│  │  • timeline_query_*     • graph_*                   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Template Registry (Runtime Config)                 │   │
│  │  • Entity types  • Field schemas  • Relationships   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Search Engine (Hybrid)                             │   │
│  │  • Full-text (SQLite FTS5)  • Metadata filters      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Graph Database (SQLite)                            │   │
│  │  • Nodes (entities)  • Edges (relationships)        │   │
│  │  • Recursive CTEs (traversal)                       │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ File watcher (chokidar)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Obsidian Vault (Markdown)                   │
│  • YAML frontmatter (entity metadata)                        │
│  • Wikilinks ([[Note Title]]) → relationships                │
│  • Canon status: draft → pending → canon                     │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. MCP Server (`src/server.ts`, `src/index.ts`)

**Purpose:** Implements Model Context Protocol for AI tool integration  
**Transport:** stdio (default) or SSE for remote clients  
**Lifecycle:** Startup → Load config → Detect template → Initialize registry → Index vault → Generate tools → Listen

**Key behaviors:**
- Dynamically generates MCP tools based on loaded template
- Conditionally registers timeline tools (only if template has date fields)
- Always registers graph tools (relationships are universal)
- Supports `--vault` CLI flag to override config path

#### 2. Template System (`src/templates/`)

**Purpose:** Define entity types, fields, and relationships per domain

**Structure:**
```
templates/
├── builtin/                 # Shipped templates
│   ├── worldbuilding.ts    # character, location, event, faction, lore, asset
│   ├── research.ts         # paper, citation, concept, note
│   └── people-management.ts # person, goal, team, meeting
├── community/              # User-contributed (future)
├── detector.ts             # Auto-detect template from vault
├── registry.ts             # Central singleton for active template
├── schema-factory.ts       # Generate Zod schemas from config
└── loader.ts               # Load and validate templates
```

**Design pattern:** Templates are NOT configured—detection is automatic via `detector.ts` scanning vault for entity type patterns. Falls back to generic base template if no match.

**Critical invariant:** Plugin and CLI both use template registry (no duplication). FRONTMATTER_TEMPLATES was removed in Phase 23 to eliminate stale hardcoded templates.

#### 3. Vault Processing (`src/vault/`)

**Purpose:** Parse Obsidian markdown files with YAML frontmatter

**Key modules:**
- `reader.ts`: Parses frontmatter + extracts wikilinks
- `watcher.ts`: Monitors vault for changes (chokidar), incremental reindexing

**Wikilink parsing:**
- Format: `[[Note Title]]` or `[[Note Title|Display Text]]`
- Extracted from markdown body (not frontmatter)
- Become edges in graph with relationship type `references`

#### 4. Graph System (`src/graph/`)

**Purpose:** SQLite-based knowledge graph for entity relationships

**Schema:**
```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  type TEXT,
  status TEXT,  -- draft, pending, canon
  title TEXT,
  content TEXT,
  frontmatter TEXT,  -- JSON blob
  date_start TEXT,   -- ISO8601 for timeline queries
  date_end TEXT
);

CREATE TABLE edges (
  id INTEGER PRIMARY KEY,
  from_id TEXT,
  to_id TEXT,
  type TEXT,  -- relationship type
  FOREIGN KEY (from_id) REFERENCES nodes(id),
  FOREIGN KEY (to_id) REFERENCES nodes(id)
);

CREATE VIRTUAL TABLE nodes_fts USING fts5(title, content);
```

**Traversal:** Recursive CTEs for multi-hop graph queries (neighbors, subgraph, shortest path)

**Performance:** Dedicated date columns (not JSON extraction) with indexes. Depth caps: subgraph max 5 hops (default 2), shortest path max 10.

#### 5. Search Engine (`src/search/`)

**Purpose:** Hybrid search with full-text + metadata filtering

**Strategy:**
- Full-text: SQLite FTS5 index on title + content
- Metadata filters: entity type, canon status, importance
- Returns ranked results with snippets
- Enriches results with relationships via graph database

#### 6. MCP Tool Generation (`src/mcp/`)

**Purpose:** Create MCP tools dynamically from template config

**Generated tools per entity type:**
- `query_{entity_type}` - Query by name/ID
- `list_{entity_type}` - List all of type

**Timeline tools (conditional):**
- `timeline_query_range` - Query date range (YYYY-MM-DD to YYYY-MM-DD)
- `timeline_query_before` - Query before date
- `timeline_query_after` - Query after date
- `timeline_query_exact` - Query exact date

**Graph tools (always):**
- `graph_get_neighbors` - 1-hop connections
- `graph_query_subgraph` - Multi-hop (configurable depth)
- `graph_shortest_path` - Find path between entities
- `graph_list_relationship_types` - List available edge types

**Entity ID resolution:** Supports `Type:name` format, direct ID, and name search for flexible queries.

#### 7. ComfyUI Integration (`src/comfyui/`, optional)

**Purpose:** Track AI-generated images and workflows

**Features:**
- Store ComfyUI workflows as assets
- Track generation parameters for reproducibility
- Link assets to vault entities
- Query assets by entity reference

**Status:** Optional feature, gracefully degrades if disabled in config.

#### 8. Obsidian Plugin (`obsidian-plugin/`)

**Purpose:** Visual interface for vault management

**Features:**
- Timeline view (vis-timeline): Chronological axis with entity swim lanes
- Graph view (sigma.js + graphology): Interactive node-link diagram with WebGL
- Validation sidebar: Vault-wide frontmatter validation
- Commands: Add/validate/fix frontmatter
- Settings: Template selection, folder mapping, MCP connection

**Bundle size:** ~150KB (main.js) + ~60KB (sigma + graphology) = ~210KB (well under 5MB Obsidian Sync limit)

**Design patterns:**
- ItemView lifecycle: `onOpen()` with placeholder, `onClose()` with cleanup
- Memory-safe: `renderer.kill()` + `graph.clear()` for sigma.js
- MCP integration: Calls MCP tools via child_process spawn
- Okabe-Ito color palette: Scientifically validated color-blind accessible (8 colors)

---

## Development Workflow

### Commands

```bash
# Build
npm run build           # Compile TypeScript to dist/

# Development
npm run dev             # Watch mode - auto-rebuild on changes

# Testing
npm test                # Run full test suite (vitest)
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run with coverage report

# Run single test file
npx vitest run tests/path/to/test.test.ts

# Run tests matching pattern
npx vitest run -t "test name pattern"

# Linting
npm run lint            # ESLint (src/ only, excludes tests/)

# Server
npm start               # Run MCP server with config.json
npx hivemind --vault /path/to/vault  # Override vault path
```

### Commit Convention

**Enforced via Conventional Commits** (commitlint + husky)

Format: `<type>: <description>`

Types:
- `feat:` - New feature (triggers **minor** version bump)
- `fix:` - Bug fix (triggers **patch** version bump)
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Other changes (deps, config)

**Breaking changes:** Add `BREAKING CHANGE:` in commit footer to trigger **major** version bump

### Release Process

Fully automated via semantic-release:

1. Merge to `master` branch
2. GitHub Actions analyzes commits
3. Determines version bump (major/minor/patch)
4. Generates `CHANGELOG.md`
5. Creates GitHub release with tag `${version}` (no `v` prefix)
6. Publishes to npm as `@hiveforge/hivemind-mcp`
7. Bundles Obsidian plugin files (`main.js`, `manifest.json`, `styles.css`)

**Important:** Release tag format is bare semver (`1.2.0`, not `v1.2.0`) to match `manifest.json` per Obsidian requirements.

### Testing Patterns

**Test structure mirrors src:**
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/fixtures.ts` - Shared test data

**Key patterns:**
- Use `fixtures.ts` for sample notes and frontmatter
- Integration tests create temporary SQLite databases
- Mock filesystem operations where needed
- Use `createNoteTypeSchema()` for template-aware tests (not hardcoded schemas)
- Thin wrappers tested indirectly via integration tests (avoid complex ESM mocking)
- TTY-free testing with mock-based orchestration for CLI

**Coverage thresholds** (vitest.config.ts):
- Branches: 30%
- Functions: 55%
- Lines: 40%
- Statements: 40%

### TypeScript Configuration

- **Target:** ES2022
- **Module:** ES2022 (ESM only, not CommonJS)
- **Strict mode:** Enabled
- **Import extensions:** Files must use `.js` extensions (e.g., `import { X } from './file.js'`)
- **No unused vars:** Enforced, but `_` prefix allowed for intentional ignores

### ESLint Rules

- Uses `typescript-eslint` recommended config
- `@typescript-eslint/no-explicit-any`: **warn** (not error, but zero warnings enforced in CI)
- Unused vars with `_` prefix are ignored
- Tests and `obsidian-plugin/` excluded from linting

---

## Key Decisions

This section captures architectural decisions that require reading multiple files to understand. Decisions are immutable once validated through implementation.

### Template System

| Decision | Rationale | Status |
|----------|-----------|--------|
| **Templates auto-detected, not configured** | User shouldn't need to specify template in config—system infers from vault entity patterns | v2.0 |
| **Template registry is source of truth** | Plugin and CLI both read from registry, no duplication of FRONTMATTER_TEMPLATES | v4.0 Phase 23 |
| **Dynamic Zod schema generation** | Factory functions (`createNoteTypeSchema`, `createBaseFrontmatterSchema`) accept custom types at runtime | v2.0 |
| **Custom entity types via config** | No coding required—define entities in `config.json` with fields and validation | v2.0 |
| **Initialize templates before vault scan** | Templates needed before parsing entities, so loader runs first in startup sequence | v2.0 |

### Data Layer

| Decision | Rationale | Status |
|----------|-----------|--------|
| **SQLite over graph DB** | better-sqlite3 is synchronous, zero config, cross-platform, sufficient for <100K entities | v1.0 |
| **Dedicated date columns** | Date fields in dedicated `date_start`/`date_end` columns (not JSON extraction) for query performance | v4.0 Phase 24 |
| **ISO8601 UTC format** | YYYY-MM-DD for user input, but stored as UTC to avoid timezone ambiguity in queries | v4.0 Phase 24 |
| **Incremental indexing default** | Only process changed files on watch events, not full vault rescan | v1.0 |
| **Wikilinks become edges** | `[[Note]]` links in markdown body extracted as `references` relationship edges | v1.0 |
| **Recursive CTEs for traversal** | SQLite native graph traversal via `WITH RECURSIVE`, no external graph library | v4.0 Phase 25 |
| **Depth caps for queries** | Subgraph max 5 hops (default 2), shortest path max 10 to prevent runaway queries in dense graphs | v4.0 Phase 25 |
| **Cycle prevention via path tracking** | Use `path NOT LIKE` pattern for SQLite-native cycle detection without extra data structures | v4.0 Phase 25 |

### MCP Tools

| Decision | Rationale | Status |
|----------|-----------|--------|
| **Dynamic tool generation** | Tools generated at runtime from template config, not hardcoded per entity type | v2.0 |
| **Conditional timeline tool registration** | Timeline tools only appear if template has date-typed fields, avoiding confusion | v4.0 Phase 24 |
| **Always-available graph tools** | Graph tools always registered (relationships are core to all templates) | v4.0 Phase 25 |
| **Entity ID resolution with multiple formats** | Support `Type:name` format, direct ID, and name search for flexible entity identification | v4.0 Phase 25 |
| **Timeline methods return relationships** | SearchEngine delegates to database then enriches with relationships, matching query pattern | v4.0 Phase 24 |
| **Graph methods enrich with full node details** | Return complete GraphNode objects with frontmatter, not just IDs | v4.0 Phase 25 |

### Obsidian Plugin

| Decision | Rationale | Status |
|----------|-----------|--------|
| **sigma.js + graphology for graph** | WebGL rendering handles 1000+ nodes, ~60KB bundle, MIT licensed | v4.0 Phase 27 |
| **vis-timeline for timeline** | Mature library with built-in timeline features, Apache-2.0 licensed, ~300KB acceptable | v4.0 Phase 26 |
| **Okabe-Ito color palette** | Scientifically validated color-blind accessible palette (8 distinct colors) for entity types | v4.0 Phase 26 |
| **ItemView lifecycle pattern** | Follow `ValidationSidebarView` pattern for views: `onOpen` placeholder, `onClose` cleanup | v4.0 Phase 26 |
| **Memory-safe renderer cleanup** | Add `renderer.kill()` + `graph.clear()` in `onClose()` to prevent leaks | v4.0 Phase 27 |
| **Local mode via neighbors query** | Use `hvmd_graph_get_neighbors` for local mode (active file entity + neighbors at depth 1) | v4.0 Phase 27 |
| **ForceAtlas2 layout** | Use `inferSettings` with 50 iterations for balance of quality and performance | v4.0 Phase 27 |
| **Edge labels on hover only** | Show relationship types only when edge hovered to prevent visual clutter | v4.0 Phase 27 |
| **Bidirectional Dijkstra for paths** | Use graphology-shortest-path locally for instant client-side path computation | v4.0 Phase 27 |
| **Louvain community detection** | Use graphology-communities-louvain for cluster identification | v4.0 Phase 27 |
| **Filter state persistence** | Store filter preferences in plugin settings for session continuity | v4.0 Phase 26/27 |
| **child_process for MCP spawn** | Plugin spawns MCP server via child_process—documented for Obsidian review team with security scope | v4.0 Phase 23 |

### Testing & Quality

| Decision | Rationale | Status |
|----------|-----------|--------|
| **`unknown` over `any`** | Safer type handling, forces explicit narrowing | v3.1 |
| **Zero `any` types enforced** | ESLint `no-explicit-any` as error in CI, 79 warnings eliminated | v3.1 |
| **Stryker mutation testing** | vitest runner, configurable thresholds, run on 7 core modules | v3.1 |
| **License compliance CI gate** | Fail build on GPL/AGPL in dependency tree | v3.1 |
| **Test isolation via explicit paths** | Removed `process.chdir()` tests, use explicit `configPath` parameter to avoid Stryker worker conflicts | v4.0 Phase 23 |
| **Inline child_process docs** | Document at import site for review team visibility vs separate ADR | v4.0 Phase 23 |
| **Indirect testing for thin wrappers** | `prompts.ts` wrappers tested via wizard integration tests vs complex ESM mocking | v4.0 Phase 23 |
| **Mock-based orchestration testing** | CLI `index.ts` routing tested with mocked dependencies for TTY-free testing | v4.0 Phase 23 |

### Release & Distribution

| Decision | Rationale | Status |
|----------|-----------|--------|
| **Dual-artifact release** | Single repo builds both npm package and Obsidian plugin | v1.0 |
| **Bare semver tag format** | Git tags use `${version}` (e.g., `1.2.0`) without `v` prefix to match `manifest.json` | v3.0 |
| **styles.css in release assets** | All three files (`main.js`, `manifest.json`, `styles.css`) required for Obsidian validation | v4.0 Phase 28 |
| **Plugin ID: hivemind-mcp** | Existing ID meets Obsidian validation rules (no `obsidian`/`plugin` keywords), kept for continuity | v4.0 Phase 28 |
| **README problem-solution structure** | Lead with worldbuilder pain point (AI hallucination), not technical features | v4.0 Phase 28 |
| **AI Firewall terminology** | Memorable term for canon enforcement positioning, differentiates from other plugins | v4.0 Phase 28 |
| **MCP setup guide separation** | Detailed client configs in `docs/MCP_SETUP_GUIDE.md` to keep README scannable (<200 lines) | v4.0 Phase 28 |

---

## Requirements Traceability

### v4.0 Requirements (Current Milestone)

**Goal:** Add timeline queries and graph visualization (both MCP tools and Obsidian UI), submit community plugin, and clean up accumulated tech debt.

#### Tech Debt (Phase 23) - COMPLETE ✅
- ✅ DEBT-01: Deduplicate FRONTMATTER_TEMPLATES using template registry
- ✅ DEBT-02: Unify template registry initialization between CLI and plugin
- ✅ DEBT-03: CLI init test coverage above 80% (achieved 91.17%)
- ✅ DEBT-04: Resolve/document process.chdir() Stryker exclusion
- ✅ DEBT-05: Resolve/document child_process import for Obsidian review

#### Timeline MCP Tools (Phase 24) - COMPLETE ✅
- ✅ TIME-01: Query entities by date range (start, end)
- ✅ TIME-02: Query entities by exact date
- ✅ TIME-03: Results sorted by date (ascending/descending)
- ✅ TIME-04: ISO date format (YYYY-MM-DD) validated
- ✅ TIME-05: Date field returned in query results
- ✅ TIME-06: Timeline queries entity-type aware (only types with date fields)

#### Graph MCP Tools (Phase 25) - COMPLETE ✅
- ✅ GRAPH-01: Return neighbors of entity (1-hop connections)
- ✅ GRAPH-02: Return subgraph around entity (configurable depth)
- ✅ GRAPH-03: Relationship types included in traversal results
- ✅ GRAPH-04: Find shortest path between two entities
- ✅ GRAPH-05: Filter graph traversal by relationship type

#### Timeline Obsidian View (Phase 26) - COMPLETE ✅
- ✅ TVIEW-01: Visual timeline panel on chronological axis
- ✅ TVIEW-02: Range items for entities with start and end dates
- ✅ TVIEW-03: Multiple timeline scales (auto-adjust)
- ✅ TVIEW-04: Click timeline item to open note
- ✅ TVIEW-05: Filter timeline by entity type
- ✅ TVIEW-06: Grouped swim lanes per entity type

#### Graph Obsidian View (Phase 27) - COMPLETE ✅
- ✅ GVIEW-01: Interactive node-link graph with pan/zoom
- ✅ GVIEW-02: Node labels showing entity names
- ✅ GVIEW-03: Edge labels showing relationship types
- ✅ GVIEW-04: Click node to open note
- ✅ GVIEW-05: Local graph view (focus on entity + neighbors)
- ✅ GVIEW-06: Filter by entity type with live update
- ✅ GVIEW-07: Search and highlight nodes
- ✅ GVIEW-08: Expand nodes for progressive disclosure
- ✅ GVIEW-09: Custom node styling by entity type
- ✅ GVIEW-10: Shortest path highlighting between nodes
- ✅ GVIEW-11: Cluster detection with auto-grouping
- ✅ GVIEW-12: Workspace mode with persistent layouts

#### Community Plugin Submission (Phase 28) - IN PROGRESS 🚧
- ✅ PLUG-01: README with purpose, usage, screenshots
- ✅ PLUG-02: manifest.json validated against Obsidian schema
- ✅ PLUG-03: GitHub release tag matches manifest.json version
- ✅ PLUG-04: Release contains main.js, manifest.json, styles.css
- ⬜ PLUG-05: PR submitted to obsidian-releases
- ✅ PLUG-06: No GPL/AGPL dependencies (CI gate verified)

**Progress:** 46/48 requirements complete (96%)

### Historical Milestones

- **v1.0 MVP** (2026-01-25): MCP server, 12 tools, Obsidian plugin, CI/CD
- **v2.0 Template System** (2026-01-26): Built-in templates, custom entities, 16 auto-generated tools
- **v3.0 Developer Experience** (2026-01-27): CLI wizard, validation, bulk frontmatter fix
- **v3.1 Type Safety & Quality** (2026-01-27): Zero `any` types, mutation testing, license compliance

---

## Technical Constraints

### Hard Constraints

1. **Local-first**: ComfyUI and primary workflows run locally (no cloud dependency)
2. **Obsidian-compatible**: Vault must be standard markdown, usable without plugins
3. **MCP protocol**: Must comply with Model Context Protocol specification
4. **Backwards compatible**: Existing worldbuilding vaults must work unchanged
5. **Bundle size**: Obsidian plugin must stay under 5MB (Obsidian Sync limit)
6. **Node.js version**: Requires Node.js >= 20.0.0
7. **License**: MIT or MIT-compatible dependencies only (no GPL/AGPL)

### Performance Targets

- **Vault indexing:** <2 seconds for 1000 notes (incremental mode)
- **Graph queries:** <500ms for 5-hop subgraph traversal
- **Timeline queries:** <200ms for 10-year date range
- **Search latency:** <100ms for full-text search on 10,000 notes
- **Graph rendering:** 60 FPS for graphs with <100 nodes, 30 FPS for <1000 nodes

### Scalability Limits

- **Vault size:** Tested up to 50,000 notes
- **Graph depth:** Max 5 hops for subgraph, 10 for shortest path
- **Timeline range:** 0001-01-01 to 9999-12-31 (ISO8601 date limits)
- **Large graph warning:** >100 nodes triggers performance warning in UI

---

## Active Concerns

### Research Flags

**Phase 24 (Timeline MCP) - HIGH:**
- Date timezone handling requires cross-timezone testing
- Migration strategy for existing vaults with non-standard date field names (`date`, `created`, `timestamp`)
- ISO8601 format-only validation (regex validates YYYY-MM-DD format without calendar correctness)

**Phase 27 (Graph View) - HIGH:**
- Bundle size monitoring critical (sigma.js + graphology ~60KB, but need continuous monitoring)
- Template registry integration affects both plugin and server (must stay synchronized)

**Phase 28 (Submission) - LOW:**
- child_process usage now documented with security scope and MCP protocol justification
- Screenshots pending for timeline-view.png and graph-view.png

### Open Questions

1. **Date field migration:** How to handle vaults with non-standard date field names? (Research during Phase 24)
   - **Current approach:** Support multiple naming conventions (`start_date`, `date`, `startDate`) and filter entities without valid dates
2. **Bundle size thresholds:** What's the actual bundle size with sigma.js + graphology? (Measure during Phase 27)
   - **Measured:** ~60-70KB for sigma + graphology, well within budget
3. **Temporal types caching:** Should `discoverTemporalTypes()` cache results? (Currently O(n) scan each call)
   - **Deferred:** Not a bottleneck yet, optimize if performance issues arise

### Blockers

None currently.

### Next Actions

**Phase 28 Remaining Work:**
1. ⬜ Plan 03: Capture screenshots for timeline and graph views
2. ⬜ Plan 03: Submit PR to obsidian-releases repository

**Future Phases (Post v4.0):**
- Add bundle size monitoring to CI
- Build cross-timezone test suite for date queries
- Implement full vault graph mode (deferred from Phase 27)
- Add timeline editing/dragging (deferred to v5.0+)

---

## Appendix: File Locations

### Core Source Files

```
src/
├── index.ts                 # Main entry point, config loading
├── server.ts                # HivemindServer class, MCP setup
├── cli.ts                   # CLI entry point
├── cli/                     # CLI commands (init, validate, fix)
├── config/                  # Config schema and validation
├── graph/                   # SQLite database and graph builder
│   ├── database.ts          # HivemindDatabase class
│   └── builder.ts           # GraphBuilder class
├── mcp/                     # MCP tool definitions
│   ├── tool-generator.ts    # Dynamic tool generation
│   ├── timeline-tools.ts    # Timeline MCP tools
│   └── graph-tools.ts       # Graph MCP tools
├── parser/                  # Markdown and frontmatter parsing
├── search/                  # Search engine (FTS5 + metadata)
│   └── engine.ts            # SearchEngine class
├── templates/               # Template system
│   ├── builtin/             # worldbuilding, research, people-management
│   ├── detector.ts          # Auto-detect template from vault
│   ├── registry.ts          # Template registry singleton
│   └── schema-factory.ts    # Dynamic Zod schema generation
├── types/                   # TypeScript types and Zod schemas
│   └── index.ts             # Factory functions for dynamic schemas
├── vault/                   # Vault reading and watching
│   ├── reader.ts            # VaultReader class
│   └── watcher.ts           # VaultWatcher class
└── comfyui/                 # ComfyUI integration (optional)
```

### Plugin Files

```
obsidian-plugin/
├── main.ts                  # Plugin entry point
├── views/
│   ├── TimelineView.ts      # Timeline visualization (vis-timeline)
│   ├── GraphView.ts         # Graph visualization (sigma.js)
│   └── ValidationSidebarView.ts  # Validation panel
├── commands/                # Obsidian commands (add/validate/fix)
├── settings/                # Settings tab UI
└── manifest.json            # Obsidian plugin manifest
```

### Planning Documentation

```
.planning/
├── PROJECT.md               # Project identity and current state
├── REQUIREMENTS.md          # v4.0 requirements with traceability
├── ROADMAP.md               # Phase breakdown and progress
├── STATE.md                 # Session continuity and next actions
├── research/
│   ├── SUMMARY.md           # Research synthesis
│   ├── ARCHITECTURE.md      # MCP + data layer architecture
│   ├── STACK.md             # Stack decisions (sigma.js, vis-timeline)
│   ├── CODE_PATTERNS.md     # Implementation patterns
│   └── PITFALLS.md          # Known issues and mitigations
└── phases/                  # Per-phase plans and summaries
```

### User Documentation

```
docs/
├── SETUP_GUIDE.md           # Getting started
├── MCP_SETUP_GUIDE.md       # AI client configuration
├── VAULT_MIGRATION_GUIDE.md # Migrating existing vaults
└── CANON_WORKFLOW_ENTERPRISE.md  # Canon workflow beyond worldbuilding
```

---

**End of Speckit Constitution v4.0**  
*This document is a living artifact that evolves with the project. Last updated after Phase 28 Plan 02.*

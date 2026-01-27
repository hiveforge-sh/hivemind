# Roadmap: Hivemind

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-01-25)
- ✅ **v2.0 Template System** - Phases 6-11 (shipped 2026-01-26)
- ✅ **v3.0 Developer Experience** - Phases 12-16 (shipped 2026-01-27)
- 🚧 **v3.1 Type Safety & Quality** - Phases 17-22 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-01-25</summary>

### Phase 1: MVP Foundation
**Goal**: Core MCP server with vault reading and search
**Plans**: 3 plans

Plans:
- [x] 01-01: Server infrastructure
- [x] 01-02: Vault reading and parsing
- [x] 01-03: Search and query tools

### Phase 2: Vault Templates
**Goal**: Entity templates and schemas for worldbuilding
**Plans**: 2 plans

Plans:
- [x] 02-01: Template definitions
- [x] 02-02: Entity schemas

### Phase 3: Canon Workflow
**Goal**: Draft-to-approved workflow with validation
**Plans**: 2 plans

Plans:
- [x] 03-01: Canon status tools
- [x] 03-02: Validation system

### Phase 4: Asset Management
**Goal**: Store and query asset metadata
**Plans**: 2 plans

Plans:
- [x] 04-01: Asset storage
- [x] 04-02: Asset query tools

### Phase 5: ComfyUI Integration
**Goal**: Workflow storage and image generation
**Plans**: 2 plans

Plans:
- [x] 05-01: Workflow management
- [x] 05-02: Generation tools

</details>

<details>
<summary>✅ v2.0 Template System (Phases 6-11) - SHIPPED 2026-01-26</summary>

### Phase 6: Template Infrastructure Core
**Goal**: Dynamic template system with Zod schema generation
**Plans**: 5 plans

Plans:
- [x] 06-01: Template type definitions
- [x] 06-02: Schema factory
- [x] 06-03: Worldbuilding template
- [x] 06-04: Config loader
- [x] 06-05: Server startup integration

### Phase 7: Migration
**Goal**: Migrate hardcoded worldbuilding to template system
**Plans**: 5 plans

Plans:
- [x] 07-01: Template detection
- [x] 07-02: Database schema v2
- [x] 07-03: Generic query handler
- [x] 07-04: Snapshot tests
- [x] 07-05: Backwards compatibility

### Phase 8: Dynamic MCP Tools
**Goal**: Auto-generate tools from template definitions
**Plans**: 1 plan

Plans:
- [x] 08-01: Tool generator

### Phase 9: Relationship System
**Goal**: Template-based relationship types and constraints
**Plans**: Merged into Phase 8

### Phase 10: Built-in Templates
**Goal**: Research and people-management templates with samples
**Plans**: Merged into Phase 8

### Phase 11: Server Integration Fix (INSERTED)
**Goal**: Fix template initialization and FTS5 bugs
**Plans**: 1 plan

Plans:
- [x] 11-01: Template initialization and bug fixes

</details>

<details>
<summary>✅ v3.0 Developer Experience (Phases 12-16) - SHIPPED 2026-01-27</summary>

### Phase 12: Setup Wizard
**Goal**: Interactive CLI for vault initialization
**Plans**: 4 plans

Plans:
- [x] 12-01: Interactive prompts
- [x] 12-02: Config generation
- [x] 12-03: Template detection
- [x] 12-04: Non-interactive mode

### Phase 13: Folder Mapping
**Goal**: Config-driven folder-to-type mapping
**Plans**: 4 plans

Plans:
- [x] 13-01: FolderMapper implementation
- [x] 13-02: Specificity resolution
- [x] 13-03: Template integration
- [x] 13-04: Shared infrastructure

### Phase 14: Validate CLI
**Goal**: Vault-wide frontmatter validation
**Plans**: 3 plans

Plans:
- [x] 14-01: Scanner implementation
- [x] 14-02: Output formatters
- [x] 14-03: CI integration

### Phase 15: Fix CLI
**Goal**: Bulk frontmatter fixes with dry-run
**Plans**: 4 plans

Plans:
- [x] 15-01: Dry-run preview
- [x] 15-02: Apply fixes
- [x] 15-03: ID generation
- [x] 15-04: Interactive type selection

### Phase 16: Obsidian Commands
**Goal**: Add/Validate/Fix commands in Obsidian plugin
**Plans**: 4 plans

Plans:
- [x] 16-01: Add frontmatter command
- [x] 16-02: Validate/Fix commands
- [x] 16-03: Sidebar and settings
- [x] 16-04: Folder operations

</details>

### 🚧 v3.1 Type Safety (In Progress)

**Milestone Goal:** Eliminate all `any` types from codebase (79 warnings across 16 files)

#### Phase 17: Foundation Types
**Goal**: Replace `any` with strict types in core type definitions, parser, and vault reader
**Depends on**: Nothing (first phase)
**Requirements**: TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):
  1. `types/index.ts` uses explicit types for all interfaces and exports
  2. `parser/markdown.ts` uses `Record<string, unknown>` for frontmatter parsing
  3. `vault/reader.ts` has zero `any` types in file operations and entity parsing
**Plans**: 1 plan

Plans:
- [x] 17-01-PLAN.md — Replace all `any` types in foundation files (types, parser, reader)

#### Phase 18: Template System & Data Layer
**Goal**: Type safety in template operations and data access layer
**Depends on**: Phase 17
**Requirements**: TMPL-01, TMPL-02, DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. `templates/schema-factory.ts` uses Zod generics instead of `any` for schema operations
  2. `graph/database.ts` uses typed interfaces for all SQLite query results
  3. `search/engine.ts` has explicit types for search parameters and results
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — Replace `any` types in template system (schema-factory.ts, loader.ts)
- [ ] 18-02-PLAN.md — Replace `any` types in data layer (database.ts, builder.ts, engine.ts)

#### Phase 19: Server & MCP
**Goal**: Type safety in MCP server and dynamic tool generation
**Depends on**: Phase 18
**Requirements**: MCP-01, MCP-02
**Success Criteria** (what must be TRUE):
  1. `server.ts` tool handlers use typed argument interfaces from MCP SDK
  2. `mcp/tool-generator.ts` uses proper generics for dynamic tool creation
**Plans**: TBD

Plans:
- [ ] 19-01: TBD

#### Phase 20: ComfyUI, CLI & Enforcement
**Goal**: Complete type safety across integrations and enforce via linting
**Depends on**: Phase 19
**Requirements**: CFUI-01, CFUI-02, CLI-01, CLI-02, CLI-03, CLI-04, ENF-01, ENF-02
**Success Criteria** (what must be TRUE):
  1. `comfyui/client.ts` and `comfyui/workflow.ts` use typed interfaces for API responses
  2. All CLI files (`cli.ts`, `cli/init/index.ts`, `cli/fix/index.ts`, `cli/validate/index.ts`) use `unknown` for error handling instead of `any`
  3. ESLint reports zero warnings for `@typescript-eslint/no-explicit-any` rule
  4. All existing tests pass without type-related failures
**Plans**: TBD

Plans:
- [ ] 20-01: TBD

#### Phase 21: Test Coverage
**Goal**: Fix and improve unit test coverage for under-tested modules
**Depends on**: Phase 20
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06
**Success Criteria** (what must be TRUE):
  1. `cli/init/` modules have unit tests covering core logic (detection, validators, wizard flow)
  2. `comfyui/client.ts` coverage above 80% (from 58%)
  3. `search/engine.ts` coverage above 80% (from 71%)
  4. `mcp/tool-generator.ts` coverage above 80% (from 75%)
  5. `vault/watcher.ts` coverage above 70% (from 47%)
  6. All tests pass with zero failures
**Plans**: TBD

Plans:
- [ ] 21-01: TBD

#### Phase 22: CI Quality Gates
**Goal**: Add license compliance testing and mutation testing to CI pipeline
**Depends on**: Phase 21
**Requirements**: CI-01, CI-02, CI-03, CI-04
**Success Criteria** (what must be TRUE):
  1. CI pipeline checks all dependencies for license compatibility
  2. CI fails on disallowed licenses (GPL, AGPL in a permissive project)
  3. Mutation testing runs on core modules and reports mutation score
  4. CI pipeline includes quality gates for both license and mutation results
**Plans**: TBD

Plans:
- [ ] 22-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19 → 20 → 21 → 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. MVP Foundation | v1.0 | 3/3 | Complete | 2026-01-25 |
| 2. Vault Templates | v1.0 | 2/2 | Complete | 2026-01-25 |
| 3. Canon Workflow | v1.0 | 2/2 | Complete | 2026-01-25 |
| 4. Asset Management | v1.0 | 2/2 | Complete | 2026-01-25 |
| 5. ComfyUI Integration | v1.0 | 2/2 | Complete | 2026-01-25 |
| 6. Template Infrastructure Core | v2.0 | 5/5 | Complete | 2026-01-26 |
| 7. Migration | v2.0 | 5/5 | Complete | 2026-01-26 |
| 8. Dynamic MCP Tools | v2.0 | 1/1 | Complete | 2026-01-26 |
| 11. Server Integration Fix | v2.0 | 1/1 | Complete | 2026-01-26 |
| 12. Setup Wizard | v3.0 | 4/4 | Complete | 2026-01-27 |
| 13. Folder Mapping | v3.0 | 4/4 | Complete | 2026-01-27 |
| 14. Validate CLI | v3.0 | 3/3 | Complete | 2026-01-27 |
| 15. Fix CLI | v3.0 | 4/4 | Complete | 2026-01-27 |
| 16. Obsidian Commands | v3.0 | 4/4 | Complete | 2026-01-27 |
| 17. Foundation Types | v3.1 | 1/1 | Complete | 2026-01-27 |
| 18. Template System & Data Layer | v3.1 | 0/0 | Not started | - |
| 19. Server & MCP | v3.1 | 0/0 | Not started | - |
| 20. ComfyUI, CLI & Enforcement | v3.1 | 0/0 | Not started | - |
| 21. Test Coverage | v3.1 | 0/0 | Not started | - |
| 22. CI Quality Gates | v3.1 | 0/0 | Not started | - |

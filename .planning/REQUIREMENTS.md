# Requirements: Hivemind v3.1 Type Safety & Quality

**Defined:** 2026-01-27
**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world.

## v3.1 Requirements

Requirements for type safety and quality milestone. Each maps to roadmap phases.

### Core Types

- [ ] **TYPE-01**: `types/index.ts` has zero `any` types — all interfaces use strict types
- [ ] **TYPE-02**: `parser/markdown.ts` has zero `any` types — frontmatter parsing uses `Record<string, unknown>` or specific types
- [ ] **TYPE-03**: `vault/reader.ts` has zero `any` types

### Template System

- [ ] **TMPL-01**: `templates/schema-factory.ts` has zero `any` types — Zod schema operations use proper generics
- [ ] **TMPL-02**: `templates/loader.ts` has zero `any` types

### Data Layer

- [ ] **DATA-01**: `graph/database.ts` has zero `any` types — SQLite query results use typed interfaces
- [ ] **DATA-02**: `graph/builder.ts` has zero `any` types
- [ ] **DATA-03**: `search/engine.ts` has zero `any` types — search results and parameters strictly typed

### Server & MCP

- [ ] **MCP-01**: `server.ts` has zero `any` types — MCP tool handlers use typed arguments
- [ ] **MCP-02**: `mcp/tool-generator.ts` has zero `any` types — dynamic tool generation uses proper generics

### ComfyUI

- [ ] **CFUI-01**: `comfyui/client.ts` has zero `any` types — API responses use typed interfaces
- [ ] **CFUI-02**: `comfyui/workflow.ts` has zero `any` types

### CLI

- [ ] **CLI-01**: `cli.ts` has zero `any` types — error handlers use `unknown`
- [ ] **CLI-02**: `cli/init/index.ts` has zero `any` types — inquirer prompt types use proper generics
- [ ] **CLI-03**: `cli/fix/index.ts` has zero `any` types
- [ ] **CLI-04**: `cli/validate/index.ts` has zero `any` types

### Enforcement

- [ ] **ENF-01**: ESLint `@typescript-eslint/no-explicit-any` reports zero warnings
- [ ] **ENF-02**: All existing tests continue to pass after type changes

### Test Coverage

- [ ] **TEST-01**: `cli/init/` modules have unit tests (detection, output, prompts, validators, wizard) — currently 0%
- [ ] **TEST-02**: `comfyui/client.ts` coverage above 80% — currently 58%
- [ ] **TEST-03**: `search/engine.ts` coverage above 80% — currently 71%
- [ ] **TEST-04**: `mcp/tool-generator.ts` coverage above 80% — currently 75%
- [ ] **TEST-05**: `vault/watcher.ts` coverage above 70% — currently 47%
- [ ] **TEST-06**: All tests pass with zero failures

### CI Quality Gates

- [ ] **CI-01**: License compliance check runs in CI pipeline
- [ ] **CI-02**: CI fails on disallowed licenses (GPL, AGPL in permissive project)
- [ ] **CI-03**: Mutation testing runs on core modules and reports mutation score
- [ ] **CI-04**: CI pipeline includes quality gates for license and mutation results

## Out of Scope

| Feature | Reason |
|---------|--------|
| Obsidian plugin `any` types | Plugin is standalone, different build system |
| Changing `unknown` to specific types | `unknown` is acceptable where true type is unknowable (e.g., external API responses) |
| Enabling `strict: true` in tsconfig | Separate concern; may require broader changes |
| 100% coverage target | Diminishing returns; focus on under-tested modules |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | Phase 17 | Pending |
| TYPE-02 | Phase 17 | Pending |
| TYPE-03 | Phase 17 | Pending |
| TMPL-01 | Phase 18 | Pending |
| TMPL-02 | Phase 18 | Pending |
| DATA-01 | Phase 18 | Pending |
| DATA-02 | Phase 18 | Pending |
| DATA-03 | Phase 18 | Pending |
| MCP-01 | Phase 19 | Pending |
| MCP-02 | Phase 19 | Pending |
| CFUI-01 | Phase 20 | Pending |
| CFUI-02 | Phase 20 | Pending |
| CLI-01 | Phase 20 | Pending |
| CLI-02 | Phase 20 | Pending |
| CLI-03 | Phase 20 | Pending |
| CLI-04 | Phase 20 | Pending |
| ENF-01 | Phase 20 | Pending |
| ENF-02 | Phase 20 | Pending |
| TEST-01 | Phase 21 | Pending |
| TEST-02 | Phase 21 | Pending |
| TEST-03 | Phase 21 | Pending |
| TEST-04 | Phase 21 | Pending |
| TEST-05 | Phase 21 | Pending |
| TEST-06 | Phase 21 | Pending |
| CI-01 | Phase 22 | Pending |
| CI-02 | Phase 22 | Pending |
| CI-03 | Phase 22 | Pending |
| CI-04 | Phase 22 | Pending |

**Coverage:**
- v3.1 requirements: 28 total
- Mapped to phases: 28 (100%)
- Unmapped: 0

**Phase Distribution:**
- Phase 17 (Foundation Types): 3 requirements
- Phase 18 (Template System & Data Layer): 5 requirements
- Phase 19 (Server & MCP): 2 requirements
- Phase 20 (ComfyUI, CLI & Enforcement): 8 requirements
- Phase 21 (Test Coverage): 6 requirements
- Phase 22 (CI Quality Gates): 4 requirements

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after roadmap creation*

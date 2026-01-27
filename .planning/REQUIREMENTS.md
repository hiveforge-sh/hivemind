# Requirements: Hivemind v3.1 Type Safety

**Defined:** 2026-01-27
**Core Value:** Consistent AI output. Give any AI tool context from your canon, get results that belong in your world.

## v3.1 Requirements

Requirements for type safety milestone. Each maps to roadmap phases.

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

## Out of Scope

| Feature | Reason |
|---------|--------|
| Obsidian plugin `any` types | Plugin is standalone, different build system |
| Adding new tests for type changes | Existing tests validate behavior; type changes are refactoring |
| Changing `unknown` to specific types | `unknown` is acceptable where true type is unknowable (e.g., external API responses) |
| Enabling `strict: true` in tsconfig | Separate concern; may require broader changes |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | — | Pending |
| TYPE-02 | — | Pending |
| TYPE-03 | — | Pending |
| TMPL-01 | — | Pending |
| TMPL-02 | — | Pending |
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |
| MCP-01 | — | Pending |
| MCP-02 | — | Pending |
| CFUI-01 | — | Pending |
| CFUI-02 | — | Pending |
| CLI-01 | — | Pending |
| CLI-02 | — | Pending |
| CLI-03 | — | Pending |
| CLI-04 | — | Pending |
| ENF-01 | — | Pending |
| ENF-02 | — | Pending |

**Coverage:**
- v3.1 requirements: 18 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 18

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after initial definition*

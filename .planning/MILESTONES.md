# Hivemind — Milestone Archive

Completed milestones for reference.

---

## v3.0 — Developer Experience ✓

**Completed:** 2026-01-27

### What Shipped

**Phase 12: Setup Wizard**
- Interactive CLI wizard (`npx hivemind init`) with breadcrumb progress
- Template auto-detection from vault folder structure
- Config.json generation and Claude Desktop MCP snippet
- Non-interactive mode via `--config` flag for CI/automation

**Phase 13: Folder Mapping & Shared Infrastructure**
- Config-driven FolderMapper with glob pattern matching (picomatch)
- Specificity-based conflict resolution
- Shared infrastructure between CLI and Obsidian plugin
- Template folderMappings field with Zod validation

**Phase 14: Validate CLI**
- `npx hivemind validate` scans vault for frontmatter issues
- Grouped text and JSON output modes
- CI-compatible exit codes (0 success, 1 errors, 2 config)
- Template schema-based field validation

**Phase 15: Fix CLI**
- `npx hivemind fix` with dry-run preview by default
- Atomic file writes via temp file + rename
- ID generator with collision detection
- Interactive type prompting for ambiguous folders

**Phase 16: Obsidian Commands**
- Add/Validate/Fix frontmatter commands (Ctrl+P)
- Preview modal and type selection modal
- Validation sidebar panel for vault-wide overview
- Settings tab and folder context menus for bulk operations

### Validated Requirements

- [x] Setup wizard with interactive and non-interactive modes (7 requirements)
- [x] Vault validation with schema checking and CI output (5 requirements)
- [x] Bulk fix with dry-run, apply, and automation flags (6 requirements)
- [x] Folder-to-type mapping shared across CLI and plugin (3 requirements)
- [x] Obsidian commands for add, validate, and fix frontmatter (7 requirements)
- [x] Error handling with clear messages and platform-agnostic paths (4 requirements)

### Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dry-run default for fix | Destructive by default is anti-pattern | ✓ Good |
| Shared FolderMapper | No logic duplication between CLI and plugin | ✓ Good |
| Inline validation in plugin | Avoid Node fs dependencies in Obsidian | ✓ Good |
| Picomatch for glob matching | Already in dep tree, 4x faster than minimatch | ✓ Good |
| @inquirer/prompts for CLI | Lightweight, well-documented | ✓ Good |

### Stats

- **Phases:** 5 (phases 12-16)
- **Plans:** 19 total
- **Commits:** 51
- **Files:** 56 modified (+7,078 / -992 lines)
- **Tests:** 502 passing, 12,438 lines TypeScript
- **Duration:** 4 days (2026-01-23 → 2026-01-27)

---

## v2.0 — Template System ✓

**Completed:** 2026-01-26

### What Shipped

**Phase 6: Template Infrastructure Core**
- Template type definitions with field configs
- Dynamic Zod schema generation from config
- Built-in worldbuilding template with all v1.0 entity types
- Config loader with validation
- Server startup integration

**Phase 7: Migration**
- Template detector for auto-detecting vault type
- Database schema v2.0 with template_id column
- Snapshot tests ensuring v1.0 parity
- Generic query_entity replacing type-specific handlers
- Full backwards compatibility

**Phase 8: Dynamic MCP Tools**
- Tool generator module (generateQueryTool, generateListTool)
- 16 dynamic tools for worldbuilding template (8 types × 2 tools)
- Template-specific tool descriptions
- Generic handlers for query/list operations

**Phase 9: Relationship System**
- RelationshipTypeConfig with source/target constraints
- Graph builder uses template-based relationship inference
- Bidirectional relationships with automatic reverse edges
- Search engine supports relationshipType filter

**Phase 10: Built-in Templates**
- Research template (paper, citation, concept, note)
- People-management template (person, goal, team, one_on_one)
- Sample vaults for all three templates

**Phase 11: Server Integration Fix** (Gap Closure)
- initializeTemplates() called at server startup
- FTS5 empty query bug fix
- Human-verified with real vault

### Validated Requirements

- [x] Template registry with pluggable template definitions
- [x] Built-in templates: worldbuilding, research, people-management
- [x] Custom template definitions via config.json
- [x] Auto-generated MCP tools per entity type (16 tools for worldbuilding)
- [x] Custom relationship types per template
- [x] Dynamic Zod schema generation from template config
- [x] Migration of hardcoded worldbuilding to template system
- [x] Backwards compatibility for existing vaults

### Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full migration to template system | Worldbuilding as template, cleaner architecture | ✓ Good |
| Custom relationship types | Each domain has its own semantics | ✓ Good |
| Config-based entity definitions | No coding required for custom templates | ✓ Good |
| Initialize templates before vault scan | Templates needed before entity parsing | ✓ Good |
| Deprecation via _meta field | MCP SDK lacks native deprecation | ✓ Good |
| One year deprecation window | Sunset 2027-01-01, removal in v3.0 | — Pending |

### Stats

- **Phases:** 6 (phases 6-11)
- **Plans:** 12 total
- **Files:** 91 modified
- **Lines:** 9,913 TypeScript (+9,875 / -2,091)
- **Tests:** 463 passing
- **Duration:** 2 days (2026-01-25 → 2026-01-26)

---

## v1.0 — MVP + Core Features ✓

**Completed:** 2026-01-25

### What Shipped

**Phase 1: MVP Foundation**
- MCP server with stdio transport
- VaultReader, VaultWatcher, MarkdownParser
- SQLite database with FTS5 search
- Knowledge graph with relationship extraction
- Tools: query_character, query_location, search_vault

**Phase 2: Vault Templates**
- Entity templates: Character, Location, Event, Faction, Lore, Asset
- Extended Zod schemas for all entity types
- Sample entities and template documentation

**Phase 3: Canon Workflow**
- get_canon_status — groups entities by approval state
- submit_for_review — guides draft → pending transition
- validate_consistency — checks duplicate IDs, broken links, missing fields

**Phase 4: Asset Management**
- store_asset — stores asset metadata in SQLite
- query_asset — retrieves single asset with full details
- list_assets — filters and lists assets

**Phase 5: ComfyUI Integration**
- ComfyUIClient and WorkflowManager classes
- store_workflow, list_workflows, get_workflow, generate_image tools
- Workflow templates: character-portrait, character-full-body, item-object, location-landscape

**Infrastructure: CI/CD Pipeline**
- GitHub Actions: test (multi-OS), release (semantic-release + CodeQL)
- Dependabot with auto-merge for minor/patch
- Obsidian plugin files attached to GitHub releases

**Infrastructure: Obsidian Plugin**
- Full plugin implementation with MCP integration
- Workflow browsing and image generation from notes
- Ready for community plugin submission

### Validated Requirements

- [x] MCP server that reads Obsidian vault structure
- [x] Query interface for canonical content (characters, locations, events, lore)
- [x] Vault template with conventions for worldbuilding organization
- [x] Asset management for approved images and their generation settings
- [x] ComfyUI workflow storage and retrieval
- [x] Canon status workflow (draft → approved)
- [x] Documentation for other users to adopt

### Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MCP architecture over vault-only | Enables programmatic context delivery to AI tools | ✓ Good |
| Shareable from day one | Design for reuse, not just personal use | ✓ Good |
| Store both outputs and generation settings | Full provenance allows reproduction | ✓ Good |
| Local-first SQLite | No external dependencies, portable | ✓ Good |
| FTS5 for search | Built into SQLite, BM25 ranking | ✓ Good |
| Zod schema validation | Type safety with graceful fallbacks | ✓ Good |

### Stats

- **Phases:** 5 + 2 infrastructure
- **MCP Tools:** 12
- **Entity Types:** 7 (character, location, event, faction, lore, asset, system)
- **Test Coverage:** Multi-OS (Ubuntu, Windows, macOS)

---
*Last phase: Phase 5 (ComfyUI Integration)*
*Next milestone starts at: Phase 6*

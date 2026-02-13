# Hivemind Copilot Instructions

This is a TypeScript MCP (Model Context Protocol) server for Obsidian vaults. It provides AI tools with structured access to worldbuilding and knowledge management vaults.

## Build, Test, and Lint Commands

```bash
# Build
npm run build           # Compile TypeScript to dist/

# Development
npm run dev             # Watch mode - auto-rebuild on changes

# Testing
npm test                # Run full test suite
npm run test:watch      # Run tests in watch mode
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage report

# To run a single test file:
npx vitest run tests/path/to/test.test.ts

# To run tests matching a pattern:
npx vitest run -t "test name pattern"

# Linting
npm run lint            # ESLint check (src/ only, excludes tests/)

# Start server
npm start               # Run the MCP server with config.json
```

**Coverage thresholds** (defined in vitest.config.ts):
- Branches: 30%
- Functions: 55%
- Lines: 40%
- Statements: 40%

## Architecture Overview

### Core Components

**MCP Server** (`src/server.ts`, `src/index.ts`)
- Implements Model Context Protocol for AI tool integration
- Dynamically generates MCP tools based on loaded templates
- Supports both stdio and SSE transport modes
- Main entry point: `HivemindServer` class

**Template System** (`src/templates/`)
- **Built-in templates**: `worldbuilding`, `research`, `people-management` (in `builtin/`)
- **Community templates**: Loaded from `community/` directory (planned)
- **Template detection**: Automatically detects which template a vault uses via `detector.ts`
- **Schema factory**: `schema-factory.ts` creates Zod schemas dynamically from template configs
- **Registry**: Central registry (`registry.ts`) holds active template and entity type configs

Templates define:
- Entity types (e.g., character, location, event, faction)
- Fields and validation rules for each type
- Relationships between entity types

**Vault Processing** (`src/vault/`)
- `reader.ts`: Parses Obsidian markdown files with YAML frontmatter
- `watcher.ts`: Watches vault for file changes using chokidar
- Extracts wikilinks (`[[Note Title]]`) for relationship building

**Graph System** (`src/graph/`)
- `database.ts`: SQLite-based storage with better-sqlite3 (synchronous)
- `builder.ts`: Constructs knowledge graph from vault notes
- Stores nodes (entities) and edges (relationships) for graph queries

**Search Engine** (`src/search/`)
- Hybrid search: full-text + metadata filtering
- SQLite FTS5 for text search
- Metadata filters: entity type, canon status, importance
- Returns ranked results with snippets

**MCP Tool Generation** (`src/mcp/`)
- `tool-generator.ts`: Creates query/list tools for each entity type dynamically
- `timeline-tools.ts`: Generates timeline query tools for temporal entities
- `graph-tools.ts`: Creates graph traversal tools (neighbors, subgraph, paths)
- Tools are generated at runtime based on active template

**ComfyUI Integration** (`src/comfyui/`)
- Optional integration for AI image generation workflows
- `client.ts`: HTTP client for ComfyUI API
- `workflow.ts`: Manages workflow storage and asset tracking

### Data Flow

1. **Startup**: Load config → Detect template → Initialize template registry → Load vault
2. **Indexing**: Parse markdown files → Extract frontmatter + wikilinks → Build graph in SQLite
3. **MCP Tools**: Generate tools dynamically based on template's entity types
4. **AI Query**: AI calls tool → Query database/search index → Return formatted results
5. **File Watch**: Detect changes → Incrementally update database → Rebuild affected relationships

### Key Design Patterns

**Dynamic Type System**
- Base entity types are hardcoded (`character`, `location`, `event`, etc.)
- Templates can define additional custom types
- `createNoteTypeSchema()` and `createBaseFrontmatterSchema()` in `src/types/index.ts` are factory functions that accept custom types
- Validation schemas are generated at runtime using Zod

**Incremental Indexing**
- Default strategy: `incremental` (only processes changed files)
- Alternative: `full` (reindex entire vault)
- Configured in `config.json` under `indexing.strategy`

**Canon Workflow**
- Entity status progression: `draft` → `pending` → `canon`
- Status stored in frontmatter `status` field
- Used to filter approved vs. in-progress content

## Repository Conventions

### Commit Messages

**Enforced via Conventional Commits** (commitlint + husky)

Format: `<type>: <description>`

Common types:
- `feat:` - New feature (triggers minor version bump)
- `fix:` - Bug fix (triggers patch version bump)
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Other changes (deps, config)

**Breaking changes**: Add `BREAKING CHANGE:` in commit footer to trigger major version bump

### Release Process

Fully automated via semantic-release:
1. Merge to `master` branch
2. GitHub Actions analyzes commits
3. Determines version bump
4. Generates CHANGELOG.md
5. Creates GitHub release
6. Publishes to npm as `@hiveforge/hivemind-mcp`
7. Bundles Obsidian plugin files in release

### File Organization

**Source structure:**
- `src/cli/`: CLI commands (init, validate, etc.)
- `src/config/`: Configuration schema and validation
- `src/graph/`: Graph database and builder
- `src/mcp/`: MCP tool definitions and generators
- `src/parser/`: Markdown and frontmatter parsing
- `src/search/`: Search engine implementation
- `src/templates/`: Template system and built-in templates
- `src/types/`: TypeScript type definitions and Zod schemas
- `src/vault/`: Vault reading and watching
- `src/comfyui/`: ComfyUI integration (optional feature)

**Tests mirror src structure:**
- `tests/unit/`: Unit tests
- `tests/integration/`: Integration tests
- `tests/fixtures.ts`: Shared test data

**Dual artifacts:**
- This repo builds both an npm package (MCP server) AND Obsidian plugin files
- Plugin files live in `obsidian-plugin/` directory
- Both are released together

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ES2022 (ESM only, not CommonJS)
- **Strict mode**: Enabled
- **Important flags**:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
  - Files must use `.js` extensions in imports (e.g., `import { X } from './file.js'`)

### ESLint Rules

- Uses `typescript-eslint` recommended config
- `@typescript-eslint/no-explicit-any`: warn (not error)
- Unused vars with `_` prefix are ignored
- Tests and Obsidian plugin excluded from linting

### Config File Locations

The server checks these paths in order:
1. `config.json` (current directory)
2. `hivemind.config.json` (current directory)
3. `HIVEMIND_CONFIG_PATH` environment variable

CLI can override vault path: `npx hivemind --vault /path/to/vault`

### Template Selection

Templates are NOT configured in `config.json`. Detection is automatic:
1. Server scans vault for entity type patterns
2. `detector.ts` matches patterns to known templates
3. Falls back to generic base template if no match

To force a specific template, use the template's config directly or set metadata in vault.

### Database Schema

SQLite tables (see `src/graph/database.ts`):
- `nodes`: Entity storage (id, type, status, title, content, frontmatter JSON)
- `edges`: Relationships (from_id, to_id, type)
- `nodes_fts`: Full-text search index (title + content)
- `assets`: Image/media asset tracking (if ComfyUI enabled)

### Wikilink Parsing

- Format: `[[Note Title]]` or `[[Note Title|Display Text]]`
- Parser extracts links from markdown body (not frontmatter)
- Links become edges in the graph (relationship type: `references`)
- See `src/parser/wikilinks.ts`

### Testing Patterns

- Use `fixtures.ts` for shared test data (sample notes, frontmatter)
- Integration tests create temporary SQLite databases
- Mock filesystem operations where needed
- Prefer `createNoteTypeSchema()` over hardcoded schemas for template-aware tests

### Documentation Structure

- `README.md`: User-facing overview
- `CONTRIBUTING.md`: Development guidelines
- `CONTRIBUTING_TEMPLATES.md`: Template creation guide
- `docs/`: Detailed guides (setup, migration, workflows)
- `docs/REPOSITORY-STANDARDS.md`: CI/CD and automation setup

## Important Notes

- This codebase uses **ESM modules**, not CommonJS - all imports must use `.js` extensions
- Tests are excluded from ESLint but should still follow conventions
- ComfyUI integration is optional - features gracefully degrade if disabled
- Vault watching is enabled by default but can be disabled in config
- The server runs in stdio mode by default (for Claude Desktop, GitHub Copilot, etc.)

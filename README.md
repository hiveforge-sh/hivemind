<p align="center">
  <img src="gh-social-preview.png" alt="Hivemind" width="100%"/>
</p>

# Hivemind MCP Server

[![NPM Version](https://img.shields.io/npm/v/@hiveforge/hivemind-mcp.svg)](https://www.npmjs.com/package/@hiveforge/hivemind-mcp)
[![Build Status](https://img.shields.io/github/actions/workflow/status/hiveforge-sh/hivemind/test.yml?branch=master&label=tests)](https://github.com/hiveforge-sh/hivemind/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/actions/workflow/status/hiveforge-sh/hivemind/release.yml?branch=master&label=release)](https://github.com/hiveforge-sh/hivemind/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/hiveforge-sh/hivemind/branch/master/graph/badge.svg)](https://codecov.io/gh/hiveforge-sh/hivemind)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/hiveforge-sh/hivemind)](https://github.com/hiveforge-sh/hivemind/issues)
[![GitHub stars](https://img.shields.io/github/stars/hiveforge-sh/hivemind)](https://github.com/hiveforge-sh/hivemind/stargazers)

A domain-agnostic MCP (Model Context Protocol) server for Obsidian vaults that provides AI tools with consistent, structured context from your knowledge base.

## What is Hivemind?

Hivemind bridges your Obsidian vault and AI tools (Claude, ComfyUI, etc.) via the Model Context Protocol. With pluggable templates, it supports multiple domains out of the box:

- **Worldbuilding** — Characters, Locations, Events, Factions, Lore, Assets
- **Research** — Papers, Citations, Concepts, Notes
- **People Management** — People, Goals, Teams, 1:1 Meetings

Or define your own custom entity types via `config.json` — no code required.

## Features

- **Pluggable Templates**: Built-in templates for worldbuilding, research, and people management — or define your own
- **HybridRAG Search**: Combines vector, graph, and keyword search for accurate context retrieval
- **Obsidian Native**: Works with standard markdown, YAML frontmatter, and wikilinks
- **Custom Relationships**: Define relationship types per template with bidirectionality and validation
- **Asset Provenance**: Track AI-generated images and their generation settings
- **Local-First**: Your data stays on your machine, with optional cloud deployment
- **Canon Management**: Draft → Pending → Canon approval workflow
- **High Performance**: <300ms query latency, supports 1000+ note vaults

## Quick Start

### Installation

```bash
# Install globally
npm install -g @hiveforge/hivemind-mcp

# Or use with npx (no installation needed)
npx @hiveforge/hivemind-mcp init
```

### Setup

```bash
# Interactive setup - creates config.json
npx @hiveforge/hivemind-mcp init

# Validate your configuration
npx @hiveforge/hivemind-mcp validate

# Start the server
npx @hiveforge/hivemind-mcp start

# Or start with a specific vault path (no config needed)
npx @hiveforge/hivemind-mcp --vault /path/to/vault
npx @hiveforge/hivemind-mcp --vault .  # Use current directory
```

### Configuration for MCP Clients

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": ["-y", "@hiveforge/hivemind-mcp", "start"]
    }
  }
}
```

**Claude Desktop with vault override**:
```json
{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": ["-y", "@hiveforge/hivemind-mcp", "--vault", "C:\\Path\\To\\Your\\Vault"]
    }
  }
}
```

**GitHub Copilot** (`~/.copilot/mcp-config.json`):
```json
{
  "mcpServers": {
    "hivemind": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@hiveforge/hivemind-mcp", "start"],
      "tools": ["*"]
    }
  }
}
```

### Manual Configuration

If you prefer to configure manually, create a `config.json`:

```json
{
  "vault": {
    "path": "/path/to/your/obsidian/vault",
    "watchForChanges": true,
    "debounceMs": 100
  },
  "server": {
    "transport": "stdio"
  },
  "template": {
    "activeTemplate": "worldbuilding"
  },
  "indexing": {
    "strategy": "incremental",
    "batchSize": 100,
    "enableVectorSearch": false,
    "enableFullTextSearch": true
  }
}
```

### Choosing a Template

Set `activeTemplate` to one of the built-in templates:

| Template | Use Case | Entity Types |
|----------|----------|--------------|
| `worldbuilding` | Fiction writers, game masters | Characters, Locations, Events, Factions, Lore, Assets, References |
| `research` | Academics, knowledge workers | Papers, Citations, Concepts, Notes |
| `people-management` | Managers, team leads | People, Goals, Teams, 1:1 Meetings |

### Custom Templates

Define custom entity types directly in your `config.json`:

```json
{
  "template": {
    "activeTemplate": "my-template",
    "templates": [{
      "id": "my-template",
      "name": "My Custom Template",
      "version": "1.0.0",
      "entityTypes": [{
        "name": "project",
        "displayName": "Project",
        "pluralName": "Projects",
        "fields": [
          { "name": "title", "type": "string", "required": true },
          { "name": "deadline", "type": "date" },
          { "name": "priority", "type": "enum", "enumValues": ["low", "medium", "high"] }
        ]
      }],
      "relationshipTypes": [{
        "id": "depends_on",
        "displayName": "Depends On",
        "sourceTypes": ["project"],
        "targetTypes": ["project"],
        "bidirectional": true,
        "reverseId": "blocks"
      }]
    }]
  }
}
```

See [samples/](samples/) for complete example vaults for each template.

## Architecture

```
Obsidian Vault → File Watcher → Markdown Parser → Knowledge Graph
                                                         ↓
                                     ┌───────────────────┴─────────────────┐
                                     │                                     │
                              Full-Text Index                      Vector Index
                                 (SQLite)                            (FAISS)
                                     │                                     │
                                     └───────────────────┬─────────────────┘
                                                         ↓
                                                  HybridRAG Router
                                                         ↓
                                                    MCP Server
                                                         ↓
                                              AI Clients (Claude, etc.)
```

## Development Status

**Current**: v2.0 Template System Complete ✅

### v2.0 — Template System (Complete)

Hivemind is now domain-agnostic with pluggable templates:

- [x] Template registry with config-driven entity definitions
- [x] Dynamic Zod schema generation from config
- [x] Auto-generated MCP tools per entity type (`query_<type>`, `list_<type>`)
- [x] Worldbuilding template extraction (backwards compatible)
- [x] Custom relationship types per template with validation
- [x] Built-in templates: worldbuilding, research, people-management
- [x] Sample vaults for each template

### v1.0 — MVP + Core Features (Shipped)

- [x] MCP server with hybrid search (vector, graph, keyword)
- [x] Vault templates for all entity types (Character, Location, Event, Faction, Lore, Asset)
- [x] Canon workflow tools (status management, consistency validation)
- [x] Asset management with full provenance tracking
- [x] ComfyUI integration with workflow management
- [x] Obsidian plugin with image generation
- [x] CI/CD with semantic-release and CodeQL scanning

### Coming Soon

- [ ] Obsidian community plugin submission
- [ ] Timeline queries with date range filtering
- [ ] First-run setup wizard

## MCP Tools

### Dynamic Entity Tools (Auto-Generated)

Tools are automatically generated for each entity type defined in the active template:

| Tool Pattern | Description |
|--------------|-------------|
| `query_<type>` | Get entity by ID/name with relationships and content |
| `list_<type>` | List all entities of type with optional filters |

**Built-in template tools:**

| Template | Generated Tools |
|----------|-----------------|
| `worldbuilding` | `query_character`, `query_location`, `query_event`, `query_faction`, `query_lore`, `query_asset`, `query_reference` + list variants |
| `research` | `query_paper`, `query_citation`, `query_concept`, `query_note` + list variants |
| `people-management` | `query_person`, `query_goal`, `query_team`, `query_one_on_one` + list variants |

### Search
| Tool | Description |
|------|-------------|
| `search_vault` | Hybrid search across all content with type/status filters |

### Asset Management
| Tool | Description |
|------|-------------|
| `store_asset` | Store generated image with provenance metadata |
| `query_asset` | Get asset with generation settings |
| `list_assets` | Filter assets by entity, type, status, workflow |

### Canon Workflow
| Tool | Description |
|------|-------------|
| `get_canon_status` | List entities grouped by status (draft/pending/canon) |
| `submit_for_review` | Move entity from draft to pending review |
| `validate_consistency` | Check for broken links, duplicates, conflicts |

### ComfyUI Integration (when enabled)
| Tool | Description |
|------|-------------|
| `store_workflow` | Save ComfyUI workflow to vault |
| `list_workflows` | Browse saved workflows |
| `get_workflow` | Retrieve workflow by ID |
| `generate_image` | Generate image with vault context injection |

### Utility
| Tool | Description |
|------|-------------|
| `rebuild_index` | Force complete re-index of vault |
| `get_vault_stats` | Vault statistics and token savings metrics |

## Documentation

- [Setup Guide](docs/SETUP_GUIDE.md) — Getting started with Hivemind
- [Vault Migration Guide](docs/VAULT_MIGRATION_GUIDE.md) — Migrating existing vaults
- [MCP Compatibility](docs/MCP_COMPATIBILITY.md) — Supported AI clients
- [ComfyUI Integration](docs/COMFYUI_INTEGRATION.md) — AI image generation
- [Obsidian Plugin Workflow](docs/OBSIDIAN_PLUGIN_WORKFLOW.md) — Plugin development
- [Sample Vaults](samples/README.md) — Example vaults for each built-in template

## License

MIT

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Important**: This project uses [Conventional Commits](https://www.conventionalcommits.org/). Commit messages must follow the format:

```
<type>: <description>

[optional body]

[optional footer]
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example: `feat: add pagination support to search results`

# Hivemind MCP Server

[![npm version](https://img.shields.io/npm/v/@hiveforge/hivemind-mcp.svg)](https://www.npmjs.com/package/@hiveforge/hivemind-mcp)

An MCP (Model Context Protocol) server for Obsidian worldbuilding vaults that provides AI tools with consistent, canonical context from your fictional worlds.

## What is Hivemind?

Hivemind bridges your Obsidian vault (where you maintain your worldbuilding canon) and AI tools (Claude, ComfyUI, etc.) via the Model Context Protocol. It ensures AI-generated content stays consistent with your established characters, locations, lore, and approved assets.

## Features

- 🔍 **HybridRAG Search**: Combines vector, graph, and keyword search for accurate context retrieval
- 📚 **Obsidian Native**: Works with standard markdown, YAML frontmatter, and wikilinks
- 🎨 **Asset Provenance**: Track AI-generated images and their generation settings
- 🔐 **Local-First**: Your data stays on your machine, with optional cloud deployment
- ✅ **Canon Management**: Draft → Pending → Canon approval workflow
- 🚀 **High Performance**: <300ms query latency, supports 1000+ note vaults

## Quick Start

### Installation

```bash
# Install globally
npm install -g hivemind-mcp

# Or use with npx (no installation needed)
npx hivemind-mcp init
```

### Setup

```bash
# Interactive setup - creates config.json
npx hivemind-mcp init

# Validate your configuration
npx hivemind-mcp validate

# Start the server
npx hivemind-mcp start
```

### Configuration for MCP Clients

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": ["-y", "hivemind-mcp", "start"]
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
      "args": ["-y", "hivemind-mcp", "start"],
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
  "indexing": {
    "strategy": "incremental",
    "batchSize": 100,
    "enableVectorSearch": false,
    "enableFullTextSearch": true
  }
}
```

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

**Current Phase**: Phase 1 - MVP Implementation  
**Version**: 0.1.0 (Pre-release)

### Roadmap

See [.planning/PROJECT.md](.planning/PROJECT.md) for the active requirements and progress tracking.

**Recently Completed:**
- [x] Project setup and dependencies
- [x] Vault reading and file watching (VaultReader, VaultWatcher)
- [x] Markdown parsing with wikilinks (MarkdownParser)
- [x] Knowledge graph construction (GraphBuilder, HivemindDatabase)
- [x] HybridRAG search implementation (SearchEngine)
- [x] MCP tools (query_character, query_location, search_vault)

**Up Next:**
- [ ] Testing and validation
- [ ] ComfyUI integration
- [ ] Obsidian plugin

## Documentation

- [Project Requirements & Roadmap](.planning/PROJECT.md)
- [Architecture Research](.planning/research/ARCHITECTURE.md)
- [Technology Stack](.planning/research/STACK.md)
- [Features Specification](.planning/research/FEATURES.md)

## License

MIT

## Contributing

This project is currently in early development. Contributions welcome once MVP is stable.

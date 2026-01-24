# Hivemind MCP Server

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

### Prerequisites

- Node.js 20+
- Obsidian vault with worldbuilding content

### Installation

```bash
npm install
npm run build
```

### Usage

```bash
# Start MCP server (stdio mode)
npm start

# Development mode with auto-rebuild
npm run dev
```

### Configuration

Create a `config.json` in your vault root:

```json
{
  "vault": {
    "path": "/path/to/your/obsidian/vault"
  },
  "server": {
    "transport": "stdio"
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

- [x] Project setup and dependencies
- [ ] Vault reading and file watching
- [ ] Markdown parsing with wikilinks
- [ ] Knowledge graph construction
- [ ] HybridRAG search implementation
- [ ] MCP tools (query_character, query_location, search_vault)
- [ ] ComfyUI integration
- [ ] Obsidian plugin

## Documentation

- [Implementation Plan](../.copilot/session-state/.../plan.md)
- [Architecture Research](.planning/research/ARCHITECTURE.md)
- [Technology Stack](.planning/research/STACK.md)
- [Features Specification](.planning/research/FEATURES.md)

## License

MIT

## Contributing

This project is currently in early development. Contributions welcome once MVP is stable.

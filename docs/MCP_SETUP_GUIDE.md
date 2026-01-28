# MCP Server Setup Guide

Give your AI the context it needs to stay in your world's truth.

## Overview

The Hivemind MCP (Model Context Protocol) server connects your Obsidian vault to AI tools like Claude Desktop and GitHub Copilot. When configured, these AI assistants can query your vault directly — reading character details, checking timeline events, and exploring entity relationships — all while staying grounded in the canon you've established.

**Why MCP?** Instead of copy-pasting notes into AI conversations, MCP lets the AI fetch exactly what it needs from your vault. Your worldbuilding knowledge becomes a living source of truth that prevents AI hallucination.

## Prerequisites

- **Node.js 18+** — [Download from nodejs.org](https://nodejs.org/)
- **Obsidian 1.4+** — Your vault should be set up with Hivemind plugin installed
- **AI Client** — Claude Desktop, GitHub Copilot, or another MCP-compatible tool

## Claude Desktop Configuration

Claude Desktop is the most popular MCP client. Here's how to connect it to your Hivemind vault.

### Windows

1. Locate your Claude Desktop config file:
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```
   (Full path: `C:\Users\YourName\AppData\Roaming\Claude\claude_desktop_config.json`)

2. Open the file in a text editor (create it if it doesn't exist)

3. Add the Hivemind server configuration:

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

4. **Optional:** Specify a vault path directly (overrides config.json):
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

5. Restart Claude Desktop

### macOS / Linux

1. Locate your Claude Desktop config file:
   ```
   ~/.config/Claude/claude_desktop_config.json
   ```

2. Open the file in a text editor (create it if it doesn't exist)

3. Add the Hivemind server configuration:

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

4. **Optional:** Specify a vault path directly:
   ```json
   {
     "mcpServers": {
       "hivemind": {
         "command": "npx",
         "args": ["-y", "@hiveforge/hivemind-mcp", "--vault", "/path/to/your/vault"]
       }
     }
   }
   ```

5. Restart Claude Desktop

### Verifying Connection

Open Claude Desktop and start a new conversation. You should see "hivemind" listed in the available tools/servers panel. Try asking Claude about your vault:

> "What characters do I have in my vault?"

If configured correctly, Claude will use the `list_character` tool to query your vault.

## GitHub Copilot Configuration

GitHub Copilot supports MCP through its agent workspace.

1. Locate your Copilot MCP config file:
   ```
   ~/.copilot/mcp-config.json
   ```

2. Add the Hivemind server:

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

3. Restart your editor (VS Code, JetBrains, etc.)

## Manual Configuration

If you prefer manual configuration, create a `config.json` file in your project directory:

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

Then reference it in your MCP client configuration:

```json
{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": ["-y", "@hiveforge/hivemind-mcp", "--config", "/path/to/config.json"]
    }
  }
}
```

## Template Selection

Hivemind supports multiple domain templates. Choose the one that fits your use case:

| Template | Use Case | Entity Types |
|----------|----------|--------------|
| `worldbuilding` | Fiction writers, game masters | Characters, Locations, Events, Factions, Lore, Assets, References |
| `research` | Academics, knowledge workers | Papers, Citations, Concepts, Notes |
| `people-management` | Managers, team leads | People, Goals, Teams, 1:1 Meetings |
| `software-architecture` | Engineers, architects | Systems, Components, Decisions (ADRs), Constraints, Interfaces |
| `ux-research` | UX researchers, product teams | Interviews, Insights, Hypotheses, Personas, Experiments |

Set your active template in `config.json`:

```json
{
  "template": {
    "activeTemplate": "worldbuilding"
  }
}
```

Or use the CLI:

```bash
npx @hiveforge/hivemind-mcp init
# (interactive wizard will prompt for template selection)
```

### Custom Templates

You can define custom entity types directly in your `config.json`. See [CONTRIBUTING_TEMPLATES.md](../CONTRIBUTING_TEMPLATES.md) for details on creating your own templates.

## CLI Commands

Useful commands for managing your Hivemind installation:

```bash
# Interactive setup - creates config.json
npx @hiveforge/hivemind-mcp init

# Validate your configuration
npx @hiveforge/hivemind-mcp validate

# Start the server manually (for testing)
npx @hiveforge/hivemind-mcp start

# List available templates
npx @hiveforge/hivemind-mcp list-templates

# Add a template from registry
npx @hiveforge/hivemind-mcp add-template software-architecture

# Get vault statistics
npx @hiveforge/hivemind-mcp stats
```

## Troubleshooting

**Server not appearing in Claude Desktop:**
- Verify `claude_desktop_config.json` is valid JSON (no trailing commas)
- Check that Node.js 18+ is installed: `node --version`
- Restart Claude Desktop completely (not just close window)

**"Command not found" or "npx: command not found":**
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Ensure `npx` is in your PATH

**"Vault not found" error:**
- Check vault path in config.json or --vault argument
- Ensure path uses correct separators (Windows: `\\`, macOS/Linux: `/`)
- Verify the path points to the root of your Obsidian vault

**Tools not working as expected:**
- Run `npx @hiveforge/hivemind-mcp validate` to check configuration
- Check Obsidian plugin is enabled and vault is indexed
- See [GitHub Issues](https://github.com/hiveforge-sh/hivemind/issues) for known issues

For additional help, open an issue on [GitHub](https://github.com/hiveforge-sh/hivemind/issues) with:
- Your MCP client (Claude Desktop, GitHub Copilot, etc.)
- Operating system
- Node.js version (`node --version`)
- Hivemind version (`npx @hiveforge/hivemind-mcp --version`)
- Error messages from logs

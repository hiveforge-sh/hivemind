# MCP Compatibility Guide

## Overview

Hivemind uses the **Model Context Protocol (MCP)** — an open standard created by Anthropic in November 2024. Any tool that implements MCP can connect to Hivemind.

## Supported MCP Clients

### Full Support

| Client | Status | Notes |
|--------|--------|-------|
| **Claude Desktop** | ✅ Native | Official Anthropic implementation |
| **GitHub Copilot** | ✅ Native | MCP support via mcp-config.json |
| **Claude Code** | ✅ Native | CLI tool with MCP support |
| **MCP Inspector** | ✅ Native | Official debugging tool |
| **Cline** | ✅ Community | VS Code extension |

### Configuration Examples

#### Claude Desktop

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

#### GitHub Copilot

**Config**: `~/.copilot/mcp-config.json`

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

#### MCP Inspector (Debugging)

```bash
npx @modelcontextprotocol/inspector npx @hiveforge/hivemind-mcp start
```

## How MCP Works

Think of MCP like USB:
- USB is a standard — any device can implement it
- Once a device has a USB port, it can connect to ANY USB accessory
- The accessory doesn't care if it's plugged into a phone, laptop, or car

**MCP is the same**:
- MCP is a protocol standard
- Hivemind implements MCP **server**
- Any tool that implements MCP **client** can connect
- Hivemind doesn't care which tool connects — it just speaks MCP

## Transport Modes

Hivemind supports MCP via **stdio** transport (standard input/output):

```
AI Tool (MCP Client) ←stdio→ Hivemind (MCP Server) ←→ Your Vault
```

This is the most common mode for local tools like Claude Desktop.

## What Hivemind Provides

When connected via MCP, clients can use these tools:

### Dynamic Entity Tools (per template)
- `query_<type>` — Get entity by ID with relationships
- `list_<type>` — List all entities of type

### Search
- `search_vault` — Full-text search across all content

### Canon Workflow
- `get_canon_status` — List entities by status
- `submit_for_review` — Move draft to pending
- `validate_consistency` — Check for issues

### Asset Management
- `store_asset` — Save asset metadata
- `query_asset` — Get asset details
- `list_assets` — Browse assets

### ComfyUI (when enabled)
- `store_workflow` — Save ComfyUI workflow
- `get_workflow` — Retrieve workflow
- `list_workflows` — Browse workflows
- `generate_image` — Generate with context injection

### Utility
- `rebuild_index` — Force re-index
- `get_vault_stats` — Vault statistics

## Non-MCP Tools

For tools that don't support MCP natively:

### HTTP API Clients

Hivemind can be wrapped with an HTTP adapter:

```typescript
// Example: Express wrapper
import { HivemindServer } from '@hiveforge/hivemind-mcp';

app.post('/query', async (req, res) => {
  const result = await server.handleTool(req.body.tool, req.body.args);
  res.json(result);
});
```

### Python Scripts

Call Hivemind programmatically:

```python
import subprocess
import json

# Start Hivemind
process = subprocess.Popen(
    ['npx', '@hiveforge/hivemind-mcp', 'start'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE
)

# Send MCP request
request = {
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
        "name": "query_character",
        "arguments": {"id": "eddard-stark"}
    },
    "id": 1
}
process.stdin.write(json.dumps(request).encode() + b'\n')
```

## Why MCP?

1. **Future-proof**: Growing ecosystem of tools adopting MCP
2. **Standard**: No vendor lock-in
3. **Extensible**: Easy to add new clients
4. **Local-first**: All processing happens on your machine

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP GitHub](https://github.com/modelcontextprotocol)
- [Hivemind Documentation](https://github.com/hiveforge-sh/hivemind)

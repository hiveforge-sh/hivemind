# MCP Compatibility: Which AI Tools Can Use Hivemind?

## The Short Answer

**Hivemind speaks MCP protocol** - it doesn't care which AI tool connects to it. ANY tool that implements the MCP client protocol can use it.

However, **not all AI tools support MCP yet** (as of Jan 2026).

---

## MCP Protocol Explained

MCP (Model Context Protocol) is an **open standard** created by Anthropic in November 2024. Think of it like USB:
- USB is a standard - any device can implement it
- Once a device has a USB port, it can connect to ANY USB accessory
- The accessory doesn't care if it's an iPhone, Android, or laptop

**MCP is the same**:
- MCP is a standard protocol
- Hivemind implements MCP **server**
- Any AI tool that implements MCP **client** can connect
- Hivemind doesn't care which tool connects - it just speaks MCP

---

## Current Tool Support (January 2026)

### ✅ Full MCP Support

**1. Claude Desktop (Anthropic)**
- Native MCP support built-in
- Official implementation by the protocol creators
- Easy setup via config file

**Setup**:
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (Mac)
// %APPDATA%/Claude/claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "hivemind": {
      "command": "node",
      "args": ["C:/Users/Preston/git/hivemind/dist/index.js"]
    }
  }
}
```

**Usage**: Just ask Claude to query your vault - it automatically uses the MCP tools.

---

**2. MCP Inspector (Anthropic)**
- Official debugging/testing tool
- Great for development
- Command-line interface

**Setup**:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

### 🟡 Partial / Community Support

**3. Cline (VS Code Extension)**
- Community-built MCP client
- Works in VS Code
- May require additional configuration

**4. LibreChat**
- Open-source chat UI
- MCP support via plugins
- Self-hosted

---

### ❓ Unknown / In Progress

**5. GitHub Copilot**
- **Current status**: No official MCP support announced (as of Jan 2026)
- **BUT**: GitHub Copilot uses a different protocol (LSP-based)
- **Workaround**: Could build a bridge/adapter
- **Future**: GitHub may add MCP support (it's an open standard)

**6. Google Gemini**
- **Current status**: No official MCP support
- **BUT**: Google has their own API system
- **Workaround**: Could build API adapter
- **Future**: May add MCP support if it gains traction

**7. ChatGPT (OpenAI)**
- **Current status**: Uses custom GPT Actions (not MCP)
- **BUT**: OpenAI has their own plugin/action system
- **Workaround**: Could expose Hivemind via HTTP API, wrap in GPT Action
- **Future**: Unclear if OpenAI will adopt MCP

---

## How to Use Hivemind with Different Tools

### Scenario 1: Tool Has Native MCP Support ✅
**Example**: Claude Desktop

1. Install tool
2. Add Hivemind to MCP config
3. Start using - tool automatically discovers and uses Hivemind tools

**No code changes needed in Hivemind!**

---

### Scenario 2: Tool Has HTTP API (No MCP) 🔧
**Example**: ChatGPT, Gemini API

**Option A**: Use Hivemind's HTTP transport (Phase 2)
```json
{
  "server": {
    "transport": "http",
    "port": 3000
  }
}
```

Then build a wrapper/adapter:
```
ChatGPT Plugin → HTTP Wrapper → Hivemind HTTP Server → Vault
```

**Option B**: Build custom integration
- Expose Hivemind tools as REST API
- Create GPT Action that calls the API
- More work, but possible

---

### Scenario 3: Tool Is CLI/Local (No MCP) 🛠️
**Example**: Local Python script, custom CLI tool

**Solution**: Use Hivemind as a library
```typescript
import { HivemindServer } from './hivemind';

const server = new HivemindServer(config);
const result = await server.handleQueryCharacter({ id: "eddard-stark" });
```

Or call it via stdio programmatically:
```python
import subprocess
import json

# Start Hivemind MCP server
process = subprocess.Popen(['node', 'dist/index.js'], 
                          stdin=subprocess.PIPE, 
                          stdout=subprocess.PIPE)

# Send MCP request
request = {
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {"name": "query_character", "arguments": {"id": "eddard-stark"}},
  "id": 1
}
process.stdin.write(json.dumps(request).encode())
```

---

## Multi-Tool Strategy: How to Support Everything

**Phase 1 (Now)**: Stdio MCP - works with Claude Desktop

**Phase 2 (Weeks 5-8)**: Add HTTP/SSE transport
```
Hivemind MCP Server
├── Stdio transport → Claude Desktop, MCP Inspector
└── HTTP/SSE transport → Custom clients, web apps
```

**Phase 3 (Future)**: Build adapters for specific tools
```
Hivemind Core
├── MCP Server (stdio/HTTP) → Claude, Cline, etc.
├── REST API Wrapper → ChatGPT GPT Actions
├── Gemini API Adapter → Google Gemini
└── Copilot Extension → GitHub Copilot (if needed)
```

---

## The Good News: Protocol Convergence

**MCP is gaining traction** (as of Jan 2026):
- Open standard (not vendor lock-in)
- Growing ecosystem of tools
- Companies are adding MCP support

**Expect more tools to adopt MCP** over time, just like how everyone eventually adopted USB.

---

## What This Means for Hivemind

**Design Decision**: We're building MCP-first because:
1. **Future-proof**: More tools will adopt MCP
2. **Extensible**: Easy to add HTTP wrapper later
3. **Standard**: Better than building custom integrations for each tool

**You can use Hivemind with**:
- ✅ **Claude Desktop** (right now, Phase 1)
- ✅ **Any MCP client** (right now, Phase 1)
- ✅ **HTTP clients** (Phase 2, weeks 5-8)
- 🔧 **Other tools via adapters** (Phase 3+, custom work)

---

## Practical Example: Multi-Tool Workflow

**Your Setup (Future)**:
```
Hivemind MCP Server (running locally)
├─ Claude Desktop → Character queries, dialogue generation
├─ ComfyUI (via adapter) → Image generation with character context
├─ Custom Python Script → Batch processing, validation
└─ Web UI (Phase 4) → Visual vault browser
```

**All tools see the SAME canonical data** from your Obsidian vault.

---

## Bottom Line

**Q: Does Copilot/Gemini/etc. use MCP the same as Claude?**

**A**: 
- **If they implement MCP**: Yes, exactly the same
- **If they don't**: You'll need an adapter/wrapper
- **Hivemind doesn't care**: It just speaks MCP protocol
- **Currently**: Claude Desktop is the main MCP-native tool

**Think of Hivemind as speaking "MCP language"** - any tool that learns MCP can talk to it. Some tools already speak it (Claude), others might need a translator (adapters).

---

## Recommendation

**Start with Claude Desktop** (Phase 1) because:
- Native MCP support
- Works out of the box
- No adapter needed
- Official implementation

**Later** (Phase 2+): Add HTTP transport and adapters for other tools as needed.

This keeps the project focused while staying extensible for future tools.

# Hivemind Obsidian Plugin

An Obsidian plugin that integrates with the Hivemind MCP server to generate consistent AI images using ComfyUI with context from your worldbuilding vault.

## Features

- **Generate Images from Notes**: Right-click on a character or location note to generate AI images with automatic context injection
- **Smart Frontmatter Management**: Automatically detect and insert missing frontmatter fields in your notes
- **Workflow Management**: Browse and select ComfyUI workflows directly from Obsidian
- **MCP Integration**: Seamless connection to the Hivemind MCP server
- **Asset Tracking**: Track generated images with full provenance (workflow, prompts, parameters)

## Installation

### Manual Installation

1. Download the latest release
2. Extract the files to `<your-vault>/.obsidian/plugins/hivemind-mcp/`
3. Enable the plugin in Obsidian settings

### Development Installation

```bash
cd obsidian-plugin
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugins folder.

## Configuration

### Settings

- **MCP Server Command**: Command to start the Hivemind MCP server (default: `npx @hiveforge/hivemind-mcp start`)
- **Auto-start MCP**: Automatically start the MCP server when Obsidian loads
- **ComfyUI Enabled**: Enable ComfyUI image generation features
- **ComfyUI Endpoint**: URL of your local ComfyUI instance (default: `http://127.0.0.1:8188`)

### Prerequisites

1. **Hivemind MCP Server**: Install globally with `npm install -g @hiveforge/hivemind-mcp`
2. **ComfyUI**: Running locally (optional, only needed for image generation)

### Privacy & Network Usage

**🔒 All connections are local-only (localhost)**

This plugin makes no external network requests. All connections are to services running on your own machine:
- **MCP Server**: Runs locally via Node.js (stdio communication, no HTTP)
- **ComfyUI**: Connects to `http://127.0.0.1:8188` only when ComfyUI is enabled in settings

Your worldbuilding data never leaves your computer.

## Usage

### Generating Images

1. Open a character or location note (must have `id` and `type` in frontmatter)
2. Use command palette: "Hivemind: Generate image from current note"
3. Select a workflow from the list
4. Wait for generation to complete
5. View the results

### Managing Workflows

- **Browse Workflows**: Command palette → "Hivemind: Browse ComfyUI workflows"
- **Store Workflow**: Use the MCP server tools directly or create JSON files in `/workflows/` directory

### Connecting to MCP

The plugin can auto-start the MCP server, or you can manually connect:

- **Connect**: Command palette → "Hivemind: Connect to MCP server"
- **Disconnect**: Command palette → "Hivemind: Disconnect from MCP server"

Status is shown in the status bar: "Hivemind: Connected" / "Hivemind: Disconnected"

## Commands

| Command | Description |
|---------|-------------|
| Generate image from current note | Generate AI image using note's context |
| Browse ComfyUI workflows | View all saved workflows |
| Check and insert missing frontmatter | Add missing frontmatter fields to notes |
| View generated assets | Browse asset gallery (coming soon) |
| Connect to MCP server | Start MCP server connection |
| Disconnect from MCP server | Stop MCP server connection |

## Development

### Building

```bash
npm run build      # Production build
npm run dev        # Development build with watch mode
```

### Project Structure

```
obsidian-plugin/
├── main.ts              # Main plugin code
├── manifest.json        # Plugin manifest
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── esbuild.config.mjs   # Build configuration
└── version-bump.mjs     # Version management script
```

## Roadmap

- [x] MCP server communication
- [x] Workflow browsing
- [x] Image generation from notes
- [x] Canon status management (via MCP tools)
- [ ] Asset gallery view
- [ ] Drag-and-drop workflow upload
- [ ] Real-time generation progress
- [ ] Batch image generation

## License

MIT

## Support

For issues and feature requests, please visit the [Hivemind GitHub repository](https://github.com/hiveforge-sh/hivemind).

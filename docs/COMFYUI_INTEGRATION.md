# ComfyUI Integration Guide

## Overview

Hivemind integrates with ComfyUI to generate consistent AI images using context from your worldbuilding vault. Every generated image is tracked with full provenance (workflow, prompts, parameters), ensuring reproducibility and canon consistency.

## Architecture

```
Obsidian Vault (Your Notes)
    ↓
Obsidian Plugin (UI)
    ↓
Hivemind MCP Server (Context Injection)
    ↓
ComfyUI API (Image Generation)
    ↓
Generated Images → Back to Vault (with Metadata)
```

## Features

- **Context Injection**: Automatically insert character/location data into ComfyUI prompts
- **Workflow Library**: Store and reuse ComfyUI workflows
- **Provenance Tracking**: Every image knows its source, workflow, and parameters
- **Obsidian Integration**: Generate images directly from character notes
- **Reproducible**: Store seed + parameters to recreate exact images

## Setup

### Prerequisites

1. **ComfyUI** installed and running locally
2. **Hivemind MCP Server** installed: `npm install -g @hiveforge/hivemind-mcp`
3. **Obsidian Plugin** installed (optional, but recommended)

### Configuration

#### 1. Enable ComfyUI in MCP Server

Edit `config.json`:

```json
{
  "vault": {
    "path": "/path/to/your/vault"
  },
  "comfyui": {
    "enabled": true,
    "endpoint": "http://127.0.0.1:8188",
    "timeout": 300000,
    "workflowsPath": "workflows",
    "assetsPath": "assets/images",
    "assetsNotesPath": "Assets"
  }
}
```

**Configuration Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Enable/disable ComfyUI features |
| `endpoint` | `http://127.0.0.1:8188` | ComfyUI API URL |
| `timeout` | `300000` | Request timeout in milliseconds (5 minutes) |
| `workflowsPath` | `workflows` | Directory for workflow JSON files |
| `assetsPath` | `assets/images` | Directory for generated images |
| `assetsNotesPath` | `Assets` | Directory for asset note files |

#### 2. Start ComfyUI

```bash
cd /path/to/ComfyUI
python main.py
```

ComfyUI will start at `http://127.0.0.1:8188`

#### 3. Install Obsidian Plugin (Optional)

1. Download the latest release from GitHub
2. Extract to `<vault>/.obsidian/plugins/hivemind-mcp/`
3. Enable in Obsidian settings → Community Plugins
4. Configure plugin settings:
   - MCP server command: `npx @hiveforge/hivemind-mcp start`
   - Auto-start MCP: Toggle on/off
   - ComfyUI endpoint: `http://127.0.0.1:8188`

## Usage

### Creating a Workflow

#### Method 1: Via ComfyUI Export

1. Create your workflow in ComfyUI
2. Click "Save (API Format)" button
3. Copy the JSON output
4. Store via MCP tool:

```javascript
// Via Claude or other MCP client
hivemind.store_workflow({
  id: "portrait-realistic",
  name: "Realistic Character Portrait",
  description: "High-quality photorealistic character portraits",
  workflow: { /* paste ComfyUI JSON here */ },
  contextFields: ["appearance", "personality", "age"]
})
```

#### Method 2: Manual File Creation

Create `workflows/portrait-realistic.json` in your vault:

```json
{
  "id": "portrait-realistic",
  "name": "Realistic Character Portrait",
  "description": "High-quality photorealistic portraits",
  "workflow": {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 12345,
        "steps": 20,
        "cfg": 7.5,
        "sampler_name": "euler_a"
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": "A portrait of a {{age}} year old person with {{appearance.hair}} hair, {{appearance.eyes}} eyes. {{personality.traits}} expression."
      }
    }
  },
  "contextFields": ["appearance", "personality", "age"],
  "outputPath": "assets/images"
}
```

The MCP server will auto-scan the `workflows/` directory on startup.

### Context Injection Syntax

Use template variables in your ComfyUI prompt nodes:

**Syntax:**
```
{{field}}                    - Top-level field
{{object.field}}             - Nested field
{{object.nested.field}}      - Any depth
```

**Example Character Note:**

```yaml
---
id: character-tyrion
type: character
age: 32
appearance:
  hair: blonde, short
  eyes: mismatched green and black
  height: 4'5"
personality:
  traits: witty, intelligent, sarcastic
---
```

**Example Workflow Prompt:**

```
A portrait of a {{age}} year old person with {{appearance.hair}} hair 
and {{appearance.eyes}} eyes, {{appearance.height}} tall. 
Expression: {{personality.traits}}
```

**After Injection:**

```
A portrait of a 32 year old person with blonde, short hair 
and mismatched green and black eyes, 4'5" tall. 
Expression: witty, intelligent, sarcastic
```

### Generating Images

#### Via Obsidian Plugin

1. Open a character or location note
2. Ensure frontmatter has `id` and `type`:
   ```yaml
   ---
   id: character-tyrion
   type: character
   ---
   ```
3. Command Palette → "Hivemind: Generate image from current note"
4. Select workflow from modal
5. Wait for generation to complete
6. Image saved to vault with metadata

#### Via MCP Tool Directly

```javascript
// Via Claude or other MCP client
const result = await hivemind.generate_image({
  workflowId: "portrait-realistic",
  contextId: "character-tyrion",
  contextType: "character",
  seed: 12345  // Optional: for reproducibility
})
```

### Workflow Commands

#### List All Workflows

```javascript
const workflows = await hivemind.list_workflows()
```

**Response:**
```markdown
# ComfyUI Workflows

Found 3 workflow(s):

## Realistic Character Portrait
- **ID**: `portrait-realistic`
- **Description**: High-quality photorealistic character portraits
- **Context Fields**: appearance, personality, age
- **Updated**: 1/25/2026, 12:00:00 AM

## Anime Style Portrait
- **ID**: `portrait-anime`
...
```

#### Get Workflow Details

```javascript
const workflow = await hivemind.get_workflow({
  id: "portrait-realistic"
})
```

Returns full workflow JSON with metadata.

### Asset Tracking

#### Store Generated Asset

```javascript
await hivemind.store_asset({
  assetType: "image",
  filePath: "assets/images/tyrion-portrait-001.png",
  depicts: ["character-tyrion"],
  workflowId: "portrait-realistic",
  prompt: "A portrait of a 32 year old person...",
  parameters: {
    seed: 12345,
    steps: 20,
    cfg: 7.5,
    sampler: "euler_a",
    model: "realisticVision_v5.1"
  }
})
```

This creates a database record tracking:
- Which character/location the image depicts
- Which workflow generated it
- The exact prompt used (with injected values)
- All generation parameters
- Creation timestamp
- Canon status (draft/pending/canon)

#### Create Asset Note (Manual)

Create `Assets/Tyrion Portrait 001.md`:

```markdown
---
id: asset-tyrion-portrait-001
type: asset
asset_type: image
status: canon
depicts:
  - character-tyrion
workflow_id: portrait-realistic
generation_date: 2026-01-25
seed: 12345
---

# Tyrion Portrait 001

![](../assets/images/tyrion-portrait-001.png)

Official portrait of [[Tyrion Lannister]] generated using the 
[[portrait-realistic]] workflow.

## Generation Parameters
- Seed: 12345
- Steps: 20
- CFG Scale: 7.5
- Sampler: euler_a
- Model: realisticVision_v5.1

## Approval Notes
Perfect capture of his sardonic expression. Approved for canon use.
```

## Workflow Examples

### Example 1: Character Portrait

**Character Note:**
```yaml
---
id: character-arya
type: character
age: 18
appearance:
  hair: brown, shoulder-length
  eyes: grey
  build: slim, athletic
personality:
  traits: determined, fierce, independent
---
```

**Workflow Prompt:**
```
A portrait of a {{age}} year old woman with {{appearance.hair}} hair, 
{{appearance.eyes}} eyes, {{appearance.build}} build. 
Personality: {{personality.traits}}. Fantasy medieval setting.
```

**Generated Prompt:**
```
A portrait of a 18 year old woman with brown, shoulder-length hair, 
grey eyes, slim, athletic build. 
Personality: determined, fierce, independent. Fantasy medieval setting.
```

### Example 2: Location Landscape

**Location Note:**
```yaml
---
id: location-winterfell
type: location
climate: cold, snowy
architecture: stone castle, ancient
atmosphere: imposing, mysterious
---
```

**Workflow Prompt:**
```
A landscape of an {{architecture}} in a {{climate}} environment. 
Atmosphere: {{atmosphere}}. Epic fantasy art style.
```

### Example 3: Batch Generation

```javascript
// Future feature - generate portraits for all Stark family members
const starkCharacters = await hivemind.search_vault({
  query: "stark",
  filters: { type: ["character"], tags: ["stark-family"] }
})

for (const character of starkCharacters.nodes) {
  await hivemind.generate_image({
    workflowId: "portrait-realistic",
    contextId: character.id,
    contextType: "character"
  })
}
```

## Advanced Features

### Custom Seed for Reproducibility

Generate the same image every time:

```javascript
await hivemind.generate_image({
  workflowId: "portrait-realistic",
  contextId: "character-tyrion",
  contextType: "character",
  seed: 42  // Use same seed = same image
})
```

### Workflow Parameter Overrides

```javascript
await hivemind.generate_image({
  workflowId: "portrait-realistic",
  contextId: "character-tyrion",
  contextType: "character",
  overrides: {
    "3": {  // KSampler node ID
      "inputs": {
        "steps": 30,  // Override default 20 steps
        "cfg": 8.5    // Override default 7.5 CFG
      }
    }
  }
})
```

### Real-time Progress Monitoring

The MCP server monitors generation via WebSocket and logs progress:

```
ComfyUI Progress: {"type":"progress","data":{"value":5,"max":20}}
ComfyUI Progress: {"type":"executing","data":{"node":"KSampler"}}
ComfyUI Progress: {"type":"executed","data":{"output":{...}}}
```

## Database Schema

### Workflows Table

```sql
CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  context_fields TEXT,  -- JSON array
  output_path TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);
```

### Assets Table

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  asset_type TEXT NOT NULL DEFAULT 'image',
  file_path TEXT NOT NULL,
  depicts TEXT,  -- JSON array of entity IDs
  workflow_id TEXT,
  prompt TEXT,
  parameters TEXT,  -- JSON object
  created TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);
```

## Troubleshooting

### ComfyUI Connection Errors

**Error:** `Failed to connect to ComfyUI at http://127.0.0.1:8188`

**Solution:**
1. Ensure ComfyUI is running: `python main.py`
2. Check endpoint in config.json matches ComfyUI URL
3. Verify no firewall blocking port 8188

### Character Not Found

**Error:** `Context entity not found: character-tyrion`

**Solution:**
1. Check character note has `id` in frontmatter
2. Ensure MCP server has indexed the vault
3. Try `rebuild_index` tool to force re-scan

### Generation Timeout

**Error:** `Workflow execution timed out`

**Solution:**
1. Increase timeout in config.json: `"timeout": 600000` (10 minutes)
2. Simplify workflow (reduce steps, resolution)
3. Check ComfyUI console for errors

### Template Variables Not Replaced

**Issue:** Prompt shows `{{appearance.hair}}` instead of actual value

**Solution:**
1. Verify character note has the field in frontmatter
2. Check spelling/case matches exactly
3. Ensure field path is correct (nested objects use dots)

## API Reference

### MCP Tools

#### `store_workflow`

Store a ComfyUI workflow in the vault.

**Parameters:**
- `id` (string, required): Unique workflow identifier
- `name` (string, required): Human-readable name
- `description` (string, optional): Workflow description
- `workflow` (object, required): ComfyUI workflow JSON
- `contextFields` (string[], optional): Fields to inject from context
- `outputPath` (string, optional): Custom output directory

**Returns:** Workflow object with metadata

#### `list_workflows`

List all stored workflows.

**Parameters:** None

**Returns:** Markdown-formatted list of workflows

#### `get_workflow`

Get a specific workflow by ID.

**Parameters:**
- `id` (string, required): Workflow ID

**Returns:** Complete workflow object with JSON

#### `generate_image`

Generate an image using ComfyUI with vault context.

**Parameters:**
- `workflowId` (string, required): Workflow to execute
- `contextId` (string, required): Character/location ID for context
- `contextType` (string, required): "character" or "location"
- `seed` (number, optional): Random seed for reproducibility
- `overrides` (object, optional): Workflow parameter overrides

**Returns:** Generation result with image details

#### `store_asset`

Store generated asset metadata.

**Parameters:**
- `assetType` (string, default: "image"): Type of asset
- `filePath` (string, required): Path in vault
- `depicts` (string[], optional): Entity IDs depicted
- `workflowId` (string, optional): Workflow used
- `prompt` (string, optional): Generation prompt
- `parameters` (object, optional): Generation parameters

**Returns:** Asset metadata

## Best Practices

### Workflow Organization

- Store workflows in `/workflows/` directory
- Use descriptive IDs: `portrait-realistic`, `landscape-aerial`
- Document context fields in description
- Version workflows: `portrait-v1`, `portrait-v2`

### Asset Management

- Use consistent naming: `character-name-type-###.png`
- Always create Asset notes for canon images
- Include seed in metadata for reproducibility
- Tag assets with character/location references

### Context Injection

- Keep frontmatter structured and consistent
- Use nested objects for complex data
- Document expected fields in workflow description
- Test templates before batch generation

### Canon Workflow

1. Generate image → status: `draft`
2. Review and approve → status: `pending`
3. Final approval → status: `canon`
4. Create Asset note with full metadata

## Future Enhancements

- **Asset Gallery UI**: Visual browser in Obsidian plugin
- **Batch Generation**: Generate multiple images at once
- **Canon Status Management**: Promote/demote assets via commands
- **Workflow Templates**: Pre-built workflows for common use cases
- **Progress Bars**: Real-time generation progress in Obsidian
- **Image Variations**: Generate multiple versions with different seeds

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/hiveforge-io/hivemind/issues
- Documentation: https://github.com/hiveforge-io/hivemind

## License

MIT - See LICENSE file for details

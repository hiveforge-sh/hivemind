# Hivemind Setup Guide

This guide will help you set up Hivemind MCP Server with your Obsidian vault.

## Quick Start

```bash
# Install and run with npx (recommended)
npx @hiveforge/hivemind-mcp init

# Or install globally
npm install -g @hiveforge/hivemind-mcp
hivemind-mcp init
```

The `init` command will guide you through configuration.

## Requirements

- **Node.js**: Version 20 or higher
- **Obsidian vault**: With markdown files containing YAML frontmatter
- **MCP client**: Claude Desktop, GitHub Copilot, or another MCP-compatible tool

## Frontmatter Structure

Hivemind requires your markdown files to have YAML frontmatter with at least these fields:

```yaml
---
id: unique-identifier
type: entity-type
status: draft|pending|canon|non-canon|archived
title: Display Name
---
```

### Choosing a Template

Hivemind includes three built-in templates:

| Template | Use Case | Entity Types |
|----------|----------|--------------|
| `worldbuilding` | Fiction, games, RPG | character, location, event, faction, lore, asset, reference |
| `research` | Academic, knowledge | paper, citation, concept, note |
| `people-management` | Teams, HR | person, goal, team, one_on_one |

### Example: Worldbuilding Character

```markdown
---
id: character-john-smith
type: character
status: canon
title: John Smith
age: 35
gender: male
race: human
---

# John Smith

John is a grizzled detective working in Neo-Tokyo...

He knows [[Jane Doe]] and lives in [[Downtown District]].
```

### Example: Research Paper

```markdown
---
id: paper-attention-is-all-you-need
type: paper
status: canon
title: "Attention Is All You Need"
authors:
  - Vaswani et al.
year: 2017
doi: "10.48550/arXiv.1706.03762"
---

# Attention Is All You Need

The foundational transformer paper...

Related concepts: [[Transformer Architecture]], [[Self-Attention]]
```

### Example: People Management Person

```markdown
---
id: person-sarah-chen
type: person
status: canon
title: Sarah Chen
role: Senior Engineer
department: Platform
---

# Sarah Chen

Reports to [[Alex Rivera]]. Member of [[Platform Team]].
```

## Configuration

### Option 1: Interactive Setup (Recommended)

```bash
npx @hiveforge/hivemind-mcp init
```

### Option 2: Manual Configuration

Create a `config.json` in your vault root:

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

### Option 3: Command Line

```bash
# Start with vault path directly
npx @hiveforge/hivemind-mcp --vault /path/to/vault

# Use current directory as vault
npx @hiveforge/hivemind-mcp --vault .
```

## MCP Client Configuration

### Claude Desktop

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

With vault override:

```json
{
  "mcpServers": {
    "hivemind": {
      "command": "npx",
      "args": ["-y", "@hiveforge/hivemind-mcp", "--vault", "/path/to/vault"]
    }
  }
}
```

### GitHub Copilot

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

## Verifying Setup

After configuration, test the connection:

1. **Start the server** (if not auto-started):
   ```bash
   npx @hiveforge/hivemind-mcp start
   ```

2. **Ask your AI assistant** to query your vault:
   - "What characters are in my vault?"
   - "Tell me about [character name]"
   - "Search my vault for [topic]"

3. **Check server logs** for any errors

## Knowledge Graph Features

Hivemind automatically builds a knowledge graph from your wikilinks:

- `[[John]]` in Jane's note creates a "knows" relationship
- Relationships are bidirectional by default
- Templates define valid relationship types

### Relationship Types by Template

**Worldbuilding**:
- `knows` - character ↔ character
- `located_in` / `has_inhabitant` - character ↔ location
- `member_of` / `has_member` - character ↔ faction
- `allied_with` - faction ↔ faction

**Research**:
- `cites` / `cited_by` - paper ↔ citation
- `defines` - paper → concept
- `about` - note → any

**People Management**:
- `reports_to` / `manages` - person hierarchy
- `member_of` / `has_member` - person ↔ team
- `owns_goal` - person → goal

## Troubleshooting

### "No notes found"

**Cause**: Vault path incorrect or no `.md` files with valid frontmatter

**Solution**:
1. Verify vault path in config
2. Check that files have `id`, `type`, and `status` in frontmatter
3. Run `npx @hiveforge/hivemind-mcp validate`

### "Frontmatter validation error"

**Cause**: Missing required fields or invalid values

**Solution**: Ensure frontmatter includes:
```yaml
---
id: unique-id
type: valid-entity-type
status: draft
---
```

### "Date format error"

**Cause**: YAML parsing dates incorrectly

**Solution**: Wrap dates in quotes:
```yaml
created: "2026-01-25"  # Correct
created: 2026-01-25    # May cause issues
```

### "Server won't connect"

**Cause**: Configuration path or permissions issue

**Solution**:
1. Use absolute paths in config
2. Escape backslashes on Windows: `"C:\\Users\\..."`
3. Restart Claude Desktop completely after config changes

## Sample Vaults

Copy a sample vault to get started quickly:

```bash
# Worldbuilding
cp -r node_modules/@hiveforge/hivemind-mcp/samples/worldbuilding ~/my-world

# Research
cp -r node_modules/@hiveforge/hivemind-mcp/samples/research ~/my-research

# People Management
cp -r node_modules/@hiveforge/hivemind-mcp/samples/people-management ~/my-team
```

Or browse the samples on GitHub: https://github.com/hiveforge-sh/hivemind/tree/master/samples

## Next Steps

1. **Add frontmatter** to your existing notes
2. **Use wikilinks** to create relationships
3. **Query via AI** - ask about characters, locations, papers, etc.
4. **Enable ComfyUI** for AI image generation (see [ComfyUI Integration](COMFYUI_INTEGRATION.md))

## Support

- **Documentation**: https://github.com/hiveforge-sh/hivemind
- **Issues**: https://github.com/hiveforge-sh/hivemind/issues
- **npm Package**: https://www.npmjs.com/package/@hiveforge/hivemind-mcp

# Hivemind Sample Vaults

This directory contains sample vaults demonstrating each built-in template.

## Available Templates

### Worldbuilding

For fiction writers, game masters, and worldbuilders.

**Entity Types**: Characters, Locations, Events, Factions, Lore, Assets

```bash
# Use the worldbuilding template
cp -r samples/worldbuilding ~/my-world
```

[View worldbuilding samples](./worldbuilding/)

### Research

For academics, students, and knowledge workers.

**Entity Types**: Papers, Citations, Concepts, Notes

```bash
# Use the research template
cp -r samples/research ~/my-research
```

[View research samples](./research/)

### People Management

For managers, team leads, and HR professionals.

**Entity Types**: People, Goals, Teams, 1:1 Meetings

```bash
# Use the people-management template
cp -r samples/people-management ~/my-team
```

[View people-management samples](./people-management/)

## Quick Start

1. **Choose a template** based on your use case
2. **Copy the sample vault** to your desired location
3. **Open in Obsidian** as a new vault
4. **Configure Hivemind** with the vault path in `config.json`
5. **Start using the MCP tools** in Claude or your AI assistant

## Configuration

Each sample vault includes a `config.json` file that specifies the template:

```json
{
  "vault": {
    "path": "."
  },
  "template": {
    "activeTemplate": "worldbuilding"
  }
}
```

Change `activeTemplate` to use a different built-in template:
- `worldbuilding` (default)
- `research`
- `people-management`

## Custom Templates

You can also define custom templates in your `config.json`:

```json
{
  "template": {
    "activeTemplate": "my-custom-template",
    "templates": [
      {
        "id": "my-custom-template",
        "name": "My Custom Template",
        "version": "1.0.0",
        "entityTypes": [
          {
            "name": "myentity",
            "displayName": "My Entity",
            "pluralName": "My Entities",
            "fields": [
              { "name": "title", "type": "string", "required": true }
            ]
          }
        ]
      }
    ]
  }
}
```

## Learn More

- [Hivemind Documentation](../README.md)
- [Template System Guide](../docs/templates.md)
- [MCP Tools Reference](../docs/mcp-tools.md)

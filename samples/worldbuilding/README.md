# Worldbuilding Sample Vault

This is a sample vault demonstrating the **worldbuilding** template for Hivemind.

## Entity Types

- **Characters**: NPCs, player characters, and historical figures
- **Locations**: Places, regions, buildings, and rooms
- **Events**: Historical events, current events, and plot points
- **Factions**: Organizations, governments, guilds, and houses
- **Lore**: Mythology, magic systems, and cultural knowledge
- **Assets**: Visual and media assets (images, audio, video)

## Folder Structure

```
vault/
├── Characters/
│   ├── Elara Brightwood.md
│   └── Marcus Stone.md
├── Locations/
│   └── Tidewatch.md
├── Events/
├── Factions/
├── Lore/
├── Assets/
└── config.json
```

## Usage

1. Copy this sample vault to your desired location
2. Open it as an Obsidian vault
3. Configure Hivemind MCP server with the vault path
4. Start building your world!

## Relationships

The worldbuilding template includes relationship types like:

- `knows` - Characters who know each other
- `located_in` / `has_inhabitant` - Character-location relationships
- `member_of` / `has_member` - Character-faction relationships
- `allied_with` / `rivals_with` - Faction relationships
- `connected_to` - Location connections
- `participated_in` - Character-event relationships

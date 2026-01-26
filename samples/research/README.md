# Research Sample Vault

This is a sample vault demonstrating the **research** template for Hivemind.

## Entity Types

- **Papers**: Academic papers, articles, and publications
- **Citations**: Citation relationships with context
- **Concepts**: Key ideas, theories, and definitions
- **Notes**: Research notes and observations

## Folder Structure

```
vault/
├── Papers/
│   └── Attention Is All You Need.md
├── Concepts/
│   └── Transformer Architecture.md
├── Notes/
│   └── Literature Review - Transformers.md
├── Citations/
└── config.json
```

## Usage

1. Copy this sample vault to your desired location
2. Open it as an Obsidian vault
3. Configure Hivemind MCP server with the vault path
4. Start managing your research!

## Relationships

The research template includes relationship types like:

- `cites` / `cited_by` - Paper citation relationships
- `defines` / `defined_in` - Paper-concept relationships
- `related_concept` - Concept interconnections
- `extends` / `extended_by` - Concept hierarchies
- `about` / `has_note` - Note-paper/concept relationships

## Workflow Tips

1. **Start with papers**: Create a note for each paper you read
2. **Extract concepts**: Identify key concepts and create dedicated notes
3. **Link everything**: Use wikilinks to connect papers, concepts, and notes
4. **Track reading status**: Use the `readStatus` field to track progress
5. **Rate papers**: Use the `rating` field for personal evaluation

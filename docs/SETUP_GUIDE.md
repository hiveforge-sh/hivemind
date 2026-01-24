# Quick Setup Guide for Your Obsidian Vault

## What Happened

Your Project-Victor vault only has the default `Welcome.md` file, which doesn't have the frontmatter structure Hivemind needs. **This is totally normal!**

Hivemind needs special frontmatter fields to understand your worldbuilding notes:
- `id` - unique identifier
- `type` - character, location, event, faction, system, asset, or lore
- `status` - canon, draft, deprecated, etc.

---

## Easy Setup (2 Steps)

### Step 1: Add Frontmatter to Your Notes

Open any note in Obsidian and add frontmatter at the top:

**Example Character Note** (`Characters/John Smith.md`):
```markdown
---
id: character-john-smith
type: character
status: canon
title: John Smith
age: 35
gender: male
race: human
created: "2026-01-24"
updated: "2026-01-24"
---

# John Smith

John is a grizzled detective working in Neo-Tokyo...

He knows [[Jane Doe]] and lives in [[Downtown District]].
```

**Example Location Note** (`Locations/Downtown District.md`):
```markdown
---
id: location-downtown-district
type: location
status: canon
title: Downtown District
region: Neo-Tokyo
category: district
climate: urban
created: "2026-01-24"
updated: "2026-01-24"
---

# Downtown District

A bustling commercial area in the heart of Neo-Tokyo...
```

### Step 2: Restart Hivemind

```bash
node dist/index.js
```

That's it! Hivemind will now:
- ✅ Scan your vault
- ✅ Parse frontmatter and wikilinks
- ✅ Build knowledge graph from `[[wikilinks]]`
- ✅ Index everything in SQLite + FTS5
- ✅ Make it available to Claude via MCP

---

## Using It in Claude Desktop

### 1. Configure Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hivemind": {
      "command": "node",
      "args": ["C:\\Users\\Preston\\git\\hivemind\\dist\\index.js"]
    }
  }
}
```

### 2. Restart Claude Desktop

Close and reopen Claude Desktop completely.

### 3. Test It

In Claude, type:

```
Tell me about John Smith from my worldbuilding vault
```

Claude will:
1. Call `query_character("john-smith")`
2. Get full character data + relationships
3. Reply with a natural response using your canonical lore!

---

## Templates for Common Note Types

### Character Template
```markdown
---
id: character-[name-lowercase-dashes]
type: character
status: canon
title: [Character Name]
age: [number]
gender: [male/female/other]
race: [human/elf/etc]
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

# [Character Name]

## Description
[Physical appearance and personality]

## Background
[History and backstory]

## Relationships
- [[Other Character]] - relationship type
- Lives in [[Location Name]]
```

### Location Template
```markdown
---
id: location-[name-lowercase-dashes]
type: location
status: canon
title: [Location Name]
region: [Region/Kingdom]
category: [city/castle/forest/etc]
climate: [hot/cold/temperate]
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

# [Location Name]

## Geography
[Physical description]

## Notable Features
[Landmarks, districts, etc]

## Inhabitants
- [[Character 1]]
- [[Character 2]]
```

### Event Template
```markdown
---
id: event-[name-lowercase-dashes]
type: event
status: canon
title: [Event Name]
date: [in-universe date]
location: [[Location Name]]
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

# [Event Name]

## What Happened
[Description of the event]

## Participants
- [[Character 1]]
- [[Character 2]]

## Consequences
[What changed as a result]
```

---

## What Will Work

Once you add frontmatter to your notes:

### Search Everything
```
User: "Search my vault for notes about magic"
Claude: [calls search_vault with query="magic"]
        Returns all notes containing "magic" with BM25 ranking
```

### Query Characters
```
User: "Tell me about the main character"
Claude: [calls query_character]
        Returns full profile + relationships from graph
```

### Query Locations
```
User: "Where does the story take place?"
Claude: [calls query_location]
        Returns location data + connected characters
```

### Knowledge Graph Features
- Wikilinks become relationships: `[[John]]` in Jane's note creates "knows" edge
- Bidirectional: John knows Jane, Jane knows John
- Location tracking: `lives in [[City]]` creates "located_in" edge
- Auto-inference: character→character = "knows", character→location = "located_in"

---

## Testing Without Modifying Your Vault

If you want to test first without changing your actual vault:

1. **Use the sample vault** (already configured):
```bash
# Edit config.json back to:
"path": "./sample-vault"

# Start server
node dist/index.js
```

2. **Create a test vault** elsewhere:
```bash
mkdir test-vault
cd test-vault

# Create a character
mkdir Characters
cat > Characters/Test.md << 'EOF'
---
id: character-test
type: character
status: canon
title: Test Character
---
# Test Character
A test character who knows [[Other Character]].
EOF

# Point config.json to test-vault
```

---

## Common Issues

### "Frontmatter validation error"
**Problem**: Missing `id` or `type` field  
**Solution**: Add both to frontmatter (see templates above)

### "Expected string, received date"
**Problem**: Date fields auto-converted by gray-matter  
**Solution**: Wrap dates in quotes: `created: "2026-01-24"` not `created: 2026-01-24`

### "No notes found"
**Problem**: Vault path incorrect or no `.md` files  
**Solution**: Check vault path in `config.json`, verify files exist

### Server starts but Claude can't see it
**Problem**: Claude Desktop config incorrect  
**Solution**: 
1. Verify config path: `%APPDATA%\Claude\claude_desktop_config.json`
2. Use absolute paths with escaped backslashes
3. Restart Claude Desktop COMPLETELY (not just reload)

---

## Next Steps

1. **Add frontmatter to 1-2 notes** (use templates above)
2. **Restart Hivemind server**
3. **Configure Claude Desktop** (edit config JSON)
4. **Test with Claude**: "Tell me about [character name]"

Once working, you can gradually add frontmatter to more notes in your vault. The server watches for changes automatically!

---

## Current Vault Status

**Your vault**: `F:\Heimdall-Dropbox\Documents\ObsidianVaults\Project-Victor\Project-Victor`  
**Files found**: 1 (`Welcome.md`)  
**Files with valid frontmatter**: 0  

**To get started**: Create a note with proper frontmatter (see templates above) and restart the server!

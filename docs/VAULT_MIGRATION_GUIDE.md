# Vault Migration Guide

This guide helps you migrate an existing Obsidian vault to work with Hivemind.

## Overview

Hivemind requires your markdown files to have YAML frontmatter with specific fields. If your vault already has notes without this structure, you'll need to add the required fields.

## Required Frontmatter

Every note needs at minimum:

```yaml
---
id: unique-identifier
type: entity-type
status: draft|pending|canon|non-canon|archived
title: Display Name
---
```

## Migration Options

### Option 1: Gradual Migration (Recommended)

Add frontmatter to notes as you use them:

1. **Point Hivemind at your existing vault**
2. **Add frontmatter to important notes first** (main characters, key locations)
3. **Let Hivemind index what it can** — notes without frontmatter are skipped
4. **Gradually add frontmatter** to remaining notes over time

This approach lets you start using Hivemind immediately without migrating everything.

### Option 2: Bulk Migration Script

Use a script to add frontmatter to all notes based on folder structure:

```powershell
# PowerShell example for Windows
$folderMappings = @{
    "Characters" = "character"
    "People" = "character"
    "Locations" = "location"
    "Places" = "location"
    "Organizations" = "faction"
    "Factions" = "faction"
    "Events" = "event"
    "Lore" = "lore"
    "Notes" = "note"
}

Get-ChildItem -Path ".\vault" -Filter "*.md" -Recurse | ForEach-Object {
    $folder = $_.Directory.Name
    $type = $folderMappings[$folder]
    if ($type) {
        $id = "$type-" + ($_.BaseName -replace '\s+', '-').ToLower()
        # Add frontmatter logic here
    }
}
```

```bash
# Bash example for macOS/Linux
for file in vault/**/*.md; do
    folder=$(dirname "$file" | xargs basename)
    case $folder in
        Characters|People) type="character" ;;
        Locations|Places) type="location" ;;
        Organizations|Factions) type="faction" ;;
        Events) type="event" ;;
        *) type="note" ;;
    esac
    # Add frontmatter logic here
done
```

### Option 3: Test Copy First

Create a test copy of your vault to experiment:

```bash
# Copy vault (excluding Obsidian settings)
cp -r ~/vault ~/vault-test
rm -rf ~/vault-test/.obsidian

# Point Hivemind at test copy
# Experiment with frontmatter changes
# When satisfied, apply to real vault
```

## Folder to Type Mapping

Common mappings for worldbuilding vaults:

| Folder | Hivemind Type | Example ID |
|--------|---------------|------------|
| Characters/, People/ | `character` | `character-john-smith` |
| Locations/, Places/ | `location` | `location-castle-black` |
| Organizations/, Factions/ | `faction` | `faction-nights-watch` |
| Events/ | `event` | `event-battle-of-winterfell` |
| Creatures/ | `character` or `lore` | `creature-dragon` |
| Lore/, Mythology/ | `lore` | `lore-magic-system` |
| Items/, Loot/ | `asset` | `asset-excalibur` |

For research vaults:

| Folder | Hivemind Type | Example ID |
|--------|---------------|------------|
| Papers/, Articles/ | `paper` | `paper-attention-2017` |
| References/ | `citation` | `citation-vaswani-2017` |
| Concepts/, Ideas/ | `concept` | `concept-attention-mechanism` |
| Notes/ | `note` | `note-ml-meeting-jan` |

For people management vaults:

| Folder | Hivemind Type | Example ID |
|--------|---------------|------------|
| People/, Team/ | `person` | `person-sarah-chen` |
| Goals/, OKRs/ | `goal` | `goal-q1-platform` |
| Teams/, Departments/ | `team` | `team-platform` |
| 1-1s/, Meetings/ | `one_on_one` | `one_on_one-2026-01-15` |

## Preserving Existing Frontmatter

If your notes already have frontmatter (like `tags`), preserve it:

**Before:**
```yaml
---
tags:
  - important
  - character
aliases:
  - "The Boss"
---
```

**After:**
```yaml
---
id: character-john-smith
type: character
status: canon
title: John Smith
tags:
  - important
  - character
aliases:
  - "The Boss"
---
```

## ID Generation Rules

IDs should be:
- Lowercase
- Use hyphens (not spaces or underscores)
- Prefixed with type for clarity
- Unique across your vault

**Good IDs:**
- `character-eddard-stark`
- `location-winterfell`
- `paper-attention-is-all-you-need`

**Avoid:**
- `Eddard Stark` (has spaces, uppercase)
- `eddard_stark` (underscores)
- `char1` (not descriptive)

## Wikilinks as Relationships

Hivemind automatically creates relationships from wikilinks:

```markdown
# John Smith

John works at [[Acme Corp]] and knows [[Jane Doe]].
```

This creates:
- `john-smith` → `member_of` → `acme-corp`
- `john-smith` → `knows` → `jane-doe`

No additional configuration needed — just keep using `[[wikilinks]]` naturally.

## Validating Migration

After adding frontmatter, validate your vault:

```bash
# Start Hivemind and check logs
npx @hiveforge/hivemind-mcp --vault /path/to/vault

# Look for:
# ✅ "Indexed X notes"
# ⚠️ "Skipped Y files (missing frontmatter)"
```

You can also use the `validate_consistency` MCP tool to check for issues.

## Common Issues

### "Expected string, received date"

YAML parses bare dates. Wrap in quotes:

```yaml
created: "2026-01-25"  # Correct
created: 2026-01-25    # May fail
```

### "Missing required field: type"

Every note needs a `type` field matching your template's entity types:

```yaml
type: character  # worldbuilding
type: paper      # research
type: person     # people-management
```

### "Unknown entity type"

The `type` must match your active template. Check available types:

**worldbuilding**: character, location, event, faction, lore, asset, reference
**research**: paper, citation, concept, note
**people-management**: person, goal, team, one_on_one

## Next Steps

1. **Choose a migration approach** (gradual recommended)
2. **Start with 5-10 important notes**
3. **Test with Hivemind**
4. **Expand to full vault**

See also:
- [Setup Guide](SETUP_GUIDE.md)
- [Sample Vaults](../samples/README.md)

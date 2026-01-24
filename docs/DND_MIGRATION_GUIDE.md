# Migrating DND-Wayward Watch to Hivemind

## Your Vault Stats

**Source**: `F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch`
- 📁 **119 markdown files** (great size for Hivemind!)
- 📋 Already organized into folders: People (49), Places (20), Organizations (7), Creatures (2), Events (2), Quests (2), Loot (3)
- ✅ Already uses `[[wikilinks]]` 
- ⚠️ Has some frontmatter with `tags:` but missing Hivemind fields (`id`, `type`, `status`)

---

## Option 1: Point Hivemind Directly at DND Vault (Easiest)

**Just use the DND vault directly** - no copying needed!

### Step 1: Update config.json
```json
{
  "vault": {
    "path": "F:\\Heimdall-Dropbox\\Obsidian Vaults\\DND-Wayward Watch\\DND Wayward Watch",
    "watchForChanges": true,
    "debounceMs": 100
  }
  ...
}
```

### Step 2: Add Frontmatter to Notes

Hivemind needs these fields. You can add them **gradually** (start with your most important notes):

**Before** (Organizations/Arcanum.md):
```markdown
---
tags:
  - Organization
  - Arcanum
  - Government
location:
---
# Arcanum
```

**After** (Organizations/Arcanum.md):
```markdown
---
id: faction-arcanum
type: faction
status: canon
title: Arcanum
tags:
  - Organization
  - Arcanum
  - Government
location: Aneria
created: "2026-01-24"
updated: "2026-01-24"
---
# Arcanum
```

### Mapping Table

| DND Folder | Hivemind Type | Example ID |
|------------|---------------|------------|
| People/ | `character` | `character-fred` |
| Places/ | `location` | `location-arkonis` |
| Organizations/ | `faction` | `faction-arcanum` |
| Creatures/ | `character` or `lore` | `creature-bounder` |
| Events/ | `event` | `event-fall-of-arcanum` |
| Quests/ | `event` or `lore` | `quest-find-artifact` |
| Loot/ | `asset` | `asset-magic-sword` |

### Step 3: Bulk Migration Script

I can create a PowerShell script to **automatically add frontmatter** to all notes based on folder:

```powershell
# This will:
# 1. Scan each folder
# 2. Add Hivemind frontmatter based on folder name
# 3. Keep existing tags/frontmatter
# 4. Generate IDs from filename
```

**Want me to create this script?**

---

## Option 2: Copy to Project-Victor (Keep Separate)

If you want Project-Victor to be its own thing but populated with DND content:

```powershell
# Copy structure
Copy-Item "F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch\*" `
  -Destination "F:\Heimdall-Dropbox\Documents\ObsidianVaults\Project-Victor\Project-Victor\" `
  -Recurse -Exclude ".obsidian","attachments","templates"

# Then add frontmatter to Project-Victor copy
```

---

## Option 3: Quick Test with Sample Notes

Test Hivemind with just a few DND notes first:

### 1. Create Test Folder
```bash
mkdir C:\Users\Preston\git\hivemind\dnd-test
```

### 2. Copy 3-5 Important Notes
- 1-2 characters (People folder)
- 1-2 locations (Places folder)  
- 1 organization (Organizations folder)

### 3. Add Frontmatter
Add `id`, `type`, `status` to each (see templates below)

### 4. Point Hivemind at Test Folder
```json
"path": "C:\\Users\\Preston\\git\\hivemind\\dnd-test"
```

---

## Frontmatter Templates for DND Notes

### Character (People folder)
```markdown
---
id: character-[name-lowercase]
type: character
status: canon
title: [Character Name]
race: [elf/human/dragonborn/etc]
class: [wizard/fighter/etc]
faction: [[Organization Name]]
location: [[Home Location]]
created: "2026-01-24"
updated: "2026-01-24"
tags:
  - character
  - [keep existing tags]
---
```

### Location (Places folder)
```markdown
---
id: location-[name-lowercase]
type: location
status: canon
title: [Location Name]
region: [Arkonis/Aneria/etc]
category: [city/dungeon/realm/etc]
created: "2026-01-24"
updated: "2026-01-24"
tags:
  - location
  - [keep existing tags]
---
```

### Faction (Organizations folder)
```markdown
---
id: faction-[name-lowercase]
type: faction
status: canon
title: [Faction Name]
leader: [[Leader Character]]
headquarters: [[Location]]
created: "2026-01-24"
updated: "2026-01-24"
tags:
  - faction
  - [keep existing tags]
---
```

### Creature (Creatures folder)
```markdown
---
id: creature-[name-lowercase]
type: lore
status: canon
title: [Creature Name]
category: monster
challenge_rating: [number]
created: "2026-01-24"
updated: "2026-01-24"
tags:
  - creature
  - [keep existing tags]
---
```

### Event (Events folder)
```markdown
---
id: event-[name-lowercase]
type: event
status: canon
title: [Event Name]
date: [in-game date]
location: [[Where It Happened]]
participants:
  - [[Character 1]]
  - [[Character 2]]
created: "2026-01-24"
updated: "2026-01-24"
tags:
  - event
  - [keep existing tags]
---
```

---

## Automatic Migration Script

I can create a PowerShell script that:

✅ Scans your DND vault folders  
✅ Detects existing frontmatter  
✅ Adds Hivemind fields (`id`, `type`, `status`) without removing existing data  
✅ Generates IDs from filenames  
✅ Maps folders to types automatically  
✅ Preserves all existing tags and content  
✅ Creates backup before modifying

**Example output**:
```
Processing People/Fred.md...
  ✓ Added id: character-fred
  ✓ Added type: character
  ✓ Added status: canon
  ✓ Preserved existing tags

Processing 119 files...
Done! 119 notes ready for Hivemind
```

---

## Recommendation

**Start with Option 1 + Migration Script**:

1. ✅ Point Hivemind directly at DND vault (no copying)
2. ✅ Run migration script to add frontmatter to all 119 notes
3. ✅ Restart Hivemind server
4. ✅ Ask Claude: "Tell me about the Arcanum" or "Who is in Arkonis?"

This keeps your DND vault as the source of truth and makes it AI-accessible!

---

## Next Steps - Choose Your Path

**A. Want the automatic migration script?**
- I'll create a PowerShell script that adds frontmatter to all 119 notes
- Safe: Creates backups first
- Smart: Preserves existing frontmatter/tags

**B. Want to manually test a few notes first?**
- I'll show you exactly which 3-5 notes to modify
- You add frontmatter by hand
- We test before migrating everything

**C. Want to use a test copy first?**
- I'll copy a few DND notes to a test folder
- Add frontmatter there
- Test without touching your real vault

**Which approach do you prefer?**

# Hivemind Vault Templates

Templates for creating consistent worldbuilding entities that integrate with the Hivemind MCP server.

## Using Templates

### Setup

1. Enable Templates plugin: **Settings > Core plugins > Templates**
2. Set template folder: **Settings > Templates > Template folder location** → `Templates`
3. Create new note in appropriate folder (Characters/, Locations/, etc.)
4. Insert template: **Ctrl/Cmd+P** → "Insert template" → Select template
5. Replace `{{placeholders}}` with actual values

### Template Placeholders

- `{{title}}` — Note title (auto-filled by Obsidian)
- `{{date:YYYY-MM-DD}}` — Current date
- Other placeholders should be manually replaced

## Entity Types

### Character

People, creatures, and NPCs in your world.

**Key fields:**
- `name` — Character's name
- `age`, `gender`, `race` — Basic demographics
- `appearance` — Physical description (nested: height, build, hair, eyes, clothing)
- `personality` — Traits and behavior (nested: traits, values, flaws)
- `relationships` — Connections to other characters

**File location:** `Characters/`

### Location

Places from continents to individual rooms.

**Key fields:**
- `name` — Location name
- `category` — Type: continent, region, settlement, building, landmark, room
- `hierarchy_level` — Same as category (for queries)
- `parent` — Containing location as wikilink: `"[[The North]]"`
- `children` — Contained locations as array: `["[[Winterfell]]", "[[White Harbor]]"]`
- `region` — Geographic region name

**Hierarchy example:**
```
Westeros (continent)
  └── The North (region)
        └── Winterfell (settlement)
              └── Great Hall (building)
```
All in flat `Locations/` folder, linked via frontmatter.

**File location:** `Locations/`

### Event

Historical events, story beats, and timeline entries.

**Key fields:**
- `name` — Event name
- `date` / `date_display` — When it occurred
- `date_start`, `date_end` — For events spanning time
- `event_type` — Category: battle, war, ceremony, discovery, political, natural
- `participants` — Characters involved (wikilink array)
- `locations` — Where it occurred (wikilink array)
- `factions` — Groups involved (wikilink array)
- `outcome` — Result of the event
- `consequences` — Long-term effects

**File location:** `Events/`

### Faction

Organizations, houses, guilds, and groups.

**Key fields:**
- `name` — Faction name
- `faction_type` — Category: house, guild, military, religious, political, criminal, other
- `leader` — Current leader (wikilink)
- `members` — Notable members (wikilink array)
- `headquarters` — Base of operations (wikilink)
- `founded` — When established
- `goals` — Faction objectives
- `allies`, `rivals` — Relationships with other factions

**File location:** `Factions/`

### Lore

World facts, mythology, magic systems, and background knowledge.

**Key fields:**
- `name` — Lore entry name
- `category` — Type: history, mythology, magic, culture, geography, science, religion
- `related_entities` — Connected entities (wikilink array)
- `source` — Knowledge origin: in-world, out-of-world, both

**File location:** `Lore/`

### Asset

AI-generated images with full provenance tracking. Critical for ComfyUI integration.

**Key fields:**
- `file_path` — Path to image file in vault
- `depicts` — Entities shown (wikilink array): `["[[Eddard Stark]]"]`
- `generator` — Tool used: ComfyUI, DALL-E, Midjourney, Stable Diffusion
- `workflow_id` — ComfyUI workflow reference (wikilink)
- `prompt` — Positive prompt used
- `negative_prompt` — Negative prompt used
- `model` — AI model/checkpoint: SDXL 1.0, flux-dev, etc.
- `seed` — Random seed for reproducibility
- `parameters` — Additional settings (nested: steps, cfg, sampler, scheduler)
- `generation_date` — When generated
- `approved_by` — Who approved for canon
- `approval_date` — When approved

**Asset example:**
```yaml
id: asset-eddard-portrait-001
type: asset
file_path: Assets/eddard-portrait-001.png
depicts: ["[[Eddard Stark]]"]
generator: ComfyUI
workflow_id: "[[character-portrait-v2]]"
prompt: "portrait of a noble northern lord, grey eyes, dark hair, fur cloak, stern expression"
negative_prompt: "cartoon, anime, low quality"
model: SDXL 1.0
seed: 42
parameters:
  steps: 30
  cfg: 7.5
  sampler: euler_ancestral
```

**File location:** `Assets/`

## Common Fields (All Types)

| Field | Description | Values |
|-------|-------------|--------|
| `id` | Unique identifier | Auto or manual |
| `type` | Entity type | character, location, event, faction, lore, asset |
| `status` | Workflow status | draft, pending, canon, non-canon, archived |
| `importance` | Narrative weight | major, minor, background |
| `world` | Setting/world name | Your world name |
| `canon_authority` | Trust level | high, medium, low |
| `tags` | Queryable tags | Array of strings |
| `aliases` | Alternative names | Array of strings |
| `created` | Creation date | YYYY-MM-DD |
| `updated` | Last modified | YYYY-MM-DD |

## Common Pitfalls

1. **Quote wikilinks in frontmatter:**
   ```yaml
   parent: "[[The North]]"     # Correct
   parent: [[The North]]       # Incorrect - YAML parsing error
   ```

2. **Use spaces, not tabs** for YAML indentation

3. **Nested objects require Source mode:**
   - `appearance`, `personality`, `relationships`, `parameters`
   - Obsidian Properties UI shows these as raw YAML

4. **Arrays use bracket syntax:**
   ```yaml
   tags: [tag1, tag2, tag3]
   # or
   tags:
     - tag1
     - tag2
   ```

5. **Dates as strings for custom formats:**
   ```yaml
   date_display: "282-283 AC"  # Quoted string for non-standard dates
   ```

## MCP Integration

These templates create entities that the Hivemind MCP server indexes automatically:

- **search_vault** — Find entities by text, type, or status
- **query_character** — Get character with relationships
- **query_location** — Get location with hierarchy
- **generate_image** — Use entity as ComfyUI context

The MCP server watches for file changes and updates its index in real-time.

# Phase 2: Vault Templates - Research

**Researched:** 2026-01-24
**Domain:** Obsidian vault templates, YAML frontmatter schema design, worldbuilding knowledge management
**Confidence:** MEDIUM-HIGH

## Summary

Vault templates for worldbuilding in Obsidian follow established patterns from the TTRPG and knowledge management communities. The standard approach uses YAML frontmatter for structured metadata, flat folder hierarchies with semantic linking rather than deep nesting, and Dataview-compatible field naming conventions.

Research focused on three key areas: (1) Obsidian-native frontmatter conventions and data types, (2) worldbuilding template patterns from TTRPG communities, and (3) hierarchical relationship modeling without folder nesting. The existing Hivemind codebase already implements Zod validation with graceful fallbacks, which aligns well with Obsidian's flexible YAML parsing.

Key findings indicate that successful vault templates balance structure (typed frontmatter fields for queryability) with flexibility (allowing undefined fields without breaking). The TTRPG worldbuilding community has converged on specific metadata patterns for characters, locations, events, and lore that work well with Dataview queries and knowledge graph visualization.

**Primary recommendation:** Use flat folder structure (one per entity type), express hierarchies through frontmatter relationships and wikilinks, design frontmatter schemas that are Dataview-queryable with strict typing for core fields and permissive handling of optional/custom fields.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| YAML | 1.2 spec | Frontmatter metadata format | Native Obsidian support, human-readable, widely parsed |
| gray-matter | 4.x | YAML frontmatter parsing | Industry standard for markdown+frontmatter, already in use |
| Zod | 3.x | Schema validation | Already implemented, provides runtime type safety with graceful fallback |
| Dataview | 0.5.x+ | Metadata querying (optional) | De facto standard for Obsidian power users, defines field naming conventions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| remark | 14.x+ | Markdown AST parsing | Already in use for heading/link extraction |
| date-fns | 2.x+ | Date formatting/parsing | If implementing timeline date normalization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| YAML frontmatter | TOML/JSON frontmatter | YAML is Obsidian native, more readable for nested data |
| Flat folders | Deep hierarchies | Community consensus: folders for type, not hierarchy; links for relationships |
| Inline Dataview fields | Pure frontmatter | Inline fields (Key:: Value) useful for per-paragraph metadata, but frontmatter better for entity-level |

**Installation:**
```bash
# Already installed in project
npm install gray-matter zod remark
```

## Architecture Patterns

### Recommended Vault Structure
```
vault-root/
├── Templates/              # Template files (*.md with placeholder frontmatter)
│   ├── Character.md
│   ├── Location.md
│   ├── Event.md
│   ├── Faction.md
│   ├── Lore.md
│   └── Asset.md
├── Characters/             # Character instances
├── Locations/              # Location instances (flat: all regions/cities/buildings together)
├── Events/                 # Timeline events
├── Factions/               # Organizations, houses, groups
├── Lore/                   # World facts, mythology, systems
├── Assets/                 # Generated images with metadata
└── README.md               # Vault documentation
```

**Key principles:**
- One folder per entity type (not per hierarchy level)
- No nested folders for hierarchical data (e.g., no Locations/Regions/Cities)
- Templates folder separate from content
- Use tags and frontmatter for categorization, not folder depth

### Pattern 1: YAML Frontmatter Schema Design

**What:** Define typed, queryable metadata fields in YAML frontmatter at the top of each markdown file.

**When to use:** For all entity types that need to be indexed, queried, or displayed in structured views.

**Example:**
```yaml
---
# Core fields (required for all entity types)
id: character-eddard-stark          # Unique identifier
type: character                      # Entity type (character|location|event|faction|lore|asset)
status: canon                        # Workflow status (draft|pending|canon|non-canon|archived)
title: Eddard Stark                  # Display title (optional, fallback to filename)
world: Westeros                      # World/setting name (for multi-world vaults)
importance: major                    # Importance tier (major|minor|background)
tags: [stark, north, lord]           # Queryable tags
aliases: [Ned, The Quiet Wolf]       # Alternative names for linking
created: 2026-01-24                  # ISO 8601 date
updated: 2026-01-24                  # ISO 8601 date
canon_authority: high                # Authority level (high|medium|low)

# Entity-specific fields (character example)
name: Eddard Stark                   # Full name
age: 35                              # Number type
gender: male                         # Text
race: human                          # Text
relationships:                       # List of objects (YAML nested structure)
  - type: spouse
    target: "[[Catelyn Stark]]"
    status: alive
  - type: child
    target: "[[Robb Stark]]"
    status: alive
assets:                              # List of asset references
  - "[[eddard-stark-portrait-001]]"
---
```

**Source:** Dataview documentation, Obsidian TTRPG community patterns

### Pattern 2: Hierarchical Relationships via Frontmatter

**What:** Express hierarchies (region > city > building) through frontmatter fields and wikilinks, not folder structure.

**When to use:** For locations with geographic hierarchy, factions with org structure, or any parent-child relationships.

**Example:**
```yaml
---
id: location-winterfell
type: location
name: Winterfell
category: castle                     # Category/subcategory for filtering
parent: "[[The North]]"              # Parent location (wikilink)
region: The North                    # Top-level region (text for queries)
hierarchy_level: settlement          # continent|region|settlement|building|room
children:                            # Child locations
  - "[[Great Hall of Winterfell]]"
  - "[[Godswood of Winterfell]]"
connections:                         # Related locations (non-hierarchical)
  - type: trade_route
    target: "[[White Harbor]]"
    distance: 200 leagues
---
```

**Key insight:**
- `parent` field creates upward hierarchy (queryable for "all locations in The North")
- `children` field enables downward navigation (auto-populated via Dataview or manual)
- `region` field allows flat querying without traversing tree
- Folder structure stays flat: all locations in `Locations/` folder

### Pattern 3: Timeline Event Metadata

**What:** Structured metadata for events that anchor to specific dates/periods and reference multiple entities.

**When to use:** For historical events, campaign sessions, story beats that connect characters/locations/factions.

**Example:**
```yaml
---
id: event-roberts-rebellion
type: event
status: canon
title: Robert's Rebellion
date: 283 AC                         # In-world date format
date_start: 282 AC                   # For multi-year events
date_end: 283 AC
date_display: "282-283 AC"           # Human-readable
tags: [rebellion, war, stark]
participants:                        # Entities involved
  - "[[Eddard Stark]]"
  - "[[Robert Baratheon]]"
  - "[[Aerys Targaryen]]"
locations:                           # Where it happened
  - "[[Trident]]"
  - "[[King's Landing]]"
outcome: Targaryen dynasty overthrown
importance: major
timeline: "[[Westeros Timeline]]"    # Reference to parent timeline
---
```

**Key insight:**
- Multiple date fields support different use cases (sorting, display, ranges)
- Entity references via wikilinks enable bidirectional linking
- `timeline` field groups events into sequences

### Pattern 4: Template File Structure

**What:** Template markdown files with placeholder frontmatter and documentation comments.

**When to use:** Provide to users for creating new entities with consistent structure.

**Example:**
```markdown
---
id: {{id}}                           # Generate from filename or manual entry
type: character                      # Fixed per template
status: draft                        # Default to draft
title: {{title}}                     # Prompt user
name: {{name}}                       # Entity-specific fields
age:
gender:
race:
tags: []
aliases: []
created: {{date:YYYY-MM-DD}}         # Auto-generated
updated: {{date:YYYY-MM-DD}}
---

# {{title}}

## Overview
Brief description of the character.

## Appearance
Physical description.

## Personality
Character traits, motivations, flaws.

## Background
History and backstory.

## Relationships
- **[[Related Character]]**: Description of relationship

## Notes
Additional worldbuilding notes.
```

**Note:** Obsidian's native Templates plugin uses `{{date}}` placeholders. Templater plugin (community) supports more complex logic. Templates should work with core plugin.

### Anti-Patterns to Avoid

- **Deep folder nesting for hierarchy:** Don't create `Locations/Continents/Regions/Cities/` structure. Use flat folders with frontmatter relationships.
- **Obsidian Properties nested YAML:** Obsidian's Properties UI doesn't support nested YAML well. Keep one level deep for UI compatibility, or accept that nested fields won't render in Properties panel.
- **Tab indentation in YAML:** YAML spec requires spaces, not tabs. Tab indentation causes parse errors.
- **Unquoted wikilinks in frontmatter:** `parent: [[The North]]` is invalid YAML. Must quote: `parent: "[[The North]]"` or use plain text: `parent_name: The North`.
- **Over-engineering schemas:** Don't create 50 required fields. Start minimal (id, type, status, title), add optional fields as needed.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom parser | gray-matter (already in use) | Handles edge cases, frontmatter/content separation, multiple formats |
| Date validation | Regex checks | Zod's date coercion or date-fns | ISO 8601 parsing is complex, timezone edge cases |
| ID generation | String manipulation | Slugify library or sanitize-filename | Handles special chars, unicode, collisions |
| Wikilink extraction | Custom regex | Existing remark plugin or current regex | Obsidian has variations ([[Link]], [[Link\|Alias]], [[Link#Heading]]) |
| Schema validation | Manual type checks | Zod (already in use) | Runtime validation, graceful fallback, type inference |
| Nested object flattening | Recursive traversal | Lodash get/set or explicit schema | Dot notation access is error-prone |

**Key insight:** The existing codebase already avoids most hand-rolling with gray-matter, remark, and Zod. Maintain this pattern for new entity types.

## Common Pitfalls

### Pitfall 1: YAML Frontmatter Parse Errors
**What goes wrong:** Templates contain invalid YAML that breaks parsing, causing notes to be unindexed.

**Why it happens:**
- Tab indentation instead of spaces
- Unquoted strings with special characters (colons, brackets)
- Incorrect list/object nesting
- Missing closing quotes or brackets

**How to avoid:**
- Validate templates with YAML linter before distribution
- Document "quotes required" for wikilinks and special chars
- Zod schema with `.catch()` provides graceful fallback for invalid frontmatter
- Log parse errors but don't fail indexing (existing approach is good)

**Warning signs:**
- Template generates notes that don't appear in search
- Properties panel shows "Invalid frontmatter" warning
- Zod validation errors in server logs

### Pitfall 2: Hierarchical Location Confusion
**What goes wrong:** Users create `Locations/Regions/Cities/Buildings/` folders expecting hierarchy, but queries fail and organization becomes unmaintainable.

**Why it happens:** Natural impulse to mirror real-world structure in filesystem, unfamiliarity with link-based organization.

**How to avoid:**
- Documentation explicitly shows flat folder + frontmatter pattern
- Template includes `parent`, `region`, `hierarchy_level` fields
- Example vault demonstrates The North region with multiple settlements in same folder
- Provide Dataview query examples for "all locations in region"

**Warning signs:**
- User creates nested Location subfolders
- Links between locations break due to relative paths
- Queries need complex path filters

### Pitfall 3: Obsidian Properties vs. Nested YAML
**What goes wrong:** Templates use nested YAML objects (valid YAML) but Obsidian's Properties UI doesn't render them, causing user confusion.

**Why it happens:** YAML spec allows nesting, but Obsidian Properties feature (introduced ~2023) only supports flat key-value pairs.

**How to avoid:**
- Document which fields work in Properties UI vs. require Source mode editing
- Use flat structure for user-editable fields (name, status, tags)
- Reserve nested structures for programmatic fields (relationships array)
- Consider inline Dataview fields for deeply nested data if needed

**Warning signs:**
- Users report "fields not showing up" in Properties panel
- Complex objects render as `[object Object]` in UI

### Pitfall 4: Date Format Inconsistency
**What goes wrong:** Mix of date formats (YYYY-MM-DD, MM/DD/YYYY, prose dates) breaks timeline queries and sorting.

**Why it happens:** Users manually edit templates, copy from other systems, or use natural language dates.

**How to avoid:**
- Templates show ISO 8601 format with example: `created: 2026-01-24`
- Documentation explains format importance for querying
- Zod schema coerces to Date type with format validation
- For in-world dates (e.g., "283 AC"), use separate `date_display` field for prose, `date` for sortable value

**Warning signs:**
- Timeline views show events in wrong order
- Date-based queries return partial results
- Validation errors on date fields

### Pitfall 5: Template Placeholder Syntax Confusion
**What goes wrong:** Users don't replace `{{placeholders}}` or templates use syntax incompatible with Obsidian's Templates plugin.

**Why it happens:** Different template systems (Templater plugin, core Templates plugin, external generators) use different placeholder syntax.

**How to avoid:**
- Document which template plugin/system templates target
- Use Obsidian core Templates plugin syntax for compatibility (limited but universally available)
- For advanced features, note "Requires Templater plugin" in docs
- Provide both filled example AND blank template versions

**Warning signs:**
- New notes have literal `{{id}}` text in frontmatter
- Template file appears in queries (should be excluded)

## Code Examples

Verified patterns from official sources and existing codebase:

### Character Template (Full Schema)
```yaml
---
id: character-{{name-slug}}
type: character
status: draft
title: {{Character Full Name}}
world: {{World Name}}
importance: minor
tags: []
aliases: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: medium

# Character-specific fields
name: {{Character Full Name}}
age:
gender:
race:
appearance:
  height:
  build:
  hair:
  eyes:
  distinctive_features:
personality:
  traits: []
  motivations: []
  flaws: []
relationships:
  - type:
    target: "[[Related Character]]"
    status:
background:
  birthplace: "[[Location]]"
  occupation:
  affiliations: []
assets: []
---

# {{Character Full Name}}

## Overview


## Appearance


## Personality


## Background


## Relationships


## Notes

```

**Source:** Existing `src/types/index.ts` CharacterFrontmatterSchema + TTRPG community patterns

### Location Template (Hierarchical)
```yaml
---
id: location-{{name-slug}}
type: location
status: draft
title: {{Location Name}}
world: {{World Name}}
importance: minor
tags: []
aliases: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: medium

# Location-specific fields
name: {{Location Name}}
category: settlement
parent: "[[Parent Region/Location]]"
region: {{Top-Level Region}}
hierarchy_level: settlement
climate:
terrain: []
population:
  size:
  demographics: []
government:
  type:
  ruler: "[[Character]]"
economy:
  primary_industries: []
  trade_connections: []
inhabitants: []
connections:
  - type:
    target: "[[Related Location]]"
    distance:
children: []
assets: []
---

# {{Location Name}}

## Overview


## Geography


## Demographics


## History


## Notable Features


## Connections


## Notes

```

**Source:** Existing LocationFrontmatterSchema + PhD20.com atlas organization pattern

### Event Template (Timeline)
```yaml
---
id: event-{{name-slug}}
type: event
status: draft
title: {{Event Name}}
world: {{World Name}}
importance: minor
tags: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: medium

# Event-specific fields
name: {{Event Name}}
date: {{YYYY-MM-DD or In-World Date}}
date_start:
date_end:
date_display:
event_type:
participants: []
locations: []
factions: []
outcome:
consequences: []
timeline: "[[Timeline Name]]"
previous_event: "[[Previous Event]]"
next_event: "[[Next Event]]"
---

# {{Event Name}}

## Summary


## Participants


## Timeline


## Outcome


## Long-term Impact


## Notes

```

**Source:** Markwhen timeline patterns + TTRPG worldbuilding conventions

### Lore Template (World Facts)
```yaml
---
id: lore-{{name-slug}}
type: lore
status: draft
title: {{Lore Entry Name}}
world: {{World Name}}
importance: minor
tags: []
aliases: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: medium

# Lore-specific fields
name: {{Lore Entry Name}}
category: mythology
related_entities: []
source: in-world
---

# {{Lore Entry Name}}

## Description


## In-World Knowledge


## Out-of-World Notes


## Related Entries

```

**Source:** Human Knowledge Markdown patterns + worldbuilding vault conventions

### Asset Template (Generated Images)
```yaml
---
id: asset-{{slug}}
type: asset
status: draft
title: {{Asset Description}}
world: {{World Name}}
tags: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: pending

# Asset-specific fields
asset_type: image
file_path: Assets/{{filename}}
file_format: png
depicts: []
generation_date: {{date:YYYY-MM-DD}}
generator: ComfyUI
workflow_id: "[[Workflow Name]]"
prompt:
negative_prompt:
model:
seed:
parameters: {}
approved_by:
approval_date:
---

# {{Asset Description}}

![[{{filename}}]]

## Generation Details

**Prompt:** {{prompt}}

**Model:** {{model}}
**Seed:** {{seed}}

## Usage

This asset depicts: {{comma-separated entities}}

## Approval Status

- Status: {{draft|pending|approved}}
- Canon authority: {{low|medium|high}}
```

**Source:** PROJECT.md asset management requirements + ComfyUI metadata patterns

### Faction Template
```yaml
---
id: faction-{{name-slug}}
type: faction
status: draft
title: {{Faction Name}}
world: {{World Name}}
importance: minor
tags: []
aliases: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: medium

# Faction-specific fields
name: {{Faction Name}}
faction_type: organization
leader: "[[Character]]"
members: []
headquarters: "[[Location]]"
founded:
goals: []
resources: []
allies: []
rivals: []
---

# {{Faction Name}}

## Overview


## Leadership


## Goals and Motivations


## History


## Relationships


## Notes

```

**Source:** TTRPG faction management patterns

### Zod Schema Extension Pattern (from existing codebase)
```typescript
// Source: src/types/index.ts (existing pattern to extend)

// Event frontmatter schema (NEW)
export const EventFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('event'),
  name: z.string(),
  date: z.string().optional(),  // Flexible: ISO or in-world format
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  date_display: z.string().optional(),
  event_type: z.string().optional(),
  participants: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  factions: z.array(z.string()).optional(),
  outcome: z.string().optional(),
  consequences: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  previous_event: z.string().optional(),
  next_event: z.string().optional(),
});

export type EventFrontmatter = z.infer<typeof EventFrontmatterSchema>;

// Lore frontmatter schema (NEW)
export const LoreFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('lore'),
  name: z.string(),
  category: z.enum(['mythology', 'history', 'magic', 'technology', 'culture', 'religion', 'other']).optional(),
  related_entities: z.array(z.string()).optional(),
  source: z.enum(['in-world', 'meta', 'player-knowledge']).optional(),
});

export type LoreFrontmatter = z.infer<typeof LoreFrontmatterSchema>;

// Asset frontmatter schema (NEW)
export const AssetFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('asset'),
  asset_type: z.enum(['image', 'audio', 'video', 'document']).default('image'),
  file_path: z.string(),
  file_format: z.string().optional(),
  depicts: z.array(z.string()).optional(),
  generation_date: z.string().optional(),
  generator: z.string().optional(),
  workflow_id: z.string().optional(),
  prompt: z.string().optional(),
  negative_prompt: z.string().optional(),
  model: z.string().optional(),
  seed: z.number().optional(),
  parameters: z.record(z.any()).optional(),
  approved_by: z.string().optional(),
  approval_date: z.string().optional(),
});

export type AssetFrontmatter = z.infer<typeof AssetFrontmatterSchema>;

// Faction frontmatter schema (NEW)
export const FactionFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('faction'),
  name: z.string(),
  faction_type: z.enum(['house', 'guild', 'organization', 'government', 'military', 'religion', 'other']).optional(),
  leader: z.string().optional(),
  members: z.array(z.string()).optional(),
  headquarters: z.string().optional(),
  founded: z.string().optional(),
  goals: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
  allies: z.array(z.string()).optional(),
  rivals: z.array(z.string()).optional(),
});

export type FactionFrontmatter = z.infer<typeof FactionFrontmatterSchema>;
```

**Source:** Existing src/types/index.ts pattern

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deep folder hierarchies | Flat folders + frontmatter links | ~2020-2022 | Obsidian graph view and search made hierarchical folders obsolete |
| Custom metadata formats | YAML frontmatter standard | ~2018 | Jekyll/Hugo standardized, Obsidian adopted |
| Dataview inline fields only | Frontmatter + selective inline | ~2021 | Properties UI (2023) favors frontmatter for entity-level metadata |
| Manual cross-referencing | Automatic backlinks + graph | Obsidian 0.6+ | Wikilinks become primary relationship mechanism |
| Plugin-specific schemas | Zod/JSON Schema validation | ~2022+ | Runtime type safety for MCP/API contexts |

**Deprecated/outdated:**
- **Nested folder hierarchies:** Community converged on flat structure by 2022 (sources: PhD20, Obsidian TTRPG Tutorials)
- **Admonitions for infoboxes:** CSS-based infoboxes more flexible (source: witchka/Obsidian-Worldbuilding-Templates)
- **Hardcoded template paths:** Obsidian Templates plugin now supports configurable path (source: Obsidian help docs)

## Open Questions

Things that couldn't be fully resolved:

1. **Template Distribution Format**
   - What we know: Templates should be markdown files in Templates/ folder
   - What's unclear: Best way to distribute (Git repo? Obsidian vault template? Zip file?)
   - Recommendation: Provide both (1) sample-vault with filled examples, (2) vault-template with blank templates. Let users copy Templates/ folder or clone vault.

2. **In-World Date Formats**
   - What we know: ISO 8601 for sortable queries, custom formats for display
   - What's unclear: Should Hivemind parse/normalize in-world dates (e.g., "283 AC" → sortable number)?
   - Recommendation: Phase 2 keeps dates as strings. Future phase can add date normalization if needed. Use `date_display` for prose, `date` for sortable values.

3. **Template Placeholder Syntax**
   - What we know: Obsidian core Templates plugin has limited placeholders, Templater plugin more powerful
   - What's unclear: Require Templater or stay compatible with core?
   - Recommendation: Ship templates compatible with core plugin ({{date}}, {{title}} only). Document "enhanced templates require Templater" for advanced users.

4. **Nested YAML in Properties UI**
   - What we know: Obsidian Properties panel doesn't render nested YAML, but it's valid YAML
   - What's unclear: Will Obsidian add nested object support in future?
   - Recommendation: Use nested structures sparingly (relationships, parameters). Document that these require Source mode editing. Majority of fields should be flat for UI compatibility.

5. **Asset File Naming Conventions**
   - What we know: Assets should reference original files, track generation metadata
   - What's unclear: Naming convention for generated assets (timestamp? hash? sequential?)
   - Recommendation: Use descriptive slugs + timestamp: `eddard-stark-portrait-20260124.png`. Asset note filename matches: `eddard-stark-portrait-20260124.md`.

## Sources

### Primary (HIGH confidence)
- [Dataview: Adding Metadata](https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/) - YAML frontmatter and inline field syntax
- [Dataview: Data Types](https://blacksmithgu.github.io/obsidian-dataview/annotation/types-of-metadata/) - Supported data types (Text, Number, Date, List, Object, Link)
- Existing codebase: `src/types/index.ts`, `src/parser/markdown.ts` - Zod schemas and gray-matter parsing
- [PhD20: Organizing D&D Atlas](https://phd20.com/blog/organizing-obsidian-dnd-atlas/) - Flat folder structure for hierarchical locations

### Secondary (MEDIUM confidence)
- [Obsidian TTRPG Tutorials: Basic World Building Templates](https://obsidianttrpgtutorials.com/Obsidian+TTRPG+Tutorials/Templates/Basic+World+Building+Templates) - Template structure patterns (content not fully accessible, but referenced widely)
- [Worldbuilding Vault Template](https://disgraceland.io/worldbuild/) - Character, Faction, Territory templates with overview fields and dynamic associations
- [Human Knowledge Markdown](https://github.com/digitalreplica/human-knowledge-markdown) - YAML frontmatter for knowledge graphs, entity relationships, AI-friendly design
- [Obsidian Forum: Organizing Vault Assets](https://forum.obsidian.md/t/what-is-a-good-structure-for-assets-or-a-clean-structure-for-a-workspace-vault-in-general/75929) - Asset folder organization patterns
- [Obsidian Forum: YAML Frontmatter Common Mistakes](https://forum.obsidian.md/t/invalid-frontmatter-yaml-when-using-tabs/38883) - Tab vs. space indentation pitfall
- [Medium: Use YAML Front Matter Correctly in Obsidian](https://amyjuanli.medium.com/use-yaml-front-matter-correctly-in-obsidian-550e4fa46a4a) - YAML syntax best practices

### Tertiary (LOW confidence - community patterns, not verified with official docs)
- WebSearch results on Obsidian worldbuilding 2026 - General community practices
- WebSearch results on hierarchical location structures - Anti-pattern consensus (flat folders preferred)
- YAML frontmatter schema design 2026 - General markdown ecosystem patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified with Dataview docs and existing codebase
- Architecture: MEDIUM-HIGH - Patterns verified with PhD20 and Dataview docs, template content inferred from community consensus
- Pitfalls: MEDIUM - Verified with forum posts and YAML spec, some based on general YAML/Obsidian knowledge
- Code examples: HIGH - Character/Location schemas from existing codebase, Event/Lore/Asset/Faction extrapolated following same Zod pattern
- Hierarchical locations: MEDIUM - Verified with PhD20 blog, aligns with community consensus

**Research date:** 2026-01-24
**Valid until:** ~30 days (stable domain, but Obsidian updates ~monthly, Dataview stable)

**Notes:**
- Official Obsidian docs for Templates and Properties didn't load via WebFetch (dynamic content). Relied on Dataview docs (accessible) and community patterns (medium confidence).
- Template content examples are synthesis of existing codebase + TTRPG community patterns. Specific field choices may need user feedback.
- Nested YAML objects work in Hivemind (gray-matter parses them) but users may be confused by Properties UI limitations. Document this clearly.

/**
 * Built-in worldbuilding template.
 *
 * Defines entity types for worldbuilding projects:
 * - character: NPCs, player characters, historical figures
 * - location: Places, regions, buildings, rooms
 * - event: Historical events, current events, plot points
 * - faction: Organizations, governments, guilds, houses
 * - lore: Mythology, magic systems, cultural knowledge
 * - asset: Visual and media assets (images, audio, video)
 */

import type { TemplateDefinition } from '../types.js';

/**
 * Worldbuilding template definition.
 *
 * Matches the existing hardcoded schemas in src/types/index.ts to ensure
 * backwards compatibility with existing vaults.
 */
export const worldbuildingTemplate: TemplateDefinition = {
  id: 'worldbuilding',
  name: 'Worldbuilding',
  version: '1.0.0',
  description: 'Template for fictional world creation with characters, locations, events, factions, lore, and assets',

  // Discovery metadata
  category: 'creative',
  tags: ['fiction', 'worldbuilding', 'rpg', 'games', 'writing', 'storytelling'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  repository: 'https://github.com/hiveforge-sh/hivemind',
  sampleVault: 'samples/worldbuilding',
  license: 'MIT',

  // Folder-to-type mappings for auto-detection
  folderMappings: [
    // Character mappings
    { folder: '**/Characters/**', types: ['character'] },
    { folder: '**/People/**', types: ['character'] },
    { folder: '**/NPCs/**', types: ['character'] },
    { folder: '**/PCs/**', types: ['character'] },
    { folder: '**/Cast/**', types: ['character'] },
    // Location mappings
    { folder: '**/Locations/**', types: ['location'] },
    { folder: '**/Places/**', types: ['location'] },
    { folder: '**/Geography/**', types: ['location'] },
    { folder: '**/World/**', types: ['location'] },
    { folder: '**/Regions/**', types: ['location'] },
    { folder: '**/Cities/**', types: ['location'] },
    { folder: '**/Towns/**', types: ['location'] },
    // Event mappings
    { folder: '**/Events/**', types: ['event'] },
    { folder: '**/Timeline/**', types: ['event'] },
    { folder: '**/History/**', types: ['event'] },
    // Session mappings (raw play notes, recaps, campaign logs)
    { folder: '**/Sessions/**', types: ['session'] },
    { folder: '**/Session Notes/**', types: ['session'] },
    { folder: '**/Campaign Logs/**', types: ['session'] },
    { folder: '**/Play Logs/**', types: ['session'] },
    // Faction mappings
    { folder: '**/Factions/**', types: ['faction'] },
    { folder: '**/Organizations/**', types: ['faction'] },
    { folder: '**/Groups/**', types: ['faction'] },
    { folder: '**/Guilds/**', types: ['faction'] },
    { folder: '**/Houses/**', types: ['faction'] },
    // Item mappings (items, loot, artifacts are synonymous)
    { folder: '**/Items/**', types: ['item'] },
    { folder: '**/Loot/**', types: ['item'] },
    { folder: '**/Artifacts/**', types: ['item'] },
    { folder: '**/Equipment/**', types: ['item'] },
    { folder: '**/Treasure/**', types: ['item'] },
    // Lore mappings
    { folder: '**/Lore/**', types: ['lore'] },
    { folder: '**/Mythology/**', types: ['lore'] },
    { folder: '**/Magic/**', types: ['lore'] },
    { folder: '**/Culture/**', types: ['lore'] },
    { folder: '**/Religion/**', types: ['lore'] },
    // Quest mappings
    { folder: '**/Quests/**', types: ['quest'] },
    { folder: '**/Missions/**', types: ['quest'] },
    { folder: '**/Adventures/**', types: ['quest'] },
    { folder: '**/Objectives/**', types: ['quest'] },
    // Creature mappings (monsters, beasts, animals - distinct from characters)
    { folder: '**/Creatures/**', types: ['creature'] },
    { folder: '**/Monsters/**', types: ['creature'] },
    { folder: '**/Bestiary/**', types: ['creature'] },
    { folder: '**/Beasts/**', types: ['creature'] },
    { folder: '**/Animals/**', types: ['creature'] },
    // Asset mappings
    { folder: '**/Assets/**', types: ['asset'] },
    { folder: '**/Images/**', types: ['asset'] },
    { folder: '**/Media/**', types: ['asset'] },
    // Reference mappings
    { folder: '**/References/**', types: ['reference'] },
    { folder: '**/Sources/**', types: ['reference'] },
    { folder: '**/Inspiration/**', types: ['reference'] },
    { folder: '**/Notes/**', types: ['reference'] },
    { folder: '**/Meta/**', types: ['reference'] },
  ],

  // Relationship type definitions for the knowledge graph
  relationshipTypes: [
    // Character relationships
    {
      id: 'knows',
      displayName: 'Knows',
      description: 'Characters who know each other',
      sourceTypes: ['character'],
      targetTypes: ['character'],
      bidirectional: true,
      reverseId: 'knows',
    },
    {
      id: 'located_in',
      displayName: 'Located In',
      description: 'Character is located in or associated with a location',
      sourceTypes: ['character'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'has_inhabitant',
    },
    {
      id: 'has_inhabitant',
      displayName: 'Has Inhabitant',
      description: 'Location has an inhabitant character',
      sourceTypes: ['location'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Faction relationships
    {
      id: 'member_of',
      displayName: 'Member Of',
      description: 'Character is a member of a faction',
      sourceTypes: ['character'],
      targetTypes: ['faction'],
      bidirectional: true,
      reverseId: 'has_member',
    },
    {
      id: 'has_member',
      displayName: 'Has Member',
      description: 'Faction has a member character',
      sourceTypes: ['faction'],
      targetTypes: ['character'],
      bidirectional: false,
    },
    {
      id: 'allied_with',
      displayName: 'Allied With',
      description: 'Factions that are allied',
      sourceTypes: ['faction'],
      targetTypes: ['faction'],
      bidirectional: true,
      reverseId: 'allied_with',
    },
    {
      id: 'rivals_with',
      displayName: 'Rivals With',
      description: 'Factions that are rivals or enemies',
      sourceTypes: ['faction'],
      targetTypes: ['faction'],
      bidirectional: true,
      reverseId: 'rivals_with',
    },

    // Location relationships
    {
      id: 'connected_to',
      displayName: 'Connected To',
      description: 'Locations that are connected or adjacent',
      sourceTypes: ['location'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'connected_to',
    },
    {
      id: 'contains',
      displayName: 'Contains',
      description: 'Location contains another location (parent-child hierarchy)',
      sourceTypes: ['location'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'contained_in',
    },
    {
      id: 'contained_in',
      displayName: 'Contained In',
      description: 'Location is contained within another location',
      sourceTypes: ['location'],
      targetTypes: ['location'],
      bidirectional: false,
    },

    // Event relationships
    {
      id: 'participated_in',
      displayName: 'Participated In',
      description: 'Character participated in an event',
      sourceTypes: ['character'],
      targetTypes: ['event'],
      bidirectional: true,
      reverseId: 'has_participant',
    },
    {
      id: 'has_participant',
      displayName: 'Has Participant',
      description: 'Event has a participant character',
      sourceTypes: ['event'],
      targetTypes: ['character'],
      bidirectional: false,
    },
    {
      id: 'occurred_at',
      displayName: 'Occurred At',
      description: 'Event occurred at a location',
      sourceTypes: ['event'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'hosted_event',
    },
    {
      id: 'hosted_event',
      displayName: 'Hosted Event',
      description: 'Location hosted an event',
      sourceTypes: ['location'],
      targetTypes: ['event'],
      bidirectional: false,
    },

    // Quest relationships
    {
      id: 'assigned_quest',
      displayName: 'Assigned Quest',
      description: 'Character is assigned to a quest',
      sourceTypes: ['character'],
      targetTypes: ['quest'],
      bidirectional: true,
      reverseId: 'assigned_to',
    },
    {
      id: 'assigned_to',
      displayName: 'Assigned To',
      description: 'Quest is assigned to a character',
      sourceTypes: ['quest'],
      targetTypes: ['character'],
      bidirectional: false,
    },
    {
      id: 'quest_location',
      displayName: 'Quest Location',
      description: 'Quest takes place at location',
      sourceTypes: ['quest'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'has_quest',
    },
    {
      id: 'has_quest',
      displayName: 'Has Quest',
      description: 'Location has an active quest',
      sourceTypes: ['location'],
      targetTypes: ['quest'],
      bidirectional: false,
    },

    // Creature relationships
    {
      id: 'inhabits',
      displayName: 'Inhabits',
      description: 'Creature inhabits a location',
      sourceTypes: ['creature'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'has_creature',
    },
    {
      id: 'has_creature',
      displayName: 'Has Creature',
      description: 'Location has creatures',
      sourceTypes: ['location'],
      targetTypes: ['creature'],
      bidirectional: false,
    },
    {
      id: 'drops',
      displayName: 'Drops',
      description: 'Creature drops an item',
      sourceTypes: ['creature'],
      targetTypes: ['item'],
      bidirectional: true,
      reverseId: 'dropped_by',
    },
    {
      id: 'dropped_by',
      displayName: 'Dropped By',
      description: 'Item is dropped by creature',
      sourceTypes: ['item'],
      targetTypes: ['creature'],
      bidirectional: false,
    },

    // Item relationships
    {
      id: 'owns',
      displayName: 'Owns',
      description: 'Character owns an item',
      sourceTypes: ['character'],
      targetTypes: ['item'],
      bidirectional: true,
      reverseId: 'owned_by',
    },
    {
      id: 'owned_by',
      displayName: 'Owned By',
      description: 'Item is owned by a character',
      sourceTypes: ['item'],
      targetTypes: ['character'],
      bidirectional: false,
    },
    {
      id: 'stored_at',
      displayName: 'Stored At',
      description: 'Item is stored at a location',
      sourceTypes: ['item'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'stores',
    },
    {
      id: 'stores',
      displayName: 'Stores',
      description: 'Location stores an item',
      sourceTypes: ['location'],
      targetTypes: ['item'],
      bidirectional: false,
    },

    // Generic fallback relationship
    {
      id: 'related',
      displayName: 'Related',
      description: 'Generic relationship between any entities',
      sourceTypes: 'any',
      targetTypes: 'any',
      bidirectional: true,
      reverseId: 'related',
    },
  ],

  entityTypes: [
    // Character entity type
    {
      name: 'character',
      displayName: 'Character',
      pluralName: 'Characters',
      description: 'NPCs, player characters, and historical figures',
      icon: 'user',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Character name',
        },
        {
          name: 'age',
          type: 'number',
          description: 'Character age in years',
        },
        {
          name: 'gender',
          type: 'string',
          description: 'Character gender',
        },
        {
          name: 'race',
          type: 'string',
          description: 'Character species or race',
        },
        {
          name: 'appearance',
          type: 'record',
          description: 'Physical appearance details',
        },
        {
          name: 'personality',
          type: 'record',
          description: 'Personality traits and characteristics',
        },
        {
          name: 'background',
          type: 'record',
          description: 'Character background and history',
        },
        {
          name: 'relationships',
          type: 'array',
          arrayItemType: 'record',
          description: 'Relationships with other characters',
        },
        {
          name: 'assets',
          type: 'array',
          arrayItemType: 'string',
          description: 'Asset IDs depicting this character',
        },
      ],
    },

    // Location entity type
    {
      name: 'location',
      displayName: 'Location',
      pluralName: 'Locations',
      description: 'Places, regions, buildings, and rooms',
      icon: 'map-pin',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Location name',
        },
        {
          name: 'region',
          type: 'string',
          description: 'Geographic region',
        },
        {
          name: 'category',
          type: 'string',
          description: 'Location category or type',
        },
        {
          name: 'parent',
          type: 'string',
          description: 'Parent location in hierarchy',
        },
        {
          name: 'hierarchy_level',
          type: 'enum',
          enumValues: ['continent', 'region', 'settlement', 'building', 'room'],
          description: 'Level in location hierarchy',
        },
        {
          name: 'children',
          type: 'array',
          arrayItemType: 'string',
          description: 'Child locations in hierarchy',
        },
        {
          name: 'climate',
          type: 'string',
          description: 'Climate type',
        },
        {
          name: 'terrain',
          type: 'array',
          arrayItemType: 'string',
          description: 'Terrain types present',
        },
        {
          name: 'inhabitants',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character IDs of inhabitants',
        },
        {
          name: 'connections',
          type: 'array',
          arrayItemType: 'record',
          description: 'Connections to other locations',
        },
        {
          name: 'assets',
          type: 'array',
          arrayItemType: 'string',
          description: 'Asset IDs depicting this location',
        },
      ],
    },

    // Event entity type
    {
      name: 'event',
      displayName: 'Event',
      pluralName: 'Events',
      description: 'Historical events, current events, and plot points',
      icon: 'calendar',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Event name',
        },
        {
          name: 'date',
          type: 'string',
          description: 'Event date',
        },
        {
          name: 'date_start',
          type: 'string',
          description: 'Event start date (for multi-day events)',
        },
        {
          name: 'date_end',
          type: 'string',
          description: 'Event end date (for multi-day events)',
        },
        {
          name: 'date_display',
          type: 'string',
          description: 'Human-readable date display',
        },
        {
          name: 'event_type',
          type: 'string',
          description: 'Type of event',
        },
        {
          name: 'participants',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character IDs of participants',
        },
        {
          name: 'locations',
          type: 'array',
          arrayItemType: 'string',
          description: 'Location IDs where event occurred',
        },
        {
          name: 'factions',
          type: 'array',
          arrayItemType: 'string',
          description: 'Faction IDs involved in event',
        },
        {
          name: 'outcome',
          type: 'string',
          description: 'Event outcome or result',
        },
        {
          name: 'consequences',
          type: 'array',
          arrayItemType: 'string',
          description: 'Consequences of the event',
        },
        {
          name: 'timeline',
          type: 'string',
          description: 'Timeline this event belongs to',
        },
        {
          name: 'previous_event',
          type: 'string',
          description: 'Previous event in sequence',
        },
        {
          name: 'next_event',
          type: 'string',
          description: 'Next event in sequence',
        },
      ],
    },

    // Faction entity type
    {
      name: 'faction',
      displayName: 'Faction',
      pluralName: 'Factions',
      description: 'Organizations, governments, guilds, and houses',
      icon: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Faction name',
        },
        {
          name: 'faction_type',
          type: 'enum',
          enumValues: ['house', 'guild', 'organization', 'government', 'military', 'religion', 'other'],
          description: 'Type of faction',
        },
        {
          name: 'leader',
          type: 'string',
          description: 'Character ID of faction leader',
        },
        {
          name: 'members',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character IDs of faction members',
        },
        {
          name: 'headquarters',
          type: 'string',
          description: 'Location ID of faction headquarters',
        },
        {
          name: 'founded',
          type: 'string',
          description: 'When the faction was founded',
        },
        {
          name: 'goals',
          type: 'array',
          arrayItemType: 'string',
          description: 'Faction goals and objectives',
        },
        {
          name: 'resources',
          type: 'array',
          arrayItemType: 'string',
          description: 'Resources controlled by faction',
        },
        {
          name: 'allies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Faction IDs of allies',
        },
        {
          name: 'rivals',
          type: 'array',
          arrayItemType: 'string',
          description: 'Faction IDs of rivals',
        },
      ],
    },

    // Quest entity type
    {
      name: 'quest',
      displayName: 'Quest',
      pluralName: 'Quests',
      description: 'Missions, adventures, objectives, and storylines',
      icon: 'scroll',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Quest name',
        },
        {
          name: 'status',
          type: 'enum',
          enumValues: ['available', 'active', 'completed', 'failed', 'abandoned'],
          description: 'Current quest status',
        },
        {
          name: 'quest_giver',
          type: 'string',
          description: 'Character ID who gave the quest',
        },
        {
          name: 'location',
          type: 'string',
          description: 'Primary location ID for the quest',
        },
        {
          name: 'objectives',
          type: 'array',
          arrayItemType: 'string',
          description: 'Quest objectives',
        },
        {
          name: 'rewards',
          type: 'array',
          arrayItemType: 'string',
          description: 'Quest rewards (item IDs or descriptions)',
        },
        {
          name: 'participants',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character IDs involved in quest',
        },
        {
          name: 'related_quests',
          type: 'array',
          arrayItemType: 'string',
          description: 'Related quest IDs (prerequisites, follow-ups)',
        },
        {
          name: 'difficulty',
          type: 'enum',
          enumValues: ['trivial', 'easy', 'medium', 'hard', 'deadly'],
          description: 'Quest difficulty level',
        },
        {
          name: 'date_started',
          type: 'string',
          description: 'When quest was started',
        },
        {
          name: 'date_completed',
          type: 'string',
          description: 'When quest was completed',
        },
      ],
    },

    // Creature entity type (monsters, beasts, animals - distinct from characters)
    {
      name: 'creature',
      displayName: 'Creature',
      pluralName: 'Creatures',
      description: 'Monsters, beasts, animals, and non-character entities',
      icon: 'bug',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Creature name or species',
        },
        {
          name: 'creature_type',
          type: 'enum',
          enumValues: ['beast', 'monstrosity', 'dragon', 'undead', 'fiend', 'celestial', 'elemental', 'fey', 'aberration', 'construct', 'ooze', 'plant', 'humanoid', 'giant'],
          description: 'Creature category',
        },
        {
          name: 'challenge_rating',
          type: 'string',
          description: 'Challenge rating or threat level',
        },
        {
          name: 'habitat',
          type: 'array',
          arrayItemType: 'string',
          description: 'Location IDs where creature is found',
        },
        {
          name: 'abilities',
          type: 'record',
          description: 'Special abilities and traits',
        },
        {
          name: 'behavior',
          type: 'string',
          description: 'Typical behavior and temperament',
        },
        {
          name: 'diet',
          type: 'string',
          description: 'What the creature eats',
        },
        {
          name: 'loot',
          type: 'array',
          arrayItemType: 'string',
          description: 'Item IDs dropped by creature',
        },
        {
          name: 'weaknesses',
          type: 'array',
          arrayItemType: 'string',
          description: 'Creature weaknesses',
        },
        {
          name: 'resistances',
          type: 'array',
          arrayItemType: 'string',
          description: 'Creature resistances and immunities',
        },
      ],
    },

    // Lore entity type
    {
      name: 'lore',
      displayName: 'Lore',
      pluralName: 'Lore',
      description: 'Mythology, magic systems, and cultural knowledge',
      icon: 'book',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Lore entry name',
        },
        {
          name: 'category',
          type: 'enum',
          enumValues: ['mythology', 'history', 'magic', 'technology', 'culture', 'religion', 'other'],
          description: 'Lore category',
        },
        {
          name: 'related_entities',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of related entities',
        },
        {
          name: 'source',
          type: 'enum',
          enumValues: ['in-world', 'meta', 'player-knowledge'],
          description: 'Knowledge source type',
        },
      ],
    },

    // Asset entity type
    {
      name: 'asset',
      displayName: 'Asset',
      pluralName: 'Assets',
      description: 'Visual and media assets (images, audio, video)',
      icon: 'image',
      fields: [
        {
          name: 'asset_type',
          type: 'enum',
          enumValues: ['image', 'audio', 'video', 'document'],
          default: 'image',
          description: 'Type of asset',
        },
        {
          name: 'file_path',
          type: 'string',
          required: true,
          description: 'Path to asset file in vault',
        },
        {
          name: 'file_format',
          type: 'string',
          description: 'File format (e.g., png, jpg, mp3)',
        },
        {
          name: 'depicts',
          type: 'array',
          arrayItemType: 'string',
          description: 'Entity IDs depicted in this asset',
        },
        {
          name: 'generation_date',
          type: 'string',
          description: 'When asset was generated',
        },
        {
          name: 'generator',
          type: 'string',
          description: 'Tool or system that generated the asset',
        },
        {
          name: 'workflow_id',
          type: 'string',
          description: 'ComfyUI workflow ID used to generate',
        },
        {
          name: 'prompt',
          type: 'string',
          description: 'Generation prompt used',
        },
        {
          name: 'negative_prompt',
          type: 'string',
          description: 'Negative prompt for generation',
        },
        {
          name: 'model',
          type: 'string',
          description: 'AI model used for generation',
        },
        {
          name: 'seed',
          type: 'number',
          description: 'Random seed for reproducible generation',
        },
        {
          name: 'parameters',
          type: 'record',
          description: 'Generation parameters (seed, steps, cfg, etc.)',
        },
        {
          name: 'approved_by',
          type: 'string',
          description: 'Who approved this asset',
        },
        {
          name: 'approval_date',
          type: 'string',
          description: 'When this asset was approved',
        },
      ],
    },

    // Item entity type (covers items, loot, artifacts, equipment)
    {
      name: 'item',
      displayName: 'Item',
      pluralName: 'Items',
      description: 'Physical objects, equipment, artifacts, loot, and treasure',
      icon: 'package',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Item name',
        },
        {
          name: 'category',
          type: 'enum',
          enumValues: ['weapon', 'armor', 'artifact', 'consumable', 'tool', 'treasure', 'misc'],
          description: 'Item category',
        },
        {
          name: 'rarity',
          type: 'enum',
          enumValues: ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'],
          description: 'Item rarity level',
        },
        {
          name: 'value',
          type: 'string',
          description: 'Item value or price',
        },
        {
          name: 'owner',
          type: 'string',
          description: 'Current owner (character ID)',
        },
        {
          name: 'location',
          type: 'string',
          description: 'Current location (location ID)',
        },
        {
          name: 'origin',
          type: 'string',
          description: 'Where the item came from or who created it',
        },
        {
          name: 'properties',
          type: 'record',
          description: 'Magical or special properties',
        },
        {
          name: 'history',
          type: 'string',
          description: 'Notable history or lore about this item',
        },
      ],
    },

    // Reference entity type
    {
      name: 'reference',
      displayName: 'Reference',
      pluralName: 'References',
      description: 'Out-of-world reference material (sources, inspiration, rules, notes)',
      icon: 'bookmark',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Reference name or title',
        },
        {
          name: 'category',
          type: 'enum',
          enumValues: ['source', 'inspiration', 'rules', 'notes', 'other'],
          description: 'Type of reference material',
        },
        {
          name: 'source_url',
          type: 'string',
          description: 'URL to external source material',
        },
        {
          name: 'related_entities',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of entities related to this reference',
        },
        {
          name: 'author',
          type: 'string',
          description: 'Author or creator of the reference material',
        },
        {
          name: 'date_accessed',
          type: 'string',
          description: 'When this reference was accessed or added',
        },
      ],
    },

    // Session entity type (raw play notes, recaps, campaign logs)
    {
      name: 'session',
      displayName: 'Session',
      pluralName: 'Sessions',
      description: 'Campaign session logs, play notes, recaps, and DM planning',
      icon: 'file-text',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Session title',
        },
        {
          name: 'session_number',
          type: 'number',
          description: 'Session number in campaign sequence',
        },
        {
          name: 'session_type',
          type: 'enum',
          enumValues: ['play', 'recap', 'summary', 'planning'],
          description: 'Type of session content (play notes, recap, summary, or planning)',
        },
        {
          name: 'date_played',
          type: 'date',
          description: 'Real-world date when session was played',
        },
        {
          name: 'players',
          type: 'array',
          arrayItemType: 'string',
          description: 'Players who attended this session',
        },
        {
          name: 'summary',
          type: 'string',
          description: 'Brief summary of what happened',
        },
        {
          name: 'npcs_met',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character IDs of NPCs encountered',
        },
        {
          name: 'locations_visited',
          type: 'array',
          arrayItemType: 'string',
          description: 'Location IDs visited during session',
        },
        {
          name: 'quests_advanced',
          type: 'array',
          arrayItemType: 'string',
          description: 'Quest IDs that progressed during session',
        },
        {
          name: 'loot_gained',
          type: 'array',
          arrayItemType: 'string',
          description: 'Item IDs acquired during session',
        },
        {
          name: 'highlights',
          type: 'array',
          arrayItemType: 'string',
          description: 'Key moments, memorable quotes, or important events',
        },
      ],
    },
  ],
};

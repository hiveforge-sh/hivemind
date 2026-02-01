/**
 * System-agnostic TTRPG base template.
 *
 * Extends the worldbuilding template with generic RPG mechanics fields
 * that are common across most tabletop RPG systems:
 * - Ability scores / attributes
 * - Skills and proficiencies
 * - Combat stats (HP, AC, etc.)
 * - Spells and abilities
 * - Equipment and inventory
 *
 * Specific game systems (D&D 5e, Pathfinder, etc.) should extend this
 * template rather than worldbuilding directly.
 */

import type { TemplateDefinition } from '../types.js';

export const ttrpgBaseTemplate: TemplateDefinition = {
  id: 'ttrpg-base',
  name: 'TTRPG Base',
  version: '1.0.0',
  description:
    'System-agnostic tabletop RPG template with generic mechanics fields. Extend this for specific game systems.',
  extendsTemplate: 'worldbuilding',

  category: 'creative',
  tags: ['ttrpg', 'rpg', 'tabletop', 'gaming', 'dnd', 'pathfinder'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  license: 'MIT',

  entityTypes: [
    // Extend character with generic RPG fields
    {
      name: 'character',
      displayName: 'Character',
      pluralName: 'Characters',
      fields: [],
      additionalFields: [
        // Core RPG attributes
        {
          name: 'character_class',
          type: 'string',
          description: 'Character class or archetype',
        },
        {
          name: 'level',
          type: 'number',
          description: 'Character level or tier',
        },
        {
          name: 'experience_points',
          type: 'number',
          description: 'Current experience points',
        },

        // Combat stats
        {
          name: 'hit_points',
          type: 'number',
          description: 'Current hit points',
        },
        {
          name: 'hit_points_max',
          type: 'number',
          description: 'Maximum hit points',
        },
        {
          name: 'armor_class',
          type: 'number',
          description: 'Armor class or defense rating',
        },
        {
          name: 'speed',
          type: 'string',
          description: 'Movement speed (e.g., "30 ft", "6 squares")',
        },

        // Ability scores - generic names work across systems
        {
          name: 'abilities',
          type: 'record',
          description: 'Ability scores (strength, dexterity, etc.)',
        },

        // Skills
        {
          name: 'skills',
          type: 'record',
          description: 'Skill proficiencies and bonuses',
        },

        // Saves
        {
          name: 'saving_throws',
          type: 'record',
          description: 'Saving throw bonuses',
        },

        // Proficiencies
        {
          name: 'proficiencies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Weapon, armor, tool, and language proficiencies',
        },

        // Combat abilities
        {
          name: 'attacks',
          type: 'array',
          arrayItemType: 'record',
          description: 'Attack actions with to-hit and damage',
        },

        // Special abilities / features
        {
          name: 'features',
          type: 'array',
          arrayItemType: 'string',
          description: 'Class features, racial traits, and special abilities',
        },

        // Inventory
        {
          name: 'inventory',
          type: 'array',
          arrayItemType: 'string',
          description: 'Items carried (item entity IDs or descriptions)',
        },
        {
          name: 'currency',
          type: 'record',
          description: 'Currency by denomination (gold, silver, etc.)',
        },

        // Spellcasting (if applicable)
        {
          name: 'spellcasting_ability',
          type: 'string',
          description: 'Ability used for spellcasting',
        },
        {
          name: 'spell_save_dc',
          type: 'number',
          description: 'Spell save difficulty class',
        },
        {
          name: 'spell_attack_bonus',
          type: 'number',
          description: 'Spell attack modifier',
        },
        {
          name: 'spells_known',
          type: 'array',
          arrayItemType: 'string',
          description: 'Known spell IDs or names',
        },
        {
          name: 'spell_slots',
          type: 'record',
          description: 'Spell slots by level',
        },

        // Conditions and status
        {
          name: 'conditions',
          type: 'array',
          arrayItemType: 'string',
          description: 'Active conditions (poisoned, frightened, etc.)',
        },

        // Notes
        {
          name: 'player_name',
          type: 'string',
          description: 'Real-world player name (for PCs)',
        },
        {
          name: 'is_player_character',
          type: 'boolean',
          description: 'True if this is a player character',
        },
      ],
    },

    // Spell entity type
    {
      name: 'spell',
      displayName: 'Spell',
      pluralName: 'Spells',
      description: 'Magic spells, powers, and special abilities',
      icon: 'sparkles',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Spell name',
        },
        {
          name: 'spell_level',
          type: 'number',
          description: 'Spell level (0 for cantrips)',
        },
        {
          name: 'school',
          type: 'string',
          description: 'School of magic (evocation, necromancy, etc.)',
        },
        {
          name: 'casting_time',
          type: 'string',
          description: 'Time required to cast (action, bonus action, 1 minute, etc.)',
        },
        {
          name: 'range',
          type: 'string',
          description: 'Spell range (self, touch, 60 feet, etc.)',
        },
        {
          name: 'components',
          type: 'array',
          arrayItemType: 'string',
          description: 'Required components (V, S, M with materials)',
        },
        {
          name: 'duration',
          type: 'string',
          description: 'Spell duration (instantaneous, 1 hour, concentration, etc.)',
        },
        {
          name: 'concentration',
          type: 'boolean',
          description: 'Whether spell requires concentration',
        },
        {
          name: 'ritual',
          type: 'boolean',
          description: 'Whether spell can be cast as a ritual',
        },
        {
          name: 'description',
          type: 'string',
          description: 'Full spell description and effects',
        },
        {
          name: 'higher_levels',
          type: 'string',
          description: 'Effects when cast at higher levels',
        },
        {
          name: 'classes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Classes that can learn this spell',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book or homebrew origin',
        },
      ],
    },

    // Class entity type
    {
      name: 'class',
      displayName: 'Class',
      pluralName: 'Classes',
      description: 'Character classes and archetypes',
      icon: 'shield',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Class name',
        },
        {
          name: 'hit_die',
          type: 'string',
          description: 'Hit die type (d6, d8, d10, d12)',
        },
        {
          name: 'primary_ability',
          type: 'string',
          description: 'Primary ability score',
        },
        {
          name: 'saving_throw_proficiencies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Saving throw proficiencies',
        },
        {
          name: 'armor_proficiencies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Armor proficiencies',
        },
        {
          name: 'weapon_proficiencies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Weapon proficiencies',
        },
        {
          name: 'skill_choices',
          type: 'array',
          arrayItemType: 'string',
          description: 'Available skill proficiency choices',
        },
        {
          name: 'num_skill_choices',
          type: 'number',
          description: 'Number of skills to choose',
        },
        {
          name: 'features_by_level',
          type: 'record',
          description: 'Class features gained at each level',
        },
        {
          name: 'subclass_name',
          type: 'string',
          description: 'What subclasses are called (archetype, domain, etc.)',
        },
        {
          name: 'subclass_level',
          type: 'number',
          description: 'Level at which subclass is chosen',
        },
        {
          name: 'spellcasting',
          type: 'record',
          description: 'Spellcasting progression details',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book or homebrew origin',
        },
      ],
    },

    // Subclass entity type
    {
      name: 'subclass',
      displayName: 'Subclass',
      pluralName: 'Subclasses',
      description: 'Class specializations and archetypes',
      icon: 'git-branch',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Subclass name',
        },
        {
          name: 'parent_class',
          type: 'string',
          description: 'Parent class ID',
        },
        {
          name: 'features_by_level',
          type: 'record',
          description: 'Subclass features gained at each level',
        },
        {
          name: 'spells',
          type: 'array',
          arrayItemType: 'string',
          description: 'Subclass spell list (if any)',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book or homebrew origin',
        },
      ],
    },

    // Extend creature with stat block fields
    {
      name: 'creature',
      displayName: 'Creature',
      pluralName: 'Creatures',
      fields: [],
      additionalFields: [
        {
          name: 'size',
          type: 'enum',
          enumValues: ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'],
          description: 'Creature size category',
        },
        {
          name: 'hit_points',
          type: 'string',
          description: 'Hit points with hit dice formula (e.g., "45 (6d10 + 12)")',
        },
        {
          name: 'armor_class',
          type: 'string',
          description: 'Armor class with source (e.g., "15 (natural armor)")',
        },
        {
          name: 'speed',
          type: 'string',
          description: 'Movement speeds (e.g., "30 ft., fly 60 ft.")',
        },
        {
          name: 'abilities',
          type: 'record',
          description: 'Ability scores (STR, DEX, CON, INT, WIS, CHA)',
        },
        {
          name: 'skills',
          type: 'record',
          description: 'Skill bonuses',
        },
        {
          name: 'damage_vulnerabilities',
          type: 'array',
          arrayItemType: 'string',
          description: 'Damage types the creature is vulnerable to',
        },
        {
          name: 'damage_resistances',
          type: 'array',
          arrayItemType: 'string',
          description: 'Damage types the creature resists',
        },
        {
          name: 'damage_immunities',
          type: 'array',
          arrayItemType: 'string',
          description: 'Damage types the creature is immune to',
        },
        {
          name: 'condition_immunities',
          type: 'array',
          arrayItemType: 'string',
          description: 'Conditions the creature is immune to',
        },
        {
          name: 'senses',
          type: 'string',
          description: 'Special senses (e.g., "darkvision 60 ft., passive Perception 14")',
        },
        {
          name: 'languages',
          type: 'array',
          arrayItemType: 'string',
          description: 'Languages the creature speaks',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'record',
          description: 'Special traits and abilities',
        },
        {
          name: 'actions',
          type: 'array',
          arrayItemType: 'record',
          description: 'Actions the creature can take',
        },
        {
          name: 'reactions',
          type: 'array',
          arrayItemType: 'record',
          description: 'Reactions available to the creature',
        },
        {
          name: 'legendary_actions',
          type: 'array',
          arrayItemType: 'record',
          description: 'Legendary actions (if any)',
        },
        {
          name: 'lair_actions',
          type: 'array',
          arrayItemType: 'record',
          description: 'Lair actions (if any)',
        },
        {
          name: 'experience_points',
          type: 'number',
          description: 'XP reward for defeating',
        },
      ],
    },

    // Extend item with RPG equipment fields
    {
      name: 'item',
      displayName: 'Item',
      pluralName: 'Items',
      fields: [],
      additionalFields: [
        {
          name: 'weight',
          type: 'string',
          description: 'Item weight (e.g., "3 lb.")',
        },
        {
          name: 'requires_attunement',
          type: 'boolean',
          description: 'Whether item requires attunement',
        },
        {
          name: 'attunement_requirements',
          type: 'string',
          description: 'Attunement requirements (e.g., "by a spellcaster")',
        },

        // Weapon properties
        {
          name: 'weapon_type',
          type: 'string',
          description: 'Weapon type (simple/martial, melee/ranged)',
        },
        {
          name: 'damage',
          type: 'string',
          description: 'Damage dice and type (e.g., "1d8 slashing")',
        },
        {
          name: 'weapon_properties',
          type: 'array',
          arrayItemType: 'string',
          description: 'Weapon properties (finesse, versatile, etc.)',
        },
        {
          name: 'range',
          type: 'string',
          description: 'Range for ranged weapons (e.g., "80/320")',
        },

        // Armor properties
        {
          name: 'armor_type',
          type: 'string',
          description: 'Armor type (light, medium, heavy, shield)',
        },
        {
          name: 'base_ac',
          type: 'number',
          description: 'Base AC provided by armor',
        },
        {
          name: 'max_dex_bonus',
          type: 'number',
          description: 'Maximum Dex bonus allowed',
        },
        {
          name: 'strength_requirement',
          type: 'number',
          description: 'Minimum Strength required',
        },
        {
          name: 'stealth_disadvantage',
          type: 'boolean',
          description: 'Whether armor imposes stealth disadvantage',
        },

        // Magic item properties
        {
          name: 'magic_bonus',
          type: 'number',
          description: 'Magic bonus to attack/damage or AC',
        },
        {
          name: 'charges',
          type: 'number',
          description: 'Number of charges (for charged items)',
        },
        {
          name: 'charges_max',
          type: 'number',
          description: 'Maximum charges',
        },
        {
          name: 'recharge',
          type: 'string',
          description: 'How charges are regained',
        },
      ],
    },

    // Encounter entity type
    {
      name: 'encounter',
      displayName: 'Encounter',
      pluralName: 'Encounters',
      description: 'Combat encounters and challenges',
      icon: 'swords',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Encounter name',
        },
        {
          name: 'difficulty',
          type: 'enum',
          enumValues: ['trivial', 'easy', 'medium', 'hard', 'deadly'],
          description: 'Encounter difficulty',
        },
        {
          name: 'location',
          type: 'string',
          description: 'Location ID where encounter takes place',
        },
        {
          name: 'creatures',
          type: 'array',
          arrayItemType: 'record',
          description: 'Creatures in encounter (ID and count)',
        },
        {
          name: 'total_xp',
          type: 'number',
          description: 'Total XP for the encounter',
        },
        {
          name: 'adjusted_xp',
          type: 'number',
          description: 'Adjusted XP based on number of creatures',
        },
        {
          name: 'treasure',
          type: 'array',
          arrayItemType: 'string',
          description: 'Treasure and rewards',
        },
        {
          name: 'tactics',
          type: 'string',
          description: 'Enemy tactics and strategy',
        },
        {
          name: 'environmental_effects',
          type: 'array',
          arrayItemType: 'string',
          description: 'Environmental hazards or effects',
        },
        {
          name: 'quest',
          type: 'string',
          description: 'Related quest ID',
        },
        {
          name: 'status',
          type: 'enum',
          enumValues: ['planned', 'active', 'completed', 'skipped'],
          description: 'Encounter status',
        },
      ],
    },

    // Session log entity type
    {
      name: 'session',
      displayName: 'Session',
      pluralName: 'Sessions',
      description: 'Game session logs and notes',
      icon: 'book-open',
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
          description: 'Session number in campaign',
        },
        {
          name: 'date_played',
          type: 'date',
          description: 'Real-world date session was played',
        },
        {
          name: 'in_game_date',
          type: 'string',
          description: 'In-game date/time',
        },
        {
          name: 'players_present',
          type: 'array',
          arrayItemType: 'string',
          description: 'Player character IDs present',
        },
        {
          name: 'npcs_encountered',
          type: 'array',
          arrayItemType: 'string',
          description: 'NPC IDs encountered',
        },
        {
          name: 'locations_visited',
          type: 'array',
          arrayItemType: 'string',
          description: 'Location IDs visited',
        },
        {
          name: 'quests_advanced',
          type: 'array',
          arrayItemType: 'string',
          description: 'Quest IDs that progressed',
        },
        {
          name: 'encounters',
          type: 'array',
          arrayItemType: 'string',
          description: 'Encounter IDs that occurred',
        },
        {
          name: 'loot_gained',
          type: 'array',
          arrayItemType: 'string',
          description: 'Items gained',
        },
        {
          name: 'xp_gained',
          type: 'number',
          description: 'Total XP gained',
        },
        {
          name: 'summary',
          type: 'string',
          description: 'Brief session summary',
        },
        {
          name: 'dm_notes',
          type: 'string',
          description: 'Private DM notes',
        },
        {
          name: 'next_session_hooks',
          type: 'array',
          arrayItemType: 'string',
          description: 'Plot hooks for next session',
        },
      ],
    },
  ],

  relationshipTypes: [
    // Character-Spell relationships
    {
      id: 'knows_spell',
      displayName: 'Knows Spell',
      description: 'Character knows this spell',
      sourceTypes: ['character'],
      targetTypes: ['spell'],
      bidirectional: true,
      reverseId: 'known_by',
    },
    {
      id: 'known_by',
      displayName: 'Known By',
      description: 'Spell is known by character',
      sourceTypes: ['spell'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Character-Class relationships
    {
      id: 'has_class',
      displayName: 'Has Class',
      description: 'Character has levels in this class',
      sourceTypes: ['character'],
      targetTypes: ['class'],
      bidirectional: true,
      reverseId: 'class_of',
    },
    {
      id: 'class_of',
      displayName: 'Class Of',
      description: 'Class belongs to character',
      sourceTypes: ['class'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Character party relationships
    {
      id: 'in_party_with',
      displayName: 'In Party With',
      description: 'Characters adventuring together',
      sourceTypes: ['character'],
      targetTypes: ['character'],
      bidirectional: true,
      reverseId: 'in_party_with',
    },

    // Class-Subclass relationships
    {
      id: 'has_subclass',
      displayName: 'Has Subclass',
      description: 'Class has this subclass option',
      sourceTypes: ['class'],
      targetTypes: ['subclass'],
      bidirectional: true,
      reverseId: 'subclass_of',
    },
    {
      id: 'subclass_of',
      displayName: 'Subclass Of',
      description: 'Subclass belongs to this class',
      sourceTypes: ['subclass'],
      targetTypes: ['class'],
      bidirectional: false,
    },

    // Class-Spell relationships
    {
      id: 'grants_spell',
      displayName: 'Grants Spell',
      description: 'Class grants access to this spell',
      sourceTypes: ['class', 'subclass'],
      targetTypes: ['spell'],
      bidirectional: true,
      reverseId: 'granted_by',
    },
    {
      id: 'granted_by',
      displayName: 'Granted By',
      description: 'Spell is granted by this class',
      sourceTypes: ['spell'],
      targetTypes: ['class', 'subclass'],
      bidirectional: false,
    },

    // Session relationships
    {
      id: 'occurred_in_session',
      displayName: 'Occurred In Session',
      description: 'Event occurred during this session',
      sourceTypes: ['event', 'encounter'],
      targetTypes: ['session'],
      bidirectional: true,
      reverseId: 'session_contains',
    },
    {
      id: 'session_contains',
      displayName: 'Session Contains',
      description: 'Session contains this event',
      sourceTypes: ['session'],
      targetTypes: ['event', 'encounter'],
      bidirectional: false,
    },

    // Encounter relationships
    {
      id: 'encounter_at',
      displayName: 'Encounter At',
      description: 'Encounter takes place at location',
      sourceTypes: ['encounter'],
      targetTypes: ['location'],
      bidirectional: true,
      reverseId: 'has_encounter',
    },
    {
      id: 'has_encounter',
      displayName: 'Has Encounter',
      description: 'Location has this encounter',
      sourceTypes: ['location'],
      targetTypes: ['encounter'],
      bidirectional: false,
    },
    {
      id: 'encounter_includes',
      displayName: 'Encounter Includes',
      description: 'Encounter includes this creature',
      sourceTypes: ['encounter'],
      targetTypes: ['creature'],
      bidirectional: true,
      reverseId: 'appears_in_encounter',
    },
    {
      id: 'appears_in_encounter',
      displayName: 'Appears In Encounter',
      description: 'Creature appears in this encounter',
      sourceTypes: ['creature'],
      targetTypes: ['encounter'],
      bidirectional: false,
    },
  ],

  folderMappings: [
    // Spell mappings
    { folder: '**/Spells/**', types: ['spell'] },
    { folder: '**/Magic/**', types: ['spell', 'lore'] },
    { folder: '**/Cantrips/**', types: ['spell'] },

    // Class mappings
    { folder: '**/Classes/**', types: ['class'] },
    { folder: '**/Subclasses/**', types: ['subclass'] },
    { folder: '**/Archetypes/**', types: ['subclass'] },

    // Session mappings
    { folder: '**/Sessions/**', types: ['session'] },
    { folder: '**/Session Logs/**', types: ['session'] },
    { folder: '**/Game Logs/**', types: ['session'] },

    // Encounter mappings
    { folder: '**/Encounters/**', types: ['encounter'] },
    { folder: '**/Combat/**', types: ['encounter'] },
    { folder: '**/Battles/**', types: ['encounter'] },

    // Player character folder
    { folder: '**/PCs/**', types: ['character'] },
    { folder: '**/Player Characters/**', types: ['character'] },
    { folder: '**/Party/**', types: ['character'] },
  ],
};

/**
 * Pathfinder 2nd Edition template.
 *
 * Extends the TTRPG base template with PF2e-specific mechanics:
 * - Three-action economy
 * - Four degrees of success (critical success, success, failure, critical failure)
 * - Proficiency ranks (untrained, trained, expert, master, legendary)
 * - Focus points and focus spells
 * - Ancestries, heritages, and versatile heritages
 * - Character level 1-20 with dedication feats for multiclassing
 *
 * Compatible with official Pathfinder 2e content and homebrew.
 */

import type { TemplateDefinition } from '../types.js';

export const pathfinder2eTemplate: TemplateDefinition = {
  id: 'pathfinder-2e',
  name: 'Pathfinder 2nd Edition',
  version: '1.0.0',
  description:
    'Pathfinder 2nd Edition template with support for the three-action economy, proficiency ranks, ancestries, and PF2e-specific mechanics.',
  extendsTemplate: 'ttrpg-base',

  category: 'creative',
  tags: ['pathfinder', 'pf2e', 'paizo', 'ttrpg', 'd20', 'three-action'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  license: 'MIT',

  entityTypes: [
    // Extend character with PF2e-specific fields
    {
      name: 'character',
      displayName: 'Character',
      pluralName: 'Characters',
      fields: [],
      additionalFields: [
        // Ancestry & Heritage (PF2e uses ancestry instead of race)
        {
          name: 'ancestry',
          type: 'string',
          description: 'Character ancestry (Human, Elf, Dwarf, etc.)',
        },
        {
          name: 'heritage',
          type: 'string',
          description: 'Heritage within ancestry',
        },
        {
          name: 'versatile_heritage',
          type: 'string',
          description: 'Versatile heritage (Dhampir, Tiefling, etc.)',
        },

        // PF2e proficiency ranks
        {
          name: 'perception',
          type: 'record',
          description: 'Perception proficiency rank and modifier',
        },
        {
          name: 'fortitude',
          type: 'record',
          description: 'Fortitude save proficiency and modifier',
        },
        {
          name: 'reflex',
          type: 'record',
          description: 'Reflex save proficiency and modifier',
        },
        {
          name: 'will',
          type: 'record',
          description: 'Will save proficiency and modifier',
        },

        // PF2e action economy
        {
          name: 'hero_points',
          type: 'number',
          description: 'Current hero points (max 3)',
        },

        // Focus spells
        {
          name: 'focus_points',
          type: 'number',
          description: 'Current focus points',
        },
        {
          name: 'focus_points_max',
          type: 'number',
          description: 'Maximum focus points (usually 1-3)',
        },
        {
          name: 'focus_spells',
          type: 'array',
          arrayItemType: 'string',
          description: 'Known focus spells',
        },

        // PF2e-specific class features
        {
          name: 'class_dc',
          type: 'number',
          description: 'Class DC for abilities',
        },
        {
          name: 'key_ability',
          type: 'string',
          description: 'Key ability score for class',
        },

        // Archetype/multiclass dedications
        {
          name: 'archetypes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Archetype dedications taken',
        },

        // Feats by type
        {
          name: 'ancestry_feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'Ancestry feats',
        },
        {
          name: 'class_feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'Class feats',
        },
        {
          name: 'skill_feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'Skill feats',
        },
        {
          name: 'general_feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'General feats',
        },
        {
          name: 'archetype_feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'Archetype feats',
        },

        // PF2e conditions (more detailed than base)
        {
          name: 'dying',
          type: 'number',
          description: 'Dying condition value (0-4)',
        },
        {
          name: 'wounded',
          type: 'number',
          description: 'Wounded condition value',
        },
        {
          name: 'doomed',
          type: 'number',
          description: 'Doomed condition value',
        },

        // Bulk system
        {
          name: 'bulk_carried',
          type: 'number',
          description: 'Current bulk carried',
        },
        {
          name: 'bulk_limit',
          type: 'number',
          description: 'Bulk limit before encumbered',
        },

        // Lore skills (PF2e-specific)
        {
          name: 'lore_skills',
          type: 'array',
          arrayItemType: 'record',
          description: 'Lore skills with proficiency ranks',
        },
      ],
    },

    // Extend spell with PF2e action economy
    {
      name: 'spell',
      displayName: 'Spell',
      pluralName: 'Spells',
      fields: [],
      additionalFields: [
        {
          name: 'actions',
          type: 'enum',
          enumValues: ['1', '2', '3', 'free', 'reaction', '1 minute', '10 minutes', '1 hour', 'special'],
          description: 'Actions required to cast',
        },
        {
          name: 'traditions',
          type: 'array',
          arrayItemType: 'enum',
          description: 'Spell traditions (arcane, divine, occult, primal)',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Spell traits',
        },
        {
          name: 'heightened',
          type: 'record',
          description: 'Heightened effects by level',
        },
        {
          name: 'save',
          type: 'string',
          description: 'Basic save or special save effect',
        },
        {
          name: 'area',
          type: 'string',
          description: 'Area of effect',
        },
        {
          name: 'targets',
          type: 'string',
          description: 'Number and type of targets',
        },
        {
          name: 'defense',
          type: 'string',
          description: 'Defense used (AC, save type)',
        },
        {
          name: 'sustained',
          type: 'boolean',
          description: 'Whether spell can be sustained',
        },
      ],
    },

    // Extend creature with PF2e stats
    {
      name: 'creature',
      displayName: 'Creature',
      pluralName: 'Creatures',
      fields: [],
      additionalFields: [
        {
          name: 'level',
          type: 'number',
          description: 'Creature level (-1 to 25+)',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Creature traits',
        },
        {
          name: 'perception',
          type: 'number',
          description: 'Perception modifier',
        },
        {
          name: 'fortitude',
          type: 'number',
          description: 'Fortitude save modifier',
        },
        {
          name: 'reflex',
          type: 'number',
          description: 'Reflex save modifier',
        },
        {
          name: 'will',
          type: 'number',
          description: 'Will save modifier',
        },
        {
          name: 'ac',
          type: 'number',
          description: 'Armor Class',
        },
        {
          name: 'hp',
          type: 'number',
          description: 'Hit Points',
        },
        {
          name: 'hardness',
          type: 'number',
          description: 'Hardness (for objects/constructs)',
        },
        {
          name: 'immunities',
          type: 'array',
          arrayItemType: 'string',
          description: 'Immunities',
        },
        {
          name: 'weaknesses',
          type: 'array',
          arrayItemType: 'record',
          description: 'Weaknesses with values',
        },
        {
          name: 'resistances',
          type: 'array',
          arrayItemType: 'record',
          description: 'Resistances with values',
        },
        {
          name: 'speed',
          type: 'record',
          description: 'Speeds by type (land, fly, swim, climb, burrow)',
        },
        {
          name: 'strikes',
          type: 'array',
          arrayItemType: 'record',
          description: 'Strike actions',
        },
        {
          name: 'spellcasting',
          type: 'array',
          arrayItemType: 'record',
          description: 'Spellcasting entries',
        },
        {
          name: 'rituals',
          type: 'array',
          arrayItemType: 'string',
          description: 'Rituals known',
        },
      ],
    },

    // Extend item with PF2e bulk and runes
    {
      name: 'item',
      displayName: 'Item',
      pluralName: 'Items',
      fields: [],
      additionalFields: [
        {
          name: 'level',
          type: 'number',
          description: 'Item level',
        },
        {
          name: 'price',
          type: 'string',
          description: 'Price in gp/sp/cp',
        },
        {
          name: 'bulk',
          type: 'string',
          description: 'Bulk (L for light, - for negligible)',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Item traits',
        },
        {
          name: 'usage',
          type: 'string',
          description: 'How the item is used (held, worn, etc.)',
        },
        {
          name: 'activate',
          type: 'record',
          description: 'Activation requirements and effects',
        },

        // Rune system
        {
          name: 'fundamental_runes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Fundamental runes (potency, striking, resilient)',
        },
        {
          name: 'property_runes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Property runes',
        },

        // PF2e weapon stats
        {
          name: 'damage_die',
          type: 'string',
          description: 'Base damage die',
        },
        {
          name: 'weapon_group',
          type: 'string',
          description: 'Weapon group (sword, bow, etc.)',
        },
        {
          name: 'weapon_traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Weapon traits (agile, reach, etc.)',
        },

        // PF2e armor stats
        {
          name: 'armor_category',
          type: 'enum',
          enumValues: ['unarmored', 'light', 'medium', 'heavy'],
          description: 'Armor category',
        },
        {
          name: 'ac_bonus',
          type: 'number',
          description: 'AC bonus',
        },
        {
          name: 'dex_cap',
          type: 'number',
          description: 'Dex modifier cap',
        },
        {
          name: 'check_penalty',
          type: 'number',
          description: 'Check penalty',
        },
        {
          name: 'speed_penalty',
          type: 'number',
          description: 'Speed penalty',
        },
        {
          name: 'armor_group',
          type: 'string',
          description: 'Armor group',
        },
      ],
    },

    // Ancestry entity type (PF2e-specific)
    {
      name: 'ancestry',
      displayName: 'Ancestry',
      pluralName: 'Ancestries',
      description: 'Playable ancestries with heritages and feats',
      icon: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Ancestry name',
        },
        {
          name: 'hit_points',
          type: 'number',
          description: 'Ancestry hit points',
        },
        {
          name: 'size',
          type: 'enum',
          enumValues: ['tiny', 'small', 'medium', 'large'],
          description: 'Size category',
        },
        {
          name: 'speed',
          type: 'number',
          description: 'Base speed in feet',
        },
        {
          name: 'ability_boosts',
          type: 'array',
          arrayItemType: 'string',
          description: 'Ability boosts',
        },
        {
          name: 'ability_flaw',
          type: 'string',
          description: 'Ability flaw (if any)',
        },
        {
          name: 'languages',
          type: 'array',
          arrayItemType: 'string',
          description: 'Starting languages',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Ancestry traits',
        },
        {
          name: 'special_abilities',
          type: 'array',
          arrayItemType: 'record',
          description: 'Special ancestry abilities',
        },
        {
          name: 'heritages',
          type: 'array',
          arrayItemType: 'string',
          description: 'Available heritages',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Heritage entity type (PF2e-specific)
    {
      name: 'heritage',
      displayName: 'Heritage',
      pluralName: 'Heritages',
      description: 'Ancestry heritages and versatile heritages',
      icon: 'git-branch',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Heritage name',
        },
        {
          name: 'ancestry',
          type: 'string',
          description: 'Parent ancestry (blank for versatile heritages)',
        },
        {
          name: 'is_versatile',
          type: 'boolean',
          description: 'Whether this is a versatile heritage',
        },
        {
          name: 'abilities',
          type: 'array',
          arrayItemType: 'record',
          description: 'Heritage abilities',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Action entity type (PF2e three-action economy)
    {
      name: 'action',
      displayName: 'Action',
      pluralName: 'Actions',
      description: 'Actions, activities, and reactions',
      icon: 'zap',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Action name',
        },
        {
          name: 'action_type',
          type: 'enum',
          enumValues: ['action', 'activity', 'reaction', 'free'],
          description: 'Type of action',
        },
        {
          name: 'actions',
          type: 'string',
          description: 'Number of actions (1, 2, 3, or varies)',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Action traits',
        },
        {
          name: 'trigger',
          type: 'string',
          description: 'Trigger (for reactions)',
        },
        {
          name: 'requirements',
          type: 'string',
          description: 'Requirements to use the action',
        },
        {
          name: 'frequency',
          type: 'string',
          description: 'Usage frequency',
        },
        {
          name: 'effect',
          type: 'string',
          description: 'Action effect',
        },
        {
          name: 'critical_success',
          type: 'string',
          description: 'Critical success effect',
        },
        {
          name: 'success',
          type: 'string',
          description: 'Success effect',
        },
        {
          name: 'failure',
          type: 'string',
          description: 'Failure effect',
        },
        {
          name: 'critical_failure',
          type: 'string',
          description: 'Critical failure effect',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source (class, feat, etc.)',
        },
      ],
    },

    // Condition entity type (PF2e has many conditions)
    {
      name: 'condition',
      displayName: 'Condition',
      pluralName: 'Conditions',
      description: 'Status conditions and their effects',
      icon: 'alert-circle',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Condition name',
        },
        {
          name: 'has_value',
          type: 'boolean',
          description: 'Whether condition has a value (e.g., frightened 2)',
        },
        {
          name: 'effects',
          type: 'array',
          arrayItemType: 'string',
          description: 'Condition effects',
        },
        {
          name: 'overrides',
          type: 'array',
          arrayItemType: 'string',
          description: 'Conditions this overrides',
        },
        {
          name: 'reduction',
          type: 'string',
          description: 'How condition value reduces',
        },
      ],
    },
  ],

  relationshipTypes: [
    // Ancestry-Heritage relationships
    {
      id: 'has_heritage',
      displayName: 'Has Heritage',
      description: 'Ancestry has this heritage option',
      sourceTypes: ['ancestry'],
      targetTypes: ['heritage'],
      bidirectional: true,
      reverseId: 'heritage_of_ancestry',
    },
    {
      id: 'heritage_of_ancestry',
      displayName: 'Heritage Of',
      description: 'Heritage belongs to this ancestry',
      sourceTypes: ['heritage'],
      targetTypes: ['ancestry'],
      bidirectional: false,
    },

    // Character-Ancestry relationships
    {
      id: 'has_ancestry',
      displayName: 'Has Ancestry',
      description: 'Character is of this ancestry',
      sourceTypes: ['character'],
      targetTypes: ['ancestry'],
      bidirectional: true,
      reverseId: 'ancestry_of',
    },
    {
      id: 'ancestry_of',
      displayName: 'Ancestry Of',
      description: 'Ancestry of character',
      sourceTypes: ['ancestry'],
      targetTypes: ['character'],
      bidirectional: false,
    },
  ],

  folderMappings: [
    // PF2e-specific folders
    { folder: '**/Ancestries/**', types: ['ancestry'] },
    { folder: '**/Heritages/**', types: ['heritage'] },
    { folder: '**/Actions/**', types: ['action'] },
    { folder: '**/Activities/**', types: ['action'] },
    { folder: '**/Conditions/**', types: ['condition'] },

    // PF2e calls them "Creatures" more often than "Monsters"
    { folder: '**/Creatures/**', types: ['creature'] },
    { folder: '**/Hazards/**', types: ['creature'] },
  ],
};

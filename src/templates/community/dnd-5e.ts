/**
 * D&D 5th Edition template.
 *
 * Extends the TTRPG base template with D&D 5e-specific mechanics:
 * - Standard 6 ability scores (STR, DEX, CON, INT, WIS, CHA)
 * - Proficiency bonus by level
 * - Advantage/disadvantage system
 * - 5e spell slots and spell levels
 * - 5e-specific creature types and conditions
 * - Challenge Rating system
 *
 * Compatible with official D&D 5e content and homebrew.
 */

import type { TemplateDefinition } from '../types.js';

export const dnd5eTemplate: TemplateDefinition = {
  id: 'dnd-5e',
  name: 'D&D 5th Edition',
  version: '1.0.0',
  description:
    'Dungeons & Dragons 5th Edition template with full support for character sheets, monsters, spells, and campaign management.',
  extendsTemplate: 'ttrpg-base',

  category: 'creative',
  tags: ['dnd', 'd&d', 'dungeons-and-dragons', '5e', 'fifth-edition', 'wotc', 'ttrpg'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  license: 'MIT',

  entityTypes: [
    // Extend character with 5e-specific fields
    {
      name: 'character',
      displayName: 'Character',
      pluralName: 'Characters',
      fields: [],
      additionalFields: [
        // 5e-specific class info
        {
          name: 'subclass',
          type: 'string',
          description: 'Subclass (e.g., Champion, Evoker, Thief)',
        },
        {
          name: 'multiclass',
          type: 'array',
          arrayItemType: 'record',
          description: 'Multiclass levels (class and level for each)',
        },

        // 5e proficiency
        {
          name: 'proficiency_bonus',
          type: 'number',
          description: 'Proficiency bonus based on total level',
        },

        // 5e-specific combat
        {
          name: 'initiative',
          type: 'number',
          description: 'Initiative modifier',
        },
        {
          name: 'hit_dice',
          type: 'string',
          description: 'Hit dice pool (e.g., "5d10 + 2d8")',
        },
        {
          name: 'hit_dice_remaining',
          type: 'string',
          description: 'Remaining hit dice',
        },
        {
          name: 'death_saves',
          type: 'record',
          description: 'Death save successes and failures',
        },
        {
          name: 'temporary_hp',
          type: 'number',
          description: 'Temporary hit points',
        },

        // 5e inspiration
        {
          name: 'inspiration',
          type: 'boolean',
          description: 'Has inspiration',
        },

        // 5e backgrounds
        {
          name: 'background_name',
          type: 'string',
          description: 'Background (Acolyte, Criminal, Noble, etc.)',
        },
        {
          name: 'personality_traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Personality traits from background',
        },
        {
          name: 'ideals',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character ideals',
        },
        {
          name: 'bonds',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character bonds',
        },
        {
          name: 'flaws',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character flaws',
        },

        // 5e exhaustion
        {
          name: 'exhaustion_level',
          type: 'number',
          description: 'Current exhaustion level (0-6)',
        },

        // 5e-specific resources
        {
          name: 'class_resources',
          type: 'record',
          description: 'Class-specific resources (Ki, Sorcery Points, etc.)',
        },

        // 5e feats
        {
          name: 'feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'Feats taken',
        },
      ],
    },

    // Extend spell with 5e-specific fields
    {
      name: 'spell',
      displayName: 'Spell',
      pluralName: 'Spells',
      fields: [],
      additionalFields: [
        {
          name: 'school',
          type: 'enum',
          enumValues: [
            'abjuration',
            'conjuration',
            'divination',
            'enchantment',
            'evocation',
            'illusion',
            'necromancy',
            'transmutation',
          ],
          description: 'School of magic',
        },
        {
          name: 'attack_type',
          type: 'enum',
          enumValues: ['melee', 'ranged', 'none'],
          description: 'Type of spell attack (if any)',
        },
        {
          name: 'save_type',
          type: 'enum',
          enumValues: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'none'],
          description: 'Saving throw type (if any)',
        },
        {
          name: 'damage_type',
          type: 'string',
          description: 'Damage type (fire, cold, necrotic, etc.)',
        },
        {
          name: 'area_of_effect',
          type: 'record',
          description: 'AoE shape and size (if any)',
        },
      ],
    },

    // Extend creature with 5e CR system
    {
      name: 'creature',
      displayName: 'Creature',
      pluralName: 'Creatures',
      fields: [],
      additionalFields: [
        {
          name: 'challenge_rating',
          type: 'string',
          description: 'Challenge rating (e.g., "1/4", "5", "21")',
        },
        {
          name: 'proficiency_bonus',
          type: 'number',
          description: 'Proficiency bonus based on CR',
        },
        {
          name: 'creature_type',
          type: 'enum',
          enumValues: [
            'aberration',
            'beast',
            'celestial',
            'construct',
            'dragon',
            'elemental',
            'fey',
            'fiend',
            'giant',
            'humanoid',
            'monstrosity',
            'ooze',
            'plant',
            'undead',
          ],
          description: 'D&D 5e creature type',
        },
        {
          name: 'creature_tags',
          type: 'array',
          arrayItemType: 'string',
          description: 'Creature tags (shapechanger, titan, etc.)',
        },
        {
          name: 'alignment',
          type: 'string',
          description: 'Creature alignment',
        },
        {
          name: 'legendary_resistance',
          type: 'number',
          description: 'Number of legendary resistances per day',
        },
        {
          name: 'spellcasting',
          type: 'record',
          description: 'Innate or class spellcasting details',
        },
      ],
    },

    // Extend item with 5e magic item rarity
    {
      name: 'item',
      displayName: 'Item',
      pluralName: 'Items',
      fields: [],
      additionalFields: [
        {
          name: 'rarity',
          type: 'enum',
          enumValues: ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'],
          description: 'D&D 5e magic item rarity',
        },
        {
          name: 'item_type',
          type: 'enum',
          enumValues: [
            'armor',
            'potion',
            'ring',
            'rod',
            'scroll',
            'staff',
            'wand',
            'weapon',
            'wondrous item',
          ],
          description: 'D&D 5e magic item type',
        },
        {
          name: 'cursed',
          type: 'boolean',
          description: 'Whether item is cursed',
        },
        {
          name: 'sentient',
          type: 'boolean',
          description: 'Whether item is sentient',
        },
        {
          name: 'sentience',
          type: 'record',
          description: 'Sentient item details (if sentient)',
        },
      ],
    },

    // Background entity type (5e-specific)
    {
      name: 'background',
      displayName: 'Background',
      pluralName: 'Backgrounds',
      description: 'Character backgrounds with features and proficiencies',
      icon: 'scroll',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Background name',
        },
        {
          name: 'skill_proficiencies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Granted skill proficiencies',
        },
        {
          name: 'tool_proficiencies',
          type: 'array',
          arrayItemType: 'string',
          description: 'Granted tool proficiencies',
        },
        {
          name: 'languages',
          type: 'number',
          description: 'Number of languages granted',
        },
        {
          name: 'equipment',
          type: 'array',
          arrayItemType: 'string',
          description: 'Starting equipment',
        },
        {
          name: 'feature_name',
          type: 'string',
          description: 'Background feature name',
        },
        {
          name: 'feature_description',
          type: 'string',
          description: 'Background feature description',
        },
        {
          name: 'suggested_characteristics',
          type: 'record',
          description: 'Suggested personality traits, ideals, bonds, flaws',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Feat entity type (5e-specific)
    {
      name: 'feat',
      displayName: 'Feat',
      pluralName: 'Feats',
      description: 'Character feats and their effects',
      icon: 'star',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Feat name',
        },
        {
          name: 'prerequisite',
          type: 'string',
          description: 'Prerequisites to take this feat',
        },
        {
          name: 'ability_score_increase',
          type: 'record',
          description: 'Ability score increases granted',
        },
        {
          name: 'benefits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Benefits granted by the feat',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Race entity type (5e-specific)
    {
      name: 'race',
      displayName: 'Race',
      pluralName: 'Races',
      description: 'Playable races and their traits',
      icon: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Race name',
        },
        {
          name: 'ability_score_increases',
          type: 'record',
          description: 'Ability score increases',
        },
        {
          name: 'size',
          type: 'enum',
          enumValues: ['small', 'medium'],
          description: 'Size category',
        },
        {
          name: 'speed',
          type: 'number',
          description: 'Base walking speed in feet',
        },
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'record',
          description: 'Racial traits',
        },
        {
          name: 'languages',
          type: 'array',
          arrayItemType: 'string',
          description: 'Languages known',
        },
        {
          name: 'subraces',
          type: 'array',
          arrayItemType: 'string',
          description: 'Available subraces',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },
  ],

  relationshipTypes: [
    // Character-Background relationship
    {
      id: 'has_background',
      displayName: 'Has Background',
      description: 'Character has this background',
      sourceTypes: ['character'],
      targetTypes: ['background'],
      bidirectional: true,
      reverseId: 'background_of',
    },
    {
      id: 'background_of',
      displayName: 'Background Of',
      description: 'Background belongs to character',
      sourceTypes: ['background'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Character-Feat relationship
    {
      id: 'has_feat',
      displayName: 'Has Feat',
      description: 'Character has this feat',
      sourceTypes: ['character'],
      targetTypes: ['feat'],
      bidirectional: true,
      reverseId: 'feat_of',
    },
    {
      id: 'feat_of',
      displayName: 'Feat Of',
      description: 'Feat belongs to character',
      sourceTypes: ['feat'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Character-Race relationship
    {
      id: 'has_race',
      displayName: 'Has Race',
      description: 'Character is of this race',
      sourceTypes: ['character'],
      targetTypes: ['race'],
      bidirectional: true,
      reverseId: 'race_of',
    },
    {
      id: 'race_of',
      displayName: 'Race Of',
      description: 'Race of character',
      sourceTypes: ['race'],
      targetTypes: ['character'],
      bidirectional: false,
    },
  ],

  folderMappings: [
    // 5e-specific folders
    { folder: '**/Backgrounds/**', types: ['background'] },
    { folder: '**/Feats/**', types: ['feat'] },
    { folder: '**/Races/**', types: ['race'] },
    { folder: '**/Subraces/**', types: ['race'] },

    // Override some base mappings for 5e-specific handling
    { folder: '**/Monsters/**', types: ['creature'] },
    { folder: '**/Statblocks/**', types: ['creature'] },
    { folder: '**/Magic Items/**', types: ['item'] },
  ],
};

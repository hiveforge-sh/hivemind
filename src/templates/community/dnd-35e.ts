/**
 * D&D 3.5e / Pathfinder 1e template.
 *
 * Extends the TTRPG base template with d20 System mechanics common to
 * D&D 3rd Edition, D&D 3.5 Edition, and Pathfinder 1st Edition:
 * - Base Attack Bonus (BAB)
 * - Skill ranks and class/cross-class skills
 * - Feat trees and prerequisites
 * - Prestige classes
 * - Full attack actions
 * - Iterative attacks
 * - Save DC calculations
 *
 * Compatible with D&D 3.0, 3.5, Pathfinder 1e, and their variants.
 */

import type { TemplateDefinition } from '../types.js';

export const dnd35eTemplate: TemplateDefinition = {
  id: 'dnd-35e',
  name: 'D&D 3.5e / Pathfinder 1e',
  version: '1.0.0',
  description:
    'Classic d20 System template for D&D 3rd/3.5 Edition and Pathfinder 1st Edition, featuring BAB, skill ranks, and prestige classes.',
  extendsTemplate: 'ttrpg-base',

  category: 'creative',
  tags: ['dnd', 'd&d', '3.5e', '3e', 'pathfinder', 'pf1e', 'd20', 'ogl', 'ttrpg'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  license: 'MIT',

  entityTypes: [
    // Extend character with d20 System fields
    {
      name: 'character',
      displayName: 'Character',
      pluralName: 'Characters',
      fields: [],
      additionalFields: [
        // Multi-classing (d20 style)
        {
          name: 'class_levels',
          type: 'array',
          arrayItemType: 'record',
          description: 'Class and level for each class taken (e.g., Fighter 5 / Wizard 3)',
        },
        {
          name: 'favored_class',
          type: 'string',
          description: 'Favored class (for XP penalty rules)',
        },

        // Base Attack Bonus
        {
          name: 'base_attack_bonus',
          type: 'number',
          description: 'Total base attack bonus',
        },
        {
          name: 'iterative_attacks',
          type: 'string',
          description: 'Full attack bonuses (e.g., "+11/+6/+1")',
        },

        // Saves (d20 style)
        {
          name: 'base_fortitude',
          type: 'number',
          description: 'Base Fortitude save',
        },
        {
          name: 'base_reflex',
          type: 'number',
          description: 'Base Reflex save',
        },
        {
          name: 'base_will',
          type: 'number',
          description: 'Base Will save',
        },

        // Combat Maneuvers (PF1e) / Grapple (3.5e)
        {
          name: 'cmb',
          type: 'number',
          description: 'Combat Maneuver Bonus (PF1e) or Grapple modifier (3.5e)',
        },
        {
          name: 'cmd',
          type: 'number',
          description: 'Combat Maneuver Defense (PF1e only)',
        },
        {
          name: 'grapple',
          type: 'number',
          description: 'Grapple modifier (3.5e only)',
        },

        // Skill ranks
        {
          name: 'skill_ranks',
          type: 'record',
          description: 'Skill ranks by skill name',
        },
        {
          name: 'class_skills',
          type: 'array',
          arrayItemType: 'string',
          description: 'Class skills',
        },
        {
          name: 'skill_points_per_level',
          type: 'number',
          description: 'Skill points gained per level',
        },

        // Feats with prerequisites
        {
          name: 'feats',
          type: 'array',
          arrayItemType: 'record',
          description: 'Feats with source (class, race, level)',
        },
        {
          name: 'bonus_feats',
          type: 'array',
          arrayItemType: 'string',
          description: 'Bonus feats from class',
        },

        // Size and reach
        {
          name: 'size_category',
          type: 'enum',
          enumValues: ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'],
          description: 'Size category',
        },
        {
          name: 'space',
          type: 'string',
          description: 'Space occupied (e.g., "5 ft.")',
        },
        {
          name: 'reach',
          type: 'string',
          description: 'Natural reach',
        },

        // Action points / Hero points (optional subsystems)
        {
          name: 'action_points',
          type: 'number',
          description: 'Action points (Eberron/UA)',
        },

        // Traits (PF1e)
        {
          name: 'traits',
          type: 'array',
          arrayItemType: 'string',
          description: 'Character traits (PF1e)',
        },

        // Archetypes (PF1e)
        {
          name: 'archetypes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Class archetypes (PF1e)',
        },

        // Carrying capacity
        {
          name: 'light_load',
          type: 'number',
          description: 'Light load limit (lbs)',
        },
        {
          name: 'medium_load',
          type: 'number',
          description: 'Medium load limit (lbs)',
        },
        {
          name: 'heavy_load',
          type: 'number',
          description: 'Heavy load limit (lbs)',
        },
        {
          name: 'current_load',
          type: 'number',
          description: 'Current weight carried (lbs)',
        },

        // Spellcasting (d20 style)
        {
          name: 'caster_level',
          type: 'number',
          description: 'Caster level',
        },
        {
          name: 'concentration',
          type: 'number',
          description: 'Concentration check modifier',
        },
        {
          name: 'spell_resistance',
          type: 'number',
          description: 'Spell resistance (if any)',
        },
        {
          name: 'spells_per_day',
          type: 'record',
          description: 'Spells per day by level',
        },
        {
          name: 'spells_prepared',
          type: 'record',
          description: 'Prepared spells by level (for prepared casters)',
        },

        // Domain/School specialization
        {
          name: 'domains',
          type: 'array',
          arrayItemType: 'string',
          description: 'Cleric domains or similar',
        },
        {
          name: 'specialization',
          type: 'string',
          description: 'Wizard school specialization',
        },
        {
          name: 'prohibited_schools',
          type: 'array',
          arrayItemType: 'string',
          description: 'Prohibited wizard schools',
        },

        // Animal companion / Familiar
        {
          name: 'companion',
          type: 'string',
          description: 'Animal companion or familiar ID',
        },
        {
          name: 'companion_type',
          type: 'enum',
          enumValues: ['familiar', 'animal_companion', 'mount', 'eidolon', 'phantom', 'none'],
          description: 'Type of companion',
        },
      ],
    },

    // Extend spell with d20 System fields
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
            'universal',
          ],
          description: 'School of magic',
        },
        {
          name: 'subschool',
          type: 'string',
          description: 'Subschool (healing, teleportation, etc.)',
        },
        {
          name: 'descriptors',
          type: 'array',
          arrayItemType: 'string',
          description: 'Spell descriptors (fire, mind-affecting, etc.)',
        },
        {
          name: 'class_levels',
          type: 'record',
          description: 'Spell level by class (e.g., Wizard 3, Cleric 4)',
        },
        {
          name: 'domain_levels',
          type: 'record',
          description: 'Spell level by domain',
        },
        {
          name: 'saving_throw',
          type: 'string',
          description: 'Saving throw type and effect (e.g., "Reflex half")',
        },
        {
          name: 'spell_resistance',
          type: 'enum',
          enumValues: ['yes', 'no', 'see text'],
          description: 'Whether spell resistance applies',
        },
        {
          name: 'material_component',
          type: 'string',
          description: 'Material component details',
        },
        {
          name: 'focus',
          type: 'string',
          description: 'Focus component details',
        },
        {
          name: 'xp_cost',
          type: 'number',
          description: 'XP cost to cast (if any)',
        },
      ],
    },

    // Extend creature with d20 System stat block
    {
      name: 'creature',
      displayName: 'Creature',
      pluralName: 'Creatures',
      fields: [],
      additionalFields: [
        {
          name: 'challenge_rating',
          type: 'string',
          description: 'Challenge rating',
        },
        {
          name: 'hit_dice',
          type: 'string',
          description: 'Hit dice (e.g., "8d10+24")',
        },
        {
          name: 'creature_type',
          type: 'enum',
          enumValues: [
            'aberration',
            'animal',
            'construct',
            'dragon',
            'elemental',
            'fey',
            'giant',
            'humanoid',
            'magical_beast',
            'monstrous_humanoid',
            'ooze',
            'outsider',
            'plant',
            'undead',
            'vermin',
          ],
          description: 'Creature type',
        },
        {
          name: 'subtypes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Creature subtypes (aquatic, evil, fire, etc.)',
        },
        {
          name: 'size',
          type: 'enum',
          enumValues: ['fine', 'diminutive', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan', 'colossal'],
          description: 'Size category',
        },
        {
          name: 'space',
          type: 'string',
          description: 'Space occupied',
        },
        {
          name: 'reach',
          type: 'string',
          description: 'Natural reach',
        },
        {
          name: 'base_attack',
          type: 'number',
          description: 'Base attack bonus',
        },
        {
          name: 'grapple',
          type: 'number',
          description: 'Grapple modifier (3.5e)',
        },
        {
          name: 'cmb',
          type: 'number',
          description: 'Combat Maneuver Bonus (PF1e)',
        },
        {
          name: 'cmd',
          type: 'number',
          description: 'Combat Maneuver Defense (PF1e)',
        },
        {
          name: 'full_attack',
          type: 'string',
          description: 'Full attack action',
        },
        {
          name: 'special_attacks',
          type: 'array',
          arrayItemType: 'record',
          description: 'Special attack abilities',
        },
        {
          name: 'special_qualities',
          type: 'array',
          arrayItemType: 'record',
          description: 'Special qualities and defenses',
        },
        {
          name: 'damage_reduction',
          type: 'string',
          description: 'Damage reduction (e.g., "10/magic")',
        },
        {
          name: 'spell_resistance',
          type: 'number',
          description: 'Spell resistance',
        },
        {
          name: 'regeneration',
          type: 'string',
          description: 'Regeneration (if any)',
        },
        {
          name: 'fast_healing',
          type: 'number',
          description: 'Fast healing (if any)',
        },
        {
          name: 'environment',
          type: 'string',
          description: 'Typical environment',
        },
        {
          name: 'organization',
          type: 'string',
          description: 'Typical organization',
        },
        {
          name: 'treasure',
          type: 'string',
          description: 'Treasure type',
        },
        {
          name: 'advancement',
          type: 'string',
          description: 'Advancement progression',
        },
        {
          name: 'level_adjustment',
          type: 'number',
          description: 'Level adjustment (for playable monsters)',
        },
      ],
    },

    // Extend item with d20 System magic item fields
    {
      name: 'item',
      displayName: 'Item',
      pluralName: 'Items',
      fields: [],
      additionalFields: [
        {
          name: 'caster_level',
          type: 'number',
          description: 'Caster level of magic item',
        },
        {
          name: 'aura',
          type: 'string',
          description: 'Magical aura strength and school',
        },
        {
          name: 'slot',
          type: 'enum',
          enumValues: ['none', 'head', 'headband', 'eyes', 'shoulders', 'neck', 'chest', 'body', 'armor', 'belt', 'wrists', 'hands', 'ring', 'feet'],
          description: 'Body slot (for wondrous items)',
        },
        {
          name: 'construction',
          type: 'record',
          description: 'Construction requirements and cost',
        },

        // Weapon fields
        {
          name: 'critical',
          type: 'string',
          description: 'Critical threat range and multiplier (e.g., "19-20/x2")',
        },
        {
          name: 'weapon_type',
          type: 'enum',
          enumValues: ['simple', 'martial', 'exotic'],
          description: 'Weapon proficiency category',
        },
        {
          name: 'weapon_category',
          type: 'enum',
          enumValues: ['unarmed', 'light', 'one-handed', 'two-handed', 'ranged'],
          description: 'Weapon size category',
        },
        {
          name: 'special',
          type: 'array',
          arrayItemType: 'string',
          description: 'Special weapon qualities',
        },

        // Armor fields
        {
          name: 'armor_bonus',
          type: 'number',
          description: 'Armor or shield bonus to AC',
        },
        {
          name: 'max_dex',
          type: 'number',
          description: 'Maximum Dex bonus',
        },
        {
          name: 'armor_check_penalty',
          type: 'number',
          description: 'Armor check penalty',
        },
        {
          name: 'arcane_spell_failure',
          type: 'number',
          description: 'Arcane spell failure chance (%)',
        },
        {
          name: 'armor_type',
          type: 'enum',
          enumValues: ['light', 'medium', 'heavy', 'shield'],
          description: 'Armor category',
        },
      ],
    },

    // Prestige class entity type (d20-specific)
    {
      name: 'prestige_class',
      displayName: 'Prestige Class',
      pluralName: 'Prestige Classes',
      description: 'Prestige classes with prerequisites and progression',
      icon: 'crown',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Prestige class name',
        },
        {
          name: 'hit_die',
          type: 'string',
          description: 'Hit die type',
        },
        {
          name: 'bab_progression',
          type: 'enum',
          enumValues: ['full', 'medium', 'poor'],
          description: 'BAB progression rate',
        },
        {
          name: 'good_saves',
          type: 'array',
          arrayItemType: 'enum',
          description: 'Good save progressions (fort, ref, will)',
        },
        {
          name: 'skill_points',
          type: 'number',
          description: 'Skill points per level',
        },
        {
          name: 'class_skills',
          type: 'array',
          arrayItemType: 'string',
          description: 'Class skills',
        },
        {
          name: 'prerequisites',
          type: 'record',
          description: 'Requirements to enter (BAB, skills, feats, etc.)',
        },
        {
          name: 'spellcasting',
          type: 'string',
          description: 'Spellcasting progression (full, partial, none)',
        },
        {
          name: 'features_by_level',
          type: 'record',
          description: 'Class features by level',
        },
        {
          name: 'max_level',
          type: 'number',
          description: 'Maximum class level (usually 10)',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Feat entity type (d20-specific with complex prerequisites)
    {
      name: 'feat',
      displayName: 'Feat',
      pluralName: 'Feats',
      description: 'Feats with prerequisites and benefits',
      icon: 'star',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Feat name',
        },
        {
          name: 'feat_type',
          type: 'array',
          arrayItemType: 'string',
          description: 'Feat types (General, Fighter, Metamagic, Item Creation, etc.)',
        },
        {
          name: 'prerequisites',
          type: 'record',
          description: 'Prerequisites (ability scores, BAB, skills, other feats)',
        },
        {
          name: 'prerequisite_text',
          type: 'string',
          description: 'Human-readable prerequisites',
        },
        {
          name: 'benefit',
          type: 'string',
          description: 'Feat benefit',
        },
        {
          name: 'normal',
          type: 'string',
          description: 'What happens without this feat',
        },
        {
          name: 'special',
          type: 'string',
          description: 'Special notes',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Domain entity type (d20 cleric domains)
    {
      name: 'domain',
      displayName: 'Domain',
      pluralName: 'Domains',
      description: 'Cleric domains with granted powers and spells',
      icon: 'sun',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Domain name',
        },
        {
          name: 'granted_power',
          type: 'string',
          description: 'Granted power description',
        },
        {
          name: 'domain_spells',
          type: 'record',
          description: 'Domain spells by level (1-9)',
        },
        {
          name: 'associated_deity',
          type: 'array',
          arrayItemType: 'string',
          description: 'Deities that grant this domain',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Source book',
        },
      ],
    },

    // Race entity type (d20 races with level adjustment)
    {
      name: 'race',
      displayName: 'Race',
      pluralName: 'Races',
      description: 'Playable races with ability modifiers and traits',
      icon: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Race name',
        },
        {
          name: 'ability_modifiers',
          type: 'record',
          description: 'Ability score modifiers',
        },
        {
          name: 'size',
          type: 'enum',
          enumValues: ['small', 'medium'],
          description: 'Size category',
        },
        {
          name: 'base_speed',
          type: 'number',
          description: 'Base land speed',
        },
        {
          name: 'type',
          type: 'string',
          description: 'Creature type (usually humanoid)',
        },
        {
          name: 'subtypes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Creature subtypes',
        },
        {
          name: 'racial_traits',
          type: 'array',
          arrayItemType: 'record',
          description: 'Racial traits and abilities',
        },
        {
          name: 'favored_class',
          type: 'string',
          description: 'Favored class (3.5e)',
        },
        {
          name: 'level_adjustment',
          type: 'number',
          description: 'Level adjustment (for powerful races)',
        },
        {
          name: 'racial_hit_dice',
          type: 'string',
          description: 'Racial hit dice (if any)',
        },
        {
          name: 'automatic_languages',
          type: 'array',
          arrayItemType: 'string',
          description: 'Languages known automatically',
        },
        {
          name: 'bonus_languages',
          type: 'array',
          arrayItemType: 'string',
          description: 'Bonus language options',
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
    // Character-Prestige Class relationship
    {
      id: 'has_prestige_class',
      displayName: 'Has Prestige Class',
      description: 'Character has levels in prestige class',
      sourceTypes: ['character'],
      targetTypes: ['prestige_class'],
      bidirectional: true,
      reverseId: 'prestige_class_of',
    },
    {
      id: 'prestige_class_of',
      displayName: 'Prestige Class Of',
      description: 'Prestige class levels of character',
      sourceTypes: ['prestige_class'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Character-Domain relationship
    {
      id: 'has_domain',
      displayName: 'Has Domain',
      description: 'Character has access to this domain',
      sourceTypes: ['character'],
      targetTypes: ['domain'],
      bidirectional: true,
      reverseId: 'domain_of',
    },
    {
      id: 'domain_of',
      displayName: 'Domain Of',
      description: 'Domain belongs to character',
      sourceTypes: ['domain'],
      targetTypes: ['character'],
      bidirectional: false,
    },

    // Feat prerequisite chain
    {
      id: 'requires_feat',
      displayName: 'Requires Feat',
      description: 'Feat requires this feat as prerequisite',
      sourceTypes: ['feat'],
      targetTypes: ['feat'],
      bidirectional: true,
      reverseId: 'enables_feat',
    },
    {
      id: 'enables_feat',
      displayName: 'Enables Feat',
      description: 'Feat enables taking this feat',
      sourceTypes: ['feat'],
      targetTypes: ['feat'],
      bidirectional: false,
    },

    // Domain-Spell relationship
    {
      id: 'grants_domain_spell',
      displayName: 'Grants Domain Spell',
      description: 'Domain grants this spell',
      sourceTypes: ['domain'],
      targetTypes: ['spell'],
      bidirectional: true,
      reverseId: 'domain_spell_of',
    },
    {
      id: 'domain_spell_of',
      displayName: 'Domain Spell Of',
      description: 'Spell is granted by this domain',
      sourceTypes: ['spell'],
      targetTypes: ['domain'],
      bidirectional: false,
    },
  ],

  folderMappings: [
    // d20-specific folders
    { folder: '**/Prestige Classes/**', types: ['prestige_class'] },
    { folder: '**/PrCs/**', types: ['prestige_class'] },
    { folder: '**/Domains/**', types: ['domain'] },
    { folder: '**/Feats/**', types: ['feat'] },
    { folder: '**/Races/**', types: ['race'] },
  ],
};

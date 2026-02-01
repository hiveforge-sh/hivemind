import { describe, it, expect, beforeEach } from 'vitest';
import { templateRegistry } from '../../src/templates/registry.js';
import { worldbuildingTemplate } from '../../src/templates/builtin/worldbuilding.js';

describe('Frontmatter Template Builder', () => {
  beforeEach(() => {
    templateRegistry.clear();
    templateRegistry.register(worldbuildingTemplate, 'builtin');
    templateRegistry.activate('worldbuilding');
  });

  describe('buildFrontmatterTemplate', () => {
    it('should build character frontmatter with all fields', () => {
      const template = templateRegistry.buildFrontmatterTemplate('character');

      // Base fields
      expect(template.id).toBe('');
      expect(template.type).toBe('character');
      expect(template.status).toBe('draft');
      expect(template.title).toBe('');
      expect(template.importance).toBe('minor');
      expect(template.tags).toEqual([]);
      expect(template.aliases).toEqual([]);

      // Character-specific fields
      expect(template.name).toBe('');
      expect(template.age).toBeNull();
      expect(template.gender).toBe('');
      expect(template.race).toBe('');

      // Nested objects with specific structure
      expect(template.appearance).toEqual({
        height: '',
        build: '',
        hair: '',
        eyes: '',
        distinctive_features: ''
      });

      expect(template.personality).toEqual({
        traits: [],
        motivations: [],
        flaws: []
      });

      expect(template.background).toEqual({
        birthplace: '',
        occupation: '',
        affiliations: []
      });

      expect(template.relationships).toEqual([]);
      expect(template.assets).toEqual([]);
    });

    it('should build location frontmatter with all fields', () => {
      const template = templateRegistry.buildFrontmatterTemplate('location');

      // Base fields
      expect(template.id).toBe('');
      expect(template.type).toBe('location');
      expect(template.importance).toBe('minor');

      // Location-specific fields from worldbuilding.ts
      expect(template.name).toBe('');
      expect(template.region).toBe('');
      expect(template.category).toBe('');
      expect(template.parent).toBe('');
      expect(template.hierarchy_level).toBe('');
      expect(template.children).toEqual([]);
      expect(template.climate).toBe('');
      expect(template.terrain).toEqual([]);
      expect(template.inhabitants).toEqual([]);
      expect(template.connections).toEqual([]);
      expect(template.assets).toEqual([]);
    });

    it('should build event frontmatter with all fields', () => {
      const template = templateRegistry.buildFrontmatterTemplate('event');

      expect(template.type).toBe('event');
      expect(template.name).toBe('');
      expect(template.date).toBe('');
      expect(template.participants).toEqual([]);
      expect(template.locations).toEqual([]);
      expect(template.factions).toEqual([]);
    });

    it('should build faction frontmatter with all fields', () => {
      const template = templateRegistry.buildFrontmatterTemplate('faction');

      expect(template.type).toBe('faction');
      expect(template.name).toBe('');
      expect(template.faction_type).toBe('');
      expect(template.leader).toBe('');
      expect(template.members).toEqual([]);
      expect(template.allies).toEqual([]);
      expect(template.rivals).toEqual([]);
    });

    it('should build lore frontmatter with all fields', () => {
      const template = templateRegistry.buildFrontmatterTemplate('lore');

      expect(template.type).toBe('lore');
      expect(template.name).toBe('');
      expect(template.category).toBe('');
      expect(template.related_entities).toEqual([]);
      expect(template.source).toBe('');
    });

    it('should build asset frontmatter WITHOUT importance field', () => {
      const template = templateRegistry.buildFrontmatterTemplate('asset');

      expect(template.type).toBe('asset');
      expect(template.importance).toBeUndefined();
      expect(template.asset_type).toBe('image'); // Has default value
      expect(template.file_path).toBe('');
      expect(template.depicts).toEqual([]);
    });

    it('should throw error for non-existent entity type', () => {
      expect(() => {
        templateRegistry.buildFrontmatterTemplate('nonexistent');
      }).toThrow('entity type "nonexistent" not found');
    });

    it('should throw error when no template is active', () => {
      templateRegistry.clear();

      expect(() => {
        templateRegistry.buildFrontmatterTemplate('character');
      }).toThrow('no active template');
    });
  });

  describe('buildAllFrontmatterTemplates', () => {
    it('should build templates for all entity types', () => {
      const templates = templateRegistry.buildAllFrontmatterTemplates();

      expect(Object.keys(templates).sort()).toEqual([
        'asset',
        'character',
        'creature',
        'event',
        'faction',
        'item',
        'location',
        'lore',
        'quest',
        'reference',
        'session'
      ]);

      // Spot check a few
      expect(templates.character.type).toBe('character');
      expect(templates.location.type).toBe('location');
      expect(templates.asset.type).toBe('asset');
      expect(templates.asset.importance).toBeUndefined();
    });

    it('should throw error when no template is active', () => {
      templateRegistry.clear();

      expect(() => {
        templateRegistry.buildAllFrontmatterTemplates();
      }).toThrow('no active template');
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  FolderMapper,
  DEFAULT_FOLDER_MAPPINGS,
  folderMapper,
} from '../../src/templates/folder-mapper.js';

describe('FolderMapper', () => {
  describe('DEFAULT_FOLDER_MAPPINGS', () => {
    it('should include character mappings', () => {
      const characterMappings = DEFAULT_FOLDER_MAPPINGS.filter(
        (m) => m.entityType === 'character'
      );
      expect(characterMappings.length).toBeGreaterThan(0);
      expect(characterMappings.map((m) => m.pattern)).toContain('characters');
      expect(characterMappings.map((m) => m.pattern)).toContain('npcs');
    });

    it('should include location mappings', () => {
      const locationMappings = DEFAULT_FOLDER_MAPPINGS.filter(
        (m) => m.entityType === 'location'
      );
      expect(locationMappings.length).toBeGreaterThan(0);
      expect(locationMappings.map((m) => m.pattern)).toContain('locations');
      expect(locationMappings.map((m) => m.pattern)).toContain('places');
    });

    it('should include event mappings', () => {
      const eventMappings = DEFAULT_FOLDER_MAPPINGS.filter(
        (m) => m.entityType === 'event'
      );
      expect(eventMappings.length).toBeGreaterThan(0);
      expect(eventMappings.map((m) => m.pattern)).toContain('events');
      expect(eventMappings.map((m) => m.pattern)).toContain('timeline');
    });

    it('should include reference mappings', () => {
      const refMappings = DEFAULT_FOLDER_MAPPINGS.filter(
        (m) => m.entityType === 'reference'
      );
      expect(refMappings.length).toBeGreaterThan(0);
      expect(refMappings.map((m) => m.pattern)).toContain('references');
    });
  });

  describe('constructor', () => {
    it('should create with default mappings', () => {
      const mapper = new FolderMapper();
      const mappings = mapper.getMappings();
      expect(mappings.length).toBe(DEFAULT_FOLDER_MAPPINGS.length);
    });

    it('should add custom mappings', () => {
      const mapper = new FolderMapper([
        { pattern: 'custom', entityType: 'custom_type' },
      ]);
      const mappings = mapper.getMappings();
      expect(mappings.length).toBe(DEFAULT_FOLDER_MAPPINGS.length + 1);
    });

    it('should allow custom mappings to override defaults', () => {
      const mapper = new FolderMapper([
        { pattern: 'characters', entityType: 'custom_character' },
      ]);
      expect(mapper.inferType('characters/alice.md')).toBe('custom_character');
    });
  });

  describe('inferType', () => {
    const mapper = new FolderMapper();

    it('should infer character type from characters folder', () => {
      expect(mapper.inferType('characters/alice.md')).toBe('character');
    });

    it('should infer character type from people folder', () => {
      expect(mapper.inferType('people/bob.md')).toBe('character');
    });

    it('should infer location type from locations folder', () => {
      expect(mapper.inferType('locations/town.md')).toBe('location');
    });

    it('should infer event type from events folder', () => {
      expect(mapper.inferType('events/battle.md')).toBe('event');
    });

    it('should infer faction type from factions folder', () => {
      expect(mapper.inferType('factions/guild.md')).toBe('faction');
    });

    it('should infer lore type from lore folder', () => {
      expect(mapper.inferType('lore/magic.md')).toBe('lore');
    });

    it('should infer reference type from references folder', () => {
      expect(mapper.inferType('references/source.md')).toBe('reference');
    });

    it('should handle nested paths (matches first folder)', () => {
      // Note: "world" maps to "location", so it matches first
      expect(mapper.inferType('world/characters/alice.md')).toBe('location');
      // A non-mapped parent folder allows nested match
      expect(mapper.inferType('campaign/characters/alice.md')).toBe('character');
    });

    it('should handle Windows-style paths', () => {
      expect(mapper.inferType('characters\\alice.md')).toBe('character');
    });

    it('should be case-insensitive', () => {
      expect(mapper.inferType('Characters/Alice.md')).toBe('character');
      expect(mapper.inferType('LOCATIONS/TOWN.md')).toBe('location');
    });

    it('should match folder prefixes', () => {
      expect(mapper.inferType('characters-main/alice.md')).toBe('character');
      expect(mapper.inferType('locations-old/ruins.md')).toBe('location');
    });

    it('should return null for unknown folders', () => {
      expect(mapper.inferType('unknown/file.md')).toBeNull();
      expect(mapper.inferType('random/path/here.md')).toBeNull();
    });

    it('should return null for files in root', () => {
      expect(mapper.inferType('readme.md')).toBeNull();
    });
  });

  describe('inferTypes', () => {
    const mapper = new FolderMapper();

    it('should infer types for multiple paths', () => {
      const paths = [
        'characters/alice.md',
        'locations/town.md',
        'unknown/file.md',
      ];
      const results = mapper.inferTypes(paths);

      expect(results.get('characters/alice.md')).toBe('character');
      expect(results.get('locations/town.md')).toBe('location');
      expect(results.get('unknown/file.md')).toBeNull();
    });

    it('should handle empty array', () => {
      const results = mapper.inferTypes([]);
      expect(results.size).toBe(0);
    });
  });

  describe('getMappings', () => {
    it('should return all mappings', () => {
      const mapper = new FolderMapper();
      const mappings = mapper.getMappings();

      expect(Array.isArray(mappings)).toBe(true);
      expect(mappings.every((m) => m.pattern && m.entityType)).toBe(true);
    });
  });

  describe('addMapping', () => {
    it('should add a new mapping', () => {
      const mapper = new FolderMapper();
      const initialCount = mapper.getMappings().length;

      mapper.addMapping('newFolder', 'new_type');

      expect(mapper.getMappings().length).toBe(initialCount + 1);
      expect(mapper.inferType('newFolder/file.md')).toBe('new_type');
    });

    it('should be case-insensitive when adding', () => {
      const mapper = new FolderMapper();
      mapper.addMapping('NewFolder', 'new_type');

      expect(mapper.inferType('newfolder/file.md')).toBe('new_type');
      expect(mapper.inferType('NEWFOLDER/file.md')).toBe('new_type');
    });
  });

  describe('folderMapper singleton', () => {
    it('should be a FolderMapper instance', () => {
      expect(folderMapper).toBeInstanceOf(FolderMapper);
    });

    it('should have default mappings', () => {
      expect(folderMapper.inferType('characters/alice.md')).toBe('character');
    });
  });
});

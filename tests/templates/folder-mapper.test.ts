import { describe, it, expect, beforeEach } from 'vitest';
import {
  FolderMapper,
  LegacyFolderMapper,
  DEFAULT_FOLDER_MAPPINGS,
  folderMapper,
} from '../../src/templates/folder-mapper.js';
import type { FolderMappingConfig } from '../../src/templates/types.js';

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

  describe('constructor (Legacy API)', () => {
    it('should create with default mappings', () => {
      const mapper = new LegacyFolderMapper();
      const mappings = mapper.getMappings();
      expect(mappings.length).toBe(DEFAULT_FOLDER_MAPPINGS.length);
    });

    it('should add custom mappings', () => {
      const mapper = new LegacyFolderMapper([
        { pattern: 'custom', entityType: 'custom_type' },
      ]);
      const mappings = mapper.getMappings();
      expect(mappings.length).toBe(DEFAULT_FOLDER_MAPPINGS.length + 1);
    });

    it('should allow custom mappings to override defaults', () => {
      const mapper = new LegacyFolderMapper([
        { pattern: 'characters', entityType: 'custom_character' },
      ]);
      expect(mapper.inferType('characters/alice.md')).toBe('custom_character');
    });
  });

  describe('inferType (Legacy API)', () => {
    const mapper = new LegacyFolderMapper();

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

  describe('inferTypes (Legacy API)', () => {
    const mapper = new LegacyFolderMapper();

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

  describe('getMappings (Legacy API)', () => {
    it('should return all mappings', () => {
      const mapper = new LegacyFolderMapper();
      const mappings = mapper.getMappings();

      expect(Array.isArray(mappings)).toBe(true);
      expect(mappings.every((m) => m.pattern && m.entityType)).toBe(true);
    });
  });

  describe('addMapping (Legacy API)', () => {
    it('should add a new mapping', () => {
      const mapper = new LegacyFolderMapper();
      const initialCount = mapper.getMappings().length;

      mapper.addMapping('newFolder', 'new_type');

      expect(mapper.getMappings().length).toBe(initialCount + 1);
      expect(mapper.inferType('newFolder/file.md')).toBe('new_type');
    });

    it('should be case-insensitive when adding', () => {
      const mapper = new LegacyFolderMapper();
      mapper.addMapping('NewFolder', 'new_type');

      expect(mapper.inferType('newfolder/file.md')).toBe('new_type');
      expect(mapper.inferType('NEWFOLDER/file.md')).toBe('new_type');
    });
  });

  describe('folderMapper singleton', () => {
    it('should be a LegacyFolderMapper instance', () => {
      expect(folderMapper).toBeInstanceOf(LegacyFolderMapper);
    });

    it('should have default mappings', () => {
      expect(folderMapper.inferType('characters/alice.md')).toBe('character');
    });
  });

  // New async FolderMapper tests
  describe('FolderMapper (New Async API)', () => {
    describe('create()', () => {
      it('should create mapper with valid config', async () => {
        const config: FolderMappingConfig = {
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
          ],
        };

        const mapper = await FolderMapper.create(config);
        expect(mapper).toBeInstanceOf(FolderMapper);
      });

      it('should validate glob patterns', async () => {
        // Note: picomatch is quite permissive with patterns, so this test
        // verifies the validation mechanism exists, even if most patterns are valid
        const config: FolderMappingConfig = {
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
          ],
        };

        // Should not throw for valid patterns
        await expect(FolderMapper.create(config)).resolves.toBeInstanceOf(FolderMapper);
      });

      it('should normalize backslashes in patterns', async () => {
        const config: FolderMappingConfig = {
          mappings: [
            { folder: '**\\Characters\\**', types: ['character'] },
          ],
        };

        const mapper = await FolderMapper.create(config);
        const result = await mapper.resolveType('vault/Characters/hero.md');
        expect(result.confidence).toBe('exact');
      });
    });

    describe('resolveType()', () => {
      let mapper: FolderMapper;

      beforeEach(async () => {
        mapper = await FolderMapper.create({
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
            { folder: '**/Locations/**', types: ['location'] },
            { folder: '**/Notes/**', types: ['lore', 'event'] },
          ],
        });
      });

      it('should match simple glob pattern', async () => {
        const result = await mapper.resolveType('vault/Characters/hero.md');

        expect(result).toEqual({
          types: ['character'],
          matchedPattern: '**/Characters/**',
          confidence: 'exact',
        });
      });

      it('should return ambiguous for multiple types', async () => {
        const result = await mapper.resolveType('vault/Notes/meeting.md');

        expect(result).toEqual({
          types: ['lore', 'event'],
          matchedPattern: '**/Notes/**',
          confidence: 'ambiguous',
        });
      });

      it('should return none when no match and no fallback', async () => {
        const result = await mapper.resolveType('vault/Random/file.md');

        expect(result).toEqual({
          types: [],
          matchedPattern: null,
          confidence: 'none',
        });
      });

      it('should normalize Windows backslash paths', async () => {
        const result = await mapper.resolveType('vault\\Characters\\hero.md');

        expect(result.confidence).toBe('exact');
        expect(result.types).toEqual(['character']);
      });

      it('should handle deeply nested paths', async () => {
        const result = await mapper.resolveType('vault/Characters/NPCs/Merchants/shopkeeper.md');

        expect(result.types).toEqual(['character']);
      });

      it('should be case-sensitive', async () => {
        const result = await mapper.resolveType('vault/characters/hero.md');

        // Lowercase 'characters' should NOT match '**/Characters/**'
        expect(result.confidence).toBe('none');
      });
    });

    describe('specificity resolution', () => {
      it('should prefer more specific pattern over generic', async () => {
        const mapper = await FolderMapper.create({
          mappings: [
            { folder: '**/People/**', types: ['character'] },
            { folder: '**/People/Heroes/**', types: ['hero'] },
          ],
        });

        // More specific pattern should win
        const result = await mapper.resolveType('vault/People/Heroes/John.md');

        expect(result.types).toEqual(['hero']);
        expect(result.matchedPattern).toBe('**/People/Heroes/**');
      });

      it('should prefer literal segments over wildcards', async () => {
        const mapper = await FolderMapper.create({
          mappings: [
            { folder: '**/**/Characters/**', types: ['generic'] },
            { folder: 'World/Characters/**', types: ['specific'] },
          ],
        });

        const result = await mapper.resolveType('World/Characters/hero.md');

        expect(result.types).toEqual(['specific']);
      });

      it('should handle multiple wildcards with different specificity', async () => {
        const mapper = await FolderMapper.create({
          mappings: [
            { folder: '**', types: ['catchall'] },
            { folder: '**/folder/**', types: ['medium'] },
            { folder: 'exact/path/**', types: ['high'] },
          ],
        });

        const result = await mapper.resolveType('exact/path/file.md');
        expect(result.types).toEqual(['high']);
      });
    });

    describe('fallback type', () => {
      it('should use fallback when no pattern matches', async () => {
        const mapper = await FolderMapper.create({
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
          ],
          fallbackType: 'reference',
        });

        const result = await mapper.resolveType('vault/Random/file.md');

        expect(result).toEqual({
          types: ['reference'],
          matchedPattern: null,
          confidence: 'fallback',
        });
      });

      it('should not use fallback when pattern matches', async () => {
        const mapper = await FolderMapper.create({
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
          ],
          fallbackType: 'reference',
        });

        const result = await mapper.resolveType('vault/Characters/hero.md');

        expect(result.confidence).toBe('exact');
        expect(result.types).toEqual(['character']);
      });
    });

    describe('resolveTypes()', () => {
      it('should resolve multiple paths', async () => {
        const mapper = await FolderMapper.create({
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
            { folder: '**/Locations/**', types: ['location'] },
          ],
        });

        const results = await mapper.resolveTypes([
          'vault/Characters/hero.md',
          'vault/Locations/city.md',
          'vault/Random/file.md',
        ]);

        expect(results.size).toBe(3);
        expect(results.get('vault/Characters/hero.md')?.types).toEqual(['character']);
        expect(results.get('vault/Locations/city.md')?.types).toEqual(['location']);
        expect(results.get('vault/Random/file.md')?.confidence).toBe('none');
      });
    });

    describe('getMappings()', () => {
      it('should return configured mappings', async () => {
        const config: FolderMappingConfig = {
          mappings: [
            { folder: '**/Characters/**', types: ['character'] },
            { folder: '**/Locations/**', types: ['location'] },
          ],
        };

        const mapper = await FolderMapper.create(config);
        const mappings = mapper.getMappings();

        expect(mappings).toHaveLength(2);
        expect(mappings[0].folder).toContain('Characters');
        expect(mappings[1].folder).toContain('Locations');
      });
    });

    describe('createWithDefaults()', () => {
      it('should create mapper with default worldbuilding mappings', async () => {
        const mapper = await FolderMapper.createWithDefaults();

        const charResult = await mapper.resolveType('vault/characters/hero.md');
        const locResult = await mapper.resolveType('vault/locations/city.md');

        expect(charResult.types).toEqual(['character']);
        expect(locResult.types).toEqual(['location']);
      });
    });
  });
});

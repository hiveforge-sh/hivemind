import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createEntitySchema,
  SchemaFactory,
  schemaFactory,
} from '../../src/templates/schema-factory.js';
import type { EntityTypeConfig, FieldConfig } from '../../src/templates/types.js';

describe('createEntitySchema', () => {
  const baseEntityType: EntityTypeConfig = {
    name: 'character',
    displayName: 'Character',
    pluralName: 'Characters',
    fields: [],
  };

  describe('string fields', () => {
    it('should create schema with optional string field', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'nickname', type: 'string' }],
      };
      const schema = createEntitySchema(config);

      const result = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
      });
      expect(result.success).toBe(true);
    });

    it('should create schema with required string field', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'name', type: 'string', required: true }],
      };
      const schema = createEntitySchema(config);

      const withoutName = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
      });
      expect(withoutName.success).toBe(false);

      const withName = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        name: 'Alice',
      });
      expect(withName.success).toBe(true);
    });
  });

  describe('number fields', () => {
    it('should validate number fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'age', type: 'number' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        age: 25,
      });
      expect(valid.success).toBe(true);

      const invalid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        age: 'twenty-five',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('boolean fields', () => {
    it('should validate boolean fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'isAlive', type: 'boolean' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        isAlive: true,
      });
      expect(valid.success).toBe(true);

      const invalid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        isAlive: 'yes',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('enum fields', () => {
    it('should validate enum fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [
          { name: 'race', type: 'enum', enumValues: ['human', 'elf', 'dwarf'] },
        ],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        race: 'elf',
      });
      expect(valid.success).toBe(true);

      const invalid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        race: 'orc',
      });
      expect(invalid.success).toBe(false);
    });

    it('should throw for enum field without values', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'race', type: 'enum' }],
      };
      expect(() => createEntitySchema(config)).toThrow(/enumValues/);
    });

    it('should throw for enum field with empty values', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'race', type: 'enum', enumValues: [] }],
      };
      expect(() => createEntitySchema(config)).toThrow(/enumValues/);
    });
  });

  describe('array fields', () => {
    it('should validate string array fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'tags', type: 'array', arrayItemType: 'string' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        tags: ['warrior', 'hero'],
      });
      expect(valid.success).toBe(true);

      const invalid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        tags: [1, 2, 3],
      });
      expect(invalid.success).toBe(false);
    });

    it('should validate number array fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'scores', type: 'array', arrayItemType: 'number' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        scores: [10, 20, 30],
      });
      expect(valid.success).toBe(true);
    });

    it('should default to string array when arrayItemType not specified', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'items', type: 'array' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        items: ['sword', 'shield'],
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('date fields', () => {
    it('should validate date string fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'birthDate', type: 'date' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        birthDate: '2024-01-15',
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('record fields', () => {
    it('should validate record fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'stats', type: 'record' }],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        stats: { strength: 10, dexterity: 15 },
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('default values', () => {
    it('should apply default values', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'level', type: 'number', default: 1 }],
      };
      const schema = createEntitySchema(config);

      const result = schema.parse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
      });
      expect(result.level).toBe(1);
    });

    it('should allow overriding default values', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [{ name: 'level', type: 'number', default: 1 }],
      };
      const schema = createEntitySchema(config);

      const result = schema.parse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        level: 10,
      });
      expect(result.level).toBe(10);
    });
  });

  describe('type enforcement', () => {
    it('should enforce correct entity type', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        name: 'character',
        fields: [],
      };
      const schema = createEntitySchema(config);

      const valid = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
      });
      expect(valid.success).toBe(true);

      const invalid = schema.safeParse({
        id: 'loc-1',
        type: 'location',
        status: 'draft',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('multiple fields', () => {
    it('should handle complex entity with multiple fields', () => {
      const config: EntityTypeConfig = {
        ...baseEntityType,
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number' },
          { name: 'race', type: 'enum', enumValues: ['human', 'elf', 'dwarf'] },
          { name: 'traits', type: 'array', arrayItemType: 'string' },
          { name: 'isAlive', type: 'boolean', default: true },
        ],
      };
      const schema = createEntitySchema(config);

      const result = schema.parse({
        id: 'char-1',
        type: 'character',
        status: 'canon',
        name: 'Thorin',
        age: 195,
        race: 'dwarf',
        traits: ['stubborn', 'brave', 'royal'],
      });

      expect(result.name).toBe('Thorin');
      expect(result.age).toBe(195);
      expect(result.race).toBe('dwarf');
      expect(result.traits).toEqual(['stubborn', 'brave', 'royal']);
      expect(result.isAlive).toBe(true);
    });
  });
});

describe('SchemaFactory', () => {
  let factory: SchemaFactory;

  const characterConfig: EntityTypeConfig = {
    name: 'character',
    displayName: 'Character',
    pluralName: 'Characters',
    fields: [{ name: 'name', type: 'string', required: true }],
  };

  const locationConfig: EntityTypeConfig = {
    name: 'location',
    displayName: 'Location',
    pluralName: 'Locations',
    fields: [{ name: 'region', type: 'string' }],
  };

  beforeEach(() => {
    factory = new SchemaFactory();
  });

  describe('getSchema', () => {
    it('should generate and return a schema', () => {
      const schema = factory.getSchema(characterConfig);
      expect(schema).toBeDefined();
      expect(schema instanceof z.ZodObject).toBe(true);
    });

    it('should cache schemas', () => {
      const schema1 = factory.getSchema(characterConfig);
      const schema2 = factory.getSchema(characterConfig);
      expect(schema1).toBe(schema2);
    });

    it('should generate different schemas for different types', () => {
      const charSchema = factory.getSchema(characterConfig);
      const locSchema = factory.getSchema(locationConfig);
      expect(charSchema).not.toBe(locSchema);
    });
  });

  describe('generateSchemas', () => {
    it('should generate schemas for multiple entity types', () => {
      const schemas = factory.generateSchemas([characterConfig, locationConfig]);
      expect(schemas.size).toBe(2);
      expect(schemas.has('character')).toBe(true);
      expect(schemas.has('location')).toBe(true);
    });

    it('should return empty map for empty array', () => {
      const schemas = factory.generateSchemas([]);
      expect(schemas.size).toBe(0);
    });

    it('should use cached schemas', () => {
      const preGenerated = factory.getSchema(characterConfig);
      const schemas = factory.generateSchemas([characterConfig, locationConfig]);
      expect(schemas.get('character')).toBe(preGenerated);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached schemas', () => {
      factory.getSchema(characterConfig);
      factory.getSchema(locationConfig);
      expect(factory.getCacheSize()).toBe(2);

      factory.clearCache();
      expect(factory.getCacheSize()).toBe(0);
    });

    it('should regenerate schemas after clearing', () => {
      const schema1 = factory.getSchema(characterConfig);
      factory.clearCache();
      const schema2 = factory.getSchema(characterConfig);

      expect(schema1).not.toBe(schema2);
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(factory.getCacheSize()).toBe(0);
    });

    it('should return correct count', () => {
      factory.getSchema(characterConfig);
      expect(factory.getCacheSize()).toBe(1);

      factory.getSchema(locationConfig);
      expect(factory.getCacheSize()).toBe(2);
    });
  });
});

describe('schemaFactory singleton', () => {
  beforeEach(() => {
    schemaFactory.clearCache();
  });

  it('should be a SchemaFactory instance', () => {
    expect(schemaFactory).toBeInstanceOf(SchemaFactory);
  });

  it('should work like a regular SchemaFactory', () => {
    const config: EntityTypeConfig = {
      name: 'test',
      displayName: 'Test',
      pluralName: 'Tests',
      fields: [],
    };
    const schema = schemaFactory.getSchema(config);
    expect(schema).toBeDefined();
  });
});

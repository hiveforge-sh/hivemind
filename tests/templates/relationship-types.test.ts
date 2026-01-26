import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  RelationshipTypeConfigSchema,
  TemplateDefinitionSchema,
} from '../../src/templates/validator.js';
import { TemplateRegistry } from '../../src/templates/registry.js';
import type { TemplateDefinition, RelationshipTypeConfig } from '../../src/templates/types.js';

describe('RelationshipTypeConfigSchema', () => {
  describe('valid relationship types', () => {
    it('should accept a minimal relationship type', () => {
      const relType = {
        id: 'knows',
        displayName: 'Knows',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: false,
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.id).toBe('knows');
      expect(result.displayName).toBe('Knows');
    });

    it('should accept snake_case IDs', () => {
      const validIds = ['knows', 'allied_with', 'member_of', 'located_in'];
      for (const id of validIds) {
        const relType = {
          id,
          displayName: 'Test',
          sourceTypes: ['character'],
          targetTypes: ['character'],
          bidirectional: false,
        };
        expect(RelationshipTypeConfigSchema.parse(relType).id).toBe(id);
      }
    });

    it('should accept "any" for sourceTypes', () => {
      const relType = {
        id: 'related',
        displayName: 'Related',
        sourceTypes: 'any',
        targetTypes: ['character'],
        bidirectional: false,
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.sourceTypes).toBe('any');
    });

    it('should accept "any" for targetTypes', () => {
      const relType = {
        id: 'related',
        displayName: 'Related',
        sourceTypes: ['character'],
        targetTypes: 'any',
        bidirectional: false,
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.targetTypes).toBe('any');
    });

    it('should accept bidirectional with reverseId', () => {
      const relType = {
        id: 'located_in',
        displayName: 'Located In',
        sourceTypes: ['character'],
        targetTypes: ['location'],
        bidirectional: true,
        reverseId: 'has_inhabitant',
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.bidirectional).toBe(true);
      expect(result.reverseId).toBe('has_inhabitant');
    });

    it('should accept optional description', () => {
      const relType = {
        id: 'knows',
        displayName: 'Knows',
        description: 'Characters who know each other',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: false,
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.description).toBe('Characters who know each other');
    });

    it('should accept optional properties', () => {
      const relType = {
        id: 'knows',
        displayName: 'Knows',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: false,
        properties: [
          { name: 'status', type: 'enum', enumValues: ['friend', 'enemy', 'neutral'] },
          { name: 'since', type: 'string' },
        ],
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.properties).toHaveLength(2);
    });

    it('should accept multiple source and target types', () => {
      const relType = {
        id: 'related',
        displayName: 'Related',
        sourceTypes: ['character', 'faction', 'location'],
        targetTypes: ['character', 'faction', 'location'],
        bidirectional: false,
      };
      const result = RelationshipTypeConfigSchema.parse(relType);
      expect(result.sourceTypes).toEqual(['character', 'faction', 'location']);
      expect(result.targetTypes).toEqual(['character', 'faction', 'location']);
    });
  });

  describe('invalid relationship types', () => {
    it('should reject empty ID', () => {
      const relType = {
        id: '',
        displayName: 'Test',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow();
    });

    it('should reject IDs starting with uppercase', () => {
      const relType = {
        id: 'Knows',
        displayName: 'Knows',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow(/snake_case/);
    });

    it('should reject IDs with hyphens', () => {
      const relType = {
        id: 'located-in',
        displayName: 'Located In',
        sourceTypes: ['character'],
        targetTypes: ['location'],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow(/snake_case/);
    });

    it('should reject IDs with camelCase', () => {
      const relType = {
        id: 'locatedIn',
        displayName: 'Located In',
        sourceTypes: ['character'],
        targetTypes: ['location'],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow(/snake_case/);
    });

    it('should reject empty display name', () => {
      const relType = {
        id: 'knows',
        displayName: '',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow();
    });

    it('should reject empty sourceTypes array', () => {
      const relType = {
        id: 'knows',
        displayName: 'Knows',
        sourceTypes: [],
        targetTypes: ['character'],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow(/at least one type/);
    });

    it('should reject empty targetTypes array', () => {
      const relType = {
        id: 'knows',
        displayName: 'Knows',
        sourceTypes: ['character'],
        targetTypes: [],
        bidirectional: false,
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow(/at least one type/);
    });

    it('should reject bidirectional without reverseId', () => {
      const relType = {
        id: 'knows',
        displayName: 'Knows',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: true,
        // Missing reverseId
      };
      expect(() => RelationshipTypeConfigSchema.parse(relType)).toThrow(/reverseId/);
    });
  });
});

describe('TemplateDefinitionSchema with relationshipTypes', () => {
  const validTemplate: TemplateDefinition = {
    id: 'test-template',
    name: 'Test Template',
    version: '1.0.0',
    entityTypes: [
      {
        name: 'character',
        displayName: 'Character',
        pluralName: 'Characters',
        fields: [],
      },
      {
        name: 'location',
        displayName: 'Location',
        pluralName: 'Locations',
        fields: [],
      },
    ],
    relationshipTypes: [
      {
        id: 'knows',
        displayName: 'Knows',
        sourceTypes: ['character'],
        targetTypes: ['character'],
        bidirectional: true,
        reverseId: 'knows',
      },
    ],
  };

  it('should accept template with relationshipTypes', () => {
    const result = TemplateDefinitionSchema.parse(validTemplate);
    expect(result.relationshipTypes).toHaveLength(1);
    expect(result.relationshipTypes![0].id).toBe('knows');
  });

  it('should accept template without relationshipTypes', () => {
    const templateWithoutRels = {
      id: 'test-template',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'item',
          displayName: 'Item',
          pluralName: 'Items',
          fields: [],
        },
      ],
    };
    const result = TemplateDefinitionSchema.parse(templateWithoutRels);
    expect(result.relationshipTypes).toBeUndefined();
  });

  it('should accept template with empty relationshipTypes array', () => {
    const template = { ...validTemplate, relationshipTypes: [] };
    const result = TemplateDefinitionSchema.parse(template);
    expect(result.relationshipTypes).toEqual([]);
  });

  it('should validate nested relationship types', () => {
    const template = {
      ...validTemplate,
      relationshipTypes: [
        {
          id: 'INVALID',
          displayName: 'Test',
          sourceTypes: ['character'],
          targetTypes: ['character'],
          bidirectional: false,
        },
      ],
    };
    expect(() => TemplateDefinitionSchema.parse(template)).toThrow(/snake_case/);
  });
});

describe('TemplateRegistry relationship methods', () => {
  let registry: TemplateRegistry;

  const testTemplate: TemplateDefinition = {
    id: 'test-template',
    name: 'Test Template',
    version: '1.0.0',
    entityTypes: [
      { name: 'character', displayName: 'Character', pluralName: 'Characters', fields: [] },
      { name: 'location', displayName: 'Location', pluralName: 'Locations', fields: [] },
      { name: 'faction', displayName: 'Faction', pluralName: 'Factions', fields: [] },
    ],
    relationshipTypes: [
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
        sourceTypes: ['character'],
        targetTypes: ['location'],
        bidirectional: true,
        reverseId: 'has_inhabitant',
      },
      {
        id: 'has_inhabitant',
        displayName: 'Has Inhabitant',
        sourceTypes: ['location'],
        targetTypes: ['character'],
        bidirectional: false,
      },
      {
        id: 'member_of',
        displayName: 'Member Of',
        sourceTypes: ['character'],
        targetTypes: ['faction'],
        bidirectional: true,
        reverseId: 'has_member',
      },
      {
        id: 'related',
        displayName: 'Related',
        sourceTypes: 'any',
        targetTypes: 'any',
        bidirectional: true,
        reverseId: 'related',
      },
    ],
  };

  beforeEach(() => {
    registry = new TemplateRegistry();
    registry.register(testTemplate, 'builtin');
    registry.activate('test-template');
  });

  afterEach(() => {
    registry.clear();
  });

  describe('getRelationshipType', () => {
    it('should return relationship type config by ID', () => {
      const relType = registry.getRelationshipType('knows');
      expect(relType).toBeDefined();
      expect(relType!.id).toBe('knows');
      expect(relType!.displayName).toBe('Knows');
    });

    it('should return undefined for unknown relationship type', () => {
      const relType = registry.getRelationshipType('unknown');
      expect(relType).toBeUndefined();
    });

    it('should throw if no template is active', () => {
      registry.clear();
      expect(() => registry.getRelationshipType('knows')).toThrow(/no active template/);
    });
  });

  describe('getRelationshipTypes', () => {
    it('should return all relationship types', () => {
      const relTypes = registry.getRelationshipTypes();
      expect(relTypes).toHaveLength(5);
      expect(relTypes.map((r) => r.id)).toContain('knows');
      expect(relTypes.map((r) => r.id)).toContain('located_in');
    });

    it('should return empty array for template without relationship types', () => {
      registry.clear();
      const templateWithoutRels = {
        id: 'no-rels',
        name: 'No Rels',
        version: '1.0.0',
        entityTypes: [{ name: 'item', displayName: 'Item', pluralName: 'Items', fields: [] }],
      };
      registry.register(templateWithoutRels, 'config');
      registry.activate('no-rels');

      const relTypes = registry.getRelationshipTypes();
      expect(relTypes).toEqual([]);
    });

    it('should throw if no template is active', () => {
      registry.clear();
      expect(() => registry.getRelationshipTypes()).toThrow(/no active template/);
    });
  });

  describe('getValidRelationships', () => {
    it('should return relationships for character → character', () => {
      const validRels = registry.getValidRelationships('character', 'character');
      expect(validRels.map((r) => r.id)).toContain('knows');
      expect(validRels.map((r) => r.id)).toContain('related');
    });

    it('should return relationships for character → location', () => {
      const validRels = registry.getValidRelationships('character', 'location');
      expect(validRels.map((r) => r.id)).toContain('located_in');
      expect(validRels.map((r) => r.id)).toContain('related');
      expect(validRels.map((r) => r.id)).not.toContain('knows');
    });

    it('should return relationships for character → faction', () => {
      const validRels = registry.getValidRelationships('character', 'faction');
      expect(validRels.map((r) => r.id)).toContain('member_of');
      expect(validRels.map((r) => r.id)).toContain('related');
    });

    it('should return "any" relationships for unknown type pairs', () => {
      const validRels = registry.getValidRelationships('unknown', 'unknown');
      expect(validRels.map((r) => r.id)).toContain('related');
      expect(validRels).toHaveLength(1);
    });

    it('should include relationships with "any" sourceTypes', () => {
      const validRels = registry.getValidRelationships('character', 'character');
      const relatedRel = validRels.find((r) => r.id === 'related');
      expect(relatedRel).toBeDefined();
    });

    it('should throw if no template is active', () => {
      registry.clear();
      expect(() => registry.getValidRelationships('character', 'character')).toThrow(
        /no active template/
      );
    });
  });

  describe('register with duplicate relationship types', () => {
    it('should throw error for duplicate relationship type IDs', () => {
      const templateWithDuplicates: TemplateDefinition = {
        id: 'duplicate-rels',
        name: 'Duplicate Rels',
        version: '1.0.0',
        entityTypes: [{ name: 'item', displayName: 'Item', pluralName: 'Items', fields: [] }],
        relationshipTypes: [
          {
            id: 'test_rel',
            displayName: 'Test',
            sourceTypes: ['item'],
            targetTypes: ['item'],
            bidirectional: false,
          },
          {
            id: 'test_rel',
            displayName: 'Test Duplicate',
            sourceTypes: ['item'],
            targetTypes: ['item'],
            bidirectional: false,
          },
        ],
      };

      registry.clear();
      expect(() => registry.register(templateWithDuplicates, 'config')).toThrow(
        /Duplicate relationship type/
      );
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  FieldConfigSchema,
  EntityTypeConfigSchema,
  TemplateDefinitionSchema,
  TemplateConfigSchema,
  TemplateValidationError,
  validateTemplateConfig,
} from '../../src/templates/validator.js';

describe('FieldConfigSchema', () => {
  describe('valid fields', () => {
    it('should accept a minimal string field', () => {
      const field = { name: 'title', type: 'string' };
      const result = FieldConfigSchema.parse(field);
      expect(result.name).toBe('title');
      expect(result.type).toBe('string');
    });

    it('should accept all basic field types', () => {
      const types = ['string', 'number', 'boolean', 'date', 'record'] as const;
      for (const type of types) {
        const field = { name: 'myField', type };
        expect(FieldConfigSchema.parse(field).type).toBe(type);
      }
    });

    it('should accept an enum field with values', () => {
      const field = {
        name: 'status',
        type: 'enum',
        enumValues: ['draft', 'published', 'archived'],
      };
      const result = FieldConfigSchema.parse(field);
      expect(result.enumValues).toEqual(['draft', 'published', 'archived']);
    });

    it('should accept an array field with item type', () => {
      const field = {
        name: 'tags',
        type: 'array',
        arrayItemType: 'string',
      };
      const result = FieldConfigSchema.parse(field);
      expect(result.arrayItemType).toBe('string');
    });

    it('should accept required flag', () => {
      const field = { name: 'name', type: 'string', required: true };
      const result = FieldConfigSchema.parse(field);
      expect(result.required).toBe(true);
    });

    it('should accept default value', () => {
      const field = { name: 'count', type: 'number', default: 0 };
      const result = FieldConfigSchema.parse(field);
      expect(result.default).toBe(0);
    });

    it('should accept description', () => {
      const field = { name: 'bio', type: 'string', description: 'Character biography' };
      const result = FieldConfigSchema.parse(field);
      expect(result.description).toBe('Character biography');
    });

    it('should accept camelCase field names', () => {
      const validNames = ['age', 'firstName', 'statusCode', 'myLongFieldName123'];
      for (const name of validNames) {
        const field = { name, type: 'string' };
        expect(FieldConfigSchema.parse(field).name).toBe(name);
      }
    });
  });

  describe('invalid fields', () => {
    it('should reject empty field name', () => {
      const field = { name: '', type: 'string' };
      expect(() => FieldConfigSchema.parse(field)).toThrow();
    });

    it('should reject field names starting with uppercase', () => {
      const field = { name: 'Title', type: 'string' };
      expect(() => FieldConfigSchema.parse(field)).toThrow(/camelCase/);
    });

    it('should accept field names with underscores', () => {
      const field = { name: 'my_field', type: 'string' };
      const result = FieldConfigSchema.parse(field);
      expect(result.name).toBe('my_field');
    });

    it('should reject field names with hyphens', () => {
      const field = { name: 'my-field', type: 'string' };
      expect(() => FieldConfigSchema.parse(field)).toThrow(/camelCase/);
    });

    it('should reject invalid field type', () => {
      const field = { name: 'test', type: 'invalid' };
      expect(() => FieldConfigSchema.parse(field)).toThrow();
    });

    it('should reject enum field without enumValues', () => {
      const field = { name: 'status', type: 'enum' };
      expect(() => FieldConfigSchema.parse(field)).toThrow(/enumValues/);
    });

    it('should reject enum field with empty enumValues', () => {
      const field = { name: 'status', type: 'enum', enumValues: [] };
      expect(() => FieldConfigSchema.parse(field)).toThrow(/enumValues/);
    });
  });
});

describe('EntityTypeConfigSchema', () => {
  const validEntityType = {
    name: 'character',
    displayName: 'Character',
    pluralName: 'Characters',
    fields: [{ name: 'name', type: 'string', required: true }],
  };

  describe('valid entity types', () => {
    it('should accept a minimal entity type', () => {
      const result = EntityTypeConfigSchema.parse(validEntityType);
      expect(result.name).toBe('character');
      expect(result.displayName).toBe('Character');
    });

    it('should accept optional description', () => {
      const entityType = { ...validEntityType, description: 'NPCs and player characters' };
      const result = EntityTypeConfigSchema.parse(entityType);
      expect(result.description).toBe('NPCs and player characters');
    });

    it('should accept optional icon', () => {
      const entityType = { ...validEntityType, icon: 'user' };
      const result = EntityTypeConfigSchema.parse(entityType);
      expect(result.icon).toBe('user');
    });

    it('should accept multiple fields', () => {
      const entityType = {
        ...validEntityType,
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'age', type: 'number' },
          { name: 'traits', type: 'array', arrayItemType: 'string' },
        ],
      };
      const result = EntityTypeConfigSchema.parse(entityType);
      expect(result.fields).toHaveLength(3);
    });

    it('should accept empty fields array', () => {
      const entityType = { ...validEntityType, fields: [] };
      const result = EntityTypeConfigSchema.parse(entityType);
      expect(result.fields).toHaveLength(0);
    });
  });

  describe('invalid entity types', () => {
    it('should reject empty entity type name', () => {
      const entityType = { ...validEntityType, name: '' };
      expect(() => EntityTypeConfigSchema.parse(entityType)).toThrow();
    });

    it('should reject uppercase entity type name', () => {
      const entityType = { ...validEntityType, name: 'Character' };
      expect(() => EntityTypeConfigSchema.parse(entityType)).toThrow(/lowercase/);
    });

    it('should reject entity type name with hyphens', () => {
      const entityType = { ...validEntityType, name: 'player-character' };
      expect(() => EntityTypeConfigSchema.parse(entityType)).toThrow(/lowercase alphanumeric/);
    });

    it('should reject empty display name', () => {
      const entityType = { ...validEntityType, displayName: '' };
      expect(() => EntityTypeConfigSchema.parse(entityType)).toThrow();
    });

    it('should reject empty plural name', () => {
      const entityType = { ...validEntityType, pluralName: '' };
      expect(() => EntityTypeConfigSchema.parse(entityType)).toThrow();
    });

    it('should reject invalid field in fields array', () => {
      const entityType = {
        ...validEntityType,
        fields: [{ name: 'Invalid', type: 'string' }],
      };
      expect(() => EntityTypeConfigSchema.parse(entityType)).toThrow();
    });
  });
});

describe('TemplateDefinitionSchema', () => {
  const validTemplate = {
    id: 'worldbuilding',
    name: 'Worldbuilding',
    version: '1.0.0',
    entityTypes: [
      {
        name: 'character',
        displayName: 'Character',
        pluralName: 'Characters',
        fields: [],
      },
    ],
  };

  describe('valid templates', () => {
    it('should accept a minimal template', () => {
      const result = TemplateDefinitionSchema.parse(validTemplate);
      expect(result.id).toBe('worldbuilding');
      expect(result.name).toBe('Worldbuilding');
      expect(result.version).toBe('1.0.0');
    });

    it('should accept template with hyphenated ID', () => {
      const template = { ...validTemplate, id: 'game-design' };
      const result = TemplateDefinitionSchema.parse(template);
      expect(result.id).toBe('game-design');
    });

    it('should accept optional description', () => {
      const template = { ...validTemplate, description: 'A template for worldbuilding' };
      const result = TemplateDefinitionSchema.parse(template);
      expect(result.description).toBe('A template for worldbuilding');
    });

    it('should accept multiple entity types', () => {
      const template = {
        ...validTemplate,
        entityTypes: [
          { name: 'character', displayName: 'Character', pluralName: 'Characters', fields: [] },
          { name: 'location', displayName: 'Location', pluralName: 'Locations', fields: [] },
          { name: 'event', displayName: 'Event', pluralName: 'Events', fields: [] },
        ],
      };
      const result = TemplateDefinitionSchema.parse(template);
      expect(result.entityTypes).toHaveLength(3);
    });
  });

  describe('invalid templates', () => {
    it('should reject empty template ID', () => {
      const template = { ...validTemplate, id: '' };
      expect(() => TemplateDefinitionSchema.parse(template)).toThrow();
    });

    it('should reject uppercase template ID', () => {
      const template = { ...validTemplate, id: 'Worldbuilding' };
      expect(() => TemplateDefinitionSchema.parse(template)).toThrow(/lowercase/);
    });

    it('should reject template ID with underscores', () => {
      const template = { ...validTemplate, id: 'world_building' };
      expect(() => TemplateDefinitionSchema.parse(template)).toThrow(/lowercase alphanumeric with hyphens/);
    });

    it('should reject empty template name', () => {
      const template = { ...validTemplate, name: '' };
      expect(() => TemplateDefinitionSchema.parse(template)).toThrow();
    });

    it('should reject invalid version format', () => {
      const invalidVersions = ['1.0', '1', 'v1.0.0', '1.0.0-beta', 'invalid'];
      for (const version of invalidVersions) {
        const template = { ...validTemplate, version };
        expect(() => TemplateDefinitionSchema.parse(template)).toThrow(/semantic versioning/);
      }
    });

    it('should accept valid semantic versions', () => {
      const validVersions = ['1.0.0', '0.1.0', '2.10.100', '99.99.99'];
      for (const version of validVersions) {
        const template = { ...validTemplate, version };
        expect(TemplateDefinitionSchema.parse(template).version).toBe(version);
      }
    });

    it('should reject empty entity types array', () => {
      const template = { ...validTemplate, entityTypes: [] };
      expect(() => TemplateDefinitionSchema.parse(template)).toThrow(/at least one entity type/);
    });
  });
});

describe('TemplateConfigSchema', () => {
  describe('valid configs', () => {
    it('should accept minimal config with activeTemplate', () => {
      const config = { activeTemplate: 'worldbuilding' };
      const result = TemplateConfigSchema.parse(config);
      expect(result.activeTemplate).toBe('worldbuilding');
    });

    it('should accept config with empty templates array', () => {
      const config = { activeTemplate: 'worldbuilding', templates: [] };
      const result = TemplateConfigSchema.parse(config);
      expect(result.templates).toEqual([]);
    });

    it('should accept config with valid templates', () => {
      const config = {
        activeTemplate: 'custom',
        templates: [
          {
            id: 'custom',
            name: 'Custom Template',
            version: '1.0.0',
            entityTypes: [
              { name: 'item', displayName: 'Item', pluralName: 'Items', fields: [] },
            ],
          },
        ],
      };
      const result = TemplateConfigSchema.parse(config);
      expect(result.templates).toHaveLength(1);
    });
  });

  describe('invalid configs', () => {
    it('should reject empty activeTemplate', () => {
      const config = { activeTemplate: '' };
      expect(() => TemplateConfigSchema.parse(config)).toThrow();
    });

    it('should reject missing activeTemplate', () => {
      const config = { templates: [] };
      expect(() => TemplateConfigSchema.parse(config)).toThrow();
    });
  });
});

describe('TemplateValidationError', () => {
  it('should store error message and issues', () => {
    const issues = [
      { code: 'custom', path: ['templates', 0, 'id'], message: 'Invalid ID' },
    ] as any;
    const error = new TemplateValidationError('Validation failed', issues);

    expect(error.message).toBe('Validation failed');
    expect(error.issues).toBe(issues);
    expect(error.name).toBe('TemplateValidationError');
  });

  it('should format user-friendly message', () => {
    const issues = [
      { code: 'custom', path: ['templates', 0, 'id'], message: 'Invalid ID format' },
      { code: 'custom', path: ['templates', 0, 'version'], message: 'Must be semver' },
    ] as any;
    const error = new TemplateValidationError('Validation failed', issues);
    const userMessage = error.toUserMessage();

    expect(userMessage).toContain('Template configuration validation failed');
    expect(userMessage).toContain('templates.0.id: Invalid ID format');
    expect(userMessage).toContain('templates.0.version: Must be semver');
  });

  it('should handle root-level errors', () => {
    const issues = [{ code: 'custom', path: [], message: 'Config required' }] as any;
    const error = new TemplateValidationError('Validation failed', issues);
    const userMessage = error.toUserMessage();

    expect(userMessage).toContain('root: Config required');
  });
});

describe('validateTemplateConfig', () => {
  it('should return validated config for valid input', () => {
    const config = { activeTemplate: 'worldbuilding' };
    const result = validateTemplateConfig(config);
    expect(result.activeTemplate).toBe('worldbuilding');
  });

  it('should throw TemplateValidationError for invalid input', () => {
    const config = { activeTemplate: '' };
    expect(() => validateTemplateConfig(config)).toThrow(TemplateValidationError);
  });

  it('should include validation issues in error', () => {
    const config = { activeTemplate: '' };
    try {
      validateTemplateConfig(config);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateValidationError);
      expect((err as TemplateValidationError).issues.length).toBeGreaterThan(0);
    }
  });

  it('should validate nested template definitions', () => {
    const config = {
      activeTemplate: 'custom',
      templates: [
        {
          id: 'INVALID',
          name: 'Test',
          version: '1.0.0',
          entityTypes: [{ name: 'test', displayName: 'Test', pluralName: 'Tests', fields: [] }],
        },
      ],
    };
    expect(() => validateTemplateConfig(config)).toThrow(TemplateValidationError);
  });
});

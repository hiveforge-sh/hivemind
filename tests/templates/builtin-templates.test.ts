import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateRegistry } from '../../src/templates/registry.js';
import { TemplateDefinitionSchema } from '../../src/templates/validator.js';
import { schemaFactory } from '../../src/templates/schema-factory.js';
import { worldbuildingTemplate } from '../../src/templates/builtin/worldbuilding.js';
import { researchTemplate } from '../../src/templates/builtin/research.js';
import { peopleManagementTemplate } from '../../src/templates/builtin/people-management.js';

describe('Built-in Templates', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
    schemaFactory.clearCache();
  });

  afterEach(() => {
    registry.clear();
    schemaFactory.clearCache();
  });

  describe('worldbuilding template', () => {
    it('should pass schema validation', () => {
      const result = TemplateDefinitionSchema.safeParse(worldbuildingTemplate);
      if (!result.success) {
        throw new Error('Worldbuilding validation errors: ' + JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should register successfully', () => {
      expect(() => registry.register(worldbuildingTemplate, 'builtin')).not.toThrow();
      expect(registry.has('worldbuilding')).toBe(true);
    });

    it('should have all expected entity types', () => {
      registry.register(worldbuildingTemplate, 'builtin');
      registry.activate('worldbuilding');

      const entityTypes = registry.getEntityTypes();
      const typeNames = entityTypes.map((e) => e.name);

      expect(typeNames).toContain('character');
      expect(typeNames).toContain('location');
      expect(typeNames).toContain('event');
      expect(typeNames).toContain('faction');
      expect(typeNames).toContain('lore');
      expect(typeNames).toContain('asset');
      expect(typeNames).toContain('reference');
    });

    it('should have relationship types defined', () => {
      registry.register(worldbuildingTemplate, 'builtin');
      registry.activate('worldbuilding');

      const relTypes = registry.getRelationshipTypes();
      const relIds = relTypes.map((r) => r.id);

      expect(relIds).toContain('knows');
      expect(relIds).toContain('located_in');
      expect(relIds).toContain('has_inhabitant');
      expect(relIds).toContain('member_of');
      expect(relIds).toContain('allied_with');
      expect(relIds).toContain('related');
    });

    it('should generate valid schemas for all entity types', () => {
      registry.register(worldbuildingTemplate, 'builtin');
      registry.activate('worldbuilding');

      schemaFactory.generateSchemas(worldbuildingTemplate.entityTypes);

      for (const entityType of worldbuildingTemplate.entityTypes) {
        const schema = schemaFactory.getSchema(entityType);
        expect(schema).toBeDefined();
      }
    });
  });

  describe('research template', () => {
    it('should pass schema validation', () => {
      const result = TemplateDefinitionSchema.safeParse(researchTemplate);
      expect(result.success).toBe(true);
    });

    it('should register successfully', () => {
      expect(() => registry.register(researchTemplate, 'builtin')).not.toThrow();
      expect(registry.has('research')).toBe(true);
    });

    it('should have all expected entity types', () => {
      registry.register(researchTemplate, 'builtin');
      registry.activate('research');

      const entityTypes = registry.getEntityTypes();
      const typeNames = entityTypes.map((e) => e.name);

      expect(typeNames).toContain('paper');
      expect(typeNames).toContain('citation');
      expect(typeNames).toContain('concept');
      expect(typeNames).toContain('note');
    });

    it('should have relationship types defined', () => {
      registry.register(researchTemplate, 'builtin');
      registry.activate('research');

      const relTypes = registry.getRelationshipTypes();
      const relIds = relTypes.map((r) => r.id);

      expect(relIds).toContain('cites');
      expect(relIds).toContain('cited_by');
      expect(relIds).toContain('defines');
      expect(relIds).toContain('related_concept');
      expect(relIds).toContain('about');
      expect(relIds).toContain('related');
    });

    it('should generate valid schemas for all entity types', () => {
      registry.register(researchTemplate, 'builtin');
      registry.activate('research');

      schemaFactory.generateSchemas(researchTemplate.entityTypes);

      for (const entityType of researchTemplate.entityTypes) {
        const schema = schemaFactory.getSchema(entityType);
        expect(schema).toBeDefined();
      }
    });

    it('should validate paper entity with required fields', () => {
      registry.register(researchTemplate, 'builtin');
      registry.activate('research');

      schemaFactory.generateSchemas(researchTemplate.entityTypes);

      const paperType = researchTemplate.entityTypes.find((e) => e.name === 'paper')!;
      const paperSchema = schemaFactory.getSchema(paperType);

      // Valid paper
      const validPaper = {
        id: 'test-paper',
        type: 'paper',
        status: 'draft',
        title: 'Test Paper',
        authors: ['John Doe'],
      };
      expect(() => paperSchema.parse(validPaper)).not.toThrow();

      // Invalid paper (missing required authors)
      const invalidPaper = {
        id: 'test-paper',
        type: 'paper',
        status: 'draft',
        title: 'Test Paper',
        // authors missing
      };
      expect(() => paperSchema.parse(invalidPaper)).toThrow();
    });
  });

  describe('people-management template', () => {
    it('should pass schema validation', () => {
      const result = TemplateDefinitionSchema.safeParse(peopleManagementTemplate);
      if (!result.success) {
        throw new Error('People-management validation errors: ' + JSON.stringify(result.error.issues, null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should register successfully', () => {
      expect(() => registry.register(peopleManagementTemplate, 'builtin')).not.toThrow();
      expect(registry.has('people-management')).toBe(true);
    });

    it('should have all expected entity types', () => {
      registry.register(peopleManagementTemplate, 'builtin');
      registry.activate('people-management');

      const entityTypes = registry.getEntityTypes();
      const typeNames = entityTypes.map((e) => e.name);

      expect(typeNames).toContain('person');
      expect(typeNames).toContain('goal');
      expect(typeNames).toContain('team');
      expect(typeNames).toContain('one_on_one');
    });

    it('should have relationship types defined', () => {
      registry.register(peopleManagementTemplate, 'builtin');
      registry.activate('people-management');

      const relTypes = registry.getRelationshipTypes();
      const relIds = relTypes.map((r) => r.id);

      expect(relIds).toContain('member_of');
      expect(relIds).toContain('reports_to');
      expect(relIds).toContain('manages');
      expect(relIds).toContain('leads');
      expect(relIds).toContain('owns_goal');
      expect(relIds).toContain('attended');
      expect(relIds).toContain('related');
    });

    it('should generate valid schemas for all entity types', () => {
      registry.register(peopleManagementTemplate, 'builtin');
      registry.activate('people-management');

      schemaFactory.generateSchemas(peopleManagementTemplate.entityTypes);

      for (const entityType of peopleManagementTemplate.entityTypes) {
        const schema = schemaFactory.getSchema(entityType);
        expect(schema).toBeDefined();
      }
    });

    it('should validate one_on_one entity with required fields', () => {
      registry.register(peopleManagementTemplate, 'builtin');
      registry.activate('people-management');

      schemaFactory.generateSchemas(peopleManagementTemplate.entityTypes);

      const oneOnOneType = peopleManagementTemplate.entityTypes.find((e) => e.name === 'one_on_one')!;
      const oneOnOneSchema = schemaFactory.getSchema(oneOnOneType);

      // Valid 1:1
      const valid1on1 = {
        id: 'test-1on1',
        type: 'one_on_one',
        status: 'draft',
        title: '2024-01-22: Test 1:1',
        date: '2024-01-22',
        manager: 'manager-id',
        directReport: 'report-id',
      };
      expect(() => oneOnOneSchema.parse(valid1on1)).not.toThrow();

      // Invalid 1:1 (missing required manager)
      const invalid1on1 = {
        id: 'test-1on1',
        type: 'one_on_one',
        status: 'draft',
        title: '2024-01-22: Test 1:1',
        date: '2024-01-22',
        // manager missing
        directReport: 'report-id',
      };
      expect(() => oneOnOneSchema.parse(invalid1on1)).toThrow();
    });
  });

  describe('all templates registered together', () => {
    it('should register all built-in templates without conflicts', () => {
      expect(() => {
        registry.register(worldbuildingTemplate, 'builtin');
        registry.register(researchTemplate, 'builtin');
        registry.register(peopleManagementTemplate, 'builtin');
      }).not.toThrow();

      expect(registry.listTemplates()).toHaveLength(3);
      expect(registry.listTemplates()).toContain('worldbuilding');
      expect(registry.listTemplates()).toContain('research');
      expect(registry.listTemplates()).toContain('people-management');
    });

    it('should switch between templates', () => {
      registry.register(worldbuildingTemplate, 'builtin');
      registry.register(researchTemplate, 'builtin');
      registry.register(peopleManagementTemplate, 'builtin');

      // Activate worldbuilding
      registry.activate('worldbuilding');
      expect(registry.getActive()?.id).toBe('worldbuilding');
      expect(registry.getEntityType('character')).toBeDefined();
      expect(registry.getEntityType('paper')).toBeUndefined();

      // Switch to research
      registry.activate('research');
      expect(registry.getActive()?.id).toBe('research');
      expect(registry.getEntityType('paper')).toBeDefined();
      expect(registry.getEntityType('character')).toBeUndefined();

      // Switch to people-management
      registry.activate('people-management');
      expect(registry.getActive()?.id).toBe('people-management');
      expect(registry.getEntityType('person')).toBeDefined();
      expect(registry.getEntityType('paper')).toBeUndefined();
    });
  });

  describe('relationship type validation', () => {
    it('should have valid bidirectional relationships in worldbuilding', () => {
      registry.register(worldbuildingTemplate, 'builtin');
      registry.activate('worldbuilding');

      const relTypes = registry.getRelationshipTypes();

      for (const rel of relTypes) {
        if (rel.bidirectional) {
          expect(rel.reverseId).toBeDefined();
          // The reverse relationship should also exist
          const reverseRel = relTypes.find((r) => r.id === rel.reverseId);
          expect(reverseRel).toBeDefined();
        }
      }
    });

    it('should have valid bidirectional relationships in research', () => {
      registry.register(researchTemplate, 'builtin');
      registry.activate('research');

      const relTypes = registry.getRelationshipTypes();

      for (const rel of relTypes) {
        if (rel.bidirectional) {
          expect(rel.reverseId).toBeDefined();
          const reverseRel = relTypes.find((r) => r.id === rel.reverseId);
          expect(reverseRel).toBeDefined();
        }
      }
    });

    it('should have valid bidirectional relationships in people-management', () => {
      registry.register(peopleManagementTemplate, 'builtin');
      registry.activate('people-management');

      const relTypes = registry.getRelationshipTypes();

      for (const rel of relTypes) {
        if (rel.bidirectional) {
          expect(rel.reverseId).toBeDefined();
          const reverseRel = relTypes.find((r) => r.id === rel.reverseId);
          expect(reverseRel).toBeDefined();
        }
      }
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateDefinitionSchema } from '../../src/templates/validator.js';
import { architectureTemplate } from '../../src/templates/community/architecture.js';
import { uxResearchTemplate } from '../../src/templates/community/ux-research.js';
import { communityTemplates, getCommunityTemplate, listCommunityTemplateIds } from '../../src/templates/community/index.js';
import { templateRegistry } from '../../src/templates/registry.js';
import { schemaFactory } from '../../src/templates/schema-factory.js';

describe('Community Templates', () => {
  beforeEach(() => {
    templateRegistry.clear();
    schemaFactory.clearCache();
  });

  afterEach(() => {
    templateRegistry.clear();
    schemaFactory.clearCache();
  });

  describe('architectureTemplate', () => {
    it('should pass schema validation', () => {
      const result = TemplateDefinitionSchema.safeParse(architectureTemplate);
      expect(result.success).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(architectureTemplate.id).toBe('software-architecture');
      expect(architectureTemplate.name).toBe('Software Architecture');
      expect(architectureTemplate.version).toBe('1.0.0');
    });

    it('should have all required entity types', () => {
      const entityNames = architectureTemplate.entityTypes.map(e => e.name);
      expect(entityNames).toContain('system');
      expect(entityNames).toContain('component');
      expect(entityNames).toContain('decision');
      expect(entityNames).toContain('constraint');
      expect(entityNames).toContain('interface');
    });

    it('should have ADR-specific fields on decision entity', () => {
      const decision = architectureTemplate.entityTypes.find(e => e.name === 'decision');
      expect(decision).toBeDefined();

      const fieldNames = decision!.fields.map(f => f.name);
      expect(fieldNames).toContain('decisionStatus');
      expect(fieldNames).toContain('date');
      expect(fieldNames).toContain('deciders');
      expect(fieldNames).toContain('context');
      expect(fieldNames).toContain('alternatives');
      expect(fieldNames).toContain('consequences');
    });

    it('should have required fields marked correctly', () => {
      const decision = architectureTemplate.entityTypes.find(e => e.name === 'decision');
      const statusField = decision!.fields.find(f => f.name === 'decisionStatus');
      const dateField = decision!.fields.find(f => f.name === 'date');

      expect(statusField?.required).toBe(true);
      expect(dateField?.required).toBe(true);
    });

    it('should have relationship types defined', () => {
      expect(architectureTemplate.relationshipTypes).toBeDefined();
      expect(architectureTemplate.relationshipTypes!.length).toBeGreaterThan(0);
    });

    it('should have key architectural relationships', () => {
      const relIds = architectureTemplate.relationshipTypes!.map(r => r.id);
      expect(relIds).toContain('depends_on');
      expect(relIds).toContain('part_of');
      expect(relIds).toContain('supersedes');
      expect(relIds).toContain('motivated_by');
      expect(relIds).toContain('affects');
      expect(relIds).toContain('violates');
    });

    it('should have bidirectional relationships configured correctly', () => {
      const partOf = architectureTemplate.relationshipTypes!.find(r => r.id === 'part_of');
      expect(partOf?.bidirectional).toBe(true);
      expect(partOf?.reverseId).toBe('contains');
    });

    it('should register and activate correctly', () => {
      templateRegistry.register(architectureTemplate, 'config');
      templateRegistry.activate('software-architecture');

      const active = templateRegistry.getActive();
      expect(active?.id).toBe('software-architecture');
    });

    it('should generate schemas for all entity types', () => {
      templateRegistry.register(architectureTemplate, 'config');
      templateRegistry.activate('software-architecture');

      schemaFactory.generateSchemas(architectureTemplate.entityTypes);

      for (const entityType of architectureTemplate.entityTypes) {
        const schema = schemaFactory.getSchema(entityType);
        expect(schema).toBeDefined();
      }
    });
  });

  describe('uxResearchTemplate', () => {
    it('should pass schema validation', () => {
      const result = TemplateDefinitionSchema.safeParse(uxResearchTemplate);
      expect(result.success).toBe(true);
    });

    it('should have correct metadata', () => {
      expect(uxResearchTemplate.id).toBe('ux-research');
      expect(uxResearchTemplate.name).toBe('UX Research');
      expect(uxResearchTemplate.version).toBe('1.0.0');
    });

    it('should have all required entity types', () => {
      const entityNames = uxResearchTemplate.entityTypes.map(e => e.name);
      expect(entityNames).toContain('interview');
      expect(entityNames).toContain('insight');
      expect(entityNames).toContain('hypothesis');
      expect(entityNames).toContain('persona');
      expect(entityNames).toContain('experiment');
    });

    it('should have research-specific fields on interview entity', () => {
      const interview = uxResearchTemplate.entityTypes.find(e => e.name === 'interview');
      expect(interview).toBeDefined();

      const fieldNames = interview!.fields.map(f => f.name);
      expect(fieldNames).toContain('participant');
      expect(fieldNames).toContain('date');
      expect(fieldNames).toContain('method');
      expect(fieldNames).toContain('segment');
      expect(fieldNames).toContain('keyQuotes');
    });

    it('should have hypothesis validation fields', () => {
      const hypothesis = uxResearchTemplate.entityTypes.find(e => e.name === 'hypothesis');
      expect(hypothesis).toBeDefined();

      const fieldNames = hypothesis!.fields.map(f => f.name);
      expect(fieldNames).toContain('hypothesisStatus');
      expect(fieldNames).toContain('metric');
      expect(fieldNames).toContain('target');
    });

    it('should have persona fields for user representation', () => {
      const persona = uxResearchTemplate.entityTypes.find(e => e.name === 'persona');
      expect(persona).toBeDefined();

      const fieldNames = persona!.fields.map(f => f.name);
      expect(fieldNames).toContain('segment');
      expect(fieldNames).toContain('goals');
      expect(fieldNames).toContain('frustrations');
      expect(fieldNames).toContain('behaviors');
    });

    it('should have evidence relationships', () => {
      const relIds = uxResearchTemplate.relationshipTypes!.map(r => r.id);
      expect(relIds).toContain('supports');
      expect(relIds).toContain('contradicts');
      expect(relIds).toContain('derived_from');
      expect(relIds).toContain('validates');
      expect(relIds).toContain('invalidates');
    });

    it('should register and activate correctly', () => {
      templateRegistry.register(uxResearchTemplate, 'config');
      templateRegistry.activate('ux-research');

      const active = templateRegistry.getActive();
      expect(active?.id).toBe('ux-research');
    });

    it('should generate schemas for all entity types', () => {
      templateRegistry.register(uxResearchTemplate, 'config');
      templateRegistry.activate('ux-research');

      schemaFactory.generateSchemas(uxResearchTemplate.entityTypes);

      for (const entityType of uxResearchTemplate.entityTypes) {
        const schema = schemaFactory.getSchema(entityType);
        expect(schema).toBeDefined();
      }
    });
  });

  describe('communityTemplates index', () => {
    it('should export architectureTemplate in array', () => {
      expect(communityTemplates).toContain(architectureTemplate);
    });

    it('should export uxResearchTemplate in array', () => {
      expect(communityTemplates).toContain(uxResearchTemplate);
    });

    it('should find template by ID', () => {
      const found = getCommunityTemplate('software-architecture');
      expect(found).toBe(architectureTemplate);
    });

    it('should find ux-research template by ID', () => {
      const found = getCommunityTemplate('ux-research');
      expect(found).toBe(uxResearchTemplate);
    });

    it('should return undefined for unknown ID', () => {
      const found = getCommunityTemplate('nonexistent');
      expect(found).toBeUndefined();
    });

    it('should list all template IDs', () => {
      const ids = listCommunityTemplateIds();
      expect(ids).toContain('software-architecture');
      expect(ids).toContain('ux-research');
    });
  });
});

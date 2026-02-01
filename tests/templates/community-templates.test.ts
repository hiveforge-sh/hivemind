import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateDefinitionSchema } from '../../src/templates/validator.js';
import { architectureTemplate } from '../../src/templates/community/architecture.js';
import { uxResearchTemplate } from '../../src/templates/community/ux-research.js';
import { ttrpgBaseTemplate } from '../../src/templates/community/ttrpg-base.js';
import { dnd5eTemplate } from '../../src/templates/community/dnd-5e.js';
import { pathfinder2eTemplate } from '../../src/templates/community/pathfinder-2e.js';
import { dnd35eTemplate } from '../../src/templates/community/dnd-35e.js';
import { communityTemplates, getCommunityTemplate, listCommunityTemplateIds } from '../../src/templates/community/index.js';
import { templateRegistry } from '../../src/templates/registry.js';
import { schemaFactory } from '../../src/templates/schema-factory.js';
import { worldbuildingTemplate } from '../../src/templates/builtin/worldbuilding.js';

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

    it('should export TTRPG templates in array', () => {
      expect(communityTemplates).toContain(ttrpgBaseTemplate);
      expect(communityTemplates).toContain(dnd5eTemplate);
      expect(communityTemplates).toContain(pathfinder2eTemplate);
      expect(communityTemplates).toContain(dnd35eTemplate);
    });

    it('should find template by ID', () => {
      const found = getCommunityTemplate('software-architecture');
      expect(found).toBe(architectureTemplate);
    });

    it('should find ux-research template by ID', () => {
      const found = getCommunityTemplate('ux-research');
      expect(found).toBe(uxResearchTemplate);
    });

    it('should find TTRPG templates by ID', () => {
      expect(getCommunityTemplate('ttrpg-base')).toBe(ttrpgBaseTemplate);
      expect(getCommunityTemplate('dnd-5e')).toBe(dnd5eTemplate);
      expect(getCommunityTemplate('pathfinder-2e')).toBe(pathfinder2eTemplate);
      expect(getCommunityTemplate('dnd-35e')).toBe(dnd35eTemplate);
    });

    it('should return undefined for unknown ID', () => {
      const found = getCommunityTemplate('nonexistent');
      expect(found).toBeUndefined();
    });

    it('should list all template IDs', () => {
      const ids = listCommunityTemplateIds();
      expect(ids).toContain('software-architecture');
      expect(ids).toContain('ux-research');
      expect(ids).toContain('ttrpg-base');
      expect(ids).toContain('dnd-5e');
      expect(ids).toContain('pathfinder-2e');
      expect(ids).toContain('dnd-35e');
    });
  });

  describe('TTRPG Templates', () => {
    // Register worldbuilding first (parent of ttrpg-base)
    beforeEach(() => {
      templateRegistry.register(worldbuildingTemplate, 'builtin');
    });

    describe('ttrpgBaseTemplate', () => {
      it('should pass schema validation', () => {
        const result = TemplateDefinitionSchema.safeParse(ttrpgBaseTemplate);
        expect(result.success).toBe(true);
      });

      it('should have correct metadata', () => {
        expect(ttrpgBaseTemplate.id).toBe('ttrpg-base');
        expect(ttrpgBaseTemplate.extendsTemplate).toBe('worldbuilding');
      });

      it('should extend worldbuilding template', () => {
        templateRegistry.register(ttrpgBaseTemplate, 'config');
        templateRegistry.activate('ttrpg-base');

        // Should inherit worldbuilding entity types
        expect(templateRegistry.getEntityType('character')).toBeDefined();
        expect(templateRegistry.getEntityType('location')).toBeDefined();
        expect(templateRegistry.getEntityType('event')).toBeDefined();

        // Should have new TTRPG types
        expect(templateRegistry.getEntityType('spell')).toBeDefined();
        expect(templateRegistry.getEntityType('class')).toBeDefined();
        expect(templateRegistry.getEntityType('session')).toBeDefined();
        expect(templateRegistry.getEntityType('encounter')).toBeDefined();
      });

      it('should add RPG fields to character', () => {
        templateRegistry.register(ttrpgBaseTemplate, 'config');
        templateRegistry.activate('ttrpg-base');

        const charType = templateRegistry.getEntityType('character');
        const fieldNames = charType!.fields.map(f => f.name);

        // Should have base worldbuilding fields
        expect(fieldNames).toContain('name');
        expect(fieldNames).toContain('age');

        // Should have TTRPG additional fields
        expect(fieldNames).toContain('character_class');
        expect(fieldNames).toContain('level');
        expect(fieldNames).toContain('hit_points');
        expect(fieldNames).toContain('armor_class');
        expect(fieldNames).toContain('abilities');
        expect(fieldNames).toContain('skills');
      });

      it('should have TTRPG relationship types', () => {
        templateRegistry.register(ttrpgBaseTemplate, 'config');
        templateRegistry.activate('ttrpg-base');

        const relTypes = templateRegistry.getRelationshipTypes();
        const relIds = relTypes.map(r => r.id);

        expect(relIds).toContain('knows_spell');
        expect(relIds).toContain('has_class');
        expect(relIds).toContain('in_party_with');
      });
    });

    describe('dnd5eTemplate', () => {
      beforeEach(() => {
        templateRegistry.register(ttrpgBaseTemplate, 'config');
      });

      it('should pass schema validation', () => {
        const result = TemplateDefinitionSchema.safeParse(dnd5eTemplate);
        expect(result.success).toBe(true);
      });

      it('should have correct metadata', () => {
        expect(dnd5eTemplate.id).toBe('dnd-5e');
        expect(dnd5eTemplate.extendsTemplate).toBe('ttrpg-base');
      });

      it('should extend ttrpg-base template', () => {
        templateRegistry.register(dnd5eTemplate, 'config');
        templateRegistry.activate('dnd-5e');

        // Should have worldbuilding types (from grandparent)
        expect(templateRegistry.getEntityType('location')).toBeDefined();

        // Should have ttrpg-base types (from parent)
        expect(templateRegistry.getEntityType('spell')).toBeDefined();
        expect(templateRegistry.getEntityType('session')).toBeDefined();

        // Should have 5e-specific types
        expect(templateRegistry.getEntityType('background')).toBeDefined();
        expect(templateRegistry.getEntityType('feat')).toBeDefined();
        expect(templateRegistry.getEntityType('race')).toBeDefined();
      });

      it('should add 5e-specific fields to character', () => {
        templateRegistry.register(dnd5eTemplate, 'config');
        templateRegistry.activate('dnd-5e');

        const charType = templateRegistry.getEntityType('character');
        const fieldNames = charType!.fields.map(f => f.name);

        // Should have inherited fields
        expect(fieldNames).toContain('level');
        expect(fieldNames).toContain('hit_points');

        // Should have 5e-specific fields
        expect(fieldNames).toContain('proficiency_bonus');
        expect(fieldNames).toContain('inspiration');
        expect(fieldNames).toContain('death_saves');
        expect(fieldNames).toContain('exhaustion_level');
      });

      it('should have 5e spell schools as enum', () => {
        templateRegistry.register(dnd5eTemplate, 'config');
        templateRegistry.activate('dnd-5e');

        const spellType = templateRegistry.getEntityType('spell');
        const schoolField = spellType!.fields.find(f => f.name === 'school');

        expect(schoolField).toBeDefined();
        expect(schoolField!.type).toBe('enum');
        expect(schoolField!.enumValues).toContain('evocation');
        expect(schoolField!.enumValues).toContain('necromancy');
      });
    });

    describe('pathfinder2eTemplate', () => {
      beforeEach(() => {
        templateRegistry.register(ttrpgBaseTemplate, 'config');
      });

      it('should pass schema validation', () => {
        const result = TemplateDefinitionSchema.safeParse(pathfinder2eTemplate);
        expect(result.success).toBe(true);
      });

      it('should have correct metadata', () => {
        expect(pathfinder2eTemplate.id).toBe('pathfinder-2e');
        expect(pathfinder2eTemplate.extendsTemplate).toBe('ttrpg-base');
      });

      it('should extend ttrpg-base template', () => {
        templateRegistry.register(pathfinder2eTemplate, 'config');
        templateRegistry.activate('pathfinder-2e');

        // Should have inherited types
        expect(templateRegistry.getEntityType('character')).toBeDefined();
        expect(templateRegistry.getEntityType('spell')).toBeDefined();

        // Should have PF2e-specific types
        expect(templateRegistry.getEntityType('ancestry')).toBeDefined();
        expect(templateRegistry.getEntityType('heritage')).toBeDefined();
        expect(templateRegistry.getEntityType('action')).toBeDefined();
        expect(templateRegistry.getEntityType('condition')).toBeDefined();
      });

      it('should have PF2e three-action economy fields', () => {
        templateRegistry.register(pathfinder2eTemplate, 'config');
        templateRegistry.activate('pathfinder-2e');

        const spellType = templateRegistry.getEntityType('spell');
        const actionsField = spellType!.fields.find(f => f.name === 'actions');

        expect(actionsField).toBeDefined();
        expect(actionsField!.type).toBe('enum');
        expect(actionsField!.enumValues).toContain('1');
        expect(actionsField!.enumValues).toContain('2');
        expect(actionsField!.enumValues).toContain('3');
      });

      it('should have PF2e-specific character fields', () => {
        templateRegistry.register(pathfinder2eTemplate, 'config');
        templateRegistry.activate('pathfinder-2e');

        const charType = templateRegistry.getEntityType('character');
        const fieldNames = charType!.fields.map(f => f.name);

        expect(fieldNames).toContain('ancestry');
        expect(fieldNames).toContain('heritage');
        expect(fieldNames).toContain('hero_points');
        expect(fieldNames).toContain('focus_points');
        expect(fieldNames).toContain('ancestry_feats');
        expect(fieldNames).toContain('class_feats');
      });
    });

    describe('dnd35eTemplate', () => {
      beforeEach(() => {
        templateRegistry.register(ttrpgBaseTemplate, 'config');
      });

      it('should pass schema validation', () => {
        const result = TemplateDefinitionSchema.safeParse(dnd35eTemplate);
        expect(result.success).toBe(true);
      });

      it('should have correct metadata', () => {
        expect(dnd35eTemplate.id).toBe('dnd-35e');
        expect(dnd35eTemplate.extendsTemplate).toBe('ttrpg-base');
      });

      it('should extend ttrpg-base template', () => {
        templateRegistry.register(dnd35eTemplate, 'config');
        templateRegistry.activate('dnd-35e');

        // Should have inherited types
        expect(templateRegistry.getEntityType('character')).toBeDefined();
        expect(templateRegistry.getEntityType('spell')).toBeDefined();

        // Should have d20-specific types
        expect(templateRegistry.getEntityType('prestige_class')).toBeDefined();
        expect(templateRegistry.getEntityType('domain')).toBeDefined();
        expect(templateRegistry.getEntityType('feat')).toBeDefined();
      });

      it('should have d20 system BAB fields', () => {
        templateRegistry.register(dnd35eTemplate, 'config');
        templateRegistry.activate('dnd-35e');

        const charType = templateRegistry.getEntityType('character');
        const fieldNames = charType!.fields.map(f => f.name);

        expect(fieldNames).toContain('base_attack_bonus');
        expect(fieldNames).toContain('iterative_attacks');
        expect(fieldNames).toContain('grapple');
        expect(fieldNames).toContain('skill_ranks');
      });

      it('should have prestige class prerequisites', () => {
        templateRegistry.register(dnd35eTemplate, 'config');
        templateRegistry.activate('dnd-35e');

        const pcType = templateRegistry.getEntityType('prestige_class');
        const fieldNames = pcType!.fields.map(f => f.name);

        expect(fieldNames).toContain('prerequisites');
        expect(fieldNames).toContain('bab_progression');
        expect(fieldNames).toContain('good_saves');
      });
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { templateRegistry } from '../../src/templates/registry.js';
import { initializeTemplates } from '../../src/templates/loader.js';

describe('Integration: Server Template Initialization', () => {
  beforeEach(() => {
    // Clear registry before each test
    templateRegistry.clear();
  });

  afterEach(() => {
    // Clean up registry after each test
    templateRegistry.clear();
  });

  describe('initializeTemplates()', () => {
    it('should register worldbuilding template by default', () => {
      const config = initializeTemplates();

      expect(config.activeTemplate).toBe('worldbuilding');
      expect(templateRegistry.has('worldbuilding')).toBe(true);
    });

    it('should register all built-in templates', () => {
      initializeTemplates();

      expect(templateRegistry.has('worldbuilding')).toBe(true);
      expect(templateRegistry.has('research')).toBe(true);
      expect(templateRegistry.has('people-management')).toBe(true);
    });

    it('should activate worldbuilding template', () => {
      initializeTemplates();

      const active = templateRegistry.getActive();
      expect(active).not.toBeNull();
      expect(active?.id).toBe('worldbuilding');
    });

    it('should have entity types available after initialization', () => {
      initializeTemplates();

      // Check worldbuilding entity types are accessible
      const character = templateRegistry.getEntityType('character');
      const location = templateRegistry.getEntityType('location');

      expect(character).not.toBeNull();
      expect(location).not.toBeNull();
      expect(character?.name).toBe('character');
      expect(location?.name).toBe('location');
    });

    it('should have relationship types available after initialization', () => {
      initializeTemplates();

      const relationships = templateRegistry.getRelationshipTypes();

      expect(relationships.length).toBeGreaterThan(0);
      // Worldbuilding has 'knows' relationship
      expect(relationships.some(r => r.id === 'knows')).toBe(true);
    });
  });
});

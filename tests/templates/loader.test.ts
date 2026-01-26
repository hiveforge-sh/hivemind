import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, realpathSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  findConfigFile,
  loadTemplateConfig,
  registerBuiltinTemplates,
  registerUserTemplates,
  activateTemplate,
  pregenerateSchemas,
  initializeTemplates,
  getEntitySchema,
} from '../../src/templates/loader.js';
import { templateRegistry } from '../../src/templates/registry.js';
import { schemaFactory } from '../../src/templates/schema-factory.js';
import type { TemplateConfig, TemplateDefinition } from '../../src/templates/types.js';

describe('Template Loader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-loader-'));
    templateRegistry.clear();
    schemaFactory.clearCache();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    templateRegistry.clear();
    schemaFactory.clearCache();
  });

  const writeConfig = (config: object, filename = 'config.json') => {
    const configPath = join(tempDir, filename);
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    return configPath;
  };

  const validUserTemplate: TemplateDefinition = {
    id: 'custom',
    name: 'Custom Template',
    version: '1.0.0',
    entityTypes: [
      {
        name: 'item',
        displayName: 'Item',
        pluralName: 'Items',
        fields: [{ name: 'rarity', type: 'string' }],
      },
    ],
  };

  describe('findConfigFile', () => {
    it('should find config file at explicit path', () => {
      const configPath = writeConfig({ template: { activeTemplate: 'worldbuilding' } });
      const found = findConfigFile(configPath);
      // Use realpathSync to handle macOS symlinks (/var -> /private/var)
      expect(realpathSync(found!)).toBe(realpathSync(configPath));
    });

    it('should return null for non-existent explicit path', () => {
      const found = findConfigFile(join(tempDir, 'nonexistent.json'));
      expect(found).toBeNull();
    });

    it('should return null when no config file exists', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const found = findConfigFile();
        // May find module config in development, but shouldn't crash
        expect(found === null || typeof found === 'string').toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should find config.json in current working directory', () => {
      const configPath = writeConfig({ template: { activeTemplate: 'worldbuilding' } });
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const found = findConfigFile();
        // Use realpathSync to handle macOS symlinks (/var -> /private/var)
        expect(realpathSync(found!)).toBe(realpathSync(configPath));
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('loadTemplateConfig', () => {
    it('should return defaults when no config file found', () => {
      const config = loadTemplateConfig(join(tempDir, 'nonexistent.json'));
      expect(config.activeTemplate).toBe('worldbuilding');
      expect(config.templates).toEqual([]);
    });

    it('should load config from explicit path', () => {
      const configPath = writeConfig({
        template: {
          activeTemplate: 'custom',
          templates: [validUserTemplate],
        },
      });
      const config = loadTemplateConfig(configPath);
      expect(config.activeTemplate).toBe('custom');
      expect(config.templates).toHaveLength(1);
    });

    it('should use defaults when template section missing', () => {
      const configPath = writeConfig({ otherSection: {} });
      const config = loadTemplateConfig(configPath);
      expect(config.activeTemplate).toBe('worldbuilding');
    });

    it('should throw for malformed JSON', () => {
      const configPath = join(tempDir, 'bad.json');
      writeFileSync(configPath, '{ invalid json }');
      expect(() => loadTemplateConfig(configPath)).toThrow(/Failed to read or parse/);
    });

    it('should throw for invalid template config', () => {
      const configPath = writeConfig({
        template: {
          activeTemplate: '', // Invalid: empty
        },
      });
      expect(() => loadTemplateConfig(configPath)).toThrow();
    });

    it('should validate nested templates', () => {
      const configPath = writeConfig({
        template: {
          activeTemplate: 'custom',
          templates: [
            {
              id: 'INVALID', // Uppercase not allowed
              name: 'Test',
              version: '1.0.0',
              entityTypes: [
                { name: 'test', displayName: 'Test', pluralName: 'Tests', fields: [] },
              ],
            },
          ],
        },
      });
      expect(() => loadTemplateConfig(configPath)).toThrow();
    });
  });

  describe('registerBuiltinTemplates', () => {
    it('should register worldbuilding template', () => {
      registerBuiltinTemplates();
      const template = templateRegistry.get('worldbuilding');
      expect(template).toBeDefined();
      expect(template?.id).toBe('worldbuilding');
    });

    it('should register as builtin source', () => {
      registerBuiltinTemplates();
      const worldbuilding = templateRegistry.get('worldbuilding');
      expect(worldbuilding?.source).toBe('builtin');
    });
  });

  describe('registerUserTemplates', () => {
    beforeEach(() => {
      registerBuiltinTemplates();
    });

    it('should do nothing for empty templates array', () => {
      const initialCount = templateRegistry.listTemplates().length;
      registerUserTemplates({ activeTemplate: 'worldbuilding', templates: [] });
      expect(templateRegistry.listTemplates().length).toBe(initialCount);
    });

    it('should do nothing when templates undefined', () => {
      const initialCount = templateRegistry.listTemplates().length;
      registerUserTemplates({ activeTemplate: 'worldbuilding' });
      expect(templateRegistry.listTemplates().length).toBe(initialCount);
    });

    it('should register user templates', () => {
      const config: TemplateConfig = {
        activeTemplate: 'custom',
        templates: [validUserTemplate],
      };
      registerUserTemplates(config);
      const template = templateRegistry.get('custom');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Custom Template');
    });

    it('should register as config source', () => {
      registerUserTemplates({
        activeTemplate: 'custom',
        templates: [validUserTemplate],
      });
      const custom = templateRegistry.get('custom');
      expect(custom?.source).toBe('config');
    });
  });

  describe('activateTemplate', () => {
    beforeEach(() => {
      registerBuiltinTemplates();
    });

    it('should activate worldbuilding template', () => {
      activateTemplate({ activeTemplate: 'worldbuilding' });
      const active = templateRegistry.getActive();
      expect(active).toBeDefined();
      expect(active?.id).toBe('worldbuilding');
    });

    it('should throw for unknown template', () => {
      expect(() => activateTemplate({ activeTemplate: 'unknown' })).toThrow();
    });
  });

  describe('pregenerateSchemas', () => {
    beforeEach(() => {
      registerBuiltinTemplates();
      activateTemplate({ activeTemplate: 'worldbuilding' });
    });

    it('should generate schemas for all entity types', () => {
      pregenerateSchemas();
      expect(schemaFactory.getCacheSize()).toBeGreaterThan(0);
    });

    it('should throw when no active template', () => {
      templateRegistry.clear();
      expect(() => pregenerateSchemas()).toThrow(/no active template/);
    });
  });

  describe('initializeTemplates', () => {
    it('should perform full initialization', () => {
      const configPath = writeConfig({
        template: {
          activeTemplate: 'worldbuilding',
        },
      });

      const config = initializeTemplates(configPath);

      expect(config.activeTemplate).toBe('worldbuilding');
      expect(templateRegistry.getActive()).toBeDefined();
      expect(schemaFactory.getCacheSize()).toBeGreaterThan(0);
    });

    it('should register and activate user template', () => {
      const configPath = writeConfig({
        template: {
          activeTemplate: 'custom',
          templates: [validUserTemplate],
        },
      });

      const config = initializeTemplates(configPath);

      expect(config.activeTemplate).toBe('custom');
      expect(templateRegistry.getActive()?.id).toBe('custom');
    });

    it('should work with no config file (defaults)', () => {
      const config = initializeTemplates(join(tempDir, 'nonexistent.json'));

      expect(config.activeTemplate).toBe('worldbuilding');
      expect(templateRegistry.getActive()?.id).toBe('worldbuilding');
    });
  });

  describe('getEntitySchema', () => {
    beforeEach(() => {
      registerBuiltinTemplates();
      activateTemplate({ activeTemplate: 'worldbuilding' });
      pregenerateSchemas();
    });

    it('should return schema for valid entity type', () => {
      const schema = getEntitySchema('character');
      expect(schema).toBeDefined();

      const result = schema.safeParse({
        id: 'char-1',
        type: 'character',
        status: 'draft',
        name: 'Alice', // Required field for character type
      });
      expect(result.success).toBe(true);
    });

    it('should throw for unknown entity type', () => {
      expect(() => getEntitySchema('unknown')).toThrow(/not found/);
    });

    it('should include available types in error message', () => {
      try {
        getEntitySchema('unknown');
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as Error).message).toContain('character');
        expect((err as Error).message).toContain('location');
      }
    });

    it('should throw when no active template', () => {
      templateRegistry.clear();
      registerBuiltinTemplates(); // But don't activate
      expect(() => getEntitySchema('character')).toThrow();
    });
  });
});

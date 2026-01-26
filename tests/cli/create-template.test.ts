import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import type { TemplateDefinition } from '../../src/templates/types.js';
import { TemplateDefinitionSchema } from '../../src/templates/validator.js';

/**
 * Tests for the create-template CLI wizard.
 *
 * Note: Interactive CLI testing is complex in automated environments.
 * These tests focus on:
 * 1. Validating the wizard starts correctly
 * 2. Testing template output format through direct file creation
 * 3. Schema validation of expected output
 */
describe('CLI: create-template', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-cli-create-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('template output validation', () => {
    it('should produce valid minimal template structure', () => {
      // Simulate what the wizard would produce
      const minimalTemplate: TemplateDefinition = {
        id: 'my-template',
        name: 'My Template',
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

      const result = TemplateDefinitionSchema.safeParse(minimalTemplate);
      expect(result.success).toBe(true);
    });

    it('should produce valid template with fields', () => {
      const templateWithFields: TemplateDefinition = {
        id: 'game-items',
        name: 'Game Items',
        description: 'Items for games',
        version: '1.2.0',
        entityTypes: [
          {
            name: 'weapon',
            displayName: 'Weapon',
            pluralName: 'Weapons',
            fields: [
              { name: 'damage', type: 'number', required: true },
              { name: 'rarity', type: 'enum', enumValues: ['common', 'rare', 'epic'] },
            ],
          },
        ],
      };

      const result = TemplateDefinitionSchema.safeParse(templateWithFields);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.entityTypes[0].fields).toHaveLength(2);
        expect(result.data.entityTypes[0].fields[0].required).toBe(true);
      }
    });

    it('should produce valid template with relationships', () => {
      const templateWithRels: TemplateDefinition = {
        id: 'rpg',
        name: 'RPG',
        version: '1.0.0',
        entityTypes: [
          {
            name: 'character',
            displayName: 'Character',
            pluralName: 'Characters',
            fields: [],
          },
          {
            name: 'item',
            displayName: 'Item',
            pluralName: 'Items',
            fields: [],
          },
        ],
        relationshipTypes: [
          {
            id: 'owns',
            displayName: 'Owns',
            sourceTypes: ['character'],
            targetTypes: ['item'],
            bidirectional: false,
          },
        ],
      };

      const result = TemplateDefinitionSchema.safeParse(templateWithRels);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.relationshipTypes).toHaveLength(1);
        expect(result.data.relationshipTypes![0].bidirectional).toBe(false);
      }
    });

    it('should produce valid template with bidirectional relationships', () => {
      const templateWithBidirectional: TemplateDefinition = {
        id: 'social',
        name: 'Social',
        version: '1.0.0',
        entityTypes: [
          {
            name: 'person',
            displayName: 'Person',
            pluralName: 'People',
            fields: [],
          },
        ],
        relationshipTypes: [
          {
            id: 'friends_with',
            displayName: 'Friends With',
            sourceTypes: ['person'],
            targetTypes: ['person'],
            bidirectional: true,
            reverseId: 'friends_with', // Same ID for symmetric relationship
          },
        ],
      };

      const result = TemplateDefinitionSchema.safeParse(templateWithBidirectional);
      expect(result.success).toBe(true);
    });

    it('should reject template without entity types', () => {
      const invalidTemplate = {
        id: 'empty',
        name: 'Empty',
        version: '1.0.0',
        entityTypes: [],
      };

      const result = TemplateDefinitionSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    it('should reject template with invalid ID', () => {
      const invalidTemplate = {
        id: 'INVALID',
        name: 'Invalid',
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

      const result = TemplateDefinitionSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });

    it('should reject bidirectional relationship without reverseId', () => {
      const invalidTemplate = {
        id: 'invalid',
        name: 'Invalid',
        version: '1.0.0',
        entityTypes: [
          {
            name: 'item',
            displayName: 'Item',
            pluralName: 'Items',
            fields: [],
          },
        ],
        relationshipTypes: [
          {
            id: 'related',
            displayName: 'Related',
            sourceTypes: ['item'],
            targetTypes: ['item'],
            bidirectional: true,
            // Missing reverseId
          },
        ],
      };

      const result = TemplateDefinitionSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });
  });

  describe('CLI invocation', () => {
    it('should show create-template in help output', () => {
      try {
        const result = execSync(`npx tsx "${join(process.cwd(), 'src/cli.ts')}"`, {
          cwd: tempDir,
          encoding: 'utf-8',
          timeout: 15000,
        });
        expect(result).toContain('create-template');
      } catch (err: any) {
        // Even if it exits with error, check stdout
        expect(err.stdout || '').toContain('create-template');
      }
    }, 20000);
  });

  describe('template file format', () => {
    it('should write valid JSON with proper formatting', () => {
      const template: TemplateDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        entityTypes: [
          {
            name: 'item',
            displayName: 'Item',
            pluralName: 'Items',
            fields: [{ name: 'value', type: 'number' }],
          },
        ],
      };

      const templatePath = join(tempDir, 'template.json');
      writeFileSync(templatePath, JSON.stringify(template, null, 2));

      // Verify it can be read back and parsed
      const content = readFileSync(templatePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.id).toBe('test');
      expect(parsed.entityTypes[0].fields[0].name).toBe('value');
    });
  });
});

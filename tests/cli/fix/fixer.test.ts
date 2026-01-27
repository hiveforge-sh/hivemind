import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { FileFixer } from '../../../src/cli/fix/fixer.js';
import { initializeTemplateRegistry } from '../../../src/cli/validate/validator.js';

describe('FileFixer', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-fixer-test-'));
    // Initialize template registry for tests
    await initializeTemplateRegistry('worldbuilding');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('analyze()', () => {
    it('identifies files with missing frontmatter', async () => {
      // Create file without frontmatter
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });
      writeFileSync(join(charDir, 'Alice.md'), '# Alice\n\nA brave hero.');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      expect(operations[0].path).toContain('Alice.md');
      expect(operations[0].fieldsToAdd).toContain('id');
      expect(operations[0].fieldsToAdd).toContain('type');
    });

    it('generates frontmatter with required fields', async () => {
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });
      writeFileSync(join(charDir, 'Bob.md'), '# Bob\n\nA wise wizard.');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      const op = operations[0];

      // Check required fields are present
      expect(op.frontmatter).toHaveProperty('id');
      expect(op.frontmatter).toHaveProperty('type');
      expect(op.frontmatter).toHaveProperty('status');
      expect(op.frontmatter).toHaveProperty('tags');
      expect(op.frontmatter).toHaveProperty('name');

      // Check default values
      expect(op.frontmatter.status).toBe('draft');
      expect(op.frontmatter.tags).toEqual([]);
    });

    it('preserves existing frontmatter values', async () => {
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });

      // File with partial frontmatter (missing id and type)
      writeFileSync(
        join(charDir, 'Charlie.md'),
        '---\nstatus: canon\ntags:\n  - hero\n---\n\n# Charlie'
      );

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      const op = operations[0];

      // Existing values should be preserved
      expect(op.frontmatter.status).toBe('canon');
      expect(op.frontmatter.tags).toEqual(['hero']);

      // Only missing fields should be added
      expect(op.fieldsToAdd).toContain('id');
      expect(op.fieldsToAdd).toContain('type');
      expect(op.fieldsToAdd).not.toContain('status');
      expect(op.fieldsToAdd).not.toContain('tags');
    });

    it('only adds missing required fields to partial frontmatter', async () => {
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });

      // File with type and status but missing id (a required field)
      writeFileSync(
        join(charDir, 'Dave.md'),
        '---\ntype: character\nstatus: draft\n---\n\n# Dave'
      );

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      const op = operations[0];

      // Existing values preserved
      expect(op.frontmatter.type).toBe('character');
      expect(op.frontmatter.status).toBe('draft');

      // Missing fields should be added (id, tags, name)
      expect(op.fieldsToAdd).toContain('id');
      expect(op.fieldsToAdd).not.toContain('type');
      expect(op.fieldsToAdd).not.toContain('status');
    });

    it('resolves entity type from folder mapping', async () => {
      // Create files in different folders
      const charDir = join(tempDir, 'Characters');
      const locDir = join(tempDir, 'Locations');
      mkdirSync(charDir, { recursive: true });
      mkdirSync(locDir, { recursive: true });

      writeFileSync(join(charDir, 'Hero.md'), '# Hero');
      writeFileSync(join(locDir, 'Castle.md'), '# Castle');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      const heroOp = operations.find((op) => op.path.includes('Hero.md'));
      const castleOp = operations.find((op) => op.path.includes('Castle.md'));

      expect(heroOp?.entityType).toBe('character');
      expect(castleOp?.entityType).toBe('location');
    });

    it('skips files that are already valid', async () => {
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });

      // Valid file
      writeFileSync(
        join(charDir, 'Valid.md'),
        '---\nid: char-001\ntype: character\nstatus: canon\nname: Valid\ntags: []\n---\n\n# Valid'
      );

      // Invalid file
      writeFileSync(join(charDir, 'Invalid.md'), '# Invalid');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      // Only invalid file should need fixing
      expect(operations.length).toBe(1);
      expect(operations[0].path).toContain('Invalid.md');
    });

    it('respects --type override', async () => {
      const customDir = join(tempDir, 'CustomFolder');
      mkdirSync(customDir, { recursive: true });
      writeFileSync(join(customDir, 'Thing.md'), '# Thing');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
        type: 'event', // Override type
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      expect(operations[0].entityType).toBe('event');
    });

    it('respects ignore patterns', async () => {
      const charDir = join(tempDir, 'Characters');
      const draftDir = join(tempDir, 'drafts');
      mkdirSync(charDir, { recursive: true });
      mkdirSync(draftDir, { recursive: true });

      writeFileSync(join(charDir, 'Hero.md'), '# Hero');
      writeFileSync(join(draftDir, 'Draft.md'), '# Draft');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
        ignorePatterns: ['drafts'],
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      expect(operations[0].path).toContain('Hero.md');
      expect(operations.some((op) => op.path.includes('Draft.md'))).toBe(false);
    });
  });

  describe('ID generation', () => {
    it('generates unique IDs based on filename', async () => {
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });
      writeFileSync(join(charDir, 'John Smith.md'), '# John Smith');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      expect(operations.length).toBe(1);
      expect(operations[0].frontmatter.id).toBe('john-smith');
    });

    it('handles ID collisions with type prefix', async () => {
      const charDir = join(tempDir, 'Characters');
      const locDir = join(tempDir, 'Locations');
      mkdirSync(charDir, { recursive: true });
      mkdirSync(locDir, { recursive: true });

      // Create existing file with id 'test'
      writeFileSync(
        join(charDir, 'Existing.md'),
        '---\nid: test\ntype: character\nstatus: draft\nname: Existing\ntags: []\n---\n\n# Existing'
      );

      // Create new file that would normally get id 'test'
      writeFileSync(join(locDir, 'Test.md'), '# Test');

      const fixer = new FileFixer({
        vaultPath: tempDir,
        apply: false,
        yes: true,
        json: false,
        verbose: false,
      });
      await fixer.initialize('worldbuilding');

      const operations = await fixer.analyze();

      // Only the Test.md file needs fixing (Existing.md is valid)
      expect(operations.length).toBe(1);
      // ID should be prefixed with type to avoid collision
      expect(operations[0].frontmatter.id).toBe('location-test');
    });
  });
});

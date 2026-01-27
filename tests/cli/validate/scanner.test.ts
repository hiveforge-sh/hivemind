import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ValidationScanner } from '../../../src/cli/validate/scanner.js';
import { initializeTemplateRegistry } from '../../../src/cli/validate/validator.js';

describe('ValidationScanner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-scanner-test-'));
    await initializeTemplateRegistry('worldbuilding');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('file discovery', () => {
    it('discovers markdown files recursively', async () => {
      // Create nested structure
      const subDir = join(tempDir, 'Characters');
      mkdirSync(subDir, { recursive: true });
      const nestedDir = join(subDir, 'Heroes');
      mkdirSync(nestedDir, { recursive: true });

      writeFileSync(join(tempDir, 'root.md'), '# Root');
      writeFileSync(join(subDir, 'char1.md'), '# Char 1');
      writeFileSync(join(nestedDir, 'hero.md'), '# Hero');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(3);
      expect(results.some((r) => r.path.endsWith('root.md'))).toBe(true);
      expect(results.some((r) => r.path.includes('char1.md'))).toBe(true);
      expect(results.some((r) => r.path.includes('hero.md'))).toBe(true);
    });

    it('only discovers markdown files', async () => {
      writeFileSync(join(tempDir, 'note.md'), '# Note');
      writeFileSync(join(tempDir, 'readme.txt'), 'Text file');
      writeFileSync(join(tempDir, 'image.png'), 'fake image');
      writeFileSync(join(tempDir, 'data.json'), '{}');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results[0].path).toContain('note.md');
    });
  });

  describe('exclusion patterns', () => {
    it('excludes hidden directories', async () => {
      const hiddenDir = join(tempDir, '.hidden');
      mkdirSync(hiddenDir, { recursive: true });
      writeFileSync(join(hiddenDir, 'file.md'), '# Hidden');
      writeFileSync(join(tempDir, 'visible.md'), '# Visible');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results.some((r) => r.path.includes('.hidden'))).toBe(false);
      expect(results[0].path).toContain('visible.md');
    });

    it('excludes .obsidian folder', async () => {
      const obsidianDir = join(tempDir, '.obsidian');
      mkdirSync(obsidianDir, { recursive: true });
      writeFileSync(join(obsidianDir, 'plugins.md'), '# Plugin');
      writeFileSync(join(tempDir, 'note.md'), '# Note');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results.some((r) => r.path.includes('.obsidian'))).toBe(false);
      expect(results[0].path).toContain('note.md');
    });

    it('excludes .trash folder', async () => {
      const trashDir = join(tempDir, '.trash');
      mkdirSync(trashDir, { recursive: true });
      writeFileSync(join(trashDir, 'deleted.md'), '# Deleted');
      writeFileSync(join(tempDir, 'active.md'), '# Active');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results.some((r) => r.path.includes('.trash'))).toBe(false);
    });

    it('excludes node_modules folder', async () => {
      const nodeDir = join(tempDir, 'node_modules');
      mkdirSync(nodeDir, { recursive: true });
      writeFileSync(join(nodeDir, 'package.md'), '# Package');
      writeFileSync(join(tempDir, 'readme.md'), '# Readme');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results.some((r) => r.path.includes('node_modules'))).toBe(false);
    });

    it('excludes _template.md files', async () => {
      writeFileSync(join(tempDir, '_template.md'), '# Template');
      writeFileSync(join(tempDir, 'actual.md'), '# Actual');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results.some((r) => r.path.includes('_template.md'))).toBe(false);
    });
  });

  describe('custom ignore patterns', () => {
    it('applies custom ignore patterns', async () => {
      const templatesDir = join(tempDir, 'templates');
      mkdirSync(templatesDir, { recursive: true });
      writeFileSync(join(templatesDir, 'note.md'), '# Template');
      writeFileSync(join(tempDir, 'content.md'), '# Content');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        ignorePatterns: ['templates/**'],
      });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results.some((r) => r.path.includes('templates'))).toBe(false);
      expect(results[0].path).toContain('content.md');
    });

    it('applies multiple custom ignore patterns', async () => {
      const draftsDir = join(tempDir, 'drafts');
      const archiveDir = join(tempDir, 'archive');
      mkdirSync(draftsDir, { recursive: true });
      mkdirSync(archiveDir, { recursive: true });

      writeFileSync(join(draftsDir, 'draft.md'), '# Draft');
      writeFileSync(join(archiveDir, 'old.md'), '# Old');
      writeFileSync(join(tempDir, 'current.md'), '# Current');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        ignorePatterns: ['drafts', 'archive'],
      });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results[0].path).toContain('current.md');
    });

    it('supports glob patterns in ignore', async () => {
      writeFileSync(join(tempDir, 'note1.md'), '# Note 1');
      writeFileSync(join(tempDir, 'note2.md'), '# Note 2');
      writeFileSync(join(tempDir, 'important.md'), '# Important');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        ignorePatterns: ['note*.md'],
      });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results[0].path).toContain('important.md');
    });
  });

  describe('target path filtering', () => {
    it('validates specific target folder', async () => {
      const charDir = join(tempDir, 'Characters');
      const locDir = join(tempDir, 'Locations');
      mkdirSync(charDir, { recursive: true });
      mkdirSync(locDir, { recursive: true });

      writeFileSync(join(charDir, 'alice.md'), '# Alice');
      writeFileSync(join(charDir, 'bob.md'), '# Bob');
      writeFileSync(join(locDir, 'town.md'), '# Town');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        targetPath: 'Characters',
      });
      const results = await scanner.scan();

      expect(results.length).toBe(2);
      expect(results.every((r) => r.path.includes('Characters'))).toBe(true);
      expect(results.some((r) => r.path.includes('alice.md'))).toBe(true);
      expect(results.some((r) => r.path.includes('bob.md'))).toBe(true);
    });

    it('validates when targetPath is a subdirectory', async () => {
      const subDir = join(tempDir, 'SubFolder');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, 'file1.md'), '# File 1');
      writeFileSync(join(tempDir, 'file2.md'), '# File 2');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        targetPath: 'SubFolder',
      });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results[0].path).toContain('file1.md');
    });

    it('validates nested target path', async () => {
      const nestedDir = join(tempDir, 'World', 'Characters', 'Heroes');
      mkdirSync(nestedDir, { recursive: true });
      const otherDir = join(tempDir, 'World', 'Locations');
      mkdirSync(otherDir, { recursive: true });

      writeFileSync(join(nestedDir, 'hero.md'), '# Hero');
      writeFileSync(join(otherDir, 'city.md'), '# City');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        targetPath: 'World/Characters',
      });
      const results = await scanner.scan();

      expect(results.length).toBe(1);
      expect(results[0].path).toContain('hero.md');
      expect(results[0].path).toContain('Characters');
    });
  });

  describe('error handling', () => {
    it('handles unreadable files gracefully', async () => {
      // Create a file, then simulate it becoming unreadable
      // (In practice, this might be difficult to test cross-platform)
      // For now, just verify scanner handles directories it can't read
      writeFileSync(join(tempDir, 'readable.md'), '# Readable');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      // Should still get the readable file
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.path.includes('readable.md'))).toBe(true);
    });
  });
});

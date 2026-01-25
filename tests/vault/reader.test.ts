import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultReader } from '../../src/vault/reader.js';
import type { VaultConfig } from '../../src/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';

describe('VaultReader', () => {
  let tempDir: string;
  let vaultPath: string;
  let reader: VaultReader;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-vault-'));
    vaultPath = join(tempDir, 'vault');
    mkdirSync(vaultPath);

    const config: VaultConfig = {
      path: vaultPath,
      dbPath: join(tempDir, 'test.db')
    };
    reader = new VaultReader(config);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createMarkdownFile = (relativePath: string, content: string) => {
    const fullPath = join(vaultPath, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf(join('/')));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  };

  describe('scanVault', () => {
    it('should scan and index markdown files with frontmatter', async () => {
      createMarkdownFile('character.md', `---
id: char-1
type: character
status: canon
title: Test Character
---

# Character Content
`);

      const index = await reader.scanVault();

      expect(index.totalNotes).toBe(1);
      expect(index.notes.size).toBe(1);
      expect(index.notes.has('char-1')).toBe(true);
    });

    it('should index multiple files', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content 1
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: draft
---
Content 2
`);

      const index = await reader.scanVault();

      expect(index.totalNotes).toBe(2);
      expect(index.notes.has('char-1')).toBe(true);
      expect(index.notes.has('char-2')).toBe(true);
    });

    it('should organize notes by type', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('loc1.md', `---
id: loc-1
type: location
status: canon
---
Content
`);

      const index = await reader.scanVault();

      expect(index.notesByType.has('character')).toBe(true);
      expect(index.notesByType.has('location')).toBe(true);
      expect(index.notesByType.get('character')!.size).toBe(1);
      expect(index.notesByType.get('location')!.size).toBe(1);
    });

    it('should organize notes by status', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: draft
---
Content
`);

      const index = await reader.scanVault();

      expect(index.notesByStatus.has('canon')).toBe(true);
      expect(index.notesByStatus.has('draft')).toBe(true);
      expect(index.notesByStatus.get('canon')!.size).toBe(1);
      expect(index.notesByStatus.get('draft')!.size).toBe(1);
    });

    it('should skip files without frontmatter', async () => {
      createMarkdownFile('valid.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('invalid.md', `# Just a heading
No frontmatter here`);

      const index = await reader.scanVault();

      expect(index.totalNotes).toBe(1);
      expect(index.ignoredFiles.length).toBe(1);
      expect(index.ignoredFiles[0].filePath).toContain('invalid.md');
    });

    it('should handle nested directories', async () => {
      createMarkdownFile('characters/alice.md', `---
id: alice
type: character
status: canon
---
Content
`);

      createMarkdownFile('locations/city.md', `---
id: city
type: location
status: canon
---
Content
`);

      const index = await reader.scanVault();

      expect(index.totalNotes).toBe(2);
      expect(index.notes.has('alice')).toBe(true);
      expect(index.notes.has('city')).toBe(true);
    });

    it('should exclude .obsidian directory', async () => {
      createMarkdownFile('.obsidian/config.md', `---
id: config
type: system
status: canon
---
Config
`);

      createMarkdownFile('valid.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      const index = await reader.scanVault();

      expect(index.totalNotes).toBe(1);
      expect(index.notes.has('char-1')).toBe(true);
      expect(index.notes.has('config')).toBe(false);
    });

    it('should handle empty vault', async () => {
      const index = await reader.scanVault();

      expect(index.totalNotes).toBe(0);
      expect(index.notes.size).toBe(0);
      expect(index.ignoredFiles.length).toBe(0);
    });
  });

  describe('getNote', () => {
    it('should retrieve note by ID', async () => {
      createMarkdownFile('char.md', `---
id: char-1
type: character
status: canon
title: Alice
---
Content
`);

      await reader.scanVault();
      const note = reader.getNote('char-1');

      expect(note).toBeDefined();
      expect(note!.id).toBe('char-1');
      expect(note!.frontmatter.title).toBe('Alice');
    });

    it('should return undefined for non-existent ID', async () => {
      await reader.scanVault();
      const note = reader.getNote('non-existent');

      expect(note).toBeUndefined();
    });
  });

  describe('getAllNotes', () => {
    it('should return all indexed notes', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: canon
---
Content
`);

      await reader.scanVault();
      const notes = reader.getAllNotes();

      expect(notes.length).toBe(2);
      expect(notes.some(n => n.id === 'char-1')).toBe(true);
      expect(notes.some(n => n.id === 'char-2')).toBe(true);
    });

    it('should return empty array for empty vault', async () => {
      await reader.scanVault();
      const notes = reader.getAllNotes();

      expect(notes).toEqual([]);
    });
  });

  describe('getNotesByType', () => {
    it('should return notes of specific type', async () => {
      createMarkdownFile('char.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('loc.md', `---
id: loc-1
type: location
status: canon
---
Content
`);

      await reader.scanVault();
      const characters = reader.getNotesByType('character');

      expect(characters.length).toBe(1);
      expect(characters[0].id).toBe('char-1');
    });

    it('should return empty array for non-existent type', async () => {
      await reader.scanVault();
      const notes = reader.getNotesByType('nonexistent');

      expect(notes).toEqual([]);
    });
  });

  describe('getNotesByStatus', () => {
    it('should return notes of specific status', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: draft
---
Content
`);

      await reader.scanVault();
      const canonNotes = reader.getNotesByStatus('canon');

      expect(canonNotes.length).toBe(1);
      expect(canonNotes[0].id).toBe('char-1');
    });

    it('should return empty array for non-existent status', async () => {
      await reader.scanVault();
      const notes = reader.getNotesByStatus('nonexistent');

      expect(notes).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return vault statistics', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: draft
---
Content
`);

      createMarkdownFile('loc.md', `---
id: loc-1
type: location
status: canon
---
Content
`);

      await reader.scanVault();
      const stats = reader.getStats();

      expect(stats.totalNotes).toBe(3);
      expect(stats.byType.character).toBe(2);
      expect(stats.byType.location).toBe(1);
      expect(stats.byStatus.canon).toBe(2);
      expect(stats.byStatus.draft).toBe(1);
    });
  });
});

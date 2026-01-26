import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TemplateDetector } from '../../src/templates/detector.js';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TemplateDetector', () => {
  let tempDir: string;
  let detector: TemplateDetector;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-detector-'));
    detector = new TemplateDetector();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createFolders = (...names: string[]) => {
    for (const name of names) {
      mkdirSync(join(tempDir, name), { recursive: true });
    }
  };

  describe('detectTemplate', () => {
    it('should detect worldbuilding with high confidence (4+ matches)', async () => {
      createFolders('characters', 'locations', 'events', 'factions');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.templateId).toBe('worldbuilding');
      expect(result!.confidence).toBe('high');
      expect(result!.matchedPatterns).toHaveLength(4);
    });

    it('should detect worldbuilding with medium confidence (3 matches)', async () => {
      createFolders('characters', 'locations', 'events');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.templateId).toBe('worldbuilding');
      expect(result!.confidence).toBe('medium');
      expect(result!.matchedPatterns).toHaveLength(3);
    });

    it('should detect worldbuilding with low confidence (2 matches)', async () => {
      createFolders('characters', 'locations');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.templateId).toBe('worldbuilding');
      expect(result!.confidence).toBe('low');
      expect(result!.matchedPatterns).toHaveLength(2);
    });

    it('should return null with only 1 match', async () => {
      createFolders('characters');

      const result = await detector.detectTemplate(tempDir);

      expect(result).toBeNull();
    });

    it('should return null with no matches', async () => {
      createFolders('random', 'folders', 'here');

      const result = await detector.detectTemplate(tempDir);

      expect(result).toBeNull();
    });

    it('should return null for empty vault', async () => {
      const result = await detector.detectTemplate(tempDir);

      expect(result).toBeNull();
    });

    it('should match singular folder names', async () => {
      createFolders('character', 'location');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('character');
      expect(result!.matchedPatterns).toContain('location');
    });

    it('should match plural folder names', async () => {
      createFolders('characters', 'locations');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('characters');
      expect(result!.matchedPatterns).toContain('locations');
    });

    it('should match case-insensitively', async () => {
      createFolders('Characters', 'LOCATIONS');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('Characters');
      expect(result!.matchedPatterns).toContain('LOCATIONS');
    });

    it('should match folders containing pattern', async () => {
      createFolders('my-characters', 'world-locations');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('my-characters');
      expect(result!.matchedPatterns).toContain('world-locations');
    });

    it('should ignore hidden folders', async () => {
      createFolders('.obsidian', '.git', 'characters', 'locations');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).not.toContain('.obsidian');
      expect(result!.matchedPatterns).not.toContain('.git');
      expect(result!.matchedPatterns).toHaveLength(2);
    });

    it('should include user-friendly message', async () => {
      createFolders('characters', 'locations');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.message).toContain('Detected worldbuilding vault');
      expect(result!.message).toContain('low confidence');
      expect(result!.message).toContain('characters');
    });

    it('should match lore folder', async () => {
      createFolders('lore', 'characters');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('lore');
    });

    it('should match assets folder', async () => {
      createFolders('assets', 'characters');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('assets');
    });

    it('should match factions folder', async () => {
      createFolders('factions', 'characters');

      const result = await detector.detectTemplate(tempDir);

      expect(result).not.toBeNull();
      expect(result!.matchedPatterns).toContain('factions');
    });
  });
});

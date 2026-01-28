import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectAndConfirmTemplate, hasRecognizableFolders } from '../../../src/cli/init/detection.js';
import * as prompts from '../../../src/cli/init/prompts.js';

describe('cli/init/detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-detection-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('detectAndConfirmTemplate', () => {
    it('should detect worldbuilding template with 2 matching folders', async () => {
      // Create worldbuilding-like vault structure
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'locations'));

      // Mock user confirming detection
      vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(true);

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('worldbuilding');
      expect(prompts.promptConfirm).toHaveBeenCalledWith(
        'Use worldbuilding template?',
        true
      );
    });

    it('should detect worldbuilding with case-insensitive matching', async () => {
      mkdirSync(join(tempDir, 'Characters'));
      mkdirSync(join(tempDir, 'LOCATIONS'));

      vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(true);

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('worldbuilding');
    });

    it('should detect worldbuilding with 3+ matching folders (medium confidence)', async () => {
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'locations'));
      mkdirSync(join(tempDir, 'events'));

      vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(true);

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('worldbuilding');
    });

    it('should detect worldbuilding with 4+ matching folders (high confidence)', async () => {
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'locations'));
      mkdirSync(join(tempDir, 'events'));
      mkdirSync(join(tempDir, 'factions'));

      vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(true);

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('worldbuilding');
    });

    it('should fall through to manual selection when user declines detection', async () => {
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'locations'));

      // User declines auto-detection
      vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(false);
      vi.spyOn(prompts, 'promptTemplateSelection').mockResolvedValue('research');

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('research');
      expect(prompts.promptTemplateSelection).toHaveBeenCalled();
    });

    it('should fall through to manual selection when no pattern detected', async () => {
      mkdirSync(join(tempDir, 'notes'));
      mkdirSync(join(tempDir, 'drafts'));

      vi.spyOn(prompts, 'promptTemplateSelection').mockResolvedValue('software-architecture');

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('software-architecture');
      expect(prompts.promptTemplateSelection).toHaveBeenCalled();
    });

    it('should not detect with only 1 matching folder', async () => {
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'notes'));

      vi.spyOn(prompts, 'promptTemplateSelection').mockResolvedValue('worldbuilding');

      const result = await detectAndConfirmTemplate(tempDir);

      // Falls through to manual selection (no detection)
      expect(result).toBe('worldbuilding');
      expect(prompts.promptTemplateSelection).toHaveBeenCalled();
    });

    it('should handle empty vault directory', async () => {
      // Empty vault - no folders
      vi.spyOn(prompts, 'promptTemplateSelection').mockResolvedValue('worldbuilding');

      const result = await detectAndConfirmTemplate(tempDir);

      expect(result).toBe('worldbuilding');
      expect(prompts.promptTemplateSelection).toHaveBeenCalled();
    });

    it('should ignore hidden directories in detection', async () => {
      mkdirSync(join(tempDir, '.obsidian'));
      mkdirSync(join(tempDir, '.git'));
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'notes'));

      // Only 1 non-hidden matching folder
      vi.spyOn(prompts, 'promptTemplateSelection').mockResolvedValue('worldbuilding');

      const result = await detectAndConfirmTemplate(tempDir);

      expect(prompts.promptTemplateSelection).toHaveBeenCalled();
    });
  });

  describe('hasRecognizableFolders', () => {
    it('should return true for vault with recognizable structure', async () => {
      mkdirSync(join(tempDir, 'characters'));
      mkdirSync(join(tempDir, 'locations'));

      const result = await hasRecognizableFolders(tempDir);

      expect(result).toBe(true);
    });

    it('should return false for vault with no recognizable structure', async () => {
      mkdirSync(join(tempDir, 'notes'));
      mkdirSync(join(tempDir, 'drafts'));

      const result = await hasRecognizableFolders(tempDir);

      expect(result).toBe(false);
    });

    it('should return false for empty vault', async () => {
      const result = await hasRecognizableFolders(tempDir);

      expect(result).toBe(false);
    });
  });
});

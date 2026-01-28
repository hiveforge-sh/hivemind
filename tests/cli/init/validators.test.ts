import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateVaultPath, validatePresetFile, configExists } from '../../../src/cli/init/validators.js';

describe('cli/init/validators', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-validators-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('validateVaultPath', () => {
    it('should return true for valid directory path', () => {
      const result = validateVaultPath(tempDir);
      expect(result).toBe(true);
    });

    it('should trim whitespace and validate', () => {
      const result = validateVaultPath(`  ${tempDir}  `);
      expect(result).toBe(true);
    });

    it('should return error message for empty string', () => {
      const result = validateVaultPath('');
      expect(result).toBe('Vault path is required');
    });

    it('should return error message for whitespace-only string', () => {
      const result = validateVaultPath('   ');
      expect(result).toBe('Vault path is required');
    });

    it('should return error message for non-existent path', () => {
      const nonExistent = join(tempDir, 'does-not-exist');
      const result = validateVaultPath(nonExistent);
      expect(result).toContain('Path does not exist');
      expect(result).toContain(nonExistent);
    });

    it('should return error message for file path (not directory)', () => {
      const filePath = join(tempDir, 'file.txt');
      writeFileSync(filePath, 'test');

      const result = validateVaultPath(filePath);
      expect(result).toContain('Path is not a directory');
      expect(result).toContain(filePath);
    });

    it('should resolve relative paths before validation', () => {
      // Current directory should exist
      const result = validateVaultPath('.');
      expect(result).toBe(true);
    });
  });

  describe('validatePresetFile', () => {
    it('should parse valid preset file', () => {
      const presetPath = join(tempDir, 'preset.json');
      const preset = {
        vaultPath: '/path/to/vault',
        templateId: 'worldbuilding',
      };
      writeFileSync(presetPath, JSON.stringify(preset, null, 2));

      const result = validatePresetFile(presetPath);

      expect(result).toEqual(preset);
    });

    it('should parse nested vault structure', () => {
      const presetPath = join(tempDir, 'preset.json');
      const preset = {
        vault: {
          path: '/path/to/vault',
          watchForChanges: true,
          debounceMs: 100,
        },
        template: {
          activeTemplate: 'worldbuilding',
        },
      };
      writeFileSync(presetPath, JSON.stringify(preset, null, 2));

      const result = validatePresetFile(presetPath);

      expect(result).toEqual(preset);
    });

    it('should throw for non-existent file', () => {
      const nonExistent = join(tempDir, 'does-not-exist.json');

      expect(() => validatePresetFile(nonExistent)).toThrow('Preset file not found');
      expect(() => validatePresetFile(nonExistent)).toThrow(nonExistent);
    });

    it('should throw for invalid JSON', () => {
      const presetPath = join(tempDir, 'invalid.json');
      writeFileSync(presetPath, '{ invalid json }');

      expect(() => validatePresetFile(presetPath)).toThrow('Invalid JSON in preset file');
    });

    it('should throw for empty file', () => {
      const presetPath = join(tempDir, 'empty.json');
      writeFileSync(presetPath, '');

      expect(() => validatePresetFile(presetPath)).toThrow('Invalid JSON in preset file');
    });

    it('should handle complex nested structures', () => {
      const presetPath = join(tempDir, 'complex.json');
      const preset = {
        vault: {
          path: '/vault',
          watchForChanges: true,
          debounceMs: 100,
        },
        server: {
          transport: 'stdio',
        },
        template: {
          activeTemplate: 'research',
        },
        indexing: {
          strategy: 'incremental',
          batchSize: 100,
          enableVectorSearch: false,
          enableFullTextSearch: true,
        },
      };
      writeFileSync(presetPath, JSON.stringify(preset, null, 2));

      const result = validatePresetFile(presetPath);

      expect(result).toEqual(preset);
    });

    it('should preserve extra fields in preset', () => {
      const presetPath = join(tempDir, 'extra.json');
      const preset = {
        vaultPath: '/vault',
        templateId: 'worldbuilding',
        extraField: 'should be preserved',
        nested: { extra: 'fields' },
      };
      writeFileSync(presetPath, JSON.stringify(preset, null, 2));

      const result = validatePresetFile(presetPath);

      expect(result).toEqual(preset);
    });
  });

  describe('configExists', () => {
    it('should return true when config.json exists', () => {
      const configPath = join(tempDir, 'config.json');
      writeFileSync(configPath, '{}');

      const result = configExists(tempDir);

      expect(result).toBe(true);
    });

    it('should return false when config.json does not exist', () => {
      const result = configExists(tempDir);

      expect(result).toBe(false);
    });

    it('should check in specified directory', () => {
      // Create config in subdirectory
      const subDir = mkdtempSync(join(tempDir, 'subdir-'));
      const configPath = join(subDir, 'config.json');
      writeFileSync(configPath, '{}');

      // Should not find in parent
      expect(configExists(tempDir)).toBe(false);
      // Should find in subdir
      expect(configExists(subDir)).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { runInteractiveWizard } from '../../../src/cli/init/wizard.js';
import * as prompts from '../../../src/cli/init/prompts.js';
import * as validators from '../../../src/cli/init/validators.js';
import * as detection from '../../../src/cli/init/detection.js';
import { ExitPromptError } from '@inquirer/core';

describe('cli/init/wizard', () => {
  let tempDir: string;
  let originalIsTTY: boolean | undefined;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-wizard-'));
    originalIsTTY = process.stdin.isTTY;
    (process.stdin as any).isTTY = true;

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    (process.stdin as any).isTTY = originalIsTTY;
    vi.restoreAllMocks();
  });

  describe('runInteractiveWizard', () => {
    it('should complete successfully with valid inputs', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(false);
      vi.spyOn(prompts, 'promptVaultPath').mockResolvedValue(tempDir);
      vi.spyOn(detection, 'detectAndConfirmTemplate').mockResolvedValue('worldbuilding');

      const result = await runInteractiveWizard();

      expect(result.cancelled).toBe(false);
      expect(result.vaultPath).toBe(tempDir);
      expect(result.templateId).toBe('worldbuilding');
    });

    it('should prompt for overwrite when config exists', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(true);
      vi.spyOn(prompts, 'promptOverwriteConfig').mockResolvedValue(true);
      vi.spyOn(prompts, 'promptVaultPath').mockResolvedValue(tempDir);
      vi.spyOn(detection, 'detectAndConfirmTemplate').mockResolvedValue('research');

      const result = await runInteractiveWizard();

      expect(prompts.promptOverwriteConfig).toHaveBeenCalled();
      expect(result.cancelled).toBe(false);
    });

    it('should cancel when user declines overwrite', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(true);
      vi.spyOn(prompts, 'promptOverwriteConfig').mockResolvedValue(false);

      const result = await runInteractiveWizard();

      expect(result.cancelled).toBe(true);
      expect(result.vaultPath).toBe('');
      expect(result.templateId).toBe('');
    });

    it('should handle custom template selection by defaulting to worldbuilding', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(false);
      vi.spyOn(prompts, 'promptVaultPath').mockResolvedValue(tempDir);
      vi.spyOn(detection, 'detectAndConfirmTemplate').mockResolvedValue('custom');

      const result = await runInteractiveWizard();

      expect(result.cancelled).toBe(false);
      expect(result.templateId).toBe('worldbuilding');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Custom template creation'));
    });

    it('should handle Ctrl+C gracefully', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(false);
      vi.spyOn(prompts, 'promptVaultPath').mockRejectedValue(new ExitPromptError());

      const result = await runInteractiveWizard();

      expect(result.cancelled).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Setup cancelled'));
    });

    it('should exit if not TTY', async () => {
      (process.stdin as any).isTTY = false;

      // Mock process.exit to throw instead of actually exiting
      processExitSpy.mockImplementation((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(runInteractiveWizard()).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Interactive mode requires a terminal'));
    });

    it('should rethrow non-ExitPromptError errors', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(false);
      vi.spyOn(prompts, 'promptVaultPath').mockRejectedValue(new Error('Unexpected error'));

      await expect(runInteractiveWizard()).rejects.toThrow('Unexpected error');
    });

    it('should display breadcrumb progress', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(false);
      vi.spyOn(prompts, 'promptVaultPath').mockResolvedValue(tempDir);
      vi.spyOn(detection, 'detectAndConfirmTemplate').mockResolvedValue('worldbuilding');

      await runInteractiveWizard();

      // Should show breadcrumb steps
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Vault'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Template'));
    });

    it('should display success messages', async () => {
      vi.spyOn(validators, 'configExists').mockReturnValue(false);
      vi.spyOn(prompts, 'promptVaultPath').mockResolvedValue(tempDir);
      vi.spyOn(detection, 'detectAndConfirmTemplate').mockResolvedValue('worldbuilding');

      await runInteractiveWizard();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Using vault'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Using template'));
    });
  });
});

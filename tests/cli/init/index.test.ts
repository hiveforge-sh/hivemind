import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseInitArgs, initCommand } from '../../../src/cli/init/index.js';
import * as wizard from '../../../src/cli/init/wizard.js';
import * as validators from '../../../src/cli/init/validators.js';
import * as output from '../../../src/cli/init/output.js';

describe('cli/init/index', () => {
  let tempDir: string;
  let originalArgv: string[];
  let originalCwd: string;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-index-'));
    originalArgv = process.argv;
    originalCwd = process.cwd();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  describe('parseInitArgs', () => {
    it('should parse --config flag', () => {
      process.argv = ['node', 'script', 'init', '--config', 'preset.json'];
      const options = parseInitArgs();
      expect(options.config).toBe('preset.json');
    });

    it('should parse --vault flag', () => {
      process.argv = ['node', 'script', 'init', '--vault', '/path/to/vault'];
      const options = parseInitArgs();
      expect(options.vault).toBe('/path/to/vault');
    });

    it('should parse --template flag', () => {
      process.argv = ['node', 'script', 'init', '--template', 'worldbuilding'];
      const options = parseInitArgs();
      expect(options.template).toBe('worldbuilding');
    });

    it('should parse --yes flag', () => {
      process.argv = ['node', 'script', 'init', '--yes'];
      const options = parseInitArgs();
      expect(options.yes).toBe(true);
    });

    it('should parse -y short flag', () => {
      process.argv = ['node', 'script', 'init', '-y'];
      const options = parseInitArgs();
      expect(options.yes).toBe(true);
    });

    it('should parse multiple flags', () => {
      process.argv = ['node', 'script', 'init', '--vault', '/vault', '--template', 'research', '--yes'];
      const options = parseInitArgs();
      expect(options.vault).toBe('/vault');
      expect(options.template).toBe('research');
      expect(options.yes).toBe(true);
    });

    it('should return empty options when no flags provided', () => {
      process.argv = ['node', 'script', 'init'];
      const options = parseInitArgs();
      expect(options).toEqual({});
    });
  });

  describe('initCommand', () => {
    it('should use preset file mode when --config provided', async () => {
      const presetPath = join(tempDir, 'preset.json');
      writeFileSync(presetPath, JSON.stringify({
        vault: { path: tempDir },
        template: { activeTemplate: 'worldbuilding' },
      }));

      process.argv = ['node', 'script', 'init', '--config', presetPath];

      const outputSpy = vi.spyOn(output, 'outputNextSteps').mockResolvedValue();
      const writeConfigSpy = vi.spyOn(output, 'writeConfigFile').mockReturnValue(join(tempDir, 'config.json'));

      await initCommand();

      expect(writeConfigSpy).toHaveBeenCalled();
      expect(outputSpy).toHaveBeenCalled();
    });

    it('should use flags mode when --vault provided', async () => {
      process.argv = ['node', 'script', 'init', '--vault', tempDir, '--yes'];

      const outputSpy = vi.spyOn(output, 'outputNextSteps').mockResolvedValue();
      const writeConfigSpy = vi.spyOn(output, 'writeConfigFile').mockReturnValue(join(tempDir, 'config.json'));
      vi.spyOn(validators, 'configExists').mockReturnValue(false);

      await initCommand();

      expect(writeConfigSpy).toHaveBeenCalled();
      expect(outputSpy).toHaveBeenCalled();
    });

    it('should use interactive wizard when no flags provided', async () => {
      process.argv = ['node', 'script', 'init'];

      vi.spyOn(wizard, 'runInteractiveWizard').mockResolvedValue({
        vaultPath: tempDir,
        templateId: 'worldbuilding',
        cancelled: false,
      });
      const outputSpy = vi.spyOn(output, 'outputNextSteps').mockResolvedValue();
      const writeConfigSpy = vi.spyOn(output, 'writeConfigFile').mockReturnValue(join(tempDir, 'config.json'));

      await initCommand();

      expect(wizard.runInteractiveWizard).toHaveBeenCalled();
      expect(writeConfigSpy).toHaveBeenCalled();
      expect(outputSpy).toHaveBeenCalled();
    });

    it('should exit cleanly when wizard is cancelled', async () => {
      process.argv = ['node', 'script', 'init'];

      vi.spyOn(wizard, 'runInteractiveWizard').mockResolvedValue({
        vaultPath: '',
        templateId: '',
        cancelled: true,
      });

      processExitSpy.mockImplementation((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      // Should call process.exit(0) when cancelled
      await expect(initCommand()).rejects.toThrow(/process\.exit/);
      expect(processExitSpy).toHaveBeenCalled();
    });

    it('should exit with error for invalid vault path in flags mode', async () => {
      process.argv = ['node', 'script', 'init', '--vault', '/nonexistent'];

      const outputErrorSpy = vi.spyOn(output, 'outputInvalidVaultError').mockImplementation(() => {});
      processExitSpy.mockImplementation((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(initCommand()).rejects.toThrow('process.exit(1)');
      expect(outputErrorSpy).toHaveBeenCalledWith('/nonexistent');
    });

    it('should exit with error when config exists and --yes not provided', async () => {
      process.argv = ['node', 'script', 'init', '--vault', tempDir];

      vi.spyOn(validators, 'configExists').mockReturnValue(true);
      processExitSpy.mockImplementation((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(initCommand()).rejects.toThrow('process.exit(1)');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('config.json already exists'));
    });

    it('should handle preset file errors', async () => {
      process.argv = ['node', 'script', 'init', '--config', '/nonexistent.json'];

      processExitSpy.mockImplementation((code: number) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(initCommand()).rejects.toThrow('process.exit(1)');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Preset file not found'));
    });

    it('should use default template when not specified in flags mode', async () => {
      process.argv = ['node', 'script', 'init', '--vault', tempDir, '--yes'];

      const generateConfigSpy = vi.spyOn(output, 'generateConfig').mockReturnValue({
        vault: { path: tempDir, watchForChanges: true, debounceMs: 100 },
        server: { transport: 'stdio' },
        template: { activeTemplate: 'worldbuilding' },
        indexing: { strategy: 'incremental', batchSize: 100, enableVectorSearch: false, enableFullTextSearch: true },
      });
      vi.spyOn(output, 'writeConfigFile').mockReturnValue(join(tempDir, 'config.json'));
      vi.spyOn(output, 'outputNextSteps').mockResolvedValue();
      vi.spyOn(validators, 'configExists').mockReturnValue(false);

      await initCommand();

      expect(generateConfigSpy).toHaveBeenCalledWith(expect.any(String), 'worldbuilding');
    });

    it('should use specified template in flags mode', async () => {
      process.argv = ['node', 'script', 'init', '--vault', tempDir, '--template', 'research', '--yes'];

      const generateConfigSpy = vi.spyOn(output, 'generateConfig').mockReturnValue({
        vault: { path: tempDir, watchForChanges: true, debounceMs: 100 },
        server: { transport: 'stdio' },
        template: { activeTemplate: 'research' },
        indexing: { strategy: 'incremental', batchSize: 100, enableVectorSearch: false, enableFullTextSearch: true },
      });
      vi.spyOn(output, 'writeConfigFile').mockReturnValue(join(tempDir, 'config.json'));
      vi.spyOn(output, 'outputNextSteps').mockResolvedValue();
      vi.spyOn(validators, 'configExists').mockReturnValue(false);

      await initCommand();

      expect(generateConfigSpy).toHaveBeenCalledWith(expect.any(String), 'research');
    });
  });
});

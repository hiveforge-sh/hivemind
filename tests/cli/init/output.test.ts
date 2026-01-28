import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  getClaudeDesktopConfigPath,
  openInExplorer,
  generateConfig,
  generateClaudeDesktopSnippet,
  writeConfigFile,
  outputNextSteps,
  outputMissingConfigError,
  outputInvalidVaultError,
  type HivemindConfig,
} from '../../../src/cli/init/output.js';
import * as prompts from '../../../src/cli/init/prompts.js';
import * as clipboard from '../../../src/cli/shared/clipboard.js';

describe('cli/init/output', () => {
  let tempDir: string;
  let originalPlatform: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-output-'));
    originalPlatform = process.platform;
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getClaudeDesktopConfigPath', () => {
    it('should return Windows path on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming';

      const result = getClaudeDesktopConfigPath();

      expect(result).toContain('AppData\\Roaming\\Claude\\claude_desktop_config.json');
    });

    it('should return macOS path on darwin', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.HOME = '/Users/test';

      const result = getClaudeDesktopConfigPath();

      // Note: path.resolve will use OS separators, so just check components
      expect(result).toContain('Library');
      expect(result).toContain('Application Support');
      expect(result).toContain('Claude');
      expect(result).toContain('claude_desktop_config.json');
    });

    it('should return Linux path with XDG_CONFIG_HOME', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = '/home/test/.config';

      const result = getClaudeDesktopConfigPath();

      // Check components rather than exact path format
      expect(result).toContain('.config');
      expect(result).toContain('Claude');
      expect(result).toContain('claude_desktop_config.json');
    });

    it('should return Linux path with HOME fallback', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      delete process.env.XDG_CONFIG_HOME;
      process.env.HOME = '/home/test';

      const result = getClaudeDesktopConfigPath();

      // Check components rather than exact path format
      expect(result).toContain('.config');
      expect(result).toContain('Claude');
      expect(result).toContain('claude_desktop_config.json');
    });

    it('should handle Windows with USERPROFILE fallback', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      delete process.env.APPDATA;
      process.env.USERPROFILE = 'C:\\Users\\Test';

      const result = getClaudeDesktopConfigPath();

      expect(result).toContain('Claude\\claude_desktop_config.json');
    });
  });

  describe('openInExplorer', () => {
    it('should create directory if it does not exist', async () => {
      const newDir = join(tempDir, 'new', 'nested', 'dir');
      const filePath = join(newDir, 'file.txt');

      // Should succeed even if directory doesn't exist
      await openInExplorer(filePath);

      // Directory should be created
      expect(existsSync(newDir)).toBe(true);
    });

    // Note: Testing directory creation failure is difficult with ESM modules
    // where exports cannot be easily mocked. The error handling path is covered
    // by the try-catch in the implementation. Skipping this edge case test.

    it('should handle existing directory', async () => {
      // Directory already exists
      const existingDir = tempDir;
      const filePath = join(existingDir, 'file.txt');

      // Should succeed with existing directory
      const result = await openInExplorer(filePath);

      // Result depends on whether exec succeeds, but function should complete
      expect(typeof result).toBe('boolean');
    });

    // Note: Actual exec command tests are skipped because they require system
    // interaction. The function resolves based on exec error, which is tested
    // indirectly. For full coverage, we'd need to mock child_process.exec.
  });

  describe('generateConfig', () => {
    it('should generate valid Hivemind config structure', () => {
      const config = generateConfig('/path/to/vault', 'worldbuilding');

      expect(config).toEqual({
        vault: {
          path: '/path/to/vault',
          watchForChanges: true,
          debounceMs: 100,
        },
        server: {
          transport: 'stdio',
        },
        template: {
          activeTemplate: 'worldbuilding',
        },
        indexing: {
          strategy: 'incremental',
          batchSize: 100,
          enableVectorSearch: false,
          enableFullTextSearch: true,
        },
      });
    });

    it('should generate config with different template', () => {
      const config = generateConfig('/vault', 'research');

      expect(config.template.activeTemplate).toBe('research');
    });

    it('should use consistent defaults', () => {
      const config = generateConfig('/vault', 'worldbuilding');

      expect(config.vault.watchForChanges).toBe(true);
      expect(config.vault.debounceMs).toBe(100);
      expect(config.server.transport).toBe('stdio');
      expect(config.indexing.strategy).toBe('incremental');
      expect(config.indexing.batchSize).toBe(100);
      expect(config.indexing.enableVectorSearch).toBe(false);
      expect(config.indexing.enableFullTextSearch).toBe(true);
    });
  });

  describe('generateClaudeDesktopSnippet', () => {
    it('should generate valid Claude Desktop MCP config', () => {
      const snippet = generateClaudeDesktopSnippet('/path/to/vault');
      const config = JSON.parse(snippet);

      expect(config).toEqual({
        mcpServers: {
          hivemind: {
            command: 'npx',
            args: ['-y', '@hiveforge/hivemind-mcp', '--vault', '/path/to/vault'],
          },
        },
      });
    });

    it('should use correct vault path in args', () => {
      const snippet = generateClaudeDesktopSnippet('/custom/vault/path');
      const config = JSON.parse(snippet);

      expect(config.mcpServers.hivemind.args).toContain('/custom/vault/path');
    });

    it('should format as pretty JSON', () => {
      const snippet = generateClaudeDesktopSnippet('/vault');

      // Should be formatted with 2-space indentation
      expect(snippet).toContain('  ');
      expect(snippet).toContain('\n');
    });
  });

  describe('writeConfigFile', () => {
    it('should write config.json to specified directory', () => {
      const config = generateConfig('/vault', 'worldbuilding');
      const configPath = writeConfigFile(tempDir, config);

      expect(configPath).toBe(join(tempDir, 'config.json'));
      expect(existsSync(configPath)).toBe(true);
    });

    it('should write valid JSON content', () => {
      const config = generateConfig('/vault', 'worldbuilding');
      writeConfigFile(tempDir, config);

      const content = readFileSync(join(tempDir, 'config.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(config);
    });

    it('should format JSON with proper indentation', () => {
      const config = generateConfig('/vault', 'worldbuilding');
      writeConfigFile(tempDir, config);

      const content = readFileSync(join(tempDir, 'config.json'), 'utf-8');

      // Should be pretty-printed
      expect(content).toContain('  ');
      expect(content).toContain('\n');
    });

    it('should overwrite existing config.json', () => {
      const oldConfig = { old: 'data' };
      writeFileSync(join(tempDir, 'config.json'), JSON.stringify(oldConfig));

      const newConfig = generateConfig('/vault', 'worldbuilding');
      writeConfigFile(tempDir, newConfig);

      const content = readFileSync(join(tempDir, 'config.json'), 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(newConfig);
      expect(parsed).not.toEqual(oldConfig);
    });
  });

  describe('outputNextSteps', () => {
    it('should output completion message in non-interactive mode', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', false);

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Setup complete!'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('/config.json'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('worldbuilding'));

      spy.mockRestore();
    });

    it('should display Claude Desktop configuration snippet', async () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', false);

      const calls = spy.mock.calls.map((call) => call.join(' '));
      const output = calls.join('\n');

      expect(output).toContain('Claude Desktop configuration');
      expect(output).toContain('mcpServers');
      expect(output).toContain('hivemind');

      spy.mockRestore();
    });

    it('should not prompt for clipboard in non-interactive mode', async () => {
      const promptSpy = vi.spyOn(prompts, 'promptConfirm');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', false);

      expect(promptSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
    });

    // Note: Mocking process.stdin.isTTY is difficult in test environment
    // as it's not configurable. This behavior is tested manually and the
    // logic is straightforward (if !isTTY, skip prompts).

    it('should handle clipboard copy success in interactive mode', async () => {
      // Mock TTY
      const originalIsTTY = process.stdin.isTTY;
      (process.stdin as any).isTTY = true;

      const promptSpy = vi.spyOn(prompts, 'promptConfirm')
        .mockResolvedValueOnce(true) // Copy to clipboard
        .mockResolvedValueOnce(false); // Don't open folder
      const clipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue(true);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', true);

      expect(promptSpy).toHaveBeenCalledWith('Copy to clipboard?', true);
      expect(clipboardSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Copied to clipboard!'));

      logSpy.mockRestore();
      (process.stdin as any).isTTY = originalIsTTY;
    });

    it('should handle clipboard copy failure in interactive mode', async () => {
      const originalIsTTY = process.stdin.isTTY;
      (process.stdin as any).isTTY = true;

      const promptSpy = vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(true);
      const clipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue(false);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', true);

      expect(clipboardSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Could not copy to clipboard'));

      logSpy.mockRestore();
      (process.stdin as any).isTTY = originalIsTTY;
    });

    it('should handle open folder success in interactive mode', async () => {
      const originalIsTTY = process.stdin.isTTY;
      (process.stdin as any).isTTY = true;

      const promptSpy = vi.spyOn(prompts, 'promptConfirm')
        .mockResolvedValueOnce(true) // Copy to clipboard
        .mockResolvedValueOnce(true); // Open folder
      const clipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue(true);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock openInExplorer to succeed
      vi.mock('../../../src/cli/init/output.js', async () => {
        const actual = await vi.importActual('../../../src/cli/init/output.js');
        return {
          ...actual,
          openInExplorer: vi.fn().mockResolvedValue(true),
        };
      });

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', true);

      expect(promptSpy).toHaveBeenCalledWith('Open config folder?', true);

      logSpy.mockRestore();
      (process.stdin as any).isTTY = originalIsTTY;
      vi.unmock('../../../src/cli/init/output.js');
    });

    it('should handle user declining clipboard copy', async () => {
      const originalIsTTY = process.stdin.isTTY;
      (process.stdin as any).isTTY = true;

      const promptSpy = vi.spyOn(prompts, 'promptConfirm').mockResolvedValue(false);
      const clipboardSpy = vi.spyOn(clipboard, 'copyToClipboard');
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await outputNextSteps('/vault', 'worldbuilding', '/config.json', true);

      expect(promptSpy).toHaveBeenCalledWith('Copy to clipboard?', true);
      expect(clipboardSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      (process.stdin as any).isTTY = originalIsTTY;
    });
  });

  describe('outputMissingConfigError', () => {
    it('should output error message to stderr', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      outputMissingConfigError();

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('config.json not found'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('npx @hiveforge/hivemind-mcp init'));

      spy.mockRestore();
    });
  });

  describe('outputInvalidVaultError', () => {
    it('should output error with provided path', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      outputInvalidVaultError('/invalid/path');

      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Invalid vault path'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('/invalid/path'));

      spy.mockRestore();
    });
  });
});

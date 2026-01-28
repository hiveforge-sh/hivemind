import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { exec } from 'child_process';
import { copyToClipboard } from '../shared/clipboard.js';
import { promptConfirm } from './prompts.js';
import { success, error, dim, bold } from '../shared/colors.js';

/**
 * Get the Claude Desktop config file path based on platform.
 */
export function getClaudeDesktopConfigPath(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    const appData = process.env.APPDATA || resolve(process.env.USERPROFILE || '', 'AppData', 'Roaming');
    return resolve(appData, 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    const home = process.env.HOME || '';
    return resolve(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux - use XDG config or fallback
    const configHome = process.env.XDG_CONFIG_HOME || resolve(process.env.HOME || '', '.config');
    return resolve(configHome, 'Claude', 'claude_desktop_config.json');
  }
}

/**
 * Open folder in system file explorer.
 * Returns true if command was executed, false on error.
 */
export function openInExplorer(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const folder = dirname(filePath);
    const platform = process.platform;

    // Ensure folder exists
    if (!existsSync(folder)) {
      try {
        mkdirSync(folder, { recursive: true });
      } catch {
        resolve(false);
        return;
      }
    }

    let command: string;
    if (platform === 'win32') {
      command = `explorer "${folder}"`;
    } else if (platform === 'darwin') {
      command = `open "${folder}"`;
    } else {
      command = `xdg-open "${folder}"`;
    }

    exec(command, (err) => {
      resolve(!err);
    });
  });
}

/**
 * Hivemind config.json structure.
 */
export interface HivemindConfig {
  vault: {
    path: string;
    watchForChanges: boolean;
    debounceMs: number;
  };
  server: {
    transport: 'stdio';
  };
  template: {
    activeTemplate: string;
  };
  indexing: {
    strategy: 'incremental';
    batchSize: number;
    enableVectorSearch: boolean;
    enableFullTextSearch: boolean;
  };
}

/**
 * Generate Hivemind config object.
 */
export function generateConfig(vaultPath: string, templateId: string): HivemindConfig {
  return {
    vault: {
      path: vaultPath,
      watchForChanges: true,
      debounceMs: 100,
    },
    server: {
      transport: 'stdio',
    },
    template: {
      activeTemplate: templateId,
    },
    indexing: {
      strategy: 'incremental',
      batchSize: 100,
      enableVectorSearch: false,
      enableFullTextSearch: true,
    },
  };
}

/**
 * Generate Claude Desktop MCP config snippet.
 */
export function generateClaudeDesktopSnippet(vaultPath: string): string {
  const config = {
    mcpServers: {
      hivemind: {
        command: 'npx',
        args: ['-y', '@hiveforge/hivemind-mcp', '--vault', vaultPath],
      },
    },
  };

  return JSON.stringify(config, null, 2);
}

/**
 * Write config.json to disk.
 */
export function writeConfigFile(dir: string, config: HivemindConfig): string {
  const configPath = resolve(dir, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

/**
 * Output final summary and next steps.
 * Offers to copy Claude Desktop config to clipboard.
 */
export async function outputNextSteps(
  vaultPath: string,
  templateId: string,
  configPath: string,
  isInteractive: boolean
): Promise<void> {
  console.warn('\n' + success('Setup complete!'));
  console.warn(`\nCreated: ${bold(configPath)}`);
  console.warn(`Template: ${templateId}`);

  // Generate and display Claude Desktop snippet
  const snippet = generateClaudeDesktopSnippet(vaultPath);
  console.warn('\n' + bold('Claude Desktop configuration:'));
  console.warn(dim('Add this to your claude_desktop_config.json:\n'));
  console.warn(snippet);

  // Offer to copy to clipboard (only in interactive mode)
  if (isInteractive && process.stdin.isTTY) {
    const shouldCopy = await promptConfirm('Copy to clipboard?', true);
    if (shouldCopy) {
      const copied = await copyToClipboard(snippet);
      if (copied) {
        console.warn(success('\nCopied to clipboard!'));

        // Offer to open Claude Desktop config location
        const claudeConfigPath = getClaudeDesktopConfigPath();
        console.warn(dim(`\nClaude Desktop config: ${claudeConfigPath}`));

        const shouldOpen = await promptConfirm('Open config folder?', true);
        if (shouldOpen) {
          const opened = await openInExplorer(claudeConfigPath);
          if (opened) {
            console.warn(success('Opened config folder.'));
          } else {
            console.warn(dim('Could not open folder automatically.'));
          }
        }
      } else {
        console.warn(dim('\nCould not copy to clipboard (clipboard may not be available).'));
      }
    }
  }

  // Next steps
  console.warn('\n' + bold('Next steps:'));
  console.warn('  1. Paste the config into Claude Desktop settings');
  console.warn('  2. Restart Claude Desktop');
  console.warn('  3. Add frontmatter to your vault files');
  console.warn('  4. Start querying via Claude!\n');

  console.warn(dim('Run `npx @hiveforge/hivemind-mcp validate` to check your setup.'));
}

/**
 * Output error for missing config.json.
 * Called when commands other than init are run without config.
 */
export function outputMissingConfigError(): void {
  console.error(error('config.json not found.'));
  console.error('\nRun `npx @hiveforge/hivemind-mcp init` to create one.');
  console.error('Or use: `npx @hiveforge/hivemind-mcp --vault <path>`');
}

/**
 * Output error for invalid vault path.
 */
export function outputInvalidVaultError(path: string): void {
  console.error(error(`Invalid vault path: ${path}`));
  console.error('\nThe path must be an existing directory.');
}

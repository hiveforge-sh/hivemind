import { resolve } from 'path';
import { runInteractiveWizard } from './wizard.js';
import { validateVaultPath, validatePresetFile, configExists } from './validators.js';
import { generateConfig, writeConfigFile, outputNextSteps, outputInvalidVaultError } from './output.js';
import { error, dim } from '../shared/colors.js';

/**
 * Options for init command.
 */
export interface InitOptions {
  /** Path to preset config file (--config flag) */
  config?: string;
  /** Vault path (--vault flag) */
  vault?: string;
  /** Template ID (--template flag) */
  template?: string;
  /** Skip confirmations (--yes flag) */
  yes?: boolean;
}

/**
 * Parse init-specific arguments from process.argv.
 */
export function parseInitArgs(): InitOptions {
  const args = process.argv.slice(3); // Skip node, script, 'init'
  const options: InitOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--config' && next) {
      options.config = next;
      i++;
    } else if (arg === '--vault' && next) {
      options.vault = next;
      i++;
    } else if (arg === '--template' && next) {
      options.template = next;
      i++;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    }
  }

  return options;
}

/**
 * Run init from preset file (--config flag).
 */
async function initFromPreset(presetPath: string): Promise<void> {
  console.log(dim(`Loading preset from: ${presetPath}\n`));

  const preset = validatePresetFile(presetPath);

  // Extract required fields
  const vault = preset.vault as Record<string, unknown> | undefined;
  const template = preset.template as Record<string, unknown> | undefined;
  const vaultPath = vault?.path as string | undefined || preset.vaultPath as string | undefined;
  const templateId = template?.activeTemplate as string | undefined || preset.templateId as string | undefined || 'worldbuilding';

  if (!vaultPath) {
    throw new Error('Preset must include vault.path or vaultPath');
  }

  // Validate vault path
  const validation = validateVaultPath(vaultPath);
  if (validation !== true) {
    throw new Error(validation);
  }

  // Generate and write config
  const resolvedVault = resolve(vaultPath);
  const config = generateConfig(resolvedVault, templateId);
  const configPath = writeConfigFile(process.cwd(), config);

  await outputNextSteps(resolvedVault, templateId, configPath, false);
}

/**
 * Run init from flags (--vault, --template).
 */
async function initFromFlags(options: InitOptions): Promise<void> {
  const vaultPath = options.vault!;
  const templateId = options.template || 'worldbuilding';

  // Validate vault path
  const validation = validateVaultPath(vaultPath);
  if (validation !== true) {
    outputInvalidVaultError(vaultPath);
    process.exit(1);
  }

  // Check for existing config
  if (configExists(process.cwd()) && !options.yes) {
    console.error(error('config.json already exists. Use --yes to overwrite.'));
    process.exit(1);
  }

  // Generate and write config
  const resolvedVault = resolve(vaultPath);
  const config = generateConfig(resolvedVault, templateId);
  const configPath = writeConfigFile(process.cwd(), config);

  await outputNextSteps(resolvedVault, templateId, configPath, false);
}

/**
 * Main init command entry point.
 *
 * Supports three modes:
 * 1. Interactive (default): Run wizard with prompts
 * 2. Preset file: --config preset.json
 * 3. Flags: --vault <path> --template <id>
 */
export async function initCommand(): Promise<void> {
  const options = parseInitArgs();

  try {
    // Mode 1: Preset file
    if (options.config) {
      await initFromPreset(options.config);
      return;
    }

    // Mode 2: Flags (vault required, template optional)
    if (options.vault) {
      await initFromFlags(options);
      return;
    }

    // Mode 3: Interactive wizard
    const result = await runInteractiveWizard();

    if (result.cancelled) {
      process.exit(0);
    }

    // Generate and write config
    const config = generateConfig(result.vaultPath, result.templateId);
    const configPath = writeConfigFile(process.cwd(), config);

    await outputNextSteps(result.vaultPath, result.templateId, configPath, true);

  } catch (err) {
    console.error(error(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

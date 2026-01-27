/**
 * CLI fix command entry point.
 *
 * Handles argument parsing, config loading, interactive prompts for ambiguous
 * types, and orchestrates the fix operation.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { select } from '@inquirer/prompts';
import { FileFixer } from './fixer.js';
import { applyOperations } from './writer.js';
import {
  formatDryRunOutput,
  formatApplyOutput,
  formatJsonOutput,
  formatJsonOutputWithResults,
} from './formatter.js';
import type { FixOptions, FixResult, FixSummary } from './types.js';
import { error } from '../shared/colors.js';
import { outputMissingConfigError } from '../init/output.js';

/**
 * Interactive prompting for ambiguous folder mappings.
 * When a folder maps to multiple types, user selects once per folder.
 * In --yes or --json mode, first type is used without prompting.
 */

/**
 * Parse command line arguments for fix command.
 *
 * Supported flags:
 * - --apply: Apply changes (default: dry-run)
 * - --yes, -y: Skip prompts (non-interactive mode)
 * - --json: Output machine-readable JSON
 * - --verbose, -v: Show individual file list
 * - --type <type>: Override folder mapping
 * - --ignore <pattern>: Add to ignorePatterns array (repeatable)
 * - --vault <path>: Override vault path
 * - First non-flag arg: Target path within vault
 *
 * @returns Parsed fix options (vaultPath populated separately)
 */
export function parseFixArgs(): Partial<FixOptions> & { vaultOverride?: string; targetPath?: string } {
  const args = process.argv.slice(3); // Skip node, script, 'fix'
  const options: Partial<FixOptions> & { vaultOverride?: string; targetPath?: string } = {
    apply: false,
    yes: false,
    json: false,
    verbose: false,
    ignorePatterns: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--type' && args[i + 1]) {
      options.type = args[i + 1];
      i++;
    } else if (arg === '--ignore' && args[i + 1]) {
      options.ignorePatterns!.push(args[i + 1]);
      i++;
    } else if (arg === '--vault' && args[i + 1]) {
      options.vaultOverride = args[i + 1];
      i++;
    } else if (!arg.startsWith('-')) {
      // First non-flag argument is target path
      if (!options.targetPath) {
        options.targetPath = arg;
      }
    }
  }

  return options;
}

/**
 * Load config.json and extract vault path and active template.
 *
 * @param vaultOverride - Optional vault path override from --vault flag
 * @returns Config with vaultPath and activeTemplate
 */
function loadConfig(vaultOverride?: string): { vaultPath: string; activeTemplate: string } {
  // If --vault flag provided, use it directly
  if (vaultOverride) {
    const vaultPath = resolve(vaultOverride);
    if (!existsSync(vaultPath)) {
      console.error(error(`Vault path does not exist: ${vaultPath}`));
      process.exit(2);
    }
    return { vaultPath, activeTemplate: 'worldbuilding' };
  }

  // Otherwise, load from config.json
  const configPath = resolve(process.cwd(), 'config.json');
  if (!existsSync(configPath)) {
    outputMissingConfigError();
    process.exit(2);
  }

  let config: any;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error(error('Configuration error:'), err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  const vaultPath = resolve(config.vault?.path);
  if (!vaultPath || !existsSync(vaultPath)) {
    console.error(error('Vault path does not exist:'), vaultPath);
    process.exit(2);
  }

  const activeTemplate = config.template?.activeTemplate || 'worldbuilding';
  return { vaultPath, activeTemplate };
}

// Note: groupByFolder utility reserved for future interactive prompting.
// Per CONTEXT.md: "Batch prompts by folder (ask once per ambiguous folder)"
// Currently, FileFixer handles type resolution internally.

/**
 * Main fix command entry point.
 *
 * Flow:
 * 1. Parse arguments
 * 2. TTY check (error if interactive required but no TTY)
 * 3. Load config, get vault path and active template
 * 4. Initialize FileFixer and analyze
 * 5. Handle ambiguous types (prompt or skip based on --yes)
 * 6. Apply changes or show dry-run preview
 * 7. Output results (text or JSON)
 */
export async function fixCommand(): Promise<void> {
  // 1. Parse arguments
  const parsedArgs = parseFixArgs();

  // 2. TTY check
  if (!process.stdin.isTTY && !parsedArgs.yes && !parsedArgs.json) {
    console.error(error('Interactive mode requires a terminal. Use --yes to skip prompts.'));
    process.exit(2);
  }

  // 3. Load config
  const { vaultPath, activeTemplate } = loadConfig(parsedArgs.vaultOverride);

  // Build full options
  const options: FixOptions = {
    vaultPath,
    apply: parsedArgs.apply ?? false,
    yes: parsedArgs.yes ?? false,
    json: parsedArgs.json ?? false,
    verbose: parsedArgs.verbose ?? false,
    type: parsedArgs.type,
    ignorePatterns: parsedArgs.ignorePatterns,
  };

  // 4. Initialize FileFixer and analyze
  const fixer = new FileFixer(options);

  try {
    await fixer.initialize(activeTemplate);
  } catch (err) {
    console.error(error('Template error:'), err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  const operations = await fixer.analyze();

  // 5. Handle ambiguous types (prompt user once per folder)
  if (!options.yes && !options.json) {
    const ambiguousFiles = fixer.getAmbiguousFiles();

    // Group by folder (unique folders only)
    const folderGroups = new Map<string, string[]>();
    for (const af of ambiguousFiles) {
      if (!folderGroups.has(af.folder)) {
        folderGroups.set(af.folder, af.possibleTypes);
      }
    }

    // Prompt for each ambiguous folder
    for (const [folder, types] of folderGroups) {
      const selectedType = await select({
        message: `Select entity type for files in "${folder}":`,
        choices: types.map(t => ({ name: t, value: t })),
      });

      fixer.resolveAmbiguousType(folder, selectedType);
    }

    // Process pending files with resolved types
    const additionalOps = await fixer.processPendingAmbiguous();
    operations.push(...additionalOps);
  }

  const skippedFiles = 0;

  // 6. Build summary
  const byType: Record<string, number> = {};
  for (const op of operations) {
    byType[op.entityType] = (byType[op.entityType] || 0) + 1;
  }

  const summary: FixSummary = {
    totalFiles: operations.length,
    fixedFiles: 0,
    skippedFiles,
    failedFiles: 0,
    byType,
  };

  // 7. Apply or dry-run
  if (options.apply) {
    // Apply changes
    const writeResults = await applyOperations(vaultPath, operations);

    summary.fixedFiles = writeResults.filter((r) => r.success).length;
    summary.failedFiles = writeResults.filter((r) => !r.success).length;

    const result: FixResult = {
      success: summary.failedFiles === 0,
      operations,
      applied: true,
      summary,
    };

    // Output
    if (options.json) {
      console.log(formatJsonOutputWithResults(result, writeResults));
    } else {
      console.log(formatApplyOutput(summary, writeResults));
    }

    // Exit code: 0 success, 1 failures
    process.exit(summary.failedFiles > 0 ? 1 : 0);
  } else {
    // Dry-run mode
    summary.fixedFiles = operations.length; // Would be fixed

    const result: FixResult = {
      success: true,
      operations,
      applied: false,
      summary,
    };

    // Output
    if (options.json) {
      console.log(formatJsonOutput(result));
    } else {
      console.log(formatDryRunOutput(operations, options.verbose));
    }

    // Exit code: 0 (dry-run is always success)
    process.exit(0);
  }
}

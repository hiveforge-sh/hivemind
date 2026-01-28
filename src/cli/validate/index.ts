/**
 * CLI validate command entry point.
 *
 * Handles argument parsing, config loading, and orchestrates validation.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { ValidateOptions } from './types.js';
import { ValidationScanner } from './scanner.js';
import { formatTextOutput, formatJsonOutput, calculateSummary } from './formatter.js';
import { initializeTemplateRegistry } from './validator.js';
import { outputMissingConfigError } from '../init/output.js';

/**
 * Parse command-line arguments for validate command.
 */
function parseValidateArgs(): Omit<ValidateOptions, 'vaultPath'> {
  const args = process.argv.slice(3); // Skip node, script, 'validate'
  const options: Omit<ValidateOptions, 'vaultPath'> = {
    skipMissing: args.includes('--skip-missing'),
    ignorePatterns: [],
    json: args.includes('--json'),
    quiet: args.includes('--quiet'),
  };

  // Parse --ignore patterns (can appear multiple times)
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ignore' && args[i + 1]) {
      options.ignorePatterns!.push(args[i + 1]);
    }
  }

  // Parse target path (non-flag argument)
  const nonFlagArgs = args.filter(
    (a) => !a.startsWith('-') && args[args.indexOf(a) - 1] !== '--ignore'
  );
  if (nonFlagArgs.length > 0) {
    options.targetPath = nonFlagArgs[0];
  }

  return options;
}

/**
 * Main entry point for validate command.
 *
 * Loads config, parses arguments, runs validation, and outputs results.
 */
export async function validateCommand(): Promise<void> {
  // 1. Load config
  const configPath = resolve(process.cwd(), 'config.json');
  if (!existsSync(configPath)) {
    outputMissingConfigError();
    process.exit(2); // Config error
  }

  let config: { vault?: { path?: string }; template?: { activeTemplate?: string } };
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8')) as typeof config;
  } catch (err) {
    console.error('Configuration error:', err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  // 2. Get vault path
  const vaultPath = resolve(config.vault?.path ?? '');
  if (!vaultPath || !existsSync(vaultPath)) {
    console.error('Vault path does not exist:', vaultPath);
    process.exit(2);
  }

  // 3. Parse arguments
  const parsedOptions = parseValidateArgs();
  const options: ValidateOptions = {
    ...parsedOptions,
    vaultPath,
  };

  // 4. Initialize template registry
  const activeTemplate = config.template?.activeTemplate || 'worldbuilding';
  try {
    await initializeTemplateRegistry(activeTemplate);
  } catch (err) {
    console.error('Template error:', err instanceof Error ? err.message : String(err));
    process.exit(2);
  }

  // 5. Run scanner
  const scanner = new ValidationScanner(options);
  const results = await scanner.scan();
  const summary = calculateSummary(results);

  // 6. Output results based on flags
  if (summary.invalidFiles === 0) {
    // Silent success per CONTEXT.md
    process.exit(0);
  }

  if (!options.quiet) {
    if (options.json) {
      console.warn(formatJsonOutput(results, summary, vaultPath));
    } else {
      console.warn(formatTextOutput(results, summary));

      // ERR-03: Suggestions when vault has no valid entities
      if (summary.validFiles === 0 && summary.totalFiles > 0) {
        console.warn('');
        console.warn('Your vault has no files with valid frontmatter.');
        console.warn('Try:');
        console.warn('  1. Run "npx hivemind fix" to add frontmatter to existing files');
        console.warn('  2. Check that your templates match your content types');
        console.warn('  3. Run "npx hivemind init" to reconfigure if needed');
      }
    }
  }

  process.exit(1); // Validation errors found
}

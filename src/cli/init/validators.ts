import { existsSync, statSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Validate vault path for @inquirer/input.
 * Returns true if valid, error message string if invalid.
 */
export function validateVaultPath(value: string): true | string {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Vault path is required';
  }

  const resolved = resolve(trimmed);

  if (!existsSync(resolved)) {
    return `Path does not exist: ${resolved}`;
  }

  const stats = statSync(resolved);
  if (!stats.isDirectory()) {
    return `Path is not a directory: ${resolved}`;
  }

  return true;
}

/**
 * Validate preset config file for --config flag.
 * Returns parsed config object or throws error.
 */
export function validatePresetFile(filePath: string): Record<string, unknown> {
  const resolved = resolve(filePath);

  if (!existsSync(resolved)) {
    throw new Error(`Preset file not found: ${resolved}`);
  }

  try {
    const content = readFileSync(resolved, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Invalid JSON in preset file: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Check if a config.json already exists in the target directory.
 */
export function configExists(dir: string): boolean {
  return existsSync(resolve(dir, 'config.json'));
}

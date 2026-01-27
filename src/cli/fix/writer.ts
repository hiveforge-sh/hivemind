/**
 * Atomic file writer for fix command.
 *
 * Uses temp file + rename pattern for safe file modifications.
 * This ensures no partial writes if the process is interrupted.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import matter from 'gray-matter';
import type { FileOperation } from './types.js';

/**
 * Result of a single file write operation.
 */
export interface WriteResult {
  /** Path to file (relative to vault) */
  path: string;
  /** Whether write succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Write frontmatter to a file atomically.
 *
 * Uses temp file + rename pattern:
 * 1. Read existing file content
 * 2. Parse/update frontmatter with gray-matter
 * 3. Write to temp file
 * 4. Rename temp to target (atomic)
 * 5. Cleanup temp on failure
 *
 * @param vaultPath - Absolute path to vault root
 * @param operation - File operation describing the fix
 * @returns Write result with success status
 */
export async function writeFile(
  vaultPath: string,
  operation: FileOperation
): Promise<WriteResult> {
  const targetPath = join(vaultPath, operation.path);
  const tempPath = join(
    tmpdir(),
    `hivemind-${Date.now()}-${Math.random().toString(36).slice(2)}.md`
  );

  try {
    // Read existing content
    const content = await fs.readFile(targetPath, 'utf-8');

    // Parse with gray-matter
    const file = matter(content);

    // Merge frontmatter: existing values take precedence, add only missing fields
    const mergedData = { ...operation.frontmatter, ...file.data };

    // Stringify back to markdown
    const output = matter.stringify(file.content, mergedData);

    // Write to temp file
    await fs.writeFile(tempPath, output, 'utf-8');

    // Atomic rename to target
    await fs.rename(tempPath, targetPath);

    return {
      path: operation.path,
      success: true,
    };
  } catch (error) {
    // Cleanup temp file on failure
    await fs.unlink(tempPath).catch(() => {});

    return {
      path: operation.path,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Apply multiple fix operations to files.
 *
 * Continues on individual file failures (doesn't abort batch).
 *
 * @param vaultPath - Absolute path to vault root
 * @param operations - File operations from FileFixer.analyze()
 * @returns Array of write results
 */
export async function applyOperations(
  vaultPath: string,
  operations: FileOperation[]
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];

  for (const operation of operations) {
    const result = await writeFile(vaultPath, operation);
    results.push(result);
  }

  return results;
}

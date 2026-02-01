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
 * Post-process YAML output to fix inline empty arrays/objects.
 * Converts `: []` and `: {}` to just `:` (YAML null) which is more
 * parser-friendly while still showing the field exists.
 */
function fixEmptyYamlValues(yaml: string): string {
  // Replace inline empty arrays `: []` with just `:`
  // Replace inline empty objects `: {}` with just `:`
  return yaml
    .replace(/: \[\]\s*$/gm, ':')
    .replace(/: \{\}\s*$/gm, ':');
}

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

    // Check for unparseable frontmatter: content starts with --- but data is empty
    // This happens when YAML has syntax errors - gray-matter puts it in content
    const hasUnparseableFrontmatter =
      Object.keys(file.data).length === 0 &&
      file.content.trimStart().startsWith('---');

    if (hasUnparseableFrontmatter) {
      // Extract and merge with existing frontmatter manually
      const frontmatterMatch = file.content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (frontmatterMatch) {
        // Parse existing frontmatter as loose key-value pairs (tolerant parsing)
        const existingLines = frontmatterMatch[1].split('\n');
        const existingData: Record<string, unknown> = {};

        for (const line of existingLines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            let value: unknown = line.slice(colonIndex + 1).trim();

            // Try to parse as JSON for arrays/objects, otherwise keep as string
            if (value && typeof value === 'string') {
              if (value.startsWith('[') || value.startsWith('{') || value.startsWith('"')) {
                try {
                  value = JSON.parse(value);
                } catch {
                  // Keep as string if JSON parse fails
                }
              } else if (value === 'true') {
                value = true;
              } else if (value === 'false') {
                value = false;
              } else if (/^-?\d+$/.test(value)) {
                value = parseInt(value, 10);
              } else if (/^-?\d+\.\d+$/.test(value)) {
                value = parseFloat(value);
              }
            }

            if (key) {
              existingData[key] = value;
            }
          }
        }

        // Merge: new fields + existing fields (existing takes precedence)
        const mergedData = { ...operation.frontmatter, ...existingData };

        // Get content after the frontmatter block
        const contentAfterFrontmatter = file.content.slice(frontmatterMatch[0].length).trimStart();

        // Stringify and fix empty values format
        const output = fixEmptyYamlValues(matter.stringify(contentAfterFrontmatter, mergedData));

        // Write to temp file
        await fs.writeFile(tempPath, output, 'utf-8');

        // Atomic rename to target
        await fs.rename(tempPath, targetPath);

        return {
          path: operation.path,
          success: true,
        };
      }
    }

    // Normal case: merge frontmatter (existing values take precedence, add only missing fields)
    const mergedData = { ...operation.frontmatter, ...file.data };

    // Stringify back to markdown and fix empty values format
    const output = fixEmptyYamlValues(matter.stringify(file.content, mergedData));

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

/**
 * ID generation for fix command.
 *
 * Creates unique slugified IDs from filenames with collision detection.
 * Follows CONTEXT.md algorithm: base ID, then type-prefixed, then numbered.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

/**
 * Slugify a filename into a valid ID.
 *
 * Transformation:
 * - Remove .md extension
 * - Lowercase
 * - Replace non-alphanumeric with hyphens
 * - Collapse multiple hyphens
 * - Remove leading/trailing hyphens
 *
 * @param filename - Filename to slugify (e.g., "John Smith.md")
 * @returns Slugified ID (e.g., "john-smith")
 */
export function slugifyFilename(filename: string): string {
  return (
    filename
      // Remove .md extension
      .replace(/\.md$/i, '')
      // Lowercase
      .toLowerCase()
      // Replace non-alphanumeric with hyphens
      .replace(/[^a-z0-9]+/g, '-')
      // Collapse multiple hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
  );
}

/**
 * Collect all existing IDs from markdown files in the vault.
 *
 * Scans all markdown files and extracts the `id` field from frontmatter.
 * Used for collision detection when generating new IDs.
 *
 * @param vaultPath - Path to vault root
 * @returns Set of existing IDs
 */
export async function collectExistingIds(vaultPath: string): Promise<Set<string>> {
  const existingIds = new Set<string>();

  // Find all markdown files by scanning vault
  const files = await findMarkdownFiles(vaultPath);

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter } = matter(content);

      if (frontmatter && typeof frontmatter.id === 'string') {
        existingIds.add(frontmatter.id);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return existingIds;
}

/**
 * Generate a unique ID for a file.
 *
 * Algorithm (per CONTEXT.md):
 * 1. Generate base ID from slugified filename
 * 2. If no collision, return base ID
 * 3. If collision, prepend entity type: `{entityType}-{baseId}`
 * 4. If still collision, add counter: `{entityType}-{baseId}-2`, `-3`, etc.
 *
 * IMPORTANT: Adds generated ID to existingIds set for subsequent calls.
 *
 * @param filename - Filename to generate ID from
 * @param entityType - Entity type for prefix when collision occurs
 * @param existingIds - Set of existing IDs (mutated to add new ID)
 * @returns Unique ID string
 */
export function generateUniqueId(
  filename: string,
  entityType: string,
  existingIds: Set<string>
): string {
  const baseId = slugifyFilename(filename);

  // Try base ID first
  if (!existingIds.has(baseId)) {
    existingIds.add(baseId);
    return baseId;
  }

  // Try with entity type prefix
  const prefixedId = `${entityType}-${baseId}`;
  if (!existingIds.has(prefixedId)) {
    existingIds.add(prefixedId);
    return prefixedId;
  }

  // Add counter until unique
  let counter = 2;
  while (existingIds.has(`${prefixedId}-${counter}`)) {
    counter++;
  }

  const uniqueId = `${prefixedId}-${counter}`;
  existingIds.add(uniqueId);
  return uniqueId;
}

/**
 * Recursively find all markdown files in a directory.
 *
 * Simplified version for ID collection - doesn't need full validation.
 *
 * @param dir - Directory to search
 * @returns Array of absolute file paths
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories and common excludes
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await findMarkdownFiles(fullPath);
        results.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return results;
}

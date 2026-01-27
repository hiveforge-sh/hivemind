/**
 * Validation scanner for discovering and validating markdown files in vault.
 *
 * Reuses VaultReader's file discovery logic with exclusion support.
 */

import { promises as fs } from 'fs';
import { join, relative } from 'path';
import picomatch from 'picomatch';
import type { ValidateOptions, ValidationResult } from './types.js';
import { validateFile } from './validator.js';

/**
 * Scanner for discovering and validating vault files.
 */
export class ValidationScanner {
  private options: ValidateOptions;

  constructor(options: ValidateOptions) {
    this.options = options;
  }

  /**
   * Scan vault and validate all markdown files.
   *
   * @returns Array of validation results for all files
   */
  async scan(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Determine starting path (targetPath or vaultPath)
    const startPath = this.options.targetPath
      ? join(this.options.vaultPath, this.options.targetPath)
      : this.options.vaultPath;

    // Find all markdown files
    const files = await this.findMarkdownFiles(startPath);

    // Validate each file
    for (const filePath of files) {
      try {
        const result = await validateFile(filePath, this.options.vaultPath, {
          skipMissing: this.options.skipMissing,
        });
        results.push(result);
      } catch (_error) {
        // If file can't be read, include error in results
        const relPath = relative(this.options.vaultPath, filePath);
        results.push({
          path: relPath,
          valid: false,
          issues: [{ type: 'missing_frontmatter' }],
        });
      }
    }

    return results;
  }

  /**
   * Recursively find all markdown files in a directory.
   *
   * Adapted from VaultReader.findMarkdownFiles with exclusion support.
   */
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip excluded patterns
        if (this.shouldExclude(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findMarkdownFiles(fullPath);
          results.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Error reading directory ${dir}:`, error);
    }

    return results;
  }

  /**
   * Check if a file/directory should be excluded.
   *
   * Adapted from VaultReader.shouldExclude with user patterns support.
   */
  private shouldExclude(name: string): boolean {
    const defaultExcludes = [
      '.obsidian',
      '.trash',
      '.git',
      'node_modules',
      '_template.md',
    ];

    const excludePatterns = [
      ...defaultExcludes,
      ...(this.options.ignorePatterns || []),
    ];

    // Check for hidden files/folders (starting with .)
    if (name.startsWith('.')) {
      return true;
    }

    return excludePatterns.some((pattern) => {
      if (pattern.includes('*')) {
        // Glob pattern matching with picomatch
        const matcher = picomatch(pattern);
        return matcher(name);
      }
      // Exact match or prefix match
      return name === pattern || name.startsWith(pattern);
    });
  }
}

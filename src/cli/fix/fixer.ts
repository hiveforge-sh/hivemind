/**
 * FileFixer - Core fix logic for generating frontmatter.
 *
 * Analyzes vault files with validation issues and generates operations
 * to fix missing frontmatter. Does NOT modify files - only generates
 * operations for the command handler to apply.
 */

import { promises as fs } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';
import { ValidationScanner } from '../validate/scanner.js';
import { templateRegistry } from '../../templates/registry.js';
import { FolderMapper } from '../../templates/folder-mapper.js';
import { initializeTemplateRegistry } from '../validate/validator.js';
import { collectExistingIds, generateUniqueId } from './id-generator.js';
import type { FixOptions, FileOperation } from './types.js';
import type { ValidationResult } from '../validate/types.js';

/**
 * FileFixer analyzes vault and generates fix operations.
 *
 * Uses ValidationScanner for file discovery and FolderMapper for type resolution.
 * Preserves existing frontmatter values when adding missing fields.
 */
export class FileFixer {
  private options: FixOptions;
  private folderMapper: FolderMapper | null = null;
  private existingIds: Set<string> = new Set();

  constructor(options: FixOptions) {
    this.options = options;
  }

  /**
   * Initialize template registry and folder mapper.
   *
   * Must be called before analyze().
   *
   * @param activeTemplate - Template ID to activate
   */
  async initialize(activeTemplate: string): Promise<void> {
    await initializeTemplateRegistry(activeTemplate);
    const template = templateRegistry.getActive();
    this.folderMapper = await FolderMapper.createFromTemplate(template?.folderMappings);
    this.existingIds = await collectExistingIds(this.options.vaultPath);
  }

  /**
   * Analyze vault and generate fix operations (does not modify files).
   *
   * Scans vault for files with validation issues, resolves entity types
   * using folder mapping, and generates frontmatter for each fixable file.
   *
   * @returns Array of file operations to apply
   */
  async analyze(): Promise<FileOperation[]> {
    const operations: FileOperation[] = [];

    // Use ValidationScanner to find files with issues
    const scanner = new ValidationScanner({
      vaultPath: this.options.vaultPath,
      skipMissing: false, // We need to find files without frontmatter
      ignorePatterns: this.options.ignorePatterns,
    });

    const results = await scanner.scan();

    // Filter to files that need fixing
    const fixableResults = results.filter((result) => {
      if (result.valid) return false;

      // Only fix 'missing_frontmatter' or 'missing_field' issues
      return result.issues.some(
        (issue) =>
          issue.type === 'missing_frontmatter' || issue.type === 'missing_field'
      );
    });

    // Generate operations for each fixable file
    for (const result of fixableResults) {
      const operation = await this.createOperation(result);
      if (operation) {
        operations.push(operation);
      }
    }

    return operations;
  }

  /**
   * Create a fix operation for a single file.
   *
   * @param result - Validation result for the file
   * @returns FileOperation or null if file can't be fixed
   */
  private async createOperation(
    result: ValidationResult
  ): Promise<FileOperation | null> {
    const filePath = join(this.options.vaultPath, result.path);

    // Resolve entity type from folder or explicit override
    const entityType = await this.resolveEntityType(result.path);
    if (!entityType) {
      // Ambiguous type and not in interactive mode - skip
      return null;
    }

    // Read existing frontmatter
    let existingFrontmatter: Record<string, unknown> = {};
    let hasExistingFrontmatter = false;

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(content);
      if (data && Object.keys(data).length > 0) {
        existingFrontmatter = data as Record<string, unknown>;
        hasExistingFrontmatter = true;
      }
    } catch {
      // File read error - skip
      return null;
    }

    // Generate frontmatter
    const frontmatter = this.generateFrontmatter(
      filePath,
      entityType,
      existingFrontmatter
    );

    // Determine which fields are being added
    const fieldsToAdd = Object.keys(frontmatter).filter(
      (key) => !(key in existingFrontmatter)
    );

    return {
      path: result.path,
      entityType,
      fieldsToAdd,
      hasExistingFrontmatter,
      frontmatter,
    };
  }

  /**
   * Resolve entity type for a file path.
   *
   * Uses --type override if specified, otherwise folder mapping.
   * Returns null if type is ambiguous and not in interactive mode.
   *
   * @param relativePath - Path relative to vault root
   * @returns Entity type name or null
   */
  private async resolveEntityType(relativePath: string): Promise<string | null> {
    // Explicit type override takes precedence
    if (this.options.type) {
      return this.options.type;
    }

    if (!this.folderMapper) {
      return null;
    }

    const resolved = await this.folderMapper.resolveType(relativePath);

    switch (resolved.confidence) {
      case 'exact':
        return resolved.types[0];
      case 'ambiguous':
        // In --yes mode, use first type (per 13-04 decision)
        if (this.options.yes) {
          return resolved.types[0];
        }
        // In interactive mode, would prompt - for now return first type
        // Interactive prompting will be added in 15-02
        return resolved.types[0];
      case 'fallback':
        return resolved.types[0];
      case 'none':
        // No mapping - in --yes mode skip, otherwise would prompt
        if (this.options.yes) {
          return null;
        }
        return null;
    }
  }

  /**
   * Generate frontmatter for a file.
   *
   * For files with NO frontmatter: generates full template with required fields.
   * For files with partial frontmatter: adds only missing required fields.
   *
   * Required fields: id, type, status, tags, name
   * Default values: status='draft', tags=[]
   *
   * @param filePath - Absolute path to file
   * @param entityType - Resolved entity type
   * @param existingData - Existing frontmatter (empty object if none)
   * @returns Complete frontmatter object
   */
  private generateFrontmatter(
    filePath: string,
    entityType: string,
    existingData: Record<string, unknown>
  ): Record<string, unknown> {
    const filename = basename(filePath);
    const result: Record<string, unknown> = { ...existingData };

    // ID - generate unique if not present
    if (!('id' in result)) {
      result.id = generateUniqueId(filename, entityType, this.existingIds);
    }

    // Type - always set to resolved type
    if (!('type' in result)) {
      result.type = entityType;
    }

    // Status - default to 'draft' per CONTEXT.md
    if (!('status' in result)) {
      result.status = 'draft';
    }

    // Tags - default to empty array
    if (!('tags' in result)) {
      result.tags = [];
    }

    // Name - derive from filename (preserve original case)
    if (!('name' in result)) {
      result.name = filename.replace(/\.md$/i, '');
    }

    return result;
  }
}

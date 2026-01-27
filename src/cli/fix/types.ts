/**
 * Types for fix command infrastructure.
 *
 * Defines options, operations, and results for bulk frontmatter fixing.
 * Follows patterns from validate/types.ts for consistency.
 */

/**
 * Options for the fix command.
 */
export interface FixOptions {
  /** Path to vault directory */
  vaultPath: string;
  /** Apply changes (default false = dry-run) */
  apply: boolean;
  /** Skip prompts (non-interactive mode) */
  yes: boolean;
  /** Output JSON format for CI integration */
  json: boolean;
  /** Show individual file list (verbose mode) */
  verbose: boolean;
  /** Override folder mapping with explicit type */
  type?: string;
  /** Additional ignore patterns */
  ignorePatterns?: string[];
}

/**
 * Operation to perform on a single file.
 *
 * Represents the fix operation before it's applied.
 */
export interface FileOperation {
  /** Path to file (relative to vault) */
  path: string;
  /** Resolved or selected entity type */
  entityType: string;
  /** Field names being added */
  fieldsToAdd: string[];
  /** Whether file already has frontmatter */
  hasExistingFrontmatter: boolean;
  /** Generated frontmatter to add/merge */
  frontmatter: Record<string, unknown>;
}

/**
 * Result of fix operation.
 */
export interface FixResult {
  /** Whether operation completed successfully */
  success: boolean;
  /** List of file operations performed */
  operations: FileOperation[];
  /** Whether changes were written to disk */
  applied: boolean;
  /** Summary statistics */
  summary: FixSummary;
}

/**
 * Summary statistics for fix operation.
 */
export interface FixSummary {
  /** Total files scanned */
  totalFiles: number;
  /** Files that were fixed (or would be fixed in dry-run) */
  fixedFiles: number;
  /** Files skipped due to ambiguous types in --yes mode */
  skippedFiles: number;
  /** Files that couldn't be written (I/O errors) */
  failedFiles: number;
  /** Count of files per entity type */
  byType: Record<string, number>;
}

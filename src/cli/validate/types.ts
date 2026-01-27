/**
 * Types for vault validation infrastructure.
 *
 * Validation results, issues, and CLI options for the validate command.
 */

/**
 * Discriminated union of all possible validation issues.
 */
export type ValidationIssue =
  | { type: 'missing_frontmatter' }
  | { type: 'missing_field'; field: string }
  | {
      type: 'invalid_type';
      actual: string;
      validTypes: string[];
    }
  | {
      type: 'schema_error';
      field: string;
      message: string;
    }
  | {
      type: 'folder_mismatch';
      expected: string;
      actual: string;
      matchedPattern: string;
    };

/**
 * Validation result for a single file.
 */
export interface ValidationResult {
  /** Path to file (relative to vault) */
  path: string;
  /** Whether file passes all validation checks */
  valid: boolean;
  /** Array of issues found (empty if valid) */
  issues: ValidationIssue[];
  /** Parsed frontmatter (included for debugging) */
  frontmatter?: Record<string, unknown>;
}

/**
 * Aggregate statistics across all validated files.
 */
export interface ValidationSummary {
  /** Total files scanned */
  totalFiles: number;
  /** Files that passed validation */
  validFiles: number;
  /** Files with issues */
  invalidFiles: number;
  /** Count of issues by type */
  issuesByType: Record<ValidationIssue['type'], number>;
}

/**
 * Options for validate command.
 */
export interface ValidateOptions {
  /** Path to vault directory */
  vaultPath: string;
  /** Skip files without frontmatter (--skip-missing flag) */
  skipMissing?: boolean;
  /** Additional ignore patterns (--ignore flag) */
  ignorePatterns?: string[];
  /** Optional specific file or folder to validate */
  targetPath?: string;
  /** Output JSON format (--json flag) */
  json?: boolean;
  /** Quiet mode - only exit code (--quiet flag) */
  quiet?: boolean;
}

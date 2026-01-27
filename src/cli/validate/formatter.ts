/**
 * Output formatters for vault validation results.
 *
 * Provides text (grouped by issue type) and JSON (grouped by file) output.
 */

import type { ValidationResult, ValidationSummary, ValidationIssue } from './types.js';
import { error, bold } from '../shared/colors.js';

/**
 * Format a single validation issue as a human-readable message.
 */
export function formatIssueMessage(issue: ValidationIssue): string {
  switch (issue.type) {
    case 'missing_frontmatter':
      return 'Missing frontmatter';
    case 'missing_field':
      return `Missing required field: ${issue.field}`;
    case 'invalid_type':
      return `Invalid type "${issue.actual}" (valid: ${issue.validTypes.join(', ')})`;
    case 'schema_error':
      return `${issue.field}: ${issue.message}`;
    case 'folder_mismatch':
      return `Folder suggests type "${issue.expected}" but file has type "${issue.actual}"`;
  }
}

/**
 * Calculate summary statistics from validation results.
 */
export function calculateSummary(results: ValidationResult[]): ValidationSummary {
  const summary: ValidationSummary = {
    totalFiles: results.length,
    validFiles: 0,
    invalidFiles: 0,
    issuesByType: {
      missing_frontmatter: 0,
      missing_field: 0,
      invalid_type: 0,
      schema_error: 0,
      folder_mismatch: 0,
    },
  };

  for (const result of results) {
    if (result.valid) {
      summary.validFiles++;
    } else {
      summary.invalidFiles++;

      // Count issues by type
      for (const issue of result.issues) {
        summary.issuesByType[issue.type]++;
      }
    }
  }

  return summary;
}

/**
 * Format validation results as grouped text output.
 * Groups results by issue type (all "missing frontmatter" together, etc.).
 */
export function formatTextOutput(results: ValidationResult[], summary: ValidationSummary): string {
  // Filter to only invalid files
  const invalidResults = results.filter((r) => !r.valid);

  // Group results by issue type
  const groups = {
    missing_frontmatter: invalidResults.filter((r) =>
      r.issues.some((i) => i.type === 'missing_frontmatter')
    ),
    invalid_type: invalidResults.filter((r) =>
      r.issues.some((i) => i.type === 'invalid_type')
    ),
    missing_field: invalidResults.filter((r) =>
      r.issues.some((i) => i.type === 'missing_field')
    ),
    schema_error: invalidResults.filter((r) =>
      r.issues.some((i) => i.type === 'schema_error')
    ),
    folder_mismatch: invalidResults.filter((r) =>
      r.issues.some((i) => i.type === 'folder_mismatch')
    ),
  };

  const output: string[] = [];

  // Output each group with header
  if (groups.missing_frontmatter.length > 0) {
    output.push(error('Missing frontmatter:'));
    for (const result of groups.missing_frontmatter) {
      output.push(`  ${result.path}`);
    }
    output.push('');
  }

  if (groups.invalid_type.length > 0) {
    output.push(error('Invalid type:'));
    for (const result of groups.invalid_type) {
      const issue = result.issues.find((i) => i.type === 'invalid_type');
      if (issue && issue.type === 'invalid_type') {
        output.push(`  ${result.path}: "${issue.actual}" (valid: ${issue.validTypes.join(', ')})`);
      }
    }
    output.push('');
  }

  if (groups.missing_field.length > 0) {
    output.push(error('Missing required fields:'));
    for (const result of groups.missing_field) {
      const missingFields = result.issues
        .filter((i) => i.type === 'missing_field')
        .map((i) => (i as { type: 'missing_field'; field: string }).field);
      output.push(`  ${result.path}: ${missingFields.join(', ')}`);
    }
    output.push('');
  }

  if (groups.schema_error.length > 0) {
    output.push(error('Schema validation errors:'));
    for (const result of groups.schema_error) {
      const schemaIssues = result.issues.filter((i) => i.type === 'schema_error');
      output.push(`  ${result.path}:`);
      for (const issue of schemaIssues) {
        if (issue.type === 'schema_error') {
          output.push(`    - ${issue.field}: ${issue.message}`);
        }
      }
    }
    output.push('');
  }

  if (groups.folder_mismatch.length > 0) {
    output.push(error('Folder mismatches:'));
    for (const result of groups.folder_mismatch) {
      const issue = result.issues.find((i) => i.type === 'folder_mismatch');
      if (issue && issue.type === 'folder_mismatch') {
        output.push(
          `  ${result.path}: folder suggests "${issue.expected}", file has "${issue.actual}"`
        );
      }
    }
    output.push('');
  }

  // Summary line at end (always shown if there are issues)
  const totalIssues = Object.values(summary.issuesByType).reduce((a, b) => a + b, 0);
  output.push(bold(`Found ${totalIssues} issue${totalIssues === 1 ? '' : 's'} in ${summary.invalidFiles} file${summary.invalidFiles === 1 ? '' : 's'}`));

  return output.join('\n');
}

/**
 * Format validation results as JSON output.
 * Groups results by file for machine-readable processing.
 */
export function formatJsonOutput(
  results: ValidationResult[],
  summary: ValidationSummary,
  vaultPath: string
): string {
  const files: Record<string, string[]> = {};

  // Only include invalid files
  for (const result of results) {
    if (!result.valid) {
      files[result.path] = result.issues.map(formatIssueMessage);
    }
  }

  const totalIssues = Object.values(summary.issuesByType).reduce((a, b) => a + b, 0);

  const output = {
    valid: summary.invalidFiles === 0,
    timestamp: new Date().toISOString(),
    vaultPath,
    totalFiles: summary.totalFiles,
    totalIssues,
    files,
    summary: {
      missingFrontmatter: summary.issuesByType.missing_frontmatter || 0,
      invalidType: summary.issuesByType.invalid_type || 0,
      missingField: summary.issuesByType.missing_field || 0,
      schemaErrors: summary.issuesByType.schema_error || 0,
      folderMismatches: summary.issuesByType.folder_mismatch || 0,
    },
  };

  return JSON.stringify(output, null, 2);
}

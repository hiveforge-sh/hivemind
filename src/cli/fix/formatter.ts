/**
 * Output formatters for fix command.
 *
 * Provides dry-run preview (field names only, not values) and
 * completion summary for --apply operations.
 */

import { dim, bold, success, warn, error as errorColor } from '../shared/colors.js';
import type { FileOperation, FixResult, FixSummary } from './types.js';
import type { WriteResult } from './writer.js';

/**
 * Format dry-run preview output.
 *
 * Shows field names only (not values) per CONTEXT.md decision.
 * Groups output by entity type for readability.
 *
 * @param operations - File operations to preview
 * @param verbose - Show individual file list (otherwise just counts)
 * @returns Formatted output string
 */
export function formatDryRunOutput(
  operations: FileOperation[],
  verbose: boolean
): string {
  if (operations.length === 0) {
    return dim('No files need fixing.');
  }

  const lines: string[] = [];

  lines.push(dim('Dry-run preview (no files modified):'));
  lines.push('');

  // Group by entity type
  const byType = new Map<string, FileOperation[]>();
  for (const op of operations) {
    if (!byType.has(op.entityType)) {
      byType.set(op.entityType, []);
    }
    byType.get(op.entityType)!.push(op);
  }

  // Output each type group
  for (const [type, ops] of byType) {
    lines.push(`${bold(type)}: ${ops.length} file${ops.length === 1 ? '' : 's'}`);

    if (verbose) {
      // Show individual files in verbose mode
      for (const op of ops) {
        lines.push(`  ${op.path}`);
        if (op.fieldsToAdd.length > 0) {
          lines.push(dim(`    + ${op.fieldsToAdd.join(', ')}`));
        }
      }
    }

    lines.push('');
  }

  // Summary count
  const totalFiles = operations.length;
  lines.push(
    dim(`${totalFiles} file${totalFiles === 1 ? '' : 's'} to fix`)
  );
  lines.push('');
  lines.push(dim('Run') + ' hivemind fix --apply ' + dim('to apply changes'));

  return lines.join('\n');
}

/**
 * Format completion summary after --apply.
 *
 * Shows count of fixed files and lists any failures.
 *
 * @param summary - Fix summary statistics
 * @param writeResults - Results from file write operations
 * @returns Formatted output string
 */
export function formatApplyOutput(
  summary: FixSummary,
  writeResults: WriteResult[]
): string {
  const lines: string[] = [];

  // Count actual successes and failures from write results
  const successes = writeResults.filter((r) => r.success);
  const failures = writeResults.filter((r) => !r.success);

  if (failures.length === 0) {
    // All succeeded
    lines.push(
      success(`Fixed ${successes.length} file${successes.length === 1 ? '' : 's'}.`)
    );
  } else if (successes.length === 0) {
    // All failed
    lines.push(
      errorColor(`Failed to fix all ${failures.length} file${failures.length === 1 ? '' : 's'}:`)
    );
    for (const failure of failures) {
      lines.push(`  - ${failure.path}: ${failure.error}`);
    }
  } else {
    // Mixed results
    lines.push(
      warn(
        `Fixed ${successes.length} file${successes.length === 1 ? '' : 's'}. ` +
        `${failures.length} file${failures.length === 1 ? '' : 's'} could not be fixed:`
      )
    );
    for (const failure of failures) {
      lines.push(`  - ${failure.path}: ${failure.error}`);
    }
  }

  // Add skipped files info if any
  if (summary.skippedFiles > 0) {
    lines.push('');
    lines.push(
      dim(`${summary.skippedFiles} file${summary.skippedFiles === 1 ? '' : 's'} skipped (ambiguous type)`)
    );
  }

  return lines.join('\n');
}

/**
 * Format JSON output for CI integration.
 *
 * Returns valid JSON with summary and file details.
 * Grouped by file (not by issue type) per CONTEXT.md.
 *
 * @param result - Complete fix result
 * @returns JSON string
 */
export function formatJsonOutput(result: FixResult): string {
  const output = {
    success: result.success,
    applied: result.applied,
    summary: {
      totalFiles: result.summary.totalFiles,
      fixedFiles: result.summary.fixedFiles,
      skippedFiles: result.summary.skippedFiles,
      failedFiles: result.summary.failedFiles,
      byType: result.summary.byType,
    },
    files: result.operations.map((op) => ({
      path: op.path,
      type: op.entityType,
      fieldsAdded: op.fieldsToAdd,
    })),
    failures: [] as Array<{ path: string; error: string }>,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format JSON output with failure details after --apply.
 *
 * @param result - Complete fix result
 * @param writeResults - Results from file write operations
 * @returns JSON string
 */
export function formatJsonOutputWithResults(
  result: FixResult,
  writeResults: WriteResult[]
): string {
  const failures = writeResults
    .filter((r) => !r.success)
    .map((r) => ({
      path: r.path,
      error: r.error || 'Unknown error',
    }));

  const successes = writeResults.filter((r) => r.success);

  const output = {
    success: failures.length === 0,
    applied: result.applied,
    summary: {
      totalFiles: result.summary.totalFiles,
      fixedFiles: successes.length,
      skippedFiles: result.summary.skippedFiles,
      failedFiles: failures.length,
      byType: result.summary.byType,
    },
    files: result.operations
      .filter((op) => writeResults.find((r) => r.path === op.path)?.success)
      .map((op) => ({
        path: op.path,
        type: op.entityType,
        fieldsAdded: op.fieldsToAdd,
      })),
    failures,
  };

  return JSON.stringify(output, null, 2);
}

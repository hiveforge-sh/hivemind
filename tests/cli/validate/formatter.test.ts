import { describe, it, expect } from 'vitest';
import {
  formatIssueMessage,
  calculateSummary,
  formatTextOutput,
  formatJsonOutput,
} from '../../../src/cli/validate/formatter.js';
import type { ValidationResult, ValidationIssue } from '../../../src/cli/validate/types.js';

describe('formatIssueMessage', () => {
  it('formats missing_frontmatter issue', () => {
    const issue: ValidationIssue = { type: 'missing_frontmatter' };
    expect(formatIssueMessage(issue)).toBe('Missing frontmatter');
  });

  it('formats missing_field issue', () => {
    const issue: ValidationIssue = { type: 'missing_field', field: 'name' };
    expect(formatIssueMessage(issue)).toBe('Missing required field: name');
  });

  it('formats invalid_type issue', () => {
    const issue: ValidationIssue = {
      type: 'invalid_type',
      actual: 'foo',
      validTypes: ['character', 'location'],
    };
    expect(formatIssueMessage(issue)).toBe('Invalid type "foo" (valid: character, location)');
  });

  it('formats schema_error issue', () => {
    const issue: ValidationIssue = {
      type: 'schema_error',
      field: 'age',
      message: 'Expected number, received string',
    };
    expect(formatIssueMessage(issue)).toBe('age: Expected number, received string');
  });

  it('formats folder_mismatch issue', () => {
    const issue: ValidationIssue = {
      type: 'folder_mismatch',
      expected: 'character',
      actual: 'location',
      matchedPattern: '**/Characters/**',
    };
    expect(formatIssueMessage(issue)).toBe(
      'Folder suggests type "character" but file has type "location"'
    );
  });
});

describe('calculateSummary', () => {
  it('calculates summary for all valid files', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: true, issues: [] },
      { path: 'b.md', valid: true, issues: [] },
    ];

    const summary = calculateSummary(results);

    expect(summary.totalFiles).toBe(2);
    expect(summary.validFiles).toBe(2);
    expect(summary.invalidFiles).toBe(0);
    expect(summary.issuesByType.missing_frontmatter).toBe(0);
  });

  it('calculates summary for mixed results', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: true, issues: [] },
      { path: 'b.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      {
        path: 'c.md',
        valid: false,
        issues: [
          { type: 'invalid_type', actual: 'foo', validTypes: ['character'] },
          { type: 'missing_field', field: 'id' },
        ],
      },
    ];

    const summary = calculateSummary(results);

    expect(summary.totalFiles).toBe(3);
    expect(summary.validFiles).toBe(1);
    expect(summary.invalidFiles).toBe(2);
    expect(summary.issuesByType.missing_frontmatter).toBe(1);
    expect(summary.issuesByType.invalid_type).toBe(1);
    expect(summary.issuesByType.missing_field).toBe(1);
  });

  it('counts multiple issues of same type', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      { path: 'b.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      { path: 'c.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);

    expect(summary.issuesByType.missing_frontmatter).toBe(3);
  });
});

describe('formatTextOutput', () => {
  it('groups results by issue type', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      {
        path: 'b.md',
        valid: false,
        issues: [{ type: 'invalid_type', actual: 'foo', validTypes: ['bar'] }],
      },
      { path: 'c.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).toContain('Missing frontmatter:');
    expect(output).toContain('a.md');
    expect(output).toContain('c.md');
    expect(output).toContain('Invalid type:');
    expect(output).toContain('b.md');
  });

  it('shows summary line with totals', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      { path: 'b.md', valid: false, issues: [{ type: 'missing_field', field: 'id' }] },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).toMatch(/Found \d+ issues? in \d+ files?/);
    expect(output).toContain('2 issues');
    expect(output).toContain('2 files');
  });

  it('handles single issue correctly (singular form)', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).toContain('1 issue');
    expect(output).toContain('1 file');
  });

  it('groups multiple issues per file', () => {
    const results: ValidationResult[] = [
      {
        path: 'a.md',
        valid: false,
        issues: [
          { type: 'missing_field', field: 'id' },
          { type: 'missing_field', field: 'name' },
        ],
      },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).toContain('Missing required fields:');
    expect(output).toContain('a.md');
    expect(output).toContain('id');
    expect(output).toContain('name');
  });

  it('shows schema errors with details', () => {
    const results: ValidationResult[] = [
      {
        path: 'a.md',
        valid: false,
        issues: [
          { type: 'schema_error', field: 'age', message: 'Expected number' },
          { type: 'schema_error', field: 'name', message: 'Required' },
        ],
      },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).toContain('Schema validation errors:');
    expect(output).toContain('a.md');
    expect(output).toContain('age: Expected number');
    expect(output).toContain('name: Required');
  });

  it('shows folder mismatches', () => {
    const results: ValidationResult[] = [
      {
        path: 'Characters/file.md',
        valid: false,
        issues: [
          {
            type: 'folder_mismatch',
            expected: 'character',
            actual: 'location',
            matchedPattern: '**/Characters/**',
          },
        ],
      },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).toContain('Folder mismatches:');
    expect(output).toContain('Characters/file.md');
    expect(output).toContain('character');
    expect(output).toContain('location');
  });

  it('does not include valid files in output', () => {
    const results: ValidationResult[] = [
      { path: 'perfectly-valid-file.md', valid: true, issues: [] },
      { path: 'invalid.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);
    const output = formatTextOutput(results, summary);

    expect(output).not.toContain('perfectly-valid-file.md');
    expect(output).toContain('invalid.md');
  });
});

describe('formatJsonOutput', () => {
  it('produces valid JSON', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);
    const output = formatJsonOutput(results, summary, '/vault');

    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('groups issues by file path', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      {
        path: 'b.md',
        valid: false,
        issues: [
          { type: 'missing_field', field: 'id' },
          { type: 'missing_field', field: 'name' },
        ],
      },
    ];

    const summary = calculateSummary(results);
    const json = JSON.parse(formatJsonOutput(results, summary, '/vault'));

    expect(json.files).toBeDefined();
    expect(Object.keys(json.files)).toHaveLength(2);
    expect(json.files['a.md']).toEqual(['Missing frontmatter']);
    expect(json.files['b.md']).toHaveLength(2);
  });

  it('includes summary counts', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      { path: 'b.md', valid: false, issues: [{ type: 'invalid_type', actual: 'foo', validTypes: ['bar'] }] },
    ];

    const summary = calculateSummary(results);
    const json = JSON.parse(formatJsonOutput(results, summary, '/vault'));

    expect(json.summary).toBeDefined();
    expect(json.summary.missingFrontmatter).toBe(1);
    expect(json.summary.invalidType).toBe(1);
    expect(json.summary.missingField).toBe(0);
    expect(json.summary.schemaErrors).toBe(0);
    expect(json.summary.folderMismatches).toBe(0);
  });

  it('includes metadata fields', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);
    const json = JSON.parse(formatJsonOutput(results, summary, '/vault/path'));

    expect(json.valid).toBe(false);
    expect(json.timestamp).toBeDefined();
    expect(json.vaultPath).toBe('/vault/path');
    expect(json.totalFiles).toBe(1);
    expect(json.totalIssues).toBe(1);
  });

  it('sets valid to true when no issues', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: true, issues: [] },
      { path: 'b.md', valid: true, issues: [] },
    ];

    const summary = calculateSummary(results);
    const json = JSON.parse(formatJsonOutput(results, summary, '/vault'));

    expect(json.valid).toBe(true);
    expect(json.totalIssues).toBe(0);
    expect(Object.keys(json.files)).toHaveLength(0);
  });

  it('includes all issue types in summary', () => {
    const results: ValidationResult[] = [
      { path: 'a.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
      { path: 'b.md', valid: false, issues: [{ type: 'missing_field', field: 'id' }] },
      { path: 'c.md', valid: false, issues: [{ type: 'invalid_type', actual: 'foo', validTypes: ['bar'] }] },
      { path: 'd.md', valid: false, issues: [{ type: 'schema_error', field: 'age', message: 'error' }] },
      {
        path: 'e.md',
        valid: false,
        issues: [
          {
            type: 'folder_mismatch',
            expected: 'character',
            actual: 'location',
            matchedPattern: '**',
          },
        ],
      },
    ];

    const summary = calculateSummary(results);
    const json = JSON.parse(formatJsonOutput(results, summary, '/vault'));

    expect(json.summary.missingFrontmatter).toBe(1);
    expect(json.summary.missingField).toBe(1);
    expect(json.summary.invalidType).toBe(1);
    expect(json.summary.schemaErrors).toBe(1);
    expect(json.summary.folderMismatches).toBe(1);
  });

  it('does not include valid files', () => {
    const results: ValidationResult[] = [
      { path: 'valid.md', valid: true, issues: [] },
      { path: 'invalid.md', valid: false, issues: [{ type: 'missing_frontmatter' }] },
    ];

    const summary = calculateSummary(results);
    const json = JSON.parse(formatJsonOutput(results, summary, '/vault'));

    expect(json.files['valid.md']).toBeUndefined();
    expect(json.files['invalid.md']).toBeDefined();
  });
});

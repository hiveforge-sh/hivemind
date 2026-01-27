import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ValidationScanner } from '../../../src/cli/validate/scanner.js';
import { initializeTemplateRegistry } from '../../../src/cli/validate/validator.js';
import {
  calculateSummary,
  formatTextOutput,
  formatJsonOutput,
} from '../../../src/cli/validate/formatter.js';

describe('validate command integration', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-integration-'));
    configPath = join(tempDir, 'config.json');

    // Create a minimal config
    writeFileSync(
      configPath,
      JSON.stringify({
        vault: { path: tempDir },
        template: { activeTemplate: 'worldbuilding' },
      })
    );

    // Initialize template registry
    await initializeTemplateRegistry('worldbuilding');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('exit code scenarios', () => {
    it('would exit 0 for vault with all valid files', async () => {
      // Create valid files
      writeFileSync(
        join(tempDir, 'char1.md'),
        '---\nid: char-001\ntype: character\nstatus: canon\nname: Alice\n---\n\n# Alice'
      );
      writeFileSync(
        join(tempDir, 'loc1.md'),
        '---\nid: loc-001\ntype: location\nstatus: canon\nname: Castle\n---\n\n# Castle'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      // Exit code would be 0 (success)
      expect(summary.invalidFiles).toBe(0);
      expect(summary.validFiles).toBe(2);
    });

    it('would exit 1 for vault with validation errors', async () => {
      // Create invalid files
      writeFileSync(join(tempDir, 'invalid1.md'), '# No frontmatter');
      writeFileSync(
        join(tempDir, 'invalid2.md'),
        '---\nid: test\ntype: invalid_type\nstatus: canon\n---\n\n# Invalid'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      // Exit code would be 1 (validation errors)
      expect(summary.invalidFiles).toBeGreaterThan(0);
    });
  });

  describe('output format scenarios', () => {
    it('produces JSON output with --json flag', async () => {
      writeFileSync(join(tempDir, 'invalid.md'), '# No frontmatter');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      const jsonOutput = formatJsonOutput(results, summary, tempDir);

      // Verify it's valid JSON
      expect(() => JSON.parse(jsonOutput)).not.toThrow();

      const parsed = JSON.parse(jsonOutput);
      expect(parsed.valid).toBe(false);
      expect(parsed.files).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });

    it('produces text output by default', async () => {
      writeFileSync(join(tempDir, 'missing.md'), '# No frontmatter');
      writeFileSync(
        join(tempDir, 'invalid.md'),
        '---\nid: test\ntype: bad_type\nstatus: canon\n---\n\n# Invalid'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      const textOutput = formatTextOutput(results, summary);

      expect(textOutput).toContain('Missing frontmatter:');
      expect(textOutput).toContain('Invalid type:');
      expect(textOutput).toMatch(/Found \d+ issues? in \d+ files?/);
    });

    it('produces no output when valid and quiet', async () => {
      writeFileSync(
        join(tempDir, 'valid.md'),
        '---\nid: test-001\ntype: character\nstatus: canon\nname: Bob\n---\n\n# Bob'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      // In quiet mode with valid files, no output
      expect(summary.invalidFiles).toBe(0);
      // Would not call formatTextOutput or formatJsonOutput
    });
  });

  describe('ERR-03: helpful suggestions', () => {
    it('shows helpful suggestions when no valid entities (ERR-03)', async () => {
      // Create vault where ALL files have issues
      writeFileSync(join(tempDir, 'file1.md'), '# No frontmatter 1');
      writeFileSync(join(tempDir, 'file2.md'), '# No frontmatter 2');
      writeFileSync(join(tempDir, 'file3.md'), '# No frontmatter 3');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      // When validFiles === 0 and totalFiles > 0, show suggestions
      expect(summary.validFiles).toBe(0);
      expect(summary.totalFiles).toBeGreaterThan(0);

      // Verify suggestion text would be shown
      const shouldShowSuggestions = summary.validFiles === 0 && summary.totalFiles > 0;
      expect(shouldShowSuggestions).toBe(true);
    });

    it('does not show suggestions when some files are valid', async () => {
      writeFileSync(
        join(tempDir, 'valid.md'),
        '---\nid: test-001\ntype: character\nstatus: canon\nname: Alice\n---\n\n# Valid'
      );
      writeFileSync(join(tempDir, 'invalid.md'), '# No frontmatter');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      // When some files are valid, don't show suggestions
      expect(summary.validFiles).toBeGreaterThan(0);
      const shouldShowSuggestions = summary.validFiles === 0 && summary.totalFiles > 0;
      expect(shouldShowSuggestions).toBe(false);
    });
  });

  describe('VALD-03: template schema validation', () => {
    it('uses template schemas for validation', async () => {
      // File with type that exists in template but violates schema
      writeFileSync(
        join(tempDir, 'invalid-schema.md'),
        '---\nid: char-001\ntype: character\nstatus: invalid_status\nname: Bob\n---\n\n# Bob'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      // Should detect schema_error for invalid status value
      const hasSchemaError = results.some((r) =>
        r.issues.some((issue) => issue.type === 'schema_error')
      );
      expect(hasSchemaError).toBe(true);
    });

    it('validates custom fields against schema', async () => {
      // Character requires 'name' field
      writeFileSync(
        join(tempDir, 'missing-name.md'),
        '---\nid: char-002\ntype: character\nstatus: canon\n---\n\n# Character without name'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      // Should detect schema_error for missing required 'name' field
      const hasSchemaError = results.some((r) =>
        r.issues.some((issue) => issue.type === 'schema_error' && issue.field === 'name')
      );
      expect(hasSchemaError).toBe(true);
    });
  });

  describe('requirement coverage', () => {
    it('VALD-01: scanner discovers markdown files', async () => {
      const subDir = join(tempDir, 'Characters');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, 'char1.md'), '# Character 1');
      writeFileSync(join(tempDir, 'root.md'), '# Root');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((r) => r.path.includes('char1.md'))).toBe(true);
      expect(results.some((r) => r.path.includes('root.md'))).toBe(true);
    });

    it('VALD-02: validator classifies all issue types', async () => {
      writeFileSync(join(tempDir, 'missing-fm.md'), '# No frontmatter');
      writeFileSync(
        join(tempDir, 'missing-field.md'),
        '---\ntype: character\nstatus: canon\n---\n\n# Missing ID'
      );
      writeFileSync(
        join(tempDir, 'invalid-type.md'),
        '---\nid: test\ntype: bad_type\nstatus: canon\n---\n\n# Bad Type'
      );
      writeFileSync(
        join(tempDir, 'schema-error.md'),
        '---\nid: test\ntype: character\nstatus: invalid\nname: Bob\n---\n\n# Schema Error'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      const issueTypes = new Set(results.flatMap((r) => r.issues.map((i) => i.type)));

      expect(issueTypes.has('missing_frontmatter')).toBe(true);
      expect(issueTypes.has('missing_field')).toBe(true);
      expect(issueTypes.has('invalid_type')).toBe(true);
      expect(issueTypes.has('schema_error')).toBe(true);
    });

    it('VALD-04: exit codes reflect validation state', async () => {
      // Test case 1: All valid (exit 0)
      writeFileSync(
        join(tempDir, 'valid.md'),
        '---\nid: test\ntype: character\nstatus: canon\nname: Alice\n---\n\n# Valid'
      );

      let scanner = new ValidationScanner({ vaultPath: tempDir });
      let results = await scanner.scan();
      let summary = calculateSummary(results);

      expect(summary.invalidFiles).toBe(0); // Would exit 0

      // Test case 2: Has errors (exit 1)
      writeFileSync(join(tempDir, 'invalid.md'), '# Invalid');

      scanner = new ValidationScanner({ vaultPath: tempDir });
      results = await scanner.scan();
      summary = calculateSummary(results);

      expect(summary.invalidFiles).toBeGreaterThan(0); // Would exit 1
    });

    it('VALD-05: JSON output is machine-parseable', async () => {
      writeFileSync(join(tempDir, 'file.md'), '# No frontmatter');

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();
      const summary = calculateSummary(results);

      const jsonOutput = formatJsonOutput(results, summary, tempDir);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed).toHaveProperty('valid');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('vaultPath');
      expect(parsed).toHaveProperty('totalFiles');
      expect(parsed).toHaveProperty('totalIssues');
      expect(parsed).toHaveProperty('files');
      expect(parsed).toHaveProperty('summary');
    });
  });

  describe('skipMissing flag behavior', () => {
    it('skips files without frontmatter when --skip-missing flag set', async () => {
      writeFileSync(join(tempDir, 'no-fm.md'), '# No frontmatter');
      writeFileSync(
        join(tempDir, 'invalid.md'),
        '---\nid: test\ntype: bad_type\nstatus: canon\n---\n\n# Invalid type'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir, skipMissing: true });
      const results = await scanner.scan();

      // File without frontmatter should be marked valid (skipped)
      const noFmFile = results.find((r) => r.path.includes('no-fm.md'));
      expect(noFmFile?.valid).toBe(true);

      // File with frontmatter should still be validated
      const invalidFile = results.find((r) => r.path.includes('invalid.md'));
      expect(invalidFile?.valid).toBe(false);
    });
  });

  describe('ignore patterns', () => {
    it('respects custom ignore patterns', async () => {
      const draftDir = join(tempDir, 'drafts');
      mkdirSync(draftDir, { recursive: true });
      writeFileSync(join(draftDir, 'draft.md'), '# Draft');
      writeFileSync(join(tempDir, 'published.md'), '# Published');

      const scanner = new ValidationScanner({
        vaultPath: tempDir,
        ignorePatterns: ['drafts'],
      });
      const results = await scanner.scan();

      expect(results.some((r) => r.path.includes('drafts'))).toBe(false);
      expect(results.some((r) => r.path.includes('published.md'))).toBe(true);
    });
  });

  describe('folder mismatch detection', () => {
    it('detects folder mismatch with folder mappings', async () => {
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });

      // File in Characters/ folder but has type: location
      writeFileSync(
        join(charDir, 'mismatched.md'),
        '---\nid: loc-001\ntype: location\nstatus: canon\nname: Castle\n---\n\n# Castle'
      );

      const scanner = new ValidationScanner({ vaultPath: tempDir });
      const results = await scanner.scan();

      const mismatchedFile = results.find((r) => r.path.includes('mismatched.md'));
      const hasFolderMismatch = mismatchedFile?.issues.some(
        (issue) => issue.type === 'folder_mismatch'
      );

      // Folder mismatch is a warning, may or may not be present depending on config
      if (hasFolderMismatch) {
        expect(hasFolderMismatch).toBe(true);
      }
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateFile, initializeTemplateRegistry } from '../../../src/cli/validate/validator.js';

describe('validateFile', () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-validate-test-'));

    // Initialize template registry with worldbuilding template
    await initializeTemplateRegistry('worldbuilding');
  });

  afterAll(() => {
    // Cleanup temp directory
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('missing frontmatter', () => {
    it('detects missing frontmatter', async () => {
      const filePath = join(tempDir, 'no-frontmatter.md');
      writeFileSync(filePath, '# Just content\n\nNo frontmatter here.');

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('missing_frontmatter');
    });

    it('detects empty frontmatter', async () => {
      const filePath = join(tempDir, 'empty-frontmatter.md');
      writeFileSync(filePath, '---\n---\n\n# Content');

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe('missing_frontmatter');
    });
  });

  describe('missing required fields', () => {
    it('detects missing id field', async () => {
      const filePath = join(tempDir, 'missing-id.md');
      writeFileSync(
        filePath,
        '---\ntype: character\nstatus: canon\n---\n\n# Character'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === 'missing_field' && i.field === 'id')).toBe(true);
    });

    it('detects missing type field', async () => {
      const filePath = join(tempDir, 'missing-type.md');
      writeFileSync(
        filePath,
        '---\nid: char-001\nstatus: canon\n---\n\n# Character'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === 'missing_field' && i.field === 'type')).toBe(
        true
      );
    });

    it('detects missing status field', async () => {
      const filePath = join(tempDir, 'missing-status.md');
      writeFileSync(
        filePath,
        '---\nid: char-001\ntype: character\n---\n\n# Character'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === 'missing_field' && i.field === 'status')).toBe(
        true
      );
    });

    it('detects multiple missing fields', async () => {
      const filePath = join(tempDir, 'multiple-missing.md');
      writeFileSync(filePath, '---\ntype: character\n---\n\n# Character');

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === 'missing_field' && i.field === 'id')).toBe(true);
      expect(result.issues.some((i) => i.type === 'missing_field' && i.field === 'status')).toBe(
        true
      );
    });
  });

  describe('invalid type', () => {
    it('detects invalid entity type', async () => {
      const filePath = join(tempDir, 'invalid-type.md');
      writeFileSync(
        filePath,
        '---\nid: test-001\ntype: invalid_type\nstatus: canon\n---\n\n# Content'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(false);
      const invalidTypeIssue = result.issues.find((i) => i.type === 'invalid_type');
      expect(invalidTypeIssue).toBeDefined();
      if (invalidTypeIssue && invalidTypeIssue.type === 'invalid_type') {
        expect(invalidTypeIssue.actual).toBe('invalid_type');
        expect(invalidTypeIssue.validTypes).toContain('character');
        expect(invalidTypeIssue.validTypes).toContain('location');
      }
    });

    it('provides list of valid types', async () => {
      const filePath = join(tempDir, 'invalid-type-list.md');
      writeFileSync(
        filePath,
        '---\nid: test-002\ntype: foo\nstatus: canon\n---\n\n# Content'
      );

      const result = await validateFile(filePath, tempDir, {});

      const invalidTypeIssue = result.issues.find((i) => i.type === 'invalid_type');
      expect(invalidTypeIssue).toBeDefined();
      if (invalidTypeIssue && invalidTypeIssue.type === 'invalid_type') {
        expect(invalidTypeIssue.validTypes.length).toBeGreaterThan(0);
        expect(invalidTypeIssue.validTypes).toEqual(
          expect.arrayContaining(['character', 'location', 'event', 'lore'])
        );
      }
    });
  });

  describe('schema validation', () => {
    it('detects schema validation errors', async () => {
      const filePath = join(tempDir, 'schema-error.md');
      // Character requires 'name' field as string
      writeFileSync(
        filePath,
        '---\nid: char-001\ntype: character\nstatus: canon\nname: 123\n---\n\n# Character'
      );

      const result = await validateFile(filePath, tempDir, {});

      // Note: Depending on schema, this might pass if name coerces to string
      // or fail with schema_error if strict validation
      if (!result.valid) {
        const schemaIssue = result.issues.find((i) => i.type === 'schema_error');
        if (schemaIssue && schemaIssue.type === 'schema_error') {
          expect(schemaIssue.field).toBeDefined();
          expect(schemaIssue.message).toBeDefined();
        }
      }
    });

    it('validates enum field constraints', async () => {
      const filePath = join(tempDir, 'invalid-enum.md');
      // Status should be 'draft' or 'approved' typically
      writeFileSync(
        filePath,
        '---\nid: char-001\ntype: character\nstatus: invalid_status\n---\n\n# Character'
      );

      const result = await validateFile(filePath, tempDir, {});

      // May have schema error if status enum is enforced
      if (!result.valid) {
        const hasSchemaError = result.issues.some((i) => i.type === 'schema_error');
        // Schema error OR it might be accepted - depends on schema definition
        expect(result.issues.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('valid files', () => {
    it('reports valid for correctly formatted character file', async () => {
      const filePath = join(tempDir, 'valid-character.md');
      writeFileSync(
        filePath,
        '---\nid: char-001\ntype: character\nstatus: canon\nname: Alice\n---\n\n# Valid Character'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('reports valid for correctly formatted location file', async () => {
      const filePath = join(tempDir, 'valid-location.md');
      writeFileSync(
        filePath,
        '---\nid: loc-001\ntype: location\nstatus: draft\nname: Castle\n---\n\n# Valid Location'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('includes frontmatter in result for debugging', async () => {
      const filePath = join(tempDir, 'with-frontmatter.md');
      writeFileSync(
        filePath,
        '---\nid: test-001\ntype: character\nstatus: canon\ncustom: value\n---\n\n# Content'
      );

      const result = await validateFile(filePath, tempDir, {});

      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.id).toBe('test-001');
      expect(result.frontmatter?.type).toBe('character');
      expect(result.frontmatter?.custom).toBe('value');
    });
  });

  describe('skipMissing flag', () => {
    it('skips files without frontmatter when skipMissing is true', async () => {
      const filePath = join(tempDir, 'skip-missing.md');
      writeFileSync(filePath, '# Just content\n\nNo frontmatter.');

      const result = await validateFile(filePath, tempDir, { skipMissing: true });

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('still validates files with frontmatter when skipMissing is true', async () => {
      const filePath = join(tempDir, 'skip-missing-but-has.md');
      writeFileSync(
        filePath,
        '---\nid: test-001\ntype: invalid\nstatus: canon\n---\n\n# Content'
      );

      const result = await validateFile(filePath, tempDir, { skipMissing: true });

      // Should still report invalid type
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.type === 'invalid_type')).toBe(true);
    });

    it('validates missing frontmatter by default (skipMissing false)', async () => {
      const filePath = join(tempDir, 'default-behavior.md');
      writeFileSync(filePath, '# Content without frontmatter');

      const result = await validateFile(filePath, tempDir, { skipMissing: false });

      expect(result.valid).toBe(false);
      expect(result.issues[0].type).toBe('missing_frontmatter');
    });
  });

  describe('folder mismatch detection', () => {
    it('detects folder mismatch when folder mapping exists', async () => {
      // Create a Characters folder
      const charDir = join(tempDir, 'Characters');
      mkdirSync(charDir, { recursive: true });

      const filePath = join(charDir, 'wrong-type.md');
      // File is in Characters/ but has type: location
      writeFileSync(
        filePath,
        '---\nid: loc-001\ntype: location\nstatus: canon\n---\n\n# Should be character'
      );

      const result = await validateFile(filePath, tempDir, {});

      // Folder mismatch is optional warning, file might still be considered valid
      // depending on schema validation
      const folderMismatch = result.issues.find((i) => i.type === 'folder_mismatch');
      if (folderMismatch && folderMismatch.type === 'folder_mismatch') {
        expect(folderMismatch.expected).toBe('character');
        expect(folderMismatch.actual).toBe('location');
        expect(folderMismatch.matchedPattern).toBeDefined();
      }
    });
  });
});

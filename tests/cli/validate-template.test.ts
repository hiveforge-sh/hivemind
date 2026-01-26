import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const CLI_PATH = resolve(__dirname, '../../dist/cli.js');

describe('CLI: validate-template', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-cli-validate-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const validTemplate = {
    id: 'test-template',
    name: 'Test Template',
    version: '1.0.0',
    entityTypes: [
      {
        name: 'item',
        displayName: 'Item',
        pluralName: 'Items',
        fields: [
          { name: 'rarity', type: 'enum', enumValues: ['common', 'rare', 'epic'] },
          { name: 'value', type: 'number' },
        ],
      },
      {
        name: 'character',
        displayName: 'Character',
        pluralName: 'Characters',
        fields: [
          { name: 'name', type: 'string', required: true },
          { name: 'level', type: 'number' },
        ],
      },
    ],
    relationshipTypes: [
      {
        id: 'owns',
        displayName: 'Owns',
        sourceTypes: ['character'],
        targetTypes: ['item'],
        bidirectional: false,
      },
    ],
  };

  const runCli = (args: string[], cwd?: string): { stdout: string; stderr: string; exitCode: number } => {
    const cmd = `node "${CLI_PATH}" ${args.join(' ')}`;
    try {
      const stdout = execSync(cmd, {
        cwd: cwd || tempDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || '',
        exitCode: err.status || 1,
      };
    }
  };

  it('should validate a valid template file', () => {
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(validTemplate, null, 2));

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Template is valid!');
    expect(result.stdout).toContain('ID: test-template');
    expect(result.stdout).toContain('Name: Test Template');
    expect(result.stdout).toContain('Version: 1.0.0');
    expect(result.stdout).toContain('Entity Types (2)');
    expect(result.stdout).toContain('item');
    expect(result.stdout).toContain('character');
    expect(result.stdout).toContain('Relationship Types (1)');
    expect(result.stdout).toContain('owns');
  }, 15000);

  it('should use default template.json when no path provided', () => {
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(validTemplate, null, 2));

    const result = runCli(['validate-template'], tempDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Template is valid!');
  }, 15000);

  it('should fail for non-existent file', () => {
    const result = runCli(['validate-template', 'nonexistent.json']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Template file not found');
  }, 15000);

  it('should fail for invalid template ID', () => {
    const invalidTemplate = {
      ...validTemplate,
      id: 'INVALID_ID', // Uppercase not allowed
    };
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(invalidTemplate, null, 2));

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('lowercase');
  }, 15000);

  it('should fail for invalid version format', () => {
    const invalidTemplate = {
      ...validTemplate,
      version: 'invalid',
    };
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(invalidTemplate, null, 2));

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('semantic versioning');
  }, 15000);

  it('should fail for empty entity types', () => {
    const invalidTemplate = {
      ...validTemplate,
      entityTypes: [],
    };
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(invalidTemplate, null, 2));

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('at least one entity type');
  }, 15000);

  it('should fail for invalid JSON', () => {
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, '{ invalid json }');

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error');
  }, 15000);

  it('should show field counts', () => {
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(validTemplate, null, 2));

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('2 fields'); // item has 2 fields
  }, 15000);
});

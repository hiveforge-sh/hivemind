import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve } from 'path';

const CLI_PATH = resolve(__dirname, '../../dist/cli.js');

describe('add-template CLI command', () => {
  it('should show add-template in help output', () => {
    const result = execSync(`node ${CLI_PATH}`, { encoding: 'utf-8' });
    expect(result).toContain('add-template');
    expect(result).toContain('<name|url>');
  }, 15000);

  it('should list available templates when no argument provided', () => {
    const result = execSync(`node ${CLI_PATH} add-template`, { encoding: 'utf-8' });
    expect(result).toContain('Available templates');
    expect(result).toContain('worldbuilding');
    expect(result).toContain('research');
    expect(result).toContain('people-management');
    expect(result).toContain('software-architecture');
    expect(result).toContain('ux-research');
  }, 15000);

  it('should show error for unknown template', () => {
    try {
      execSync(`node ${CLI_PATH} add-template unknown-template-xyz`, { encoding: 'utf-8' });
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err.stderr?.toString() || err.stdout?.toString()).toContain('Template not found');
    }
  }, 15000);
});

describe('list-templates CLI command', () => {
  it('should show list-templates in help output', () => {
    const result = execSync(`node ${CLI_PATH}`, { encoding: 'utf-8' });
    expect(result).toContain('list-templates');
  }, 15000);

  it('should list all available templates', () => {
    const result = execSync(`node ${CLI_PATH} list-templates`, { encoding: 'utf-8' });
    expect(result).toContain('Available Templates');
    expect(result).toContain('Built-in Templates');
    expect(result).toContain('Community Templates');
    expect(result).toContain('worldbuilding');
    expect(result).toContain('research');
    expect(result).toContain('people-management');
    expect(result).toContain('software-architecture');
    expect(result).toContain('ux-research');
  }, 15000);

  it('should show entity types for each template', () => {
    const result = execSync(`node ${CLI_PATH} list-templates`, { encoding: 'utf-8' });
    expect(result).toContain('Entity types:');
    // Check for some entity types
    expect(result).toContain('character');
    expect(result).toContain('paper');
    expect(result).toContain('person');
  }, 15000);
});

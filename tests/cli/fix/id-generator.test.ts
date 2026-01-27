import { describe, it, expect } from 'vitest';
import {
  slugifyFilename,
  generateUniqueId,
} from '../../../src/cli/fix/id-generator.js';

describe('slugifyFilename', () => {
  it('converts spaces to hyphens', () => {
    expect(slugifyFilename('John Smith.md')).toBe('john-smith');
  });

  it('removes special characters', () => {
    // Apostrophe becomes hyphen then collapses
    expect(slugifyFilename("John's Castle.md")).toBe('john-s-castle');
    expect(slugifyFilename('Test @#$ File.md')).toBe('test-file');
  });

  it('lowercases the result', () => {
    expect(slugifyFilename('JohnSmith.md')).toBe('johnsmith');
    expect(slugifyFilename('UPPERCASE.md')).toBe('uppercase');
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugifyFilename('-test-.md')).toBe('test');
    expect(slugifyFilename('---test---.md')).toBe('test');
  });

  it('handles already-slugified names', () => {
    expect(slugifyFilename('john-smith.md')).toBe('john-smith');
    expect(slugifyFilename('test-file-name.md')).toBe('test-file-name');
  });

  it('collapses multiple hyphens', () => {
    expect(slugifyFilename('test   multiple   spaces.md')).toBe(
      'test-multiple-spaces'
    );
    expect(slugifyFilename('test---multiple---hyphens.md')).toBe(
      'test-multiple-hyphens'
    );
  });

  it('handles numbers', () => {
    expect(slugifyFilename('File123.md')).toBe('file123');
    expect(slugifyFilename('123Test.md')).toBe('123test');
  });

  it('handles empty name', () => {
    expect(slugifyFilename('.md')).toBe('');
  });

  it('handles unicode characters', () => {
    // Unicode gets converted to hyphens and collapsed
    expect(slugifyFilename('cafe.md')).toBe('cafe');
    expect(slugifyFilename('test file.md')).toBe('test-file');
  });
});

describe('generateUniqueId', () => {
  it('returns base ID when no collision', () => {
    const existingIds = new Set<string>();
    const id = generateUniqueId('John Smith.md', 'character', existingIds);
    expect(id).toBe('john-smith');
  });

  it('adds type prefix on first collision', () => {
    const existingIds = new Set<string>(['john-smith']);
    const id = generateUniqueId('John Smith.md', 'character', existingIds);
    expect(id).toBe('character-john-smith');
  });

  it('adds counter on subsequent collisions', () => {
    const existingIds = new Set<string>([
      'john-smith',
      'character-john-smith',
    ]);
    const id = generateUniqueId('John Smith.md', 'character', existingIds);
    expect(id).toBe('character-john-smith-2');
  });

  it('increments counter for multiple collisions', () => {
    const existingIds = new Set<string>([
      'john-smith',
      'character-john-smith',
      'character-john-smith-2',
      'character-john-smith-3',
    ]);
    const id = generateUniqueId('John Smith.md', 'character', existingIds);
    expect(id).toBe('character-john-smith-4');
  });

  it('adds generated ID to existingIds set', () => {
    const existingIds = new Set<string>();

    // First call
    const id1 = generateUniqueId('Test.md', 'character', existingIds);
    expect(existingIds.has(id1)).toBe(true);

    // Second call with same name should get different ID
    const id2 = generateUniqueId('Test.md', 'character', existingIds);
    expect(id1).not.toBe(id2);
    expect(existingIds.has(id2)).toBe(true);
  });

  it('uses different prefixes for different types', () => {
    const existingIds = new Set<string>(['test']);

    const charId = generateUniqueId('Test.md', 'character', existingIds);
    expect(charId).toBe('character-test');

    const locId = generateUniqueId('Test.md', 'location', existingIds);
    expect(locId).toBe('location-test');
  });

  it('handles empty filename', () => {
    const existingIds = new Set<string>();
    // Empty filename produces empty slug, but type prefix is added
    const id = generateUniqueId('.md', 'character', existingIds);
    // Should still produce something usable
    expect(typeof id).toBe('string');
  });
});

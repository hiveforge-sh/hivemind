import { describe, it, expect } from 'vitest';
import {
  parseVersion,
  compareVersions,
  satisfiesMinVersion,
  getHivemindVersion,
  checkTemplateCompatibility,
} from '../../src/templates/version.js';

describe('version utilities', () => {
  describe('parseVersion', () => {
    it('should parse valid semantic version', () => {
      const result = parseVersion('1.2.3');
      expect(result).toEqual({ major: 1, minor: 2, patch: 3 });
    });

    it('should parse version with zeros', () => {
      const result = parseVersion('0.0.0');
      expect(result).toEqual({ major: 0, minor: 0, patch: 0 });
    });

    it('should parse large version numbers', () => {
      const result = parseVersion('10.20.30');
      expect(result).toEqual({ major: 10, minor: 20, patch: 30 });
    });

    it('should throw for invalid version format', () => {
      expect(() => parseVersion('1.2')).toThrow('Invalid semantic version');
      expect(() => parseVersion('1.2.3.4')).toThrow('Invalid semantic version');
      expect(() => parseVersion('v1.2.3')).toThrow('Invalid semantic version');
      expect(() => parseVersion('1.2.a')).toThrow('Invalid semantic version');
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('2.5.10', '2.5.10')).toBe(0);
    });

    it('should compare major versions', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    });

    it('should compare minor versions', () => {
      expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0);
      expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
    });

    it('should compare patch versions', () => {
      expect(compareVersions('1.0.2', '1.0.1')).toBeGreaterThan(0);
      expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
    });

    it('should prioritize major over minor over patch', () => {
      expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
      expect(compareVersions('1.1.0', '1.0.99')).toBeGreaterThan(0);
    });
  });

  describe('satisfiesMinVersion', () => {
    it('should return true for equal versions', () => {
      expect(satisfiesMinVersion('1.0.0', '1.0.0')).toBe(true);
    });

    it('should return true for greater versions', () => {
      expect(satisfiesMinVersion('2.0.0', '1.0.0')).toBe(true);
      expect(satisfiesMinVersion('1.5.0', '1.0.0')).toBe(true);
      expect(satisfiesMinVersion('1.0.5', '1.0.0')).toBe(true);
    });

    it('should return false for lesser versions', () => {
      expect(satisfiesMinVersion('1.0.0', '2.0.0')).toBe(false);
      expect(satisfiesMinVersion('1.0.0', '1.5.0')).toBe(false);
      expect(satisfiesMinVersion('1.0.0', '1.0.5')).toBe(false);
    });
  });

  describe('getHivemindVersion', () => {
    it('should return a valid semantic version', () => {
      const version = getHivemindVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('checkTemplateCompatibility', () => {
    it('should return compatible when no minVersion specified', () => {
      const result = checkTemplateCompatibility(undefined, '1.0.0');
      expect(result.compatible).toBe(true);
      expect(result.message).toContain('assuming compatible');
    });

    it('should return compatible when minVersion is satisfied', () => {
      const hivemindVersion = getHivemindVersion();
      const result = checkTemplateCompatibility('1.0.0', '1.0.0');
      expect(result.compatible).toBe(true);
      expect(result.hivemindVersion).toBe(hivemindVersion);
    });

    it('should return incompatible when minVersion is not satisfied', () => {
      const result = checkTemplateCompatibility('99.0.0', '1.0.0');
      expect(result.compatible).toBe(false);
      expect(result.message).toContain('Please upgrade Hivemind');
    });
  });
});

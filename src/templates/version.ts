/**
 * Template versioning utilities.
 *
 * Provides functions for comparing semantic versions and checking
 * template compatibility with Hivemind versions.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Parsed semantic version.
 */
export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Parse a semantic version string into components.
 *
 * @param version - Version string (e.g., "1.2.3")
 * @returns Parsed version object
 * @throws Error if version is invalid
 */
export function parseVersion(version: string): SemanticVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two semantic versions.
 *
 * @param a - First version
 * @param b - Second version
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

/**
 * Check if version a satisfies the minimum requirement b.
 *
 * @param version - Version to check
 * @param minVersion - Minimum required version
 * @returns True if version >= minVersion
 */
export function satisfiesMinVersion(version: string, minVersion: string): boolean {
  return compareVersions(version, minVersion) >= 0;
}

/**
 * Get the current Hivemind version from package.json.
 *
 * @returns Current Hivemind version string
 */
export function getHivemindVersion(): string {
  // Try to read from package.json in different locations
  const locations = [
    // When running from dist/
    resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'),
    // When running from src/ (development)
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../package.json'),
    // When running from project root
    resolve(process.cwd(), 'package.json'),
  ];

  for (const location of locations) {
    try {
      const pkg = JSON.parse(readFileSync(location, 'utf-8'));
      if (pkg.name === '@hiveforge/hivemind-mcp' && pkg.version) {
        return pkg.version;
      }
    } catch {
      // Try next location
    }
  }

  // Fallback version
  return '2.3.0';
}

/**
 * Compatibility check result.
 */
export interface CompatibilityResult {
  compatible: boolean;
  hivemindVersion: string;
  templateVersion: string;
  minHivemindVersion?: string;
  message: string;
}

/**
 * Check if a template is compatible with the current Hivemind version.
 *
 * @param templateMinVersion - Template's minHivemindVersion (optional)
 * @param templateVersion - Template's version
 * @returns Compatibility result with details
 */
export function checkTemplateCompatibility(
  templateMinVersion: string | undefined,
  templateVersion: string
): CompatibilityResult {
  const hivemindVersion = getHivemindVersion();

  // If no minimum version specified, assume compatible
  if (!templateMinVersion) {
    return {
      compatible: true,
      hivemindVersion,
      templateVersion,
      message: 'Template does not specify minimum Hivemind version (assuming compatible)',
    };
  }

  const compatible = satisfiesMinVersion(hivemindVersion, templateMinVersion);

  if (compatible) {
    return {
      compatible: true,
      hivemindVersion,
      templateVersion,
      minHivemindVersion: templateMinVersion,
      message: `Template is compatible (requires Hivemind >= ${templateMinVersion}, running ${hivemindVersion})`,
    };
  }

  return {
    compatible: false,
    hivemindVersion,
    templateVersion,
    minHivemindVersion: templateMinVersion,
    message: `Template requires Hivemind >= ${templateMinVersion}, but running ${hivemindVersion}. Please upgrade Hivemind.`,
  };
}

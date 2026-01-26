/**
 * Template auto-detection from vault folder structure.
 *
 * This module enables backwards compatibility by automatically identifying
 * templates based on vault organization patterns.
 */

import { promises as fs } from 'fs';

/**
 * Result of template detection with confidence level.
 */
export interface DetectionResult {
  /** Detected template identifier */
  templateId: string;

  /** Confidence level based on pattern matches */
  confidence: 'high' | 'medium' | 'low';

  /** Folder names that matched detection patterns */
  matchedPatterns: string[];

  /** User-friendly notification message */
  message: string;
}

/**
 * Detects template type from vault folder structure.
 *
 * Provides automatic template identification for backwards compatibility
 * with existing vaults.
 */
export class TemplateDetector {
  /**
   * Worldbuilding folder patterns (case-insensitive).
   *
   * Vaults with 2+ matching folders are detected as worldbuilding templates.
   */
  private static readonly WORLDBUILDING_PATTERNS = [
    'characters',
    'character',
    'locations',
    'location',
    'events',
    'event',
    'factions',
    'faction',
    'lore',
    'assets',
    'asset',
  ];

  /**
   * Detect template from vault folder structure.
   *
   * Scans top-level folders and matches against known template patterns.
   * Returns null if no template can be confidently detected.
   *
   * @param vaultPath - Absolute path to vault directory
   * @returns Detection result with confidence level, or null if no match
   */
  async detectTemplate(vaultPath: string): Promise<DetectionResult | null> {
    const folders = await this.listTopLevelFolders(vaultPath);

    // Check for worldbuilding patterns
    const matched = folders.filter((f) =>
      TemplateDetector.WORLDBUILDING_PATTERNS.some((p) =>
        f.toLowerCase().includes(p.toLowerCase())
      )
    );

    if (matched.length >= 2) {
      const confidence =
        matched.length >= 4 ? 'high' : matched.length >= 3 ? 'medium' : 'low';

      return {
        templateId: 'worldbuilding',
        confidence,
        matchedPatterns: matched,
        message: `Detected worldbuilding vault (${confidence} confidence). Matched folders: ${matched.join(', ')}`,
      };
    }

    return null;
  }

  /**
   * List top-level folders in vault, excluding hidden directories.
   *
   * @param vaultPath - Absolute path to vault directory
   * @returns Array of folder names
   */
  private async listTopLevelFolders(vaultPath: string): Promise<string[]> {
    const entries = await fs.readdir(vaultPath, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => e.name);
  }
}

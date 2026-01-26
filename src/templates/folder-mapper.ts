/**
 * Folder-to-type mapping utility.
 *
 * Infers entity types from file paths based on folder names.
 * Used by the CLI 'fix' command and Obsidian plugin to auto-suggest
 * entity types for files without frontmatter.
 */

import type { FolderMapping } from './types.js';

/**
 * Default folder-to-type mappings for common worldbuilding folder structures.
 *
 * Supports multiple naming conventions (e.g., 'characters', 'people', 'npcs')
 * mapping to the same entity type.
 */
export const DEFAULT_FOLDER_MAPPINGS: FolderMapping[] = [
  // Character mappings
  { pattern: 'characters', entityType: 'character' },
  { pattern: 'people', entityType: 'character' },
  { pattern: 'npcs', entityType: 'character' },
  { pattern: 'pcs', entityType: 'character' },
  { pattern: 'cast', entityType: 'character' },

  // Location mappings
  { pattern: 'locations', entityType: 'location' },
  { pattern: 'places', entityType: 'location' },
  { pattern: 'geography', entityType: 'location' },
  { pattern: 'world', entityType: 'location' },
  { pattern: 'regions', entityType: 'location' },
  { pattern: 'cities', entityType: 'location' },
  { pattern: 'towns', entityType: 'location' },

  // Event mappings
  { pattern: 'events', entityType: 'event' },
  { pattern: 'timeline', entityType: 'event' },
  { pattern: 'history', entityType: 'event' },
  { pattern: 'sessions', entityType: 'event' },

  // Faction mappings
  { pattern: 'factions', entityType: 'faction' },
  { pattern: 'organizations', entityType: 'faction' },
  { pattern: 'groups', entityType: 'faction' },
  { pattern: 'guilds', entityType: 'faction' },
  { pattern: 'houses', entityType: 'faction' },

  // Lore mappings
  { pattern: 'lore', entityType: 'lore' },
  { pattern: 'mythology', entityType: 'lore' },
  { pattern: 'magic', entityType: 'lore' },
  { pattern: 'culture', entityType: 'lore' },
  { pattern: 'religion', entityType: 'lore' },

  // Asset mappings
  { pattern: 'assets', entityType: 'asset' },
  { pattern: 'images', entityType: 'asset' },
  { pattern: 'media', entityType: 'asset' },

  // Reference mappings
  { pattern: 'references', entityType: 'reference' },
  { pattern: 'sources', entityType: 'reference' },
  { pattern: 'inspiration', entityType: 'reference' },
  { pattern: 'notes', entityType: 'reference' },
  { pattern: 'meta', entityType: 'reference' },
];

/**
 * FolderMapper infers entity types from file paths.
 *
 * Checks each path segment against folder mappings to determine
 * the most likely entity type for a file.
 */
export class FolderMapper {
  private mappings: Map<string, string>;

  /**
   * Create a FolderMapper with optional custom mappings.
   *
   * @param customMappings - Additional or override mappings.
   *                         Custom mappings take precedence over defaults.
   */
  constructor(customMappings: FolderMapping[] = []) {
    this.mappings = new Map();

    // Add default mappings first
    for (const mapping of DEFAULT_FOLDER_MAPPINGS) {
      this.mappings.set(mapping.pattern.toLowerCase(), mapping.entityType);
    }

    // Override with custom mappings
    for (const mapping of customMappings) {
      this.mappings.set(mapping.pattern.toLowerCase(), mapping.entityType);
    }
  }

  /**
   * Infer entity type from a file path.
   *
   * Checks each folder in the path against mappings.
   * Returns the first match found, or null if no match.
   *
   * @param filePath - Relative or absolute file path
   * @returns Inferred entity type name, or null if no match
   */
  inferType(filePath: string): string | null {
    // Split on both forward and back slashes
    const parts = filePath.toLowerCase().split(/[/\\]/);

    // Check each path part against mappings
    for (const part of parts) {
      // Exact match
      const exactMatch = this.mappings.get(part);
      if (exactMatch) {
        return exactMatch;
      }

      // Prefix match (e.g., 'characters-main' matches 'characters')
      for (const [pattern, entityType] of this.mappings) {
        if (part.startsWith(pattern)) {
          return entityType;
        }
      }
    }

    return null;
  }

  /**
   * Infer types for multiple file paths.
   *
   * @param filePaths - Array of file paths
   * @returns Map of file path to inferred type (or null)
   */
  inferTypes(filePaths: string[]): Map<string, string | null> {
    const results = new Map<string, string | null>();
    for (const path of filePaths) {
      results.set(path, this.inferType(path));
    }
    return results;
  }

  /**
   * Get all registered mappings.
   *
   * @returns Array of folder mappings
   */
  getMappings(): FolderMapping[] {
    return Array.from(this.mappings.entries()).map(([pattern, entityType]) => ({
      pattern,
      entityType,
    }));
  }

  /**
   * Add a new mapping.
   *
   * @param pattern - Folder name pattern
   * @param entityType - Entity type to assign
   */
  addMapping(pattern: string, entityType: string): void {
    this.mappings.set(pattern.toLowerCase(), entityType);
  }
}

/**
 * Singleton instance for convenience.
 */
export const folderMapper = new FolderMapper();

/**
 * Folder-to-type mapping utility.
 *
 * Infers entity types from file paths based on folder patterns.
 * Used by the CLI 'fix' command and Obsidian plugin to auto-suggest
 * entity types for files without frontmatter.
 */

import picomatch from 'picomatch';
import type { FolderMappingConfig, FolderMappingRule, ResolveResult, FolderMapping } from './types.js';

/**
 * Compiled mapping with pre-built matcher and specificity score.
 */
interface CompiledMapping {
  rule: FolderMappingRule;
  matcher: (path: string) => boolean;
  specificity: number;
}

/**
 * Calculate pattern specificity for "most specific wins" resolution.
 * Higher score = more specific pattern.
 */
function calculateSpecificity(pattern: string): number {
  let score = 0;

  // Base: character count (longer = more specific)
  score += pattern.length;

  // Wildcards reduce specificity
  const doubleStars = (pattern.match(/\*\*/g) || []).length;
  const singleStars = (pattern.match(/(?<!\*)\*(?!\*)/g) || []).length;
  score -= doubleStars * 10;  // ** is very generic
  score -= singleStars * 5;   // * is somewhat generic

  // Path depth increases specificity
  const depth = pattern.split('/').filter(s => s.length > 0).length;
  score += depth * 8;

  // Literal segments (no wildcards) are highly specific
  const segments = pattern.split('/').filter(s => s.length > 0);
  const literalSegs = segments.filter(s => !s.includes('*')).length;
  score += literalSegs * 12;

  return score;
}

/**
 * Normalize path to forward slashes for glob matching.
 * Windows backslashes become forward slashes.
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * FolderMapper resolves file paths to entity types using glob patterns.
 *
 * Shared between CLI and Obsidian plugin - no duplication.
 * Uses picomatch for fast, standards-compliant glob matching.
 */
export class FolderMapper {
  private compiledMappings: CompiledMapping[];
  private fallbackType?: string;

  /**
   * Private constructor - use FolderMapper.create() instead.
   */
  private constructor(
    compiledMappings: CompiledMapping[],
    fallbackType?: string
  ) {
    this.compiledMappings = compiledMappings;
    this.fallbackType = fallbackType;
  }

  /**
   * Create a FolderMapper from configuration.
   *
   * Validates patterns and pre-compiles matchers for performance.
   * Throws on invalid glob patterns.
   *
   * @param config - Folder mapping configuration
   * @returns Promise resolving to configured FolderMapper
   */
  static async create(config: FolderMappingConfig): Promise<FolderMapper> {
    const compiled: CompiledMapping[] = [];

    for (const rule of config.mappings) {
      // Normalize pattern (backslashes to forward slashes)
      const normalizedPattern = normalizePath(rule.folder);

      // Validate pattern by attempting to parse
      try {
        picomatch.parse(normalizedPattern);
      } catch (error) {
        throw new Error(`Invalid glob pattern "${rule.folder}": ${(error as Error).message}`);
      }

      compiled.push({
        rule: { ...rule, folder: normalizedPattern },
        matcher: picomatch(normalizedPattern),
        specificity: calculateSpecificity(normalizedPattern),
      });
    }

    // Sort by specificity (highest first) for "most specific wins"
    compiled.sort((a, b) => b.specificity - a.specificity);

    return new FolderMapper(compiled, config.fallbackType);
  }

  /**
   * Create a FolderMapper with default worldbuilding mappings.
   * Convenience method for backwards compatibility.
   */
  static async createWithDefaults(): Promise<FolderMapper> {
    return FolderMapper.create({
      mappings: DEFAULT_FOLDER_MAPPINGS.map(m => ({
        folder: `**/${m.pattern}/**`,
        types: [m.entityType],
      })),
    });
  }

  /**
   * Create a FolderMapper from template folderMappings.
   *
   * Converts template-style FolderMappingRule[] to FolderMappingConfig.
   * Falls back to defaults if no mappings provided.
   *
   * @param folderMappings - Array of folder mapping rules from template
   * @param fallbackType - Optional fallback type when no pattern matches
   * @returns Promise resolving to configured FolderMapper
   */
  static async createFromTemplate(
    folderMappings?: FolderMappingRule[],
    fallbackType?: string
  ): Promise<FolderMapper> {
    // If template has mappings, use them
    if (folderMappings && folderMappings.length > 0) {
      return FolderMapper.create({
        mappings: folderMappings,
        fallbackType,
      });
    }
    // Fall back to defaults (worldbuilding patterns)
    return FolderMapper.createWithDefaults();
  }

  /**
   * Resolve a file path to entity type(s).
   *
   * Async API for future extensibility (e.g., loading config from disk).
   *
   * @param filePath - File path (absolute or vault-relative)
   * @returns Resolve result with types and confidence
   */
  async resolveType(filePath: string): Promise<ResolveResult> {
    const normalized = normalizePath(filePath);

    // Find first matching pattern (already sorted by specificity)
    for (const compiled of this.compiledMappings) {
      if (compiled.matcher(normalized)) {
        const types = compiled.rule.types;
        return {
          types,
          matchedPattern: compiled.rule.folder,
          confidence: types.length === 1 ? 'exact' : 'ambiguous',
        };
      }
    }

    // No match - use fallback or return none
    if (this.fallbackType) {
      return {
        types: [this.fallbackType],
        matchedPattern: null,
        confidence: 'fallback',
      };
    }

    return {
      types: [],
      matchedPattern: null,
      confidence: 'none',
    };
  }

  /**
   * Resolve types for multiple file paths.
   *
   * @param filePaths - Array of file paths
   * @returns Map of file path to resolve result
   */
  async resolveTypes(filePaths: string[]): Promise<Map<string, ResolveResult>> {
    const results = new Map<string, ResolveResult>();
    for (const path of filePaths) {
      results.set(path, await this.resolveType(path));
    }
    return results;
  }

  /**
   * Get all configured mappings.
   */
  getMappings(): FolderMappingRule[] {
    return this.compiledMappings.map(c => c.rule);
  }
}

// ===== Legacy API for backwards compatibility =====

/**
 * Default folder-to-type mappings for common worldbuilding folder structures.
 * @deprecated Use FolderMapper.create() with explicit config instead.
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
 * Legacy FolderMapper using simple string matching.
 * @deprecated Use async FolderMapper.create() for glob support.
 */
export class LegacyFolderMapper {
  private mappings: Map<string, string>;

  constructor(customMappings: FolderMapping[] = []) {
    this.mappings = new Map();
    for (const mapping of DEFAULT_FOLDER_MAPPINGS) {
      this.mappings.set(mapping.pattern.toLowerCase(), mapping.entityType);
    }
    for (const mapping of customMappings) {
      this.mappings.set(mapping.pattern.toLowerCase(), mapping.entityType);
    }
  }

  inferType(filePath: string): string | null {
    const parts = filePath.toLowerCase().split(/[/\\]/);
    for (const part of parts) {
      const exactMatch = this.mappings.get(part);
      if (exactMatch) return exactMatch;
      for (const [pattern, entityType] of this.mappings) {
        if (part.startsWith(pattern)) return entityType;
      }
    }
    return null;
  }

  inferTypes(filePaths: string[]): Map<string, string | null> {
    const results = new Map<string, string | null>();
    for (const path of filePaths) {
      results.set(path, this.inferType(path));
    }
    return results;
  }

  getMappings(): FolderMapping[] {
    return Array.from(this.mappings.entries()).map(([pattern, entityType]) => ({
      pattern,
      entityType,
    }));
  }

  addMapping(pattern: string, entityType: string): void {
    this.mappings.set(pattern.toLowerCase(), entityType);
  }
}

/**
 * Legacy singleton instance.
 * @deprecated Use async FolderMapper.create() for glob support.
 */
export const folderMapper = new LegacyFolderMapper();

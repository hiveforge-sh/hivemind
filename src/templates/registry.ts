/**
 * Template registry for managing template lifecycle.
 *
 * Provides centralized template management with O(1) lookups
 * and validation on registration.
 */

import type {
  TemplateDefinition,
  TemplateRegistryEntry,
  EntityTypeConfig,
  RelationshipTypeConfig,
  FolderMappingRule,
} from './types.js';

/**
 * Source of a template registration.
 */
type TemplateSource = 'builtin' | 'config';

/**
 * Manages registered templates with fast lookups.
 *
 * Singleton pattern ensures consistent state across the application.
 * Validates templates on registration and provides O(1) entity type lookups.
 */
export class TemplateRegistry {
  /** Map from template ID to registry entry */
  private templates = new Map<string, TemplateRegistryEntry>();

  /** ID of the currently active template */
  private activeTemplateId: string | null = null;

  /**
   * Registers a template in the registry.
   *
   * Validates the template definition and creates optimized lookup maps.
   *
   * @param template - Template definition to register
   * @param source - Source of the template (builtin or config)
   * @throws {Error} If template with this ID is already registered
   */
  register(template: TemplateDefinition, source: TemplateSource): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template "${template.id}" is already registered`);
    }

    // Create entity type lookup map for O(1) access
    const entityTypeMap = new Map<string, EntityTypeConfig>();
    for (const entityType of template.entityTypes) {
      if (entityTypeMap.has(entityType.name)) {
        throw new Error(
          `Duplicate entity type "${entityType.name}" in template "${template.id}"`
        );
      }
      entityTypeMap.set(entityType.name, entityType);
    }

    // Create relationship type lookup map for O(1) access
    const relationshipTypeMap = new Map<string, RelationshipTypeConfig>();
    if (template.relationshipTypes) {
      for (const relType of template.relationshipTypes) {
        if (relationshipTypeMap.has(relType.id)) {
          throw new Error(
            `Duplicate relationship type "${relType.id}" in template "${template.id}"`
          );
        }
        relationshipTypeMap.set(relType.id, relType);
      }
    }

    const entry: TemplateRegistryEntry = {
      ...template,
      source,
      entityTypeMap,
      relationshipTypeMap,
    };

    this.templates.set(template.id, entry);
  }

  /**
   * Sets the active template by ID.
   *
   * @param templateId - ID of template to activate
   * @throws {Error} If template ID is not registered
   */
  activate(templateId: string): void {
    if (!this.templates.has(templateId)) {
      throw new Error(
        `Cannot activate template "${templateId}": not registered. ` +
          `Available templates: ${Array.from(this.templates.keys()).join(', ')}`
      );
    }
    this.activeTemplateId = templateId;
  }

  /**
   * Gets the currently active template.
   *
   * @returns Active template entry, or null if no template is active
   */
  getActive(): TemplateRegistryEntry | null {
    if (this.activeTemplateId === null) {
      return null;
    }
    return this.templates.get(this.activeTemplateId) ?? null;
  }

  /**
   * Gets a template by ID.
   *
   * @param templateId - Template ID to retrieve
   * @returns Template entry if found, undefined otherwise
   */
  get(templateId: string): TemplateRegistryEntry | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Checks if a template is registered.
   *
   * @param templateId - Template ID to check
   * @returns True if template exists in registry
   */
  has(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Lists all registered template IDs.
   *
   * @returns Array of template IDs
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Gets an entity type config from the active template.
   *
   * O(1) lookup using the entity type map.
   *
   * @param name - Entity type name to retrieve
   * @returns Entity type config if found, undefined otherwise
   * @throws {Error} If no template is active
   */
  getEntityType(name: string): EntityTypeConfig | undefined {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get entity type: no active template');
    }
    return active.entityTypeMap.get(name);
  }

  /**
   * Gets all entity type configs from the active template.
   *
   * @returns Array of entity type configs
   * @throws {Error} If no template is active
   */
  getEntityTypes(): EntityTypeConfig[] {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get entity types: no active template');
    }
    return active.entityTypes;
  }

  /**
   * Gets a relationship type config from the active template.
   *
   * O(1) lookup using the relationship type map.
   *
   * @param id - Relationship type ID to retrieve
   * @returns Relationship type config if found, undefined otherwise
   * @throws {Error} If no template is active
   */
  getRelationshipType(id: string): RelationshipTypeConfig | undefined {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get relationship type: no active template');
    }
    return active.relationshipTypeMap.get(id);
  }

  /**
   * Gets all relationship type configs from the active template.
   *
   * @returns Array of relationship type configs
   * @throws {Error} If no template is active
   */
  getRelationshipTypes(): RelationshipTypeConfig[] {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get relationship types: no active template');
    }
    return active.relationshipTypes || [];
  }

  /**
   * Gets folder mappings from the active template.
   *
   * Returns the template's configured folder mappings for entity type inference.
   * Returns undefined if the template has no folder mappings defined.
   *
   * @returns Array of folder mapping rules, or undefined if not configured
   * @throws {Error} If no template is active
   */
  getFolderMappings(): FolderMappingRule[] | undefined {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get folder mappings: no active template');
    }
    return active.folderMappings;
  }

  /**
   * Gets valid relationship types for a source-target entity type pair.
   *
   * Returns all relationship types where:
   * - sourceTypes includes the source entity type (or is 'any')
   * - targetTypes includes the target entity type (or is 'any')
   *
   * @param sourceType - Source entity type name
   * @param targetType - Target entity type name
   * @returns Array of valid relationship type configs
   * @throws {Error} If no template is active
   */
  getValidRelationships(sourceType: string, targetType: string): RelationshipTypeConfig[] {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get valid relationships: no active template');
    }

    const relationshipTypes = active.relationshipTypes || [];
    return relationshipTypes.filter((rel) => {
      const sourceValid =
        rel.sourceTypes === 'any' || rel.sourceTypes.includes(sourceType);
      const targetValid =
        rel.targetTypes === 'any' || rel.targetTypes.includes(targetType);
      return sourceValid && targetValid;
    });
  }

  /**
   * Clears all registered templates and resets active template.
   *
   * Primarily for testing purposes.
   */
  clear(): void {
    this.templates.clear();
    this.activeTemplateId = null;
  }
}

/**
 * Singleton instance of the template registry.
 *
 * Use this throughout the application for consistent template state.
 */
export const templateRegistry = new TemplateRegistry();

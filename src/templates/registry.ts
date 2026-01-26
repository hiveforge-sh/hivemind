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

    const entry: TemplateRegistryEntry = {
      ...template,
      source,
      entityTypeMap,
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

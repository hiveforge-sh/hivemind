/**
 * Template registry for managing template lifecycle.
 *
 * Provides centralized template management with O(1) lookups
 * and validation on registration. Supports template inheritance
 * via the `extendsTemplate` field.
 */

import type {
  TemplateDefinition,
  TemplateRegistryEntry,
  EntityTypeConfig,
  RelationshipTypeConfig,
  FolderMappingRule,
  FieldConfig,
} from './types.js';

/**
 * Source of a template registration.
 */
type TemplateSource = 'builtin' | 'config';

/**
 * Merges two arrays of field configs, with child fields taking precedence.
 * Fields with the same name in the child override the parent field.
 *
 * @param parentFields - Fields from the parent entity type
 * @param childFields - Additional fields from the child entity type
 * @returns Merged array of field configs
 */
function mergeFields(parentFields: FieldConfig[], childFields: FieldConfig[]): FieldConfig[] {
  const fieldMap = new Map<string, FieldConfig>();

  // Add parent fields first
  for (const field of parentFields) {
    fieldMap.set(field.name, field);
  }

  // Child fields override parent fields with same name
  for (const field of childFields) {
    fieldMap.set(field.name, field);
  }

  return Array.from(fieldMap.values());
}

/**
 * Merges entity type configs from parent and child templates.
 *
 * Rules:
 * - Entity types only in parent: included as-is
 * - Entity types only in child: included as-is
 * - Entity types in both: child's additionalFields are merged with parent's fields
 *
 * @param parentTypes - Entity types from parent template
 * @param childTypes - Entity types from child template
 * @returns Merged array of entity type configs
 */
function mergeEntityTypes(
  parentTypes: EntityTypeConfig[],
  childTypes: EntityTypeConfig[]
): EntityTypeConfig[] {
  const typeMap = new Map<string, EntityTypeConfig>();

  // Add all parent types
  for (const parentType of parentTypes) {
    typeMap.set(parentType.name, { ...parentType });
  }

  // Process child types
  for (const childType of childTypes) {
    const parentType = typeMap.get(childType.name);

    if (parentType) {
      // Extending existing type - merge fields
      const mergedFields = mergeFields(
        parentType.fields,
        childType.additionalFields || childType.fields
      );

      typeMap.set(childType.name, {
        ...parentType,
        // Child can override display metadata
        displayName: childType.displayName || parentType.displayName,
        pluralName: childType.pluralName || parentType.pluralName,
        description: childType.description || parentType.description,
        icon: childType.icon || parentType.icon,
        fields: mergedFields,
        // Clear additionalFields after merge
        additionalFields: undefined,
      });
    } else {
      // New type from child - add as-is
      typeMap.set(childType.name, { ...childType });
    }
  }

  return Array.from(typeMap.values());
}

/**
 * Merges relationship type configs from parent and child templates.
 * Child relationship types with the same ID override parent types.
 *
 * @param parentTypes - Relationship types from parent template
 * @param childTypes - Relationship types from child template
 * @returns Merged array of relationship type configs
 */
function mergeRelationshipTypes(
  parentTypes: RelationshipTypeConfig[] | undefined,
  childTypes: RelationshipTypeConfig[] | undefined
): RelationshipTypeConfig[] | undefined {
  if (!parentTypes && !childTypes) {
    return undefined;
  }

  const typeMap = new Map<string, RelationshipTypeConfig>();

  // Add parent types first
  if (parentTypes) {
    for (const relType of parentTypes) {
      typeMap.set(relType.id, relType);
    }
  }

  // Child types override parent types with same ID
  if (childTypes) {
    for (const relType of childTypes) {
      typeMap.set(relType.id, relType);
    }
  }

  return Array.from(typeMap.values());
}

/**
 * Merges folder mappings from parent and child templates.
 * Child mappings are appended to parent mappings (child takes precedence
 * when patterns match, since they come later in the array).
 *
 * @param parentMappings - Folder mappings from parent template
 * @param childMappings - Folder mappings from child template
 * @returns Merged array of folder mapping rules
 */
function mergeFolderMappings(
  parentMappings: FolderMappingRule[] | undefined,
  childMappings: FolderMappingRule[] | undefined
): FolderMappingRule[] | undefined {
  if (!parentMappings && !childMappings) {
    return undefined;
  }

  // Child mappings come after parent, so they take precedence in matching
  return [...(parentMappings || []), ...(childMappings || [])];
}

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
   * Validates the template definition, resolves inheritance if `extendsTemplate`
   * is specified, and creates optimized lookup maps.
   *
   * @param template - Template definition to register
   * @param source - Source of the template (builtin or config)
   * @throws {Error} If template with this ID is already registered
   * @throws {Error} If parent template is not found (when using extendsTemplate)
   * @throws {Error} If circular inheritance is detected
   */
  register(template: TemplateDefinition, source: TemplateSource): void {
    if (this.templates.has(template.id)) {
      throw new Error(`Template "${template.id}" is already registered`);
    }

    // Resolve template inheritance
    let resolvedTemplate = template;
    if (template.extendsTemplate) {
      resolvedTemplate = this.resolveInheritance(template);
    }

    // Create entity type lookup map for O(1) access
    const entityTypeMap = new Map<string, EntityTypeConfig>();
    for (const entityType of resolvedTemplate.entityTypes) {
      if (entityTypeMap.has(entityType.name)) {
        throw new Error(
          `Duplicate entity type "${entityType.name}" in template "${template.id}"`
        );
      }
      entityTypeMap.set(entityType.name, entityType);
    }

    // Create relationship type lookup map for O(1) access
    const relationshipTypeMap = new Map<string, RelationshipTypeConfig>();
    if (resolvedTemplate.relationshipTypes) {
      for (const relType of resolvedTemplate.relationshipTypes) {
        if (relationshipTypeMap.has(relType.id)) {
          throw new Error(
            `Duplicate relationship type "${relType.id}" in template "${template.id}"`
          );
        }
        relationshipTypeMap.set(relType.id, relType);
      }
    }

    const entry: TemplateRegistryEntry = {
      ...resolvedTemplate,
      source,
      entityTypeMap,
      relationshipTypeMap,
    };

    this.templates.set(template.id, entry);
  }

  /**
   * Resolves template inheritance by merging with parent template(s).
   *
   * Handles multi-level inheritance (e.g., A extends B extends C) by
   * recursively resolving the parent chain.
   *
   * @param template - Child template with extendsTemplate specified
   * @param visited - Set of template IDs in the current inheritance chain (for cycle detection)
   * @returns Resolved template with merged entity types, relationships, and mappings
   * @throws {Error} If parent template is not found
   * @throws {Error} If circular inheritance is detected
   */
  private resolveInheritance(
    template: TemplateDefinition,
    visited: Set<string> = new Set()
  ): TemplateDefinition {
    if (!template.extendsTemplate) {
      return template;
    }

    // Check for circular inheritance
    if (visited.has(template.id)) {
      throw new Error(
        `Circular template inheritance detected: ${Array.from(visited).join(' -> ')} -> ${template.id}`
      );
    }
    visited.add(template.id);

    // Get parent template
    const parentEntry = this.templates.get(template.extendsTemplate);
    if (!parentEntry) {
      throw new Error(
        `Template "${template.id}" extends "${template.extendsTemplate}", but parent template is not registered. ` +
          `Make sure parent templates are registered before child templates.`
      );
    }

    // If parent also extends another template, recursively resolve
    // Note: Parent is already registered, so it's already resolved
    // We just need to merge with the resolved parent

    // Merge entity types
    const mergedEntityTypes = mergeEntityTypes(parentEntry.entityTypes, template.entityTypes);

    // Merge relationship types
    const mergedRelationshipTypes = mergeRelationshipTypes(
      parentEntry.relationshipTypes,
      template.relationshipTypes
    );

    // Merge folder mappings
    const mergedFolderMappings = mergeFolderMappings(
      parentEntry.folderMappings,
      template.folderMappings
    );

    // Return resolved template
    return {
      ...template,
      entityTypes: mergedEntityTypes,
      relationshipTypes: mergedRelationshipTypes,
      folderMappings: mergedFolderMappings,
    };
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
   * Builds a frontmatter template object for a specific entity type.
   *
   * Creates a complete frontmatter object with:
   * - Base fields (id, type, status, title, importance, tags, aliases)
   * - Custom fields from entity type config with default values
   *
   * @param entityTypeName - Name of entity type to build template for
   * @returns Frontmatter template object
   * @throws {Error} If no template is active or entity type not found
   */
  buildFrontmatterTemplate(entityTypeName: string): Record<string, unknown> {
    const entityType = this.getEntityType(entityTypeName);
    if (!entityType) {
      throw new Error(
        `Cannot build frontmatter template: entity type "${entityTypeName}" not found in active template`
      );
    }

    // Base fields common to all entity types
    const baseFields: Record<string, unknown> = {
      id: '',
      type: entityTypeName,
      status: 'draft',
      title: '',
      tags: [],
      aliases: [],
    };

    // Asset type doesn't have importance field
    if (entityTypeName !== 'asset') {
      baseFields.importance = 'minor';
    }

    // Build custom fields from entity type config
    const customFields: Record<string, unknown> = {};
    for (const field of entityType.fields) {
      customFields[field.name] = this.getFieldDefaultValue(field);
    }

    return { ...baseFields, ...customFields };
  }

  /**
   * Builds frontmatter templates for all entity types in the active template.
   *
   * @returns Map of entity type names to their frontmatter templates
   * @throws {Error} If no template is active
   */
  buildAllFrontmatterTemplates(): Record<string, Record<string, unknown>> {
    const entityTypes = this.getEntityTypes();
    const templates: Record<string, Record<string, unknown>> = {};

    for (const entityType of entityTypes) {
      templates[entityType.name] = this.buildFrontmatterTemplate(entityType.name);
    }

    return templates;
  }

  /**
   * Gets the default value for a field based on its configuration.
   *
   * Uses field.default if provided, otherwise derives from field type.
   * Note: Empty values ([], {}) are returned here but should be filtered
   * out when serializing to YAML to avoid parsing issues.
   *
   * @param field - Field configuration
   * @returns Default value for the field
   */
  private getFieldDefaultValue(field: FieldConfig): unknown {
    // Use explicit default if provided
    if (field.default !== undefined) {
      return field.default;
    }

    // Derive default from field type
    switch (field.type) {
      case 'string':
        return '';
      case 'number':
        return null;
      case 'boolean':
        return false;
      case 'enum':
        return '';
      case 'array':
        return [];
      case 'date':
        return '';
      case 'record':
        // For record types, check if there are known nested structures
        // Character-specific nested objects
        if (field.name === 'appearance') {
          return {
            height: '',
            build: '',
            hair: '',
            eyes: '',
            distinctive_features: ''
          };
        }
        if (field.name === 'personality') {
          return {
            traits: [],
            motivations: [],
            flaws: []
          };
        }
        if (field.name === 'background') {
          return {
            birthplace: '',
            occupation: '',
            affiliations: []
          };
        }
        // Default record is empty object
        return {};
      default:
        return null;
    }
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

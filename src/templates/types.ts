/**
 * Template system type definitions.
 *
 * This module defines the core interfaces for the pluggable template system,
 * which allows users to define custom entity types in config.json without
 * writing code.
 */

/**
 * Supported field data types for template fields.
 *
 * - string: Text values
 * - number: Numeric values (integers or decimals)
 * - boolean: True/false values
 * - enum: One of a predefined set of string values
 * - array: List of values (specify item type with arrayItemType)
 * - date: ISO 8601 date strings
 * - record: Key-value pairs (object)
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'date'
  | 'record';

/**
 * Configuration for a single field in an entity type.
 *
 * Defines the name, type, validation rules, and default value for a custom
 * field beyond the base entity fields (name, content, tags, relations).
 */
export interface FieldConfig {
  /** Field name (e.g., "age", "status") */
  name: string;

  /** Data type of the field */
  type: FieldType;

  /** Whether this field is required (default: false) */
  required?: boolean;

  /** Default value if not provided */
  default?: unknown;

  /** Valid values when type is 'enum' (required for enum fields) */
  enumValues?: string[];

  /** Type of items when type is 'array' (default: 'string') */
  arrayItemType?: FieldType;

  /** Human-readable description for documentation and MCP tool descriptions */
  description?: string;
}

/**
 * Configuration for a custom entity type.
 *
 * Defines a new entity type (e.g., "character", "location") with its
 * custom fields and metadata.
 */
export interface EntityTypeConfig {
  /** Entity type name (lowercase, alphanumeric, e.g., "character") */
  name: string;

  /** Human-readable display name (e.g., "Character") */
  displayName: string;

  /** Plural form for UI (e.g., "Characters") */
  pluralName: string;

  /** Description of this entity type for documentation */
  description?: string;

  /** Custom fields beyond base entity fields */
  fields: FieldConfig[];

  /** Optional icon identifier for UI rendering */
  icon?: string;
}

/**
 * Complete template definition.
 *
 * A template is a collection of entity types that work together
 * (e.g., "worldbuilding" template with characters, locations, events).
 */
export interface TemplateDefinition {
  /** Unique template identifier (e.g., "worldbuilding") */
  id: string;

  /** Human-readable template name (e.g., "Worldbuilding") */
  name: string;

  /** Semantic version for migrations (e.g., "1.0.0") */
  version: string;

  /** Description of what this template is for */
  description?: string;

  /** Entity types included in this template */
  entityTypes: EntityTypeConfig[];
}

/**
 * Structure of the template configuration in config.json.
 *
 * Users can define custom templates inline or reference built-in templates.
 */
export interface TemplateConfig {
  /** Custom template definitions (optional, for inline templates) */
  templates?: TemplateDefinition[];

  /** ID of the template to use (can be builtin or custom) */
  activeTemplate: string;
}

/**
 * Runtime registry entry for a template.
 *
 * Extends TemplateDefinition with runtime metadata and optimized lookups.
 */
export interface TemplateRegistryEntry extends TemplateDefinition {
  /** Source of this template (builtin or user-defined) */
  source: 'builtin' | 'config';

  /** Fast lookup map from entity type name to config */
  entityTypeMap: Map<string, EntityTypeConfig>;
}

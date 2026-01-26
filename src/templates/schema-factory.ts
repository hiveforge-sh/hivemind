/**
 * Schema factory for dynamically generating Zod schemas from entity type configurations.
 *
 * This module is the core of the template system's runtime validation - it transforms
 * user-defined EntityTypeConfig objects into Zod schemas that extend the base entity
 * schema with custom fields.
 */

import { z } from 'zod';
import type { EntityTypeConfig, FieldConfig, FieldType } from './types.js';
import { BaseFrontmatterSchema } from '../types/index.js';

/**
 * Build a Zod schema for a primitive field type.
 * Used for array item types and standalone fields.
 */
function buildPrimitiveSchema(type: FieldType): z.ZodTypeAny {
  switch (type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'date':
      return z.string(); // ISO 8601 date string
    case 'record':
      return z.record(z.string(), z.any());
    default:
      // For enum/array types used as primitives, fall back to string
      return z.string();
  }
}

/**
 * Build a Zod schema for a single field based on its configuration.
 *
 * Handles all field types: string, number, boolean, enum, array, date, record.
 * Applies required/optional modifiers and default values.
 */
function buildFieldSchema(field: FieldConfig): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'string':
      schema = z.string();
      break;

    case 'number':
      schema = z.number();
      break;

    case 'boolean':
      schema = z.boolean();
      break;

    case 'enum':
      if (!field.enumValues || field.enumValues.length === 0) {
        throw new Error(`Field "${field.name}" of type enum must specify enumValues`);
      }
      // Build enum schema from first value + rest
      schema = z.enum([field.enumValues[0], ...field.enumValues.slice(1)] as [string, ...string[]]);
      break;

    case 'array':
      // Determine the item type (default to string if not specified)
      const itemType = field.arrayItemType || 'string';
      const itemSchema = buildPrimitiveSchema(itemType);
      schema = z.array(itemSchema);
      break;

    case 'date':
      // ISO 8601 date string
      schema = z.string();
      break;

    case 'record':
      // Key-value pairs
      schema = z.record(z.string(), z.any());
      break;

    default:
      // Fallback for unknown types
      schema = z.any();
  }

  // Apply optional/required modifiers
  // Fields are optional by default unless explicitly marked required
  if (!field.required) {
    schema = schema.optional();
  }

  // Apply default value if provided
  if (field.default !== undefined) {
    schema = schema.default(field.default);
  }

  return schema;
}

/**
 * Create a complete Zod schema for an entity type from its configuration.
 *
 * The generated schema extends BaseFrontmatterSchema with:
 * - Type literal enforcement (type must match entity type name)
 * - All custom fields from the entity config
 *
 * @param config - Entity type configuration
 * @returns Zod schema that validates entities of this type
 */
export function createEntitySchema(config: EntityTypeConfig): z.ZodObject<any> {
  // Build the shape for custom fields
  const customFields: Record<string, z.ZodTypeAny> = {};

  for (const field of config.fields) {
    customFields[field.name] = buildFieldSchema(field);
  }

  // Extend BaseFrontmatterSchema with custom fields and enforce type literal
  const schema = BaseFrontmatterSchema.extend({
    type: z.literal(config.name as any), // Enforce this specific entity type
    ...customFields,
  });

  return schema;
}

/**
 * Factory class for managing schema generation with caching.
 *
 * Generates Zod schemas once per entity type and caches them for performance.
 * Useful when validating multiple entities of the same type.
 */
export class SchemaFactory {
  private schemaCache: Map<string, z.ZodObject<any>> = new Map();

  /**
   * Get or create a schema for an entity type.
   *
   * If a schema for this entity type has been generated before, returns the
   * cached version. Otherwise, generates and caches a new schema.
   *
   * @param config - Entity type configuration
   * @returns Cached or newly generated Zod schema
   */
  getSchema(config: EntityTypeConfig): z.ZodObject<any> {
    const cached = this.schemaCache.get(config.name);
    if (cached) {
      return cached;
    }

    const schema = createEntitySchema(config);
    this.schemaCache.set(config.name, schema);
    return schema;
  }

  /**
   * Generate schemas for multiple entity types at once.
   *
   * Useful for bulk schema generation (e.g., when loading a template).
   * Returns a map of entity type name to schema.
   *
   * @param configs - Array of entity type configurations
   * @returns Map from entity type name to Zod schema
   */
  generateSchemas(configs: EntityTypeConfig[]): Map<string, z.ZodObject<any>> {
    const schemas = new Map<string, z.ZodObject<any>>();

    for (const config of configs) {
      schemas.set(config.name, this.getSchema(config));
    }

    return schemas;
  }

  /**
   * Clear the schema cache.
   *
   * Useful for testing or when entity type configurations change at runtime.
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Get the number of cached schemas.
   *
   * @returns Number of schemas currently cached
   */
  getCacheSize(): number {
    return this.schemaCache.size;
  }
}

/**
 * Singleton instance of SchemaFactory for shared caching across the application.
 */
export const schemaFactory = new SchemaFactory();

/**
 * Type helper to infer TypeScript type from generated entity schema.
 *
 * Usage:
 * ```ts
 * const characterSchema = createEntitySchema(characterConfig);
 * type Character = InferEntityType<typeof characterSchema>;
 * ```
 */
export type InferEntityType<T extends z.ZodObject<any>> = z.infer<T>;

/**
 * Template configuration validation using Zod.
 *
 * Provides schema validation for template configs to fail fast at startup
 * before schema generation, ensuring user configs are valid.
 */

import { z } from 'zod';
import type {
  FieldConfig,
  EntityTypeConfig,
  TemplateDefinition,
  TemplateConfig,
} from './types.js';

/**
 * Zod schema for field configuration validation.
 *
 * Validates:
 * - Field names are camelCase alphanumeric
 * - Type is one of the supported FieldType values
 * - Enum fields have enumValues defined
 * - Array fields have valid arrayItemType
 */
export const FieldConfigSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Field name cannot be empty')
      .regex(
        /^[a-z][a-zA-Z0-9]*$/,
        'Field name must be camelCase alphanumeric (e.g., "age", "statusCode")'
      ),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'array', 'date', 'record'], {
      message: 'Field type must be one of: string, number, boolean, enum, array, date, record',
    }),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
    enumValues: z.array(z.string()).optional(),
    arrayItemType: z
      .enum(['string', 'number', 'boolean', 'enum', 'array', 'date', 'record'])
      .optional(),
    description: z.string().optional(),
  })
  .refine(
    (field) => {
      // Enum fields must have enumValues
      if (field.type === 'enum' && (!field.enumValues || field.enumValues.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Enum fields must define enumValues with at least one value',
      path: ['enumValues'],
    }
  ) satisfies z.ZodType<FieldConfig>;

/**
 * Zod schema for entity type configuration validation.
 *
 * Validates:
 * - Entity type names are lowercase alphanumeric
 * - Display names and plural names are provided
 * - Fields array is valid
 */
export const EntityTypeConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Entity type name cannot be empty')
    .regex(
      /^[a-z][a-z0-9]*$/,
      'Entity type name must be lowercase alphanumeric (e.g., "character", "location")'
    ),
  displayName: z.string().min(1, 'Display name cannot be empty'),
  pluralName: z.string().min(1, 'Plural name cannot be empty'),
  description: z.string().optional(),
  fields: z.array(FieldConfigSchema),
  icon: z.string().optional(),
}) satisfies z.ZodType<EntityTypeConfig>;

/**
 * Zod schema for template definition validation.
 *
 * Validates:
 * - Template ID is lowercase alphanumeric with hyphens
 * - Version follows semantic versioning (X.Y.Z)
 * - Entity types array is valid and non-empty
 */
export const TemplateDefinitionSchema = z.object({
  id: z
    .string()
    .min(1, 'Template ID cannot be empty')
    .regex(
      /^[a-z][a-z0-9-]*$/,
      'Template ID must be lowercase alphanumeric with hyphens (e.g., "worldbuilding", "game-design")'
    ),
  name: z.string().min(1, 'Template name cannot be empty'),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., "1.0.0")'),
  description: z.string().optional(),
  entityTypes: z
    .array(EntityTypeConfigSchema)
    .min(1, 'Template must define at least one entity type'),
}) satisfies z.ZodType<TemplateDefinition>;

/**
 * Zod schema for full template configuration validation.
 *
 * Validates:
 * - Templates array (if provided) contains valid templates
 * - activeTemplate is specified
 */
export const TemplateConfigSchema = z.object({
  templates: z.array(TemplateDefinitionSchema).optional(),
  activeTemplate: z.string().min(1, 'activeTemplate must be specified'),
}) satisfies z.ZodType<TemplateConfig>;

/**
 * Custom error class for template validation failures.
 *
 * Provides structured error information and user-friendly messages.
 */
export class TemplateValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'TemplateValidationError';
  }

  /**
   * Converts Zod validation issues to a user-friendly error message.
   *
   * @returns Formatted error message with all validation issues
   */
  toUserMessage(): string {
    const lines = ['Template configuration validation failed:', ''];

    for (const issue of this.issues) {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      lines.push(`  • ${path}: ${issue.message}`);
    }

    return lines.join('\n');
  }
}

/**
 * Validates template configuration against schema.
 *
 * @param config - Template configuration to validate
 * @returns Validated and typed configuration
 * @throws {TemplateValidationError} If validation fails with details of all issues
 */
export function validateTemplateConfig(config: unknown): TemplateConfig {
  const result = TemplateConfigSchema.safeParse(config);

  if (!result.success) {
    throw new TemplateValidationError('Invalid template configuration', result.error.issues);
  }

  return result.data;
}

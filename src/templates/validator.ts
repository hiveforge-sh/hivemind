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
  RelationshipTypeConfig,
  TemplateDefinition,
  TemplateConfig,
  TemplateAuthor,
  TemplateCategory,
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
        /^[a-z][a-zA-Z0-9_]*$/,
        'Field name must be camelCase or snake_case alphanumeric (e.g., "age", "statusCode", "event_type")'
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
      /^[a-z][a-z0-9_]*$/,
      'Entity type name must be lowercase alphanumeric with underscores (e.g., "character", "one_on_one")'
    ),
  displayName: z.string().min(1, 'Display name cannot be empty'),
  pluralName: z.string().min(1, 'Plural name cannot be empty'),
  description: z.string().optional(),
  fields: z.array(FieldConfigSchema),
  icon: z.string().optional(),
}) satisfies z.ZodType<EntityTypeConfig>;

/**
 * Zod schema for relationship type configuration validation.
 *
 * Validates:
 * - Relationship IDs are snake_case
 * - Source/target types are valid
 * - Bidirectional relationships specify reverseId
 */
export const RelationshipTypeConfigSchema = z
  .object({
    id: z
      .string()
      .min(1, 'Relationship ID cannot be empty')
      .regex(
        /^[a-z][a-z0-9_]*$/,
        'Relationship ID must be snake_case (e.g., "knows", "allied_with")'
      ),
    displayName: z.string().min(1, 'Display name cannot be empty'),
    description: z.string().optional(),
    sourceTypes: z.union([
      z.array(z.string()).min(1, 'sourceTypes must have at least one type'),
      z.literal('any'),
    ]),
    targetTypes: z.union([
      z.array(z.string()).min(1, 'targetTypes must have at least one type'),
      z.literal('any'),
    ]),
    bidirectional: z.boolean().default(false),
    reverseId: z.string().optional(),
    properties: z.array(FieldConfigSchema).optional(),
  })
  .refine(
    (rel) => !rel.bidirectional || rel.reverseId,
    {
      message: 'Bidirectional relationships must specify reverseId',
      path: ['reverseId'],
    }
  ) satisfies z.ZodType<RelationshipTypeConfig>;

/**
 * Template categories for discovery and filtering.
 */
export const TemplateCategorySchema = z.enum([
  'productivity',
  'creative',
  'engineering',
  'research',
  'business',
  'other',
]) satisfies z.ZodType<TemplateCategory>;

/**
 * Zod schema for template author information.
 */
export const TemplateAuthorSchema = z.object({
  name: z.string().min(1, 'Author name cannot be empty'),
  url: z.url('Author URL must be a valid URL').optional(),
  email: z.email('Author email must be a valid email').optional(),
}) satisfies z.ZodType<TemplateAuthor>;

/**
 * Zod schema for folder mapping rule validation.
 */
export const FolderMappingRuleSchema = z.object({
  folder: z.string().min(1, 'Folder pattern is required'),
  types: z.array(z.string().min(1)).min(1, 'At least one type is required'),
});

/**
 * Zod schema for template definition validation.
 *
 * Validates:
 * - Template ID is lowercase alphanumeric with hyphens
 * - Version follows semantic versioning (X.Y.Z)
 * - Entity types array is valid and non-empty
 * - Optional metadata fields for discovery
 */
export const TemplateDefinitionSchema = z.object({
  // Required fields
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
  relationshipTypes: z.array(RelationshipTypeConfigSchema).optional(),

  // Discovery metadata (optional)
  category: TemplateCategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  author: TemplateAuthorSchema.optional(),
  repository: z.url('Repository must be a valid URL').optional(),
  sampleVault: z.string().optional(),
  license: z.string().optional(),
  minHivemindVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'minHivemindVersion must follow semantic versioning')
    .optional(),
  folderMappings: z.array(FolderMappingRuleSchema).optional(),
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
    public readonly issues: z.core.$ZodIssue[]
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

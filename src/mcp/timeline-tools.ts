/**
 * Timeline MCP tools - date field discovery and validation.
 *
 * Provides date field discovery from template registry and Zod validation
 * schemas for timeline query tools.
 */

import { z } from 'zod';
import { templateRegistry } from '../templates/registry.js';
import type { ToolDefinition } from './tool-generator.js';

/**
 * Information about an entity type's date fields.
 */
export interface TemporalTypeInfo {
  /** Entity type name */
  entityType: string;
  /** Date fields available on this entity type */
  dateFields: Array<{
    name: string;
    required: boolean;
    description?: string;
  }>;
}

/**
 * Discovers entity types that have date-typed fields.
 *
 * Scans the active template's entity types and returns information about
 * which types have date fields available for timeline queries.
 *
 * @returns Array of temporal type information, or empty array if no active template
 */
export function discoverTemporalTypes(): TemporalTypeInfo[] {
  const activeTemplate = templateRegistry.getActive();
  if (!activeTemplate) {
    return [];
  }

  const temporalTypes: TemporalTypeInfo[] = [];

  for (const entityType of activeTemplate.entityTypes) {
    const dateFields = entityType.fields
      .filter((field) => field.type === 'date')
      .map((field) => ({
        name: field.name,
        required: field.required ?? false,
        description: field.description,
      }));

    if (dateFields.length > 0) {
      temporalTypes.push({
        entityType: entityType.name,
        dateFields,
      });
    }
  }

  return temporalTypes;
}

/**
 * Validates that a field exists on an entity type and is a date type.
 *
 * @param entityType - Entity type name to check
 * @param dateField - Field name to validate
 * @returns True if the field exists and is a date type, false otherwise
 */
export function validateDateField(entityType: string, dateField: string): boolean {
  const activeTemplate = templateRegistry.getActive();
  if (!activeTemplate) {
    return false;
  }

  const entityConfig = activeTemplate.entityTypeMap.get(entityType);
  if (!entityConfig) {
    return false;
  }

  const field = entityConfig.fields.find((f) => f.name === dateField);
  if (!field) {
    return false;
  }

  return field.type === 'date';
}

/**
 * ISO8601 date string regex (YYYY-MM-DD format only).
 *
 * Validates format but not calendar correctness - SQLite handles string
 * comparison correctly even with invalid dates like 2024-13-45.
 */
const ISO8601DateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validation schema for query_timeline_range arguments.
 *
 * Finds entities with date fields in a specified range.
 */
export const QueryTimelineRangeArgsSchema = z.object({
  startDate: z
    .string()
    .regex(ISO8601DateRegex, 'Date must be in YYYY-MM-DD format'),
  endDate: z
    .string()
    .regex(ISO8601DateRegex, 'Date must be in YYYY-MM-DD format'),
  dateField: z.string().describe('Name of the date field to query'),
  entityType: z
    .string()
    .optional()
    .describe('Optional entity type filter'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc')
    .describe('Sort order for results'),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
});

export type QueryTimelineRangeArgs = z.infer<typeof QueryTimelineRangeArgsSchema>;

/**
 * Validation schema for query_timeline_before arguments.
 *
 * Finds entities with date fields before a specified date.
 */
export const QueryTimelineBeforeArgsSchema = z.object({
  date: z
    .string()
    .regex(ISO8601DateRegex, 'Date must be in YYYY-MM-DD format'),
  dateField: z.string().describe('Name of the date field to query'),
  entityType: z
    .string()
    .optional()
    .describe('Optional entity type filter'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort order for results'),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
});

export type QueryTimelineBeforeArgs = z.infer<typeof QueryTimelineBeforeArgsSchema>;

/**
 * Validation schema for query_timeline_after arguments.
 *
 * Finds entities with date fields after a specified date.
 */
export const QueryTimelineAfterArgsSchema = z.object({
  date: z
    .string()
    .regex(ISO8601DateRegex, 'Date must be in YYYY-MM-DD format'),
  dateField: z.string().describe('Name of the date field to query'),
  entityType: z
    .string()
    .optional()
    .describe('Optional entity type filter'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc')
    .describe('Sort order for results'),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
});

export type QueryTimelineAfterArgs = z.infer<typeof QueryTimelineAfterArgsSchema>;

/**
 * Validation schema for query_timeline_exact arguments.
 *
 * Finds entities with date fields matching an exact date.
 */
export const QueryTimelineExactArgsSchema = z.object({
  date: z
    .string()
    .regex(ISO8601DateRegex, 'Date must be in YYYY-MM-DD format'),
  dateField: z.string().describe('Name of the date field to query'),
  entityType: z
    .string()
    .optional()
    .describe('Optional entity type filter'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc')
    .describe('Sort order for results'),
  limit: z
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Maximum number of results to return'),
});

export type QueryTimelineExactArgs = z.infer<typeof QueryTimelineExactArgsSchema>;

/**
 * Generates MCP tool definitions for timeline queries.
 *
 * Creates four tools: query_timeline_range, query_timeline_before,
 * query_timeline_after, and query_timeline_exact.
 *
 * Tool descriptions dynamically include available date fields per entity type.
 *
 * @param temporalTypes - Entity types with date fields
 * @returns Array of tool definitions for MCP registration
 */
export function generateTimelineTools(temporalTypes: TemporalTypeInfo[]): ToolDefinition[] {
  // Build description of available date fields
  const dateFieldsDescription = buildDateFieldsDescription(temporalTypes);

  // Common properties shared by all timeline tools
  const commonProperties = {
    dateField: {
      type: 'string',
      description: 'Name of the date field to query',
    },
    entityType: {
      type: 'string',
      description: 'Optional: filter to specific entity type',
    },
    sortOrder: {
      type: 'string',
      enum: ['asc', 'desc'],
      description: 'Sort order for results',
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (1-1000, default: 100)',
      minimum: 1,
      maximum: 1000,
      default: 100,
    },
  };

  const tools: ToolDefinition[] = [
    {
      name: 'query_timeline_range',
      description: `Query entities with dates in a specified range. Returns entities where the date field falls between startDate and endDate (inclusive).${dateFieldsDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (inclusive)',
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format (inclusive)',
          },
          ...commonProperties,
        },
        required: ['startDate', 'endDate', 'dateField'],
      },
    },
    {
      name: 'query_timeline_before',
      description: `Query entities with dates before a specified date. Returns entities where the date field is earlier than the given date.${dateFieldsDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (exclusive upper bound)',
          },
          ...commonProperties,
          sortOrder: {
            ...commonProperties.sortOrder,
            default: 'desc',
            description: 'Sort order for results (default: desc)',
          },
        },
        required: ['date', 'dateField'],
      },
    },
    {
      name: 'query_timeline_after',
      description: `Query entities with dates after a specified date. Returns entities where the date field is later than the given date.${dateFieldsDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (exclusive lower bound)',
          },
          ...commonProperties,
          sortOrder: {
            ...commonProperties.sortOrder,
            default: 'asc',
            description: 'Sort order for results (default: asc)',
          },
        },
        required: ['date', 'dateField'],
      },
    },
    {
      name: 'query_timeline_exact',
      description: `Query entities with dates matching an exact date. Returns entities where the date field exactly matches the given date.${dateFieldsDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (exact match)',
          },
          ...commonProperties,
          sortOrder: {
            ...commonProperties.sortOrder,
            default: 'asc',
            description: 'Sort order for results (default: asc)',
          },
        },
        required: ['date', 'dateField'],
      },
    },
  ];

  return tools;
}

/**
 * Builds the date fields description section for tool descriptions.
 *
 * @param temporalTypes - Entity types with date fields
 * @returns Formatted description of available date fields
 */
function buildDateFieldsDescription(temporalTypes: TemporalTypeInfo[]): string {
  if (temporalTypes.length === 0) {
    return '';
  }

  let description = '\n\nAvailable date fields:\n';
  for (const typeInfo of temporalTypes) {
    const fieldNames = typeInfo.dateFields.map((f) => f.name).join(', ');
    description += `- ${typeInfo.entityType}: ${fieldNames}\n`;
  }
  return description;
}

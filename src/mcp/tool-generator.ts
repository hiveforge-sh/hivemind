/**
 * Dynamic MCP tool generation from template entity types.
 *
 * Generates query_<entityType> and list_<entityType> tools for each
 * entity type defined in the active template.
 */

import type { EntityTypeConfig } from '../templates/types.js';
import { z } from 'zod';

/**
 * MCP Tool definition structure.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Standard query arguments schema.
 * All query tools share this interface.
 */
export const QueryEntityArgsSchema = z.object({
  id: z.string().describe('Entity ID or name to query'),
  includeContent: z.boolean().optional().default(true).describe('Include content body in response'),
  contentLimit: z.number().min(100).max(5000).optional().default(500).describe('Maximum characters of content to return'),
});

export type QueryEntityArgs = z.infer<typeof QueryEntityArgsSchema>;

/**
 * Standard list arguments schema.
 * All list tools share this interface.
 */
export const ListEntityArgsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20).describe('Maximum number of results to return'),
  status: z.enum(['draft', 'pending', 'canon', 'non-canon', 'archived']).optional().describe('Filter by status'),
  includeContent: z.boolean().optional().default(false).describe('Include content snippets in response'),
  contentLimit: z.number().min(50).max(500).optional().default(200).describe('Maximum characters per content snippet'),
});

export type ListEntityArgs = z.infer<typeof ListEntityArgsSchema>;

/**
 * Generate a query_<entityType> tool definition.
 *
 * @param entityType - Entity type configuration from template
 * @returns Tool definition for MCP registration
 */
export function generateQueryTool(entityType: EntityTypeConfig): ToolDefinition {
  const typeName = entityType.name;
  const displayName = entityType.displayName;

  return {
    name: `query_${typeName}`,
    description: `Retrieve detailed information about a ${displayName.toLowerCase()} by ID or name. Returns properties, content, and relationships.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: `${displayName} ID or name to query`,
        },
        includeContent: {
          type: 'boolean',
          description: 'Include content body in response (default: true)',
          default: true,
        },
        contentLimit: {
          type: 'number',
          description: 'Maximum characters of content to return (default: 500, max: 5000)',
          default: 500,
          minimum: 100,
          maximum: 5000,
        },
      },
      required: ['id'],
    },
  };
}

/**
 * Generate a list_<entityType> tool definition.
 *
 * @param entityType - Entity type configuration from template
 * @returns Tool definition for MCP registration
 */
export function generateListTool(entityType: EntityTypeConfig): ToolDefinition {
  const typeName = entityType.name;
  const pluralName = entityType.pluralName;

  return {
    name: `list_${typeName}`,
    description: `List all ${pluralName.toLowerCase()} in the vault. Supports filtering by status and pagination.`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20, max: 100)',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
        status: {
          type: 'string',
          description: 'Filter by status (draft, pending, canon, non-canon, archived)',
          enum: ['draft', 'pending', 'canon', 'non-canon', 'archived'],
        },
        includeContent: {
          type: 'boolean',
          description: 'Include content snippets in response (default: false)',
          default: false,
        },
        contentLimit: {
          type: 'number',
          description: 'Maximum characters per content snippet (default: 200)',
          default: 200,
          minimum: 50,
          maximum: 500,
        },
      },
      required: [],
    },
  };
}

/**
 * Generate all tools for a set of entity types.
 *
 * @param entityTypes - Array of entity type configurations
 * @returns Array of tool definitions (query + list for each type)
 */
export function generateToolsForEntityTypes(entityTypes: EntityTypeConfig[]): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  for (const entityType of entityTypes) {
    tools.push(generateQueryTool(entityType));
    tools.push(generateListTool(entityType));
  }

  return tools;
}

/**
 * Check if a tool name matches the query_<entityType> pattern.
 *
 * @param toolName - Tool name to check
 * @returns Entity type name if match, null otherwise
 */
export function parseQueryToolName(toolName: string): string | null {
  const match = toolName.match(/^query_(\w+)$/);
  return match ? match[1] : null;
}

/**
 * Check if a tool name matches the list_<entityType> pattern.
 *
 * @param toolName - Tool name to check
 * @returns Entity type name if match, null otherwise
 */
export function parseListToolName(toolName: string): string | null {
  const match = toolName.match(/^list_(\w+)$/);
  return match ? match[1] : null;
}

/**
 * Format an entity with its relationships for response.
 *
 * Generic formatter that works with any entity type.
 * Groups relationships by relationship type (e.g., "Knows", "Member Of").
 *
 * @param entityType - Entity type configuration
 * @param result - Query result with node, relationships, and relatedNodes
 * @param includeContent - Whether to include content body
 * @param contentLimit - Maximum content length
 * @returns Formatted markdown response
 */
export function formatEntityWithRelationships(
  entityType: EntityTypeConfig,
  result: { node: any; relationships?: any[]; relatedNodes: any[] },
  includeContent = true,
  contentLimit = 500
): string {
  const { node, relationships, relatedNodes } = result;
  const props = node.properties;
  const displayName = entityType.displayName;

  let response = `# ${node.title}\n\n`;
  response += `**Type**: ${displayName} | **Status**: ${node.status} | **ID**: \`${node.id}\`\n\n`;

  // Display configured fields from entity type
  const fieldValues: string[] = [];
  for (const field of entityType.fields) {
    const value = props[field.name];
    if (value !== undefined && value !== null && value !== '') {
      // Format field name for display (capitalize first letter)
      const fieldLabel = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/_/g, ' ');
      if (field.type === 'array') {
        if (Array.isArray(value) && value.length > 0) {
          fieldValues.push(`**${fieldLabel}**: ${value.join(', ')}`);
        }
      } else if (field.type === 'record') {
        // Skip complex record types in summary
      } else {
        fieldValues.push(`**${fieldLabel}**: ${value}`);
      }
    }
  }

  if (fieldValues.length > 0) {
    response += fieldValues.slice(0, 5).join(' | ') + '\n\n';
  }

  // Content (if requested)
  if (includeContent && node.content) {
    response += `## Description\n`;
    const content = node.content.trim();
    if (content.length > contentLimit) {
      response += `${content.substring(0, contentLimit)}...\n\n`;
      response += `*[Truncated at ${contentLimit} chars. Full content: ${content.length} chars]*\n\n`;
    } else {
      response += `${content}\n\n`;
    }
  }

  // Relationships (from graph) - group by relationship type
  if (relationships && relationships.length > 0 && relatedNodes.length > 0) {
    response += `## Relationships\n`;

    // Build a map from node ID to node for quick lookup
    const nodeMap = new Map<string, any>();
    nodeMap.set(node.id, node);
    for (const related of relatedNodes) {
      nodeMap.set(related.id, related);
    }

    // Group relationships by relationship type
    const byRelType: Record<string, string[]> = {};
    for (const rel of relationships) {
      const relType = rel.relationType || 'related';
      // Format relationship type for display (snake_case to Title Case)
      const typeLabel = relType
        .split('_')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      if (!byRelType[typeLabel]) {
        byRelType[typeLabel] = [];
      }

      // Determine which node is the "other" node in the relationship
      const otherId = rel.sourceId === node.id ? rel.targetId : rel.sourceId;
      const otherNode = nodeMap.get(otherId);
      if (otherNode) {
        byRelType[typeLabel].push(otherNode.title);
      }
    }

    // Output grouped relationships
    for (const [typeLabel, titles] of Object.entries(byRelType)) {
      // Deduplicate titles
      const uniqueTitles = [...new Set(titles)];
      response += `**${typeLabel}**: ${uniqueTitles.join(', ')}\n`;
    }
    response += `\n`;
  } else if (relatedNodes.length > 0) {
    // Fallback: group by entity type if no relationship data available
    response += `## Relationships\n`;

    const byType: Record<string, any[]> = {};
    for (const related of relatedNodes) {
      const type = related.type || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(related);
    }

    for (const [type, nodes] of Object.entries(byType)) {
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + 's';
      response += `**${typeLabel}**: ${nodes.map((n: any) => n.title).join(', ')}\n`;
    }
    response += `\n`;
  }

  response += `---\n*Source: ${node.filePath}*\n`;
  response += `*Last updated: ${new Date(node.updated).toLocaleString()}*`;

  return response;
}

/**
 * Format a list of entities for response.
 *
 * @param entityType - Entity type configuration
 * @param nodes - Array of nodes to format
 * @param includeContent - Whether to include content snippets
 * @param contentLimit - Maximum content length per snippet
 * @returns Formatted markdown response
 */
export function formatEntityList(
  entityType: EntityTypeConfig,
  nodes: any[],
  includeContent = false,
  contentLimit = 200
): string {
  const pluralName = entityType.pluralName;

  let response = `# ${pluralName}\n\n`;
  response += `Found ${nodes.length} ${pluralName.toLowerCase()}:\n\n`;

  for (const node of nodes) {
    response += `## ${node.title}\n`;
    response += `- **ID**: \`${node.id}\`\n`;
    response += `- **Status**: ${node.status}\n`;
    response += `- **Path**: ${node.filePath}\n`;

    if (includeContent && node.content) {
      const content = node.content.trim();
      if (content.length > contentLimit) {
        response += `- **Snippet**: ${content.substring(0, contentLimit)}...\n`;
      } else {
        response += `- **Snippet**: ${content}\n`;
      }
    }

    response += `\n`;
  }

  return response;
}

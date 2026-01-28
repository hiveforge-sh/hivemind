/**
 * Graph MCP tools - relationship traversal and path finding.
 *
 * Provides graph traversal tools for querying entity relationships,
 * finding shortest paths, and discovering available relationship types.
 */

import { z } from 'zod';
import { templateRegistry } from '../templates/registry.js';
import type { ToolDefinition } from './tool-generator.js';

/**
 * Validation schema for query_graph_neighbors arguments.
 *
 * Finds immediate neighbors (1-hop connections) of an entity.
 */
export const QueryGraphNeighborsArgsSchema = z.object({
  entityId: z
    .string()
    .describe('Entity identifier (ID, name, or Type:name format)'),
  direction: z
    .enum(['outgoing', 'incoming', 'both'])
    .optional()
    .default('both')
    .describe('Traversal direction (default: both)'),
  includeRelationships: z
    .array(z.string())
    .optional()
    .describe('Only include these relationship types'),
  excludeRelationships: z
    .array(z.string())
    .optional()
    .describe('Exclude these relationship types'),
  includeEntityTypes: z
    .array(z.string())
    .optional()
    .describe('Only return neighbors of these entity types'),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .describe('Maximum neighbors to return'),
});

export type QueryGraphNeighborsArgs = z.infer<typeof QueryGraphNeighborsArgsSchema>;

/**
 * Validation schema for query_graph_subgraph arguments.
 *
 * Finds entities within N hops of a starting entity.
 */
export const QueryGraphSubgraphArgsSchema = z.object({
  entityId: z
    .string()
    .describe('Starting entity identifier'),
  depth: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .default(2)
    .describe('Number of hops to traverse (max: 5)'),
  direction: z
    .enum(['outgoing', 'incoming', 'both'])
    .optional()
    .default('both')
    .describe('Traversal direction (default: both)'),
  includeRelationships: z
    .array(z.string())
    .optional()
    .describe('Only include these relationship types'),
  excludeRelationships: z
    .array(z.string())
    .optional()
    .describe('Exclude these relationship types'),
  includeEntityTypes: z
    .array(z.string())
    .optional()
    .describe('Only return entities of these types'),
  includeIntermediateNodes: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include nodes at intermediate depths'),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .default(100)
    .describe('Maximum entities to return'),
});

export type QueryGraphSubgraphArgs = z.infer<typeof QueryGraphSubgraphArgsSchema>;

/**
 * Validation schema for query_graph_path arguments.
 *
 * Finds the shortest path between two entities.
 */
export const QueryGraphPathArgsSchema = z.object({
  fromEntityId: z
    .string()
    .describe('Starting entity identifier'),
  toEntityId: z
    .string()
    .describe('Target entity identifier'),
  includeRelationships: z
    .array(z.string())
    .optional()
    .describe('Only traverse these relationship types'),
  maxDepth: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(6)
    .describe('Maximum path length to search'),
});

export type QueryGraphPathArgs = z.infer<typeof QueryGraphPathArgsSchema>;

/**
 * Validation schema for list_relationship_types arguments.
 *
 * Lists all relationship types available in the vault.
 */
export const ListRelationshipTypesArgsSchema = z.object({
  // No required parameters
});

export type ListRelationshipTypesArgs = z.infer<typeof ListRelationshipTypesArgsSchema>;

/**
 * Generates MCP tool definitions for graph queries.
 *
 * Creates four tools: query_graph_neighbors, query_graph_subgraph,
 * query_graph_path, and list_relationship_types.
 *
 * Tool descriptions dynamically include available relationship types
 * when an active template is present.
 *
 * @returns Array of tool definitions for MCP registration
 */
export function generateGraphTools(): ToolDefinition[] {
  // Get available relationship types for tool descriptions
  let relationshipTypesDescription = '';
  try {
    const relTypes = templateRegistry.getRelationshipTypes();
    if (relTypes.length > 0) {
      relationshipTypesDescription =
        '\n\nAvailable relationship types: ' +
        relTypes.map((r) => r.id).join(', ');
    }
  } catch {
    // No active template - tools still available but without relationship type hints
  }

  return [
    {
      name: 'query_graph_neighbors',
      description: `Get immediate neighbors (1-hop connections) of an entity. Returns neighbor entities with their relationship types and directions.${relationshipTypesDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          entityId: {
            type: 'string',
            description:
              'Entity identifier (ID, name, or Type:name format like "Character:john")',
          },
          direction: {
            type: 'string',
            enum: ['outgoing', 'incoming', 'both'],
            default: 'both',
            description: 'Traversal direction (default: both)',
          },
          includeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only include these relationship types',
          },
          excludeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exclude these relationship types',
          },
          includeEntityTypes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only return neighbors of these entity types',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Maximum neighbors to return',
          },
        },
        required: ['entityId'],
      },
    },
    {
      name: 'query_graph_subgraph',
      description: `Get entities within N hops of a starting entity. Useful for exploring the neighborhood around an entity.${relationshipTypesDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          entityId: {
            type: 'string',
            description: 'Starting entity identifier',
          },
          depth: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            default: 2,
            description: 'Number of hops to traverse (1-5, default: 2)',
          },
          direction: {
            type: 'string',
            enum: ['outgoing', 'incoming', 'both'],
            default: 'both',
            description: 'Traversal direction (default: both)',
          },
          includeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only include these relationship types',
          },
          excludeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exclude these relationship types',
          },
          includeEntityTypes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only return entities of these types',
          },
          includeIntermediateNodes: {
            type: 'boolean',
            default: false,
            description:
              'Include nodes at intermediate depths (default: only final depth)',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 200,
            default: 100,
            description: 'Maximum entities to return',
          },
        },
        required: ['entityId'],
      },
    },
    {
      name: 'query_graph_path',
      description: `Find shortest path between two entities. Returns both the node sequence and edge list.${relationshipTypesDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          fromEntityId: {
            type: 'string',
            description: 'Starting entity identifier',
          },
          toEntityId: {
            type: 'string',
            description: 'Target entity identifier',
          },
          includeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only traverse these relationship types',
          },
          maxDepth: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            default: 6,
            description: 'Maximum path length to search',
          },
        },
        required: ['fromEntityId', 'toEntityId'],
      },
    },
    {
      name: 'list_relationship_types',
      description:
        'List all relationship types available in the vault. Use this to discover valid filter values for graph queries.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}

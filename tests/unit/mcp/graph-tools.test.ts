/**
 * Unit tests for graph MCP tools.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  generateGraphTools,
  QueryGraphNeighborsArgsSchema,
  QueryGraphSubgraphArgsSchema,
  QueryGraphPathArgsSchema,
  ListRelationshipTypesArgsSchema,
} from '../../../src/mcp/graph-tools.js';
import { templateRegistry } from '../../../src/templates/registry.js';
import { initializeTemplates } from '../../../src/templates/loader.js';

describe('Graph Tools', () => {
  describe('generateGraphTools', () => {
    let originalActive: ReturnType<typeof templateRegistry.getActive>;

    beforeAll(() => {
      // Save original state
      originalActive = templateRegistry.getActive();
      // Initialize templates and activate worldbuilding template
      templateRegistry.clear();
      initializeTemplates();
      templateRegistry.activate('worldbuilding');
    });

    afterAll(() => {
      // Restore original state
      templateRegistry.clear();
      if (originalActive) {
        initializeTemplates();
        templateRegistry.activate(originalActive.id);
      }
    });

    it('should return 4 tool definitions', () => {
      const tools = generateGraphTools();
      expect(tools).toHaveLength(4);
    });

    it('should include query_graph_neighbors tool', () => {
      const tools = generateGraphTools();
      const neighborsTool = tools.find((t) => t.name === 'query_graph_neighbors');

      expect(neighborsTool).toBeDefined();
      expect(neighborsTool?.description).toContain('immediate neighbors');
      expect(neighborsTool?.description).toContain('1-hop connections');
      expect(neighborsTool?.inputSchema.required).toContain('entityId');
      expect(neighborsTool?.inputSchema.properties.entityId).toBeDefined();
      expect(neighborsTool?.inputSchema.properties.direction).toBeDefined();
      expect(neighborsTool?.inputSchema.properties.limit).toBeDefined();
    });

    it('should include query_graph_subgraph tool', () => {
      const tools = generateGraphTools();
      const subgraphTool = tools.find((t) => t.name === 'query_graph_subgraph');

      expect(subgraphTool).toBeDefined();
      expect(subgraphTool?.description).toContain('within N hops');
      expect(subgraphTool?.inputSchema.required).toContain('entityId');
      expect(subgraphTool?.inputSchema.properties.entityId).toBeDefined();
      expect(subgraphTool?.inputSchema.properties.depth).toBeDefined();
      expect(subgraphTool?.inputSchema.properties.includeIntermediateNodes).toBeDefined();
    });

    it('should include query_graph_path tool', () => {
      const tools = generateGraphTools();
      const pathTool = tools.find((t) => t.name === 'query_graph_path');

      expect(pathTool).toBeDefined();
      expect(pathTool?.description).toContain('shortest path');
      expect(pathTool?.description).toContain('two entities');
      expect(pathTool?.inputSchema.required).toContain('fromEntityId');
      expect(pathTool?.inputSchema.required).toContain('toEntityId');
      expect(pathTool?.inputSchema.properties.fromEntityId).toBeDefined();
      expect(pathTool?.inputSchema.properties.toEntityId).toBeDefined();
      expect(pathTool?.inputSchema.properties.maxDepth).toBeDefined();
    });

    it('should include list_relationship_types tool', () => {
      const tools = generateGraphTools();
      const listTool = tools.find((t) => t.name === 'list_relationship_types');

      expect(listTool).toBeDefined();
      expect(listTool?.description).toContain('relationship types');
      expect(listTool?.description).toContain('available in the vault');
      expect(listTool?.inputSchema.required).toHaveLength(0);
    });

    it('should include relationship types in descriptions when template active', () => {
      const tools = generateGraphTools();
      const neighborsTool = tools.find((t) => t.name === 'query_graph_neighbors');

      expect(neighborsTool?.description).toContain('Available relationship types:');
      // Default template has relationship types
      expect(neighborsTool?.description).toMatch(/knows|member_of|manages|located_in/);
    });

    it('should work without active template', () => {
      // Temporarily clear active template
      const originalActive = templateRegistry.getActive();
      (templateRegistry as any).activeTemplateId = null;

      const tools = generateGraphTools();
      expect(tools).toHaveLength(4);

      const neighborsTool = tools.find((t) => t.name === 'query_graph_neighbors');
      expect(neighborsTool).toBeDefined();
      // Should not include relationship types in description
      expect(neighborsTool?.description).not.toContain('Available relationship types:');

      // Restore
      if (originalActive) {
        templateRegistry.activate(originalActive.id);
      }
    });
  });

  describe('QueryGraphNeighborsArgsSchema', () => {
    it('should validate valid arguments', () => {
      const validArgs = {
        entityId: 'Character:john',
        direction: 'both' as const,
        limit: 50,
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entityId).toBe('Character:john');
        expect(result.data.direction).toBe('both');
        expect(result.data.limit).toBe(50);
      }
    });

    it('should apply default values', () => {
      const minimalArgs = {
        entityId: 'char-123',
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(minimalArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.direction).toBe('both');
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject missing required entityId', () => {
      const invalidArgs = {
        direction: 'outgoing',
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject invalid direction enum', () => {
      const invalidArgs = {
        entityId: 'char-123',
        direction: 'sideways',
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject out-of-range limit', () => {
      const invalidArgs = {
        entityId: 'char-123',
        limit: 500,
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should validate relationship filters', () => {
      const validArgs = {
        entityId: 'char-123',
        includeRelationships: ['knows', 'member_of'],
        excludeRelationships: ['manages'],
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeRelationships).toEqual(['knows', 'member_of']);
        expect(result.data.excludeRelationships).toEqual(['manages']);
      }
    });

    it('should validate entity type filters', () => {
      const validArgs = {
        entityId: 'char-123',
        includeEntityTypes: ['Character', 'Organization'],
      };

      const result = QueryGraphNeighborsArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeEntityTypes).toEqual(['Character', 'Organization']);
      }
    });
  });

  describe('QueryGraphSubgraphArgsSchema', () => {
    it('should validate valid arguments', () => {
      const validArgs = {
        entityId: 'char-123',
        depth: 3,
        includeIntermediateNodes: true,
        limit: 100,
      };

      const result = QueryGraphSubgraphArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depth).toBe(3);
        expect(result.data.includeIntermediateNodes).toBe(true);
        expect(result.data.limit).toBe(100);
      }
    });

    it('should apply default values', () => {
      const minimalArgs = {
        entityId: 'char-123',
      };

      const result = QueryGraphSubgraphArgsSchema.safeParse(minimalArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depth).toBe(2);
        expect(result.data.direction).toBe('both');
        expect(result.data.includeIntermediateNodes).toBe(false);
        expect(result.data.limit).toBe(100);
      }
    });

    it('should reject depth above max', () => {
      const invalidArgs = {
        entityId: 'char-123',
        depth: 10,
      };

      const result = QueryGraphSubgraphArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject depth below min', () => {
      const invalidArgs = {
        entityId: 'char-123',
        depth: 0,
      };

      const result = QueryGraphSubgraphArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject limit above max', () => {
      const invalidArgs = {
        entityId: 'char-123',
        limit: 300,
      };

      const result = QueryGraphSubgraphArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });
  });

  describe('QueryGraphPathArgsSchema', () => {
    it('should validate valid arguments', () => {
      const validArgs = {
        fromEntityId: 'char-john',
        toEntityId: 'char-jane',
        includeRelationships: ['knows', 'friend_of'],
        maxDepth: 8,
      };

      const result = QueryGraphPathArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fromEntityId).toBe('char-john');
        expect(result.data.toEntityId).toBe('char-jane');
        expect(result.data.includeRelationships).toEqual(['knows', 'friend_of']);
        expect(result.data.maxDepth).toBe(8);
      }
    });

    it('should apply default maxDepth', () => {
      const minimalArgs = {
        fromEntityId: 'char-john',
        toEntityId: 'char-jane',
      };

      const result = QueryGraphPathArgsSchema.safeParse(minimalArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxDepth).toBe(6);
      }
    });

    it('should reject missing required fields', () => {
      const invalidArgs = {
        fromEntityId: 'char-john',
      };

      const result = QueryGraphPathArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject maxDepth above max', () => {
      const invalidArgs = {
        fromEntityId: 'char-john',
        toEntityId: 'char-jane',
        maxDepth: 15,
      };

      const result = QueryGraphPathArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });

    it('should reject maxDepth below min', () => {
      const invalidArgs = {
        fromEntityId: 'char-john',
        toEntityId: 'char-jane',
        maxDepth: 0,
      };

      const result = QueryGraphPathArgsSchema.safeParse(invalidArgs);
      expect(result.success).toBe(false);
    });
  });

  describe('ListRelationshipTypesArgsSchema', () => {
    it('should validate empty object', () => {
      const validArgs = {};

      const result = ListRelationshipTypesArgsSchema.safeParse(validArgs);
      expect(result.success).toBe(true);
    });

    it('should accept any additional properties', () => {
      const argsWithExtras = {
        someExtraField: 'ignored',
      };

      const result = ListRelationshipTypesArgsSchema.safeParse(argsWithExtras);
      expect(result.success).toBe(true);
    });
  });
});

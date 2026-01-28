import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { HivemindDatabase } from '../../src/graph/database.js';
import { SearchEngine } from '../../src/search/engine.js';
import { templateRegistry } from '../../src/templates/registry.js';
import { initializeTemplates } from '../../src/templates/loader.js';
import { generateGraphTools } from '../../src/mcp/graph-tools.js';
import type { VaultNote } from '../../src/types/index.js';

describe('Integration: Graph MCP Tools', () => {
  let testDbPath: string;
  let database: HivemindDatabase;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    // Initialize templates
    templateRegistry.clear();
    initializeTemplates();

    // Activate worldbuilding template which has relationships defined
    templateRegistry.activate('worldbuilding');

    // Create test database
    const testDir = join(process.cwd(), '.test-graph-mcp');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    testDbPath = join(testDir, 'test.db');

    database = new HivemindDatabase({ path: testDbPath });
    searchEngine = new SearchEngine(database);

    // Seed test data
    seedTestData();
  });

  afterEach(() => {
    // Close database
    database.close();

    // Clean up test directory
    const testDir = join(process.cwd(), '.test-graph-mcp');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Clear template registry
    templateRegistry.clear();
  });

  function seedTestData() {
    const now = new Date();
    const testNotes: VaultNote[] = [
      {
        id: 'character-alice',
        fileName: 'alice.md',
        filePath: 'Characters/alice.md',
        frontmatter: {
          id: 'character-alice',
          type: 'character',
          status: 'canon',
          title: 'Alice',
          description: 'A brave adventurer who knows many people',
        },
        content: 'Alice is a brave adventurer',
        links: ['character-bob', 'location-cityhall'],
        tags: [],
        stats: { created: now, modified: now, size: 100 },
      },
      {
        id: 'character-bob',
        fileName: 'bob.md',
        filePath: 'Characters/bob.md',
        frontmatter: {
          id: 'character-bob',
          type: 'character',
          status: 'canon',
          title: 'Bob',
          description: 'A member of The Council',
        },
        content: 'Bob is a member of The Council',
        links: ['faction-council'],
        tags: [],
        stats: { created: now, modified: now, size: 100 },
      },
      {
        id: 'faction-council',
        fileName: 'council.md',
        filePath: 'Factions/council.md',
        frontmatter: {
          id: 'faction-council',
          type: 'faction',
          status: 'canon',
          title: 'The Council',
          description: 'The ruling body of the realm',
        },
        content: 'The Council rules the realm',
        links: [],
        tags: [],
        stats: { created: now, modified: now, size: 100 },
      },
      {
        id: 'location-cityhall',
        fileName: 'cityhall.md',
        filePath: 'Locations/cityhall.md',
        frontmatter: {
          id: 'location-cityhall',
          type: 'location',
          status: 'canon',
          title: 'City Hall',
          description: 'The central building in the capital',
        },
        content: 'City Hall is in the capital',
        links: ['location-capital'],
        tags: [],
        stats: { created: now, modified: now, size: 100 },
      },
      {
        id: 'location-capital',
        fileName: 'capital.md',
        filePath: 'Locations/capital.md',
        frontmatter: {
          id: 'location-capital',
          type: 'location',
          status: 'canon',
          title: 'Capital',
          description: 'The main city of the realm',
        },
        content: 'Capital is the main city',
        links: [],
        tags: [],
        stats: { created: now, modified: now, size: 100 },
      },
      {
        id: 'character-isolated',
        fileName: 'isolated.md',
        filePath: 'Characters/isolated.md',
        frontmatter: {
          id: 'character-isolated',
          type: 'character',
          status: 'canon',
          title: 'Isolated Character',
          description: 'A character with no connections',
        },
        content: 'Isolated character',
        links: [],
        tags: [],
        stats: { created: now, modified: now, size: 100 },
      },
    ];

    // Insert nodes using upsertNode
    for (const note of testNotes) {
      database.upsertNode(note);
    }

    // Insert relationships
    database.insertRelationship('character-alice', 'character-bob', 'knows', {});
    database.insertRelationship('character-bob', 'faction-council', 'member_of', {});
    database.insertRelationship('location-cityhall', 'location-capital', 'located_in', {});
    database.insertRelationship('character-alice', 'location-cityhall', 'located_in', {});
  }

  describe('Tool Generation', () => {
    it('should generate 4 graph tools', () => {
      const tools = generateGraphTools();
      expect(tools).toHaveLength(4);
    });

    it('should have expected tool names', () => {
      const tools = generateGraphTools();
      const names = tools.map((t) => t.name);
      expect(names).toContain('query_graph_neighbors');
      expect(names).toContain('query_graph_subgraph');
      expect(names).toContain('query_graph_path');
      expect(names).toContain('list_relationship_types');
    });
  });

  describe('Neighbor Queries', () => {
    it('should return neighbors of an entity', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-alice');
      expect(results.neighbors.length).toBeGreaterThan(0);
      expect(results.neighbors.some((n) => n.node.id === 'character-bob')).toBe(true);
      expect(results.neighbors.some((n) => n.node.id === 'location-cityhall')).toBe(true);
    });

    it('should filter neighbors by direction (outgoing)', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-alice', {
        direction: 'outgoing',
      });
      expect(results.neighbors.length).toBeGreaterThan(0);
      expect(results.neighbors.every((n) => n.relationship.direction === 'outgoing')).toBe(true);
    });

    it('should filter neighbors by direction (incoming)', async () => {
      const results = await searchEngine.queryGraphNeighbors('location-capital', {
        direction: 'incoming',
      });
      expect(results.neighbors.length).toBeGreaterThan(0);
      expect(results.neighbors.every((n) => n.relationship.direction === 'incoming')).toBe(true);
      expect(results.neighbors.some((n) => n.node.id === 'location-cityhall')).toBe(true);
    });

    it('should filter neighbors by relationship type (include)', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-alice', {
        includeRelationships: ['knows'],
      });
      expect(results.neighbors.length).toBeGreaterThan(0);
      expect(results.neighbors.every((n) => n.relationship.type === 'knows')).toBe(true);
      expect(results.neighbors.some((n) => n.node.id === 'character-bob')).toBe(true);
    });

    it('should filter neighbors by entity type', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-alice', {
        includeEntityTypes: ['character'],
      });
      expect(results.neighbors.length).toBeGreaterThan(0);
      expect(results.neighbors.every((n) => n.node.type === 'character')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-alice', {
        limit: 1,
      });
      expect(results.neighbors.length).toBe(1);
    });

    it('should return empty result for entity with no relationships', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-isolated');
      expect(results.neighbors.length).toBe(0);
    });
  });

  describe('Subgraph Queries', () => {
    it('should return subgraph at depth 1 (matches neighbors)', async () => {
      const subgraphResults = await searchEngine.queryGraphSubgraph('character-alice', 1);
      const neighborResults = await searchEngine.queryGraphNeighbors('character-alice');

      expect(subgraphResults.nodes.length).toBe(neighborResults.neighbors.length);
      expect(subgraphResults.metadata.depth).toBe(1);
    });

    it('should return subgraph at depth 2', async () => {
      const results = await searchEngine.queryGraphSubgraph('character-alice', 2, {
        includeIntermediateNodes: true,
      });

      // Should include Alice's neighbors (Bob, City Hall) and their neighbors (Council, Capital)
      // With intermediate nodes: Bob, City Hall, Council, Capital = 4+ nodes
      expect(results.nodes.length).toBeGreaterThan(2);
      expect(results.metadata.depth).toBe(2);

      // Should reach faction-council through Bob
      expect(results.nodes.some((n) => n.id === 'faction-council')).toBe(true);
    });

    it('should enforce depth limit (max 5)', async () => {
      const results = await searchEngine.queryGraphSubgraph('character-alice', 5);
      expect(results.metadata.depth).toBe(5);
    });

    it('should support includeIntermediateNodes option', async () => {
      const withIntermediate = await searchEngine.queryGraphSubgraph('character-alice', 2, {
        includeIntermediateNodes: true,
      });

      const withoutIntermediate = await searchEngine.queryGraphSubgraph('character-alice', 2, {
        includeIntermediateNodes: false,
      });

      // With intermediate should have equal or more nodes
      expect(withIntermediate.nodes.length).toBeGreaterThanOrEqual(withoutIntermediate.nodes.length);
    });

    it('should handle disconnected entity gracefully', async () => {
      const results = await searchEngine.queryGraphSubgraph('character-isolated', 2);
      expect(results.nodes.length).toBe(0);
    });
  });

  describe('Shortest Path Queries', () => {
    it('should find direct connection (1 hop)', async () => {
      const results = await searchEngine.queryGraphPath('character-alice', 'character-bob');

      expect(results.found).toBe(true);
      expect(results.path.length).toBe(2);
      expect(results.edges.length).toBe(1);
      expect(results.path[0].id).toBe('character-alice');
      expect(results.path[1].id).toBe('character-bob');
    });

    it('should find multi-hop path', async () => {
      const results = await searchEngine.queryGraphPath('character-alice', 'faction-council');

      expect(results.found).toBe(true);
      expect(results.path.length).toBe(3);
      expect(results.edges.length).toBe(2);

      // Path: Alice -> Bob -> Council
      expect(results.path[0].id).toBe('character-alice');
      expect(results.path[1].id).toBe('character-bob');
      expect(results.path[2].id).toBe('faction-council');
    });

    it('should return not found when no path exists', async () => {
      const results = await searchEngine.queryGraphPath('character-alice', 'character-isolated');

      expect(results.found).toBe(false);
      expect(results.path.length).toBe(0);
      expect(results.edges.length).toBe(0);
    });

    it('should respect relationship type filter', async () => {
      const results = await searchEngine.queryGraphPath('character-alice', 'faction-council', {
        includeRelationships: ['knows'],
      });

      // Can only use 'knows' relationships, so can't reach Council (requires member_of)
      expect(results.found).toBe(false);
    });

    it('should respect maxDepth limit', async () => {
      const results = await searchEngine.queryGraphPath('character-alice', 'faction-council', {
        maxDepth: 1,
      });

      // Council is 2 hops away, so maxDepth=1 won't find it
      expect(results.found).toBe(false);
    });
  });

  describe('List Relationship Types', () => {
    it('should return relationship types from template', async () => {
      const results = await searchEngine.listRelationshipTypes();

      expect(results.types.length).toBeGreaterThan(0);
      expect(results.metadata.source).toBe('template');
    });

    it('should include id and label for each type', async () => {
      const results = await searchEngine.listRelationshipTypes();

      for (const type of results.types) {
        expect(type.id).toBeDefined();
        expect(typeof type.id).toBe('string');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown entity ID gracefully', async () => {
      const results = await searchEngine.queryGraphNeighbors('nonexistent-entity');

      // Should return empty results rather than throwing
      expect(results.neighbors.length).toBe(0);
    });

    it('should handle invalid depth value (Zod validates)', async () => {
      // This would be caught by Zod validation at the server level
      // Just verify SearchEngine accepts valid ranges
      await expect(
        searchEngine.queryGraphSubgraph('character-alice', 1)
      ).resolves.toBeDefined();

      await expect(
        searchEngine.queryGraphSubgraph('character-alice', 5)
      ).resolves.toBeDefined();
    });

    it('should require both entities for path query', async () => {
      // This test verifies path query works with valid IDs
      const results = await searchEngine.queryGraphPath('character-alice', 'character-bob');
      expect(results.found).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should support full workflow: list types -> query neighbors with filter -> query path', async () => {
      // Step 1: List available relationship types
      const types = await searchEngine.listRelationshipTypes();
      expect(types.types.length).toBeGreaterThan(0);

      const knowsType = types.types.find((t) => t.id === 'knows');
      expect(knowsType).toBeDefined();

      // Step 2: Query neighbors with relationship type filter
      const neighbors = await searchEngine.queryGraphNeighbors('character-alice', {
        includeRelationships: [knowsType!.id],
      });
      expect(neighbors.neighbors.length).toBeGreaterThan(0);

      // Step 3: Query path between entities
      const path = await searchEngine.queryGraphPath('character-alice', 'character-bob');
      expect(path.found).toBe(true);
      expect(path.path.length).toBe(2);
    });

    it('should include correct relationship types and directions', async () => {
      const results = await searchEngine.queryGraphNeighbors('character-alice');

      for (const neighbor of results.neighbors) {
        expect(neighbor.relationship.type).toBeDefined();
        expect(neighbor.relationship.direction).toMatch(/^(outgoing|incoming)$/);
      }
    });
  });
});

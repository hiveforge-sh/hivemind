import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchEngine } from '../../src/search/engine.js';
import { HivemindDatabase } from '../../src/graph/database.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

describe('SearchEngine', () => {
  let db: HivemindDatabase;
  let searchEngine: SearchEngine;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-test-'));
    db = new HivemindDatabase({ path: join(tempDir, 'test.db') });
    searchEngine = new SearchEngine(db);

    const now = new Date();

    // Insert test data with proper VaultNote structure
    db.upsertNode({
      id: 'char-1',
      filePath: '/vault/characters/alice.md',
      fileName: 'alice.md',
      frontmatter: {
        id: 'char-1',
        type: 'character',
        status: 'canon',
        title: 'Alice the Brave',
        tags: [],
        aliases: []
      },
      content: 'Alice is a brave warrior who fights with honor.',
      links: [],
      headings: [],
      stats: {
        size: 1000,
        created: now,
        modified: now
      }
    });

    db.upsertNode({
      id: 'char-2',
      filePath: '/vault/characters/bob.md',
      fileName: 'bob.md',
      frontmatter: {
        id: 'char-2',
        type: 'character',
        status: 'canon',
        title: 'Bob the Wizard',
        tags: [],
        aliases: []
      },
      content: 'Bob is a powerful wizard skilled in fire magic.',
      links: [],
      headings: [],
      stats: {
        size: 1000,
        created: now,
        modified: now
      }
    });

    db.upsertNode({
      id: 'loc-1',
      filePath: '/vault/locations/library.md',
      fileName: 'library.md',
      frontmatter: {
        id: 'loc-1',
        type: 'location',
        status: 'canon',
        title: 'The Great Library',
        tags: [],
        aliases: []
      },
      content: 'A massive library containing ancient knowledge.',
      links: [],
      headings: [],
      stats: {
        size: 1000,
        created: now,
        modified: now
      }
    });

    db.upsertNode({
      id: 'char-3',
      filePath: '/vault/characters/carol.md',
      fileName: 'carol.md',
      frontmatter: {
        id: 'char-3',
        type: 'character',
        status: 'draft',
        title: 'Carol the Thief',
        tags: [],
        aliases: []
      },
      content: 'Carol is a sneaky thief with quick reflexes.',
      links: [],
      headings: [],
      stats: {
        size: 1000,
        created: now,
        modified: now
      }
    });

    // Add relationships
    db.insertRelationship('char-1', 'char-2', 'ally');
    db.insertRelationship('char-2', 'loc-1', 'visits');
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('search', () => {
    it('should search and return matching nodes', async () => {
      const result = await searchEngine.search('wizard');

      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.nodes.some(n => n.id === 'char-2')).toBe(true);
      expect(result.metadata.source).toBe('fts');
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should filter by type', async () => {
      const result = await searchEngine.search('Great', {
        filters: { type: ['location'] }
      });

      expect(result.nodes.every(n => n.type === 'location')).toBe(true);
      expect(result.nodes.some(n => n.id === 'loc-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await searchEngine.search('character', {
        filters: { status: ['canon'] }
      });

      expect(result.nodes.every(n => n.status === 'canon')).toBe(true);
      expect(result.nodes.some(n => n.id === 'char-3')).toBe(false);
    });

    it('should respect limit', async () => {
      const result = await searchEngine.search('the', {
        limit: 2
      });

      expect(result.nodes.length).toBeLessThanOrEqual(2);
    });

    it('should include relationships when requested', async () => {
      const result = await searchEngine.search('Alice', {
        includeRelationships: true
      });

      expect(result.relationships).toBeDefined();
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    it('should not include relationships by default', async () => {
      const result = await searchEngine.search('Alice');

      expect(result.relationships).toBeUndefined();
    });

    it('should return all nodes when query is empty', async () => {
      const result = await searchEngine.search('');

      expect(result.nodes.length).toBe(4);
      expect(result.metadata.source).toBe('graph');
      expect(result.metadata.totalResults).toBe(4);
    });

    it('should return nodes by single type filter with empty query', async () => {
      const result = await searchEngine.search('', {
        filters: { type: ['character'] }
      });

      expect(result.nodes.every(n => n.type === 'character')).toBe(true);
      expect(result.nodes.length).toBe(3);
    });

    it('should return nodes by multiple type filters with empty query', async () => {
      const result = await searchEngine.search('', {
        filters: { type: ['character', 'location'] }
      });

      expect(result.nodes.length).toBe(4);
    });

    it('should filter by status with empty query', async () => {
      const result = await searchEngine.search('', {
        filters: { status: ['draft'] }
      });

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].id).toBe('char-3');
    });

    it('should apply both type and status filters with empty query', async () => {
      const result = await searchEngine.search('  ', {
        filters: { type: ['character'], status: ['canon'] }
      });

      expect(result.nodes.length).toBe(2);
      expect(result.nodes.every(n => n.type === 'character' && n.status === 'canon')).toBe(true);
    });

    it('should respect limit with empty query', async () => {
      const result = await searchEngine.search('', { limit: 2 });

      expect(result.nodes.length).toBe(2);
      expect(result.metadata.totalResults).toBe(4);
    });

    it('should filter by status on FTS search results', async () => {
      const result = await searchEngine.search('character', {
        filters: { status: ['draft'] }
      });

      expect(result.nodes.every(n => n.status === 'draft')).toBe(true);
    });

    it('should filter relationships by type in search', async () => {
      const result = await searchEngine.search('Alice', {
        includeRelationships: true,
        relationshipType: 'ally'
      });

      expect(result.relationships).toBeDefined();
      expect(result.relationships!.every(r => r.relationType === 'ally')).toBe(true);
    });

    it('should return empty relationships when relationshipType matches nothing', async () => {
      const result = await searchEngine.search('Alice', {
        includeRelationships: true,
        relationshipType: 'enemy'
      });

      expect(result.relationships).toBeDefined();
      expect(result.relationships!.length).toBe(0);
    });
  });

  describe('getNodeWithRelationships', () => {
    it('should return node with its relationships', async () => {
      const result = await searchEngine.getNodeWithRelationships('char-1');

      expect(result).toBeDefined();
      expect(result!.node.id).toBe('char-1');
      expect(result!.relationships.length).toBeGreaterThan(0);
      expect(result!.relatedNodes.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent node', async () => {
      const result = await searchEngine.getNodeWithRelationships('non-existent');

      expect(result).toBeNull();
    });

    it('should include both source and target relationships', async () => {
      const result = await searchEngine.getNodeWithRelationships('char-2');

      expect(result).toBeDefined();
      expect(result!.relationships.length).toBe(2); // One incoming, one outgoing
    });

    it('should filter relationships by type', async () => {
      const result = await searchEngine.getNodeWithRelationships('char-2', {
        relationshipType: 'ally'
      });

      expect(result).toBeDefined();
      expect(result!.relationships.every(r => r.relationType === 'ally')).toBe(true);
      expect(result!.relationships.length).toBe(1);
      // Related nodes should only include those from filtered relationships
      expect(result!.relatedNodes.length).toBe(1);
      expect(result!.relatedNodes[0].id).toBe('char-1');
    });

    it('should return unique related nodes', async () => {
      const result = await searchEngine.getNodeWithRelationships('char-2');

      const uniqueIds = new Set(result!.relatedNodes.map(n => n.id));
      expect(uniqueIds.size).toBe(result!.relatedNodes.length);
    });
  });

  describe('getNodesByType', () => {
    it('should return all nodes of a given type', async () => {
      const characters = await searchEngine.getNodesByType('character');

      expect(characters.length).toBe(3);
      expect(characters.every(n => n.type === 'character')).toBe(true);
    });

    it('should return empty array for non-existent type', async () => {
      const results = await searchEngine.getNodesByType('non-existent');

      expect(results).toEqual([]);
    });

    it('should return single node for location type', async () => {
      const locations = await searchEngine.getNodesByType('location');

      expect(locations.length).toBe(1);
      expect(locations[0].id).toBe('loc-1');
    });
  });

  describe('getStats', () => {
    it('should return database statistics', () => {
      const stats = searchEngine.getStats();

      expect(stats).toBeDefined();
      expect(stats.nodes).toBe(4);
      expect(stats.relationships).toBe(2);
      expect(stats.byType.character).toBe(3);
      expect(stats.byType.location).toBe(1);
    });
  });
});

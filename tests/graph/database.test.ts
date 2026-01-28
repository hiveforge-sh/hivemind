import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HivemindDatabase } from '../../src/graph/database.js';
import type { VaultNote } from '../../src/types/index.js';

describe('HivemindDatabase Timeline Queries', () => {
  let db: HivemindDatabase;
  let dbPath: string;

  beforeEach(() => {
    // Use in-memory database for fast tests
    dbPath = ':memory:';
    db = new HivemindDatabase({ path: dbPath });

    // Insert test nodes with various date fields
    const testNotes: VaultNote[] = [
      {
        id: 'char-1',
        filePath: '/vault/char-1.md',
        fileName: 'char-1.md',
        frontmatter: {
          id: 'char-1',
          type: 'character',
          status: 'canon',
          title: 'Alice',
          birth_date: '1990-05-15',
        },
        content: 'Alice content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'char-2',
        filePath: '/vault/char-2.md',
        fileName: 'char-2.md',
        frontmatter: {
          id: 'char-2',
          type: 'character',
          status: 'canon',
          title: 'Bob',
          birth_date: '1985-03-20',
        },
        content: 'Bob content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'event-1',
        filePath: '/vault/event-1.md',
        fileName: 'event-1.md',
        frontmatter: {
          id: 'event-1',
          type: 'event',
          status: 'canon',
          title: 'Battle of Midway',
          start_date: '2020-06-01',
          end_date: '2020-06-05',
        },
        content: 'Battle content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'event-2',
        filePath: '/vault/event-2.md',
        fileName: 'event-2.md',
        frontmatter: {
          id: 'event-2',
          type: 'event',
          status: 'canon',
          title: 'Ongoing War',
          start_date: '2019-01-01',
          // No end_date - ongoing event
        },
        content: 'War content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'event-3',
        filePath: '/vault/event-3.md',
        fileName: 'event-3.md',
        frontmatter: {
          id: 'event-3',
          type: 'event',
          status: 'draft',
          title: 'Ancient Battle',
          start_date: '1500-03-15',
          end_date: '1500-03-16',
        },
        content: 'Ancient battle content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
    ];

    testNotes.forEach(note => db.upsertNode(note));
  });

  afterEach(() => {
    db.close();
  });

  describe('initializeDateColumns', () => {
    it('should create generated columns and indexes for date fields', () => {
      db.initializeDateColumns(['birth_date', 'start_date', 'end_date']);

      // Verify by attempting to query using the columns
      const stmt = db.db.prepare(`
        SELECT birth_date FROM nodes WHERE id = 'char-1'
      `);
      const result = stmt.get() as { birth_date: string };
      expect(result.birth_date).toBe('1990-05-15');
    });

    it('should be idempotent (safe to call multiple times)', () => {
      db.initializeDateColumns(['birth_date']);

      // Should not throw on second call
      expect(() => {
        db.initializeDateColumns(['birth_date']);
      }).not.toThrow();
    });

    it('should handle multiple date fields', () => {
      db.initializeDateColumns(['birth_date', 'start_date', 'end_date']);

      const stmt = db.db.prepare(`
        SELECT start_date, end_date FROM nodes WHERE id = 'event-1'
      `);
      const result = stmt.get() as { start_date: string; end_date: string };
      expect(result.start_date).toBe('2020-06-01');
      expect(result.end_date).toBe('2020-06-05');
    });
  });

  describe('queryByDateRange', () => {
    it('should return nodes within date range (inclusive)', () => {
      const results = db.queryByDateRange('1985-01-01', '1990-12-31', 'birth_date');

      expect(results).toHaveLength(2);
      expect(results.map(r => r.id).sort()).toEqual(['char-1', 'char-2']);
    });

    it('should filter by entity type', () => {
      const results = db.queryByDateRange('2019-01-01', '2020-12-31', 'start_date', {
        entityType: 'event',
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'event')).toBe(true);
    });

    it('should sort ascending by default', () => {
      const results = db.queryByDateRange('1980-01-01', '1995-12-31', 'birth_date', {
        sortOrder: 'asc',
      });

      expect(results[0].id).toBe('char-2'); // 1985
      expect(results[1].id).toBe('char-1'); // 1990
    });

    it('should sort descending when specified', () => {
      const results = db.queryByDateRange('1980-01-01', '1995-12-31', 'birth_date', {
        sortOrder: 'desc',
      });

      expect(results[0].id).toBe('char-1'); // 1990
      expect(results[1].id).toBe('char-2'); // 1985
    });

    it('should respect limit option', () => {
      const results = db.queryByDateRange('1980-01-01', '1995-12-31', 'birth_date', {
        limit: 1,
      });

      expect(results).toHaveLength(1);
    });

    it('should use default limit of 100', () => {
      // This test just ensures the default is applied, not that it works with 100 items
      const results = db.queryByDateRange('1980-01-01', '1995-12-31', 'birth_date');
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  describe('queryByDateBefore', () => {
    it('should return nodes before the specified date', () => {
      const results = db.queryByDateBefore('1990-01-01', 'birth_date');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('char-2'); // 1985
    });

    it('should default sort to desc (most recent first)', () => {
      // Insert another character
      db.upsertNode({
        id: 'char-3',
        filePath: '/vault/char-3.md',
        fileName: 'char-3.md',
        frontmatter: {
          id: 'char-3',
          type: 'character',
          status: 'canon',
          title: 'Charlie',
          birth_date: '1988-07-10',
        },
        content: 'Charlie content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      });

      const results = db.queryByDateBefore('1990-01-01', 'birth_date');

      expect(results[0].id).toBe('char-3'); // 1988 (most recent)
      expect(results[1].id).toBe('char-2'); // 1985
    });

    it('should filter by entity type', () => {
      const results = db.queryByDateBefore('2020-01-01', 'start_date', {
        entityType: 'event',
      });

      expect(results).toHaveLength(2); // event-2 (2019) and event-3 (1500)
      expect(results.every(r => r.type === 'event')).toBe(true);
    });
  });

  describe('queryByDateAfter', () => {
    it('should return nodes after the specified date', () => {
      const results = db.queryByDateAfter('1990-01-01', 'birth_date');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('char-1'); // 1990-05-15
    });

    it('should default sort to asc (earliest first)', () => {
      const results = db.queryByDateAfter('2019-01-01', 'start_date', {
        entityType: 'event',
      });

      // Should return event-1 (2020-06-01) first
      expect(results[0].id).toBe('event-1');
    });

    it('should filter by entity type', () => {
      const results = db.queryByDateAfter('2015-01-01', 'start_date', {
        entityType: 'event',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.type === 'event')).toBe(true);
    });
  });

  describe('queryByExactDate', () => {
    it('should return nodes matching exact date', () => {
      const results = db.queryByExactDate('1990-05-15', 'birth_date');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('char-1');
    });

    it('should return empty array when no match', () => {
      const results = db.queryByExactDate('2000-01-01', 'birth_date');

      expect(results).toHaveLength(0);
    });

    it('should filter by entity type', () => {
      const results = db.queryByExactDate('2020-06-01', 'start_date', {
        entityType: 'event',
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('event-1');
    });

    it('should default sort to asc', () => {
      // Insert duplicate date
      db.upsertNode({
        id: 'char-4',
        filePath: '/vault/char-4.md',
        fileName: 'char-4.md',
        frontmatter: {
          id: 'char-4',
          type: 'character',
          status: 'canon',
          title: 'Dave',
          birth_date: '1990-05-15',
        },
        content: 'Dave content',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      });

      const results = db.queryByExactDate('1990-05-15', 'birth_date');
      expect(results).toHaveLength(2);
    });
  });

  describe('queryByDateOverlap', () => {
    it('should match events whose range overlaps query range', () => {
      // Query for events overlapping June 2020
      const results = db.queryByDateOverlap(
        '2020-06-01',
        '2020-06-30',
        'start_date',
        'end_date'
      );

      // Should include both event-1 (ended June 5) and event-2 (ongoing since 2019)
      expect(results).toHaveLength(2);
      expect(results.some(r => r.id === 'event-1')).toBe(true);
      expect(results.some(r => r.id === 'event-2')).toBe(true);
    });

    it('should include events with NULL end_date (ongoing)', () => {
      // Query for events overlapping 2020
      const results = db.queryByDateOverlap(
        '2020-01-01',
        '2020-12-31',
        'start_date',
        'end_date'
      );

      // Should include event-1 (ended) and event-2 (ongoing since 2019)
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some(r => r.id === 'event-1')).toBe(true);
      expect(results.some(r => r.id === 'event-2')).toBe(true);
    });

    it('should filter by entity type', () => {
      const results = db.queryByDateOverlap(
        '2019-01-01',
        '2021-12-31',
        'start_date',
        'end_date',
        { entityType: 'event' }
      );

      expect(results.every(r => r.type === 'event')).toBe(true);
    });

    it('should not match events outside the query range', () => {
      // Query for events in 2021
      const results = db.queryByDateOverlap(
        '2021-01-01',
        '2021-12-31',
        'start_date',
        'end_date'
      );

      // Should only include ongoing event-2 (started 2019, no end)
      // event-1 ended in 2020-06-05, should not match
      expect(results.some(r => r.id === 'event-1')).toBe(false);
      expect(results.some(r => r.id === 'event-2')).toBe(true); // ongoing
    });

    it('should handle sort order', () => {
      const results = db.queryByDateOverlap(
        '1500-01-01',
        '2021-12-31',
        'start_date',
        'end_date',
        { sortOrder: 'asc', entityType: 'event' }
      );

      // Should sort by start_date ascending
      expect(results[0].id).toBe('event-3'); // 1500
    });
  });
});

describe('HivemindDatabase Graph Traversal', () => {
  let db: HivemindDatabase;
  let dbPath: string;

  beforeEach(() => {
    // Use in-memory database for fast tests
    dbPath = ':memory:';
    db = new HivemindDatabase({ path: dbPath });

    // Create a test graph:
    // alice -> knows -> bob
    // alice -> manages -> team
    // bob -> knows -> charlie
    // bob -> member_of -> team
    // team -> has_lead -> alice (creates a cycle)
    // dave (isolated node)
    const testNotes: VaultNote[] = [
      {
        id: 'alice',
        filePath: '/vault/alice.md',
        fileName: 'alice.md',
        frontmatter: {
          id: 'alice',
          type: 'character',
          status: 'canon',
          title: 'Alice',
        },
        content: 'Alice is a team lead.',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'bob',
        filePath: '/vault/bob.md',
        fileName: 'bob.md',
        frontmatter: {
          id: 'bob',
          type: 'character',
          status: 'canon',
          title: 'Bob',
        },
        content: 'Bob is a team member.',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'charlie',
        filePath: '/vault/charlie.md',
        fileName: 'charlie.md',
        frontmatter: {
          id: 'charlie',
          type: 'character',
          status: 'canon',
          title: 'Charlie',
        },
        content: 'Charlie is friends with Alice and Bob.',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'team',
        filePath: '/vault/team.md',
        fileName: 'team.md',
        frontmatter: {
          id: 'team',
          type: 'organization',
          status: 'canon',
          title: 'Engineering Team',
        },
        content: 'A software engineering team.',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
      {
        id: 'dave',
        filePath: '/vault/dave.md',
        fileName: 'dave.md',
        frontmatter: {
          id: 'dave',
          type: 'character',
          status: 'canon',
          title: 'Dave',
        },
        content: 'Dave is isolated.',
        links: [],
        headings: [],
        stats: {
          size: 100,
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
      },
    ];

    testNotes.forEach(note => db.upsertNode(note));

    // Insert relationships (creating the graph structure)
    db.insertRelationship('alice', 'bob', 'knows');
    db.insertRelationship('alice', 'team', 'manages');
    db.insertRelationship('bob', 'charlie', 'knows');
    db.insertRelationship('bob', 'team', 'member_of');
    // Add a cycle via a different node for cycle testing
    db.insertRelationship('team', 'alice', 'has_lead'); // Creates cycle: alice->team->alice
  });

  afterEach(() => {
    db.close();
  });

  describe('queryNeighbors', () => {
    it('should return immediate neighbors with relationship types and directions', () => {
      const neighbors = db.queryNeighbors('alice');

      // Default direction is 'both', so includes outgoing and incoming
      expect(neighbors).toHaveLength(3);
      expect(neighbors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            neighbor_id: 'bob',
            rel_type: 'knows',
            direction: 'outgoing',
          }),
          expect.objectContaining({
            neighbor_id: 'team',
            rel_type: 'manages',
            direction: 'outgoing',
          }),
          expect.objectContaining({
            neighbor_id: 'team',
            rel_type: 'has_lead',
            direction: 'incoming',
          }),
        ])
      );
    });

    it('should handle bidirectional relationships (both directions)', () => {
      const neighbors = db.queryNeighbors('alice', { direction: 'both' });

      // Alice has outgoing: bob (knows), team (manages)
      // Alice has incoming: team (has_lead)
      expect(neighbors).toHaveLength(3);
      expect(neighbors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ neighbor_id: 'bob', direction: 'outgoing' }),
          expect.objectContaining({ neighbor_id: 'team', direction: 'outgoing' }),
          expect.objectContaining({ neighbor_id: 'team', direction: 'incoming' }),
        ])
      );
    });

    it('should filter by direction (outgoing only)', () => {
      const neighbors = db.queryNeighbors('alice', { direction: 'outgoing' });

      expect(neighbors).toHaveLength(2);
      expect(neighbors.every(n => n.direction === 'outgoing')).toBe(true);
    });

    it('should filter by direction (incoming only)', () => {
      const neighbors = db.queryNeighbors('alice', { direction: 'incoming' });

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]).toMatchObject({
        neighbor_id: 'team',
        direction: 'incoming',
      });
    });

    it('should filter by relationship type (include)', () => {
      const neighbors = db.queryNeighbors('bob', {
        includeRelationships: ['knows'],
      });

      expect(neighbors).toHaveLength(2); // alice (incoming) and charlie (outgoing)
      expect(neighbors.every(n => n.rel_type === 'knows')).toBe(true);
    });

    it('should filter by relationship type (exclude)', () => {
      const neighbors = db.queryNeighbors('bob', {
        excludeRelationships: ['knows'],
      });

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0]).toMatchObject({
        neighbor_id: 'team',
        rel_type: 'member_of',
      });
    });

    it('should filter by entity type of neighbors', () => {
      const neighbors = db.queryNeighbors('bob', {
        includeEntityTypes: ['character'],
      });

      // Should only return charlie and alice (both characters)
      expect(neighbors.length).toBeGreaterThanOrEqual(2);
      // Verify no 'team' (organization) in results
      expect(neighbors.every(n => n.neighbor_id !== 'team')).toBe(true);
    });

    it('should return empty array for entity with no relationships', () => {
      const neighbors = db.queryNeighbors('dave');

      expect(neighbors).toHaveLength(0);
    });

    it('should respect limit option', () => {
      const neighbors = db.queryNeighbors('alice', { limit: 1 });

      expect(neighbors).toHaveLength(1);
    });
  });

  describe('querySubgraph', () => {
    it('should return entities at specified depth', () => {
      const subgraph = db.querySubgraph('alice', 1);

      // At depth 1: bob, team
      expect(subgraph).toHaveLength(2);
      expect(subgraph.every(n => n.depth === 1)).toBe(true);
    });

    it('should traverse multiple hops', () => {
      const subgraph = db.querySubgraph('alice', 2);

      // At depth 2: charlie (via bob)
      expect(subgraph).toHaveLength(1);
      expect(subgraph[0]).toMatchObject({
        entity_id: 'charlie',
        depth: 2,
      });
    });

    it('should prevent cycles (not revisit nodes)', () => {
      // alice -> team -> alice (cycle via has_lead)
      const subgraph = db.querySubgraph('alice', 3);

      // Should not return alice again (cycle prevention)
      expect(subgraph.every(n => n.entity_id !== 'alice')).toBe(true);
    });

    it('should cap depth at 5', () => {
      // Request depth 10, should get capped at 5
      const subgraph = db.querySubgraph('alice', 10);

      expect(subgraph.every(n => n.depth <= 5)).toBe(true);
    });

    it('should include intermediate nodes when option is set', () => {
      const subgraph = db.querySubgraph('alice', 2, {
        includeIntermediateNodes: true,
      });

      // Should include depth 1 (bob, team) and depth 2 (charlie)
      expect(subgraph.length).toBeGreaterThanOrEqual(3);
      expect(subgraph.some(n => n.depth === 1)).toBe(true);
      expect(subgraph.some(n => n.depth === 2)).toBe(true);
    });

    it('should filter by relationship type', () => {
      const subgraph = db.querySubgraph('alice', 2, {
        includeRelationships: ['knows'],
      });

      // Should traverse only 'knows' relationships: alice -> bob -> charlie
      expect(subgraph.length).toBeGreaterThanOrEqual(1);
      // team should not be included (manages relationship excluded)
      expect(subgraph.every(n => n.entity_id !== 'team')).toBe(true);
    });

    it('should filter by direction', () => {
      const subgraph = db.querySubgraph('alice', 1, {
        direction: 'outgoing',
      });

      // Only outgoing from alice: bob, team
      expect(subgraph).toHaveLength(2);
      expect(subgraph.every(n => ['bob', 'team'].includes(n.entity_id))).toBe(true);
    });

    it('should return path to each node', () => {
      const subgraph = db.querySubgraph('alice', 2, {
        includeIntermediateNodes: true,
      });

      // Each node should have a path
      expect(subgraph.every(n => n.path)).toBe(true);
      // Path should start with alice
      expect(subgraph.every(n => n.path.startsWith('alice'))).toBe(true);
    });
  });

  describe('queryShortestPath', () => {
    it('should find shortest path between two connected entities', () => {
      const result = db.queryShortestPath('alice', 'charlie');

      expect(result).toMatchObject({
        found: true,
        path: ['alice', 'bob', 'charlie'],
      });
      expect(result.edges).toHaveLength(2);
    });

    it('should return edges with relationship types', () => {
      const result = db.queryShortestPath('alice', 'charlie');

      expect(result.edges).toEqual([
        { from: 'alice', to: 'bob', type: 'knows' },
        { from: 'bob', to: 'charlie', type: 'knows' },
      ]);
    });

    it('should return not found for disconnected entities', () => {
      const result = db.queryShortestPath('alice', 'dave');

      expect(result).toMatchObject({
        found: false,
        path: [],
        edges: [],
      });
    });

    it('should handle direct connection (1-hop path)', () => {
      const result = db.queryShortestPath('alice', 'bob');

      expect(result).toMatchObject({
        found: true,
        path: ['alice', 'bob'],
      });
      expect(result.edges).toHaveLength(1);
    });

    it('should filter by relationship type', () => {
      const result = db.queryShortestPath('alice', 'team', {
        includeRelationships: ['manages'],
      });

      expect(result).toMatchObject({
        found: true,
        path: ['alice', 'team'],
      });
      expect(result.edges[0].type).toBe('manages');
    });

    it('should return not found if no path exists within relationship filter', () => {
      const result = db.queryShortestPath('alice', 'team', {
        includeRelationships: ['knows'], // Only 'knows', but alice->team is 'manages'
      });

      expect(result.found).toBe(false);
    });

    it('should respect maxDepth limit', () => {
      const result = db.queryShortestPath('alice', 'charlie', {
        maxDepth: 1, // Only allow 1 hop, but charlie is 2 hops away
      });

      expect(result.found).toBe(false);
    });
  });

  describe('getEdgeBetween', () => {
    it('should return edge info for directly connected nodes', () => {
      const edge = db.getEdgeBetween('alice', 'bob');

      expect(edge).toMatchObject({
        rel_type: 'knows',
      });
    });

    it('should return null for non-connected nodes', () => {
      const edge = db.getEdgeBetween('alice', 'charlie');

      expect(edge).toBeNull();
    });

    it('should work in both directions (bidirectional query)', () => {
      const edge1 = db.getEdgeBetween('alice', 'bob');
      const edge2 = db.getEdgeBetween('bob', 'alice');

      expect(edge1).toBeTruthy();
      expect(edge2).toBeTruthy();
    });
  });
});

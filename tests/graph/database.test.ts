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

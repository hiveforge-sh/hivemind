import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { HivemindDatabase } from '../../src/graph/database.js';
import { SearchEngine } from '../../src/search/engine.js';
import { templateRegistry } from '../../src/templates/registry.js';
import { initializeTemplates } from '../../src/templates/loader.js';
import { discoverTemporalTypes, validateDateField } from '../../src/mcp/timeline-tools.js';
import type { VaultNote } from '../../src/types/index.js';

describe('Integration: Timeline MCP Tools', () => {
  let testDbPath: string;
  let database: HivemindDatabase;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    // Initialize templates
    templateRegistry.clear();
    initializeTemplates();

    // Activate research template which has date fields
    templateRegistry.activate('research');

    // Create test database
    const testDir = join(process.cwd(), '.test-timeline-mcp');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    testDbPath = join(testDir, 'test.db');

    database = new HivemindDatabase({ path: testDbPath });
    searchEngine = new SearchEngine(database);

    // Initialize date columns for note type (dateCreated)
    database.initializeDateColumns(['dateCreated']);

    // Seed test data
    seedTestData();
  });

  afterEach(() => {
    // Close database
    database.close();

    // Clean up test directory
    const testDir = join(process.cwd(), '.test-timeline-mcp');
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
        id: 'note-recent',
        fileName: 'note-recent.md',
        filePath: 'Notes/note-recent.md',
        frontmatter: {
          id: 'note-recent',
          type: 'note',
          status: 'draft',
          title: 'Recent Research Note',
          dateCreated: '2024-03-15',
          noteType: 'literature',
        },
        content: 'Recent research findings',
        links: [],
        tags: [],
        stats: {
          created: now,
          modified: now,
          size: 100,
        },
      },
      {
        id: 'note-january',
        fileName: 'note-january.md',
        filePath: 'Notes/note-january.md',
        frontmatter: {
          id: 'note-january',
          type: 'note',
          status: 'draft',
          title: 'January Note',
          dateCreated: '2024-01-10',
          noteType: 'idea',
        },
        content: 'An idea from January',
        links: [],
        tags: [],
        stats: {
          created: now,
          modified: now,
          size: 100,
        },
      },
      {
        id: 'note-old',
        fileName: 'note-old.md',
        filePath: 'Notes/note-old.md',
        frontmatter: {
          id: 'note-old',
          type: 'note',
          status: 'draft',
          title: 'Old Note',
          dateCreated: '2023-06-20',
          noteType: 'question',
        },
        content: 'An older note from last year',
        links: [],
        tags: [],
        stats: {
          created: now,
          modified: now,
          size: 100,
        },
      },
      {
        id: 'paper-related',
        fileName: 'paper-related.md',
        filePath: 'Papers/paper-related.md',
        frontmatter: {
          id: 'paper-related',
          type: 'paper',
          status: 'reviewed',
          title: 'Related Paper',
        },
        content: 'A related research paper',
        links: ['note-recent'],
        tags: [],
        stats: {
          created: now,
          modified: now,
          size: 100,
        },
      },
    ];

    for (const note of testNotes) {
      database.upsertNode(note);
    }

    // Create a relationship
    database.insertRelationship('paper-related', 'note-recent', 'references', {});
  }

  describe('discoverTemporalTypes()', () => {
    it('should discover note type with dateCreated field', () => {
      const temporalTypes = discoverTemporalTypes();

      expect(temporalTypes.length).toBeGreaterThan(0);

      const noteType = temporalTypes.find(t => t.entityType === 'note');
      expect(noteType).toBeDefined();
      expect(noteType?.dateFields.length).toBeGreaterThan(0);

      const hasDateCreated = noteType?.dateFields.some(f => f.name === 'dateCreated');
      expect(hasDateCreated).toBe(true);
    });

    it('should not discover paper type (no date fields)', () => {
      const temporalTypes = discoverTemporalTypes();

      const paperType = temporalTypes.find(t => t.entityType === 'paper');
      expect(paperType).toBeUndefined();
    });
  });

  describe('validateDateField()', () => {
    it('should validate dateCreated for note type', () => {
      const isValid = validateDateField('note', 'dateCreated');
      expect(isValid).toBe(true);
    });

    it('should reject paper type with dateCreated (paper has no date fields)', () => {
      const isValid = validateDateField('paper', 'dateCreated');
      expect(isValid).toBe(false);
    });

    it('should reject invalid field name', () => {
      const isValid = validateDateField('note', 'invalid_field');
      expect(isValid).toBe(false);
    });

    it('should reject non-date field', () => {
      const isValid = validateDateField('note', 'title');
      expect(isValid).toBe(false);
    });

    it('should reject invalid entity type', () => {
      const isValid = validateDateField('invalid_type', 'dateCreated');
      expect(isValid).toBe(false);
    });
  });

  describe('queryTimelineRange()', () => {
    it('should return entities in date range', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated'
      );

      expect(results.nodes.length).toBe(2); // January and Recent, not Old
      expect(results.nodes.some(n => n.id === 'note-january')).toBe(true);
      expect(results.nodes.some(n => n.id === 'note-recent')).toBe(true);
      expect(results.nodes.some(n => n.id === 'note-old')).toBe(false);
    });

    it('should sort results by date ascending by default', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated',
        { sortOrder: 'asc' }
      );

      expect(results.nodes.length).toBe(2);
      // January is 2024-01-10, Recent is 2024-03-15
      expect(results.nodes[0].id).toBe('note-january');
      expect(results.nodes[1].id).toBe('note-recent');
    });

    it('should support descending sort order', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated',
        { sortOrder: 'desc' }
      );

      expect(results.nodes.length).toBe(2);
      // Reversed order
      expect(results.nodes[0].id).toBe('note-recent');
      expect(results.nodes[1].id).toBe('note-january');
    });

    it('should filter by entity type', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated',
        { entityType: 'note' }
      );

      expect(results.nodes.length).toBe(2);
      expect(results.nodes.every(n => n.type === 'note')).toBe(true);
    });

    it('should respect limit option', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated',
        { limit: 1 }
      );

      expect(results.nodes.length).toBe(1);
    });

    it('should include relationships', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated'
      );

      expect(results.relationships).toBeDefined();
      expect(results.relationships.length).toBeGreaterThan(0);

      // Should include paper -> note-recent relationship
      const hasRelationship = results.relationships.some(
        r => r.sourceId === 'paper-related' && r.targetId === 'note-recent'
      );
      expect(hasRelationship).toBe(true);
    });

    it('should include execution metadata', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'dateCreated'
      );

      expect(results.metadata.source).toBe('timeline');
      expect(results.metadata.queryType).toBe('range');
      expect(results.metadata.dateField).toBe('dateCreated');
      expect(results.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(results.metadata.totalResults).toBe(2);
    });
  });

  describe('queryTimelineBefore()', () => {
    it('should return entities before date', async () => {
      const results = await searchEngine.queryTimelineBefore(
        '2024-02-01',
        'dateCreated'
      );

      expect(results.nodes.length).toBe(2); // January and Old, not Recent
      expect(results.nodes.some(n => n.id === 'note-january')).toBe(true);
      expect(results.nodes.some(n => n.id === 'note-old')).toBe(true);
      expect(results.nodes.some(n => n.id === 'note-recent')).toBe(false);
    });

    it('should sort descending by default (most recent first)', async () => {
      const results = await searchEngine.queryTimelineBefore(
        '2024-02-01',
        'dateCreated'
      );

      expect(results.nodes.length).toBe(2);
      // January (2024-01-10) is more recent than Old (2023-06-20)
      expect(results.nodes[0].id).toBe('note-january');
      expect(results.nodes[1].id).toBe('note-old');
    });

    it('should support ascending sort order', async () => {
      const results = await searchEngine.queryTimelineBefore(
        '2024-02-01',
        'dateCreated',
        { sortOrder: 'asc' }
      );

      expect(results.nodes.length).toBe(2);
      // Reversed order
      expect(results.nodes[0].id).toBe('note-old');
      expect(results.nodes[1].id).toBe('note-january');
    });
  });

  describe('queryTimelineAfter()', () => {
    it('should return entities after date', async () => {
      const results = await searchEngine.queryTimelineAfter(
        '2024-02-01',
        'dateCreated'
      );

      expect(results.nodes.length).toBe(1); // Only Recent
      expect(results.nodes[0].id).toBe('note-recent');
    });

    it('should sort ascending by default (earliest first)', async () => {
      const results = await searchEngine.queryTimelineAfter(
        '2023-01-01',
        'dateCreated'
      );

      // Should get all 3 notes
      expect(results.nodes.length).toBe(3);
      // Old (2023-06-20), January (2024-01-10), Recent (2024-03-15)
      expect(results.nodes[0].id).toBe('note-old');
      expect(results.nodes[1].id).toBe('note-january');
      expect(results.nodes[2].id).toBe('note-recent');
    });

    it('should support descending sort order', async () => {
      const results = await searchEngine.queryTimelineAfter(
        '2023-01-01',
        'dateCreated',
        { sortOrder: 'desc' }
      );

      expect(results.nodes.length).toBe(3);
      // Reversed order
      expect(results.nodes[0].id).toBe('note-recent');
      expect(results.nodes[1].id).toBe('note-january');
      expect(results.nodes[2].id).toBe('note-old');
    });
  });

  describe('queryTimelineExact()', () => {
    it('should return entities on exact date', async () => {
      const results = await searchEngine.queryTimelineExact(
        '2024-03-15',
        'dateCreated'
      );

      expect(results.nodes.length).toBe(1);
      expect(results.nodes[0].id).toBe('note-recent');
    });

    it('should return empty for non-matching date', async () => {
      const results = await searchEngine.queryTimelineExact(
        '2024-02-15',
        'dateCreated'
      );

      expect(results.nodes.length).toBe(0);
    });

    it('should filter by entity type', async () => {
      const results = await searchEngine.queryTimelineExact(
        '2024-03-15',
        'dateCreated',
        { entityType: 'note' }
      );

      expect(results.nodes.length).toBe(1);
      expect(results.nodes[0].type).toBe('note');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid date format gracefully', async () => {
      // Note: validation happens in the server layer via Zod schemas
      // Here we just verify the database layer doesn't crash
      const results = await searchEngine.queryTimelineRange(
        'invalid-date',
        '2024-12-31',
        'dateCreated'
      );

      // SQLite string comparison will just not match anything
      expect(results.nodes.length).toBe(0);
    });

    it('should handle non-existent date field gracefully', async () => {
      const results = await searchEngine.queryTimelineRange(
        '2024-01-01',
        '2024-12-31',
        'non_existent_field'
      );

      // No entities have this field, so returns empty
      expect(results.nodes.length).toBe(0);
    });
  });
});

import Database from 'better-sqlite3';
import type { VaultNote, GraphNode, GraphEdge, NoteType, NoteStatus } from '../types/index.js';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

// SQLite row interfaces
interface NodeRow {
  id: string;
  type: string;
  status: string;
  title: string;
  content: string;
  frontmatter: string;  // JSON string
  file_path: string;
  created_at: number;
  updated_at: number;
}

interface RelationshipRow {
  id: number;
  source_id: string;
  target_id: string;
  rel_type: string | null;
  properties: string | null;  // JSON string or NULL
}

interface SearchResultRow {
  id: string;
  rank: number;
}

interface CountRow {
  count: number;
}

export class HivemindDatabase {
  public db: Database.Database;

  constructor(config: DatabaseConfig) {
    // Ensure directory exists
    this.ensureDirectory(config.path);

    this.db = new Database(config.path, {
      readonly: config.readonly || false,
      fileMustExist: false,
    });

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    this.initializeSchema();
  }

  /**
   * Ensure database directory exists
   */
  private ensureDirectory(dbPath: string): void {
    const dir = dirname(dbPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch (_error) {
      // Directory might already exist
    }
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    // Nodes table (entities)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        frontmatter TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Relationships table (edges)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        rel_type TEXT,
        properties TEXT,
        FOREIGN KEY (source_id) REFERENCES nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES nodes(id) ON DELETE CASCADE,
        UNIQUE(source_id, target_id, rel_type)
      );
    `);

    // Indexes for fast lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
      CREATE INDEX IF NOT EXISTS idx_nodes_status ON nodes(status);
      CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_id);
      CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_id);
    `);

    // Full-text search index using FTS5
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
        id UNINDEXED,
        title,
        content,
        content='nodes',
        content_rowid='rowid'
      );
    `);

    // Triggers to keep FTS index in sync
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS nodes_ai AFTER INSERT ON nodes BEGIN
        INSERT INTO nodes_fts(rowid, id, title, content)
        VALUES (new.rowid, new.id, new.title, new.content);
      END;

      CREATE TRIGGER IF NOT EXISTS nodes_ad AFTER DELETE ON nodes BEGIN
        DELETE FROM nodes_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS nodes_au AFTER UPDATE ON nodes BEGIN
        UPDATE nodes_fts
        SET title = new.title, content = new.content
        WHERE rowid = new.rowid;
      END;
    `);

    // ComfyUI workflows table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        file_path TEXT NOT NULL,
        context_fields TEXT,
        output_path TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated);
    `);

    // Assets table for tracking generated images
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        asset_type TEXT NOT NULL DEFAULT 'image',
        file_path TEXT NOT NULL,
        depicts TEXT,
        workflow_id TEXT,
        prompt TEXT,
        parameters TEXT,
        created TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_assets_workflow ON assets(workflow_id);
      CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    `);

    console.error('Database schema initialized');
  }

  /**
   * Insert or update a node
   */
  upsertNode(note: VaultNote): void {
    const stmt = this.db.prepare(`
      INSERT INTO nodes (id, type, status, title, content, frontmatter, file_path, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        status = excluded.status,
        title = excluded.title,
        content = excluded.content,
        frontmatter = excluded.frontmatter,
        file_path = excluded.file_path,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      note.id,
      note.frontmatter.type,
      note.frontmatter.status,
      note.frontmatter.title || note.fileName,
      note.content,
      JSON.stringify(note.frontmatter),
      note.filePath,
      note.stats.created.getTime(),
      note.stats.modified.getTime()
    );
  }

  /**
   * Insert a relationship
   */
  insertRelationship(sourceId: string, targetId: string, relType?: string, properties?: Record<string, unknown>): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO relationships (source_id, target_id, rel_type, properties)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      sourceId,
      targetId,
      relType || 'related',
      properties ? JSON.stringify(properties) : null
    );
  }

  /**
   * Convert a database row to a GraphNode
   */
  private rowToGraphNode(row: NodeRow): GraphNode {
    return {
      id: row.id,
      type: row.type as NoteType,
      status: row.status as NoteStatus,
      title: row.title,
      content: row.content,
      properties: JSON.parse(row.frontmatter),
      filePath: row.file_path,
      created: new Date(row.created_at),
      updated: new Date(row.updated_at),
    };
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM nodes WHERE id = ?
    `);

    const row = stmt.get(id) as NodeRow | undefined;
    if (!row) return undefined;

    return this.rowToGraphNode(row);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    const stmt = this.db.prepare('SELECT * FROM nodes ORDER BY updated_at DESC');
    const rows = stmt.all() as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: string): GraphNode[] {
    const stmt = this.db.prepare('SELECT * FROM nodes WHERE type = ? ORDER BY title');
    const rows = stmt.all(type) as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Get relationships for a node
   */
  getRelationships(nodeId: string): GraphEdge[] {
    const stmt = this.db.prepare(`
      SELECT * FROM relationships
      WHERE source_id = ? OR target_id = ?
    `);

    const rows = stmt.all(nodeId, nodeId) as RelationshipRow[];

    return rows.map(row => ({
      id: row.id.toString(),
      sourceId: row.source_id,
      targetId: row.target_id,
      relationType: row.rel_type || undefined,
      properties: row.properties ? JSON.parse(row.properties) : undefined,
      bidirectional: false, // Will be determined by graph builder
    }));
  }

  /**
   * Full-text search using FTS5
   */
  search(query: string, limit: number = 10): Array<{ id: string; rank: number }> {
    const stmt = this.db.prepare(`
      SELECT id, rank
      FROM nodes_fts
      WHERE nodes_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);

    const rows = stmt.all(query, limit) as SearchResultRow[];
    return rows.map(row => ({
      id: row.id,
      rank: row.rank,
    }));
  }

  /**
   * Delete a node and its relationships
   */
  deleteNode(id: string): void {
    const stmt = this.db.prepare('DELETE FROM nodes WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.db.exec('DELETE FROM nodes');
    this.db.exec('DELETE FROM relationships');
  }

  /**
   * Get database statistics
   */
  getStats() {
    const nodeCount = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as CountRow;
    const relCount = this.db.prepare('SELECT COUNT(*) as count FROM relationships').get() as CountRow;

    const typeStats = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM nodes
      GROUP BY type
    `).all() as Array<{ type: string; count: number }>;

    return {
      nodes: nodeCount.count,
      relationships: relCount.count,
      byType: Object.fromEntries(typeStats.map(s => [s.type, s.count])),
    };
  }

  /**
   * Get the most recent updated_at timestamp from database
   */
  getLatestTimestamp(): number | null {
    const result = this.db.prepare('SELECT MAX(updated_at) as max_ts FROM nodes').get() as { max_ts: number | null };
    return result.max_ts;
  }

  /**
   * Check if database has any nodes
   */
  hasNodes(): boolean {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as CountRow;
    return result.count > 0;
  }

  /**
   * Initialize generated columns for date fields
   * Creates VIRTUAL generated columns that extract date values from JSON frontmatter
   * and indexes them for efficient queries.
   *
   * @param dateFields - Array of date field names (e.g., ['birth_date', 'start_date'])
   */
  initializeDateColumns(dateFields: string[]): void {
    for (const field of dateFields) {
      try {
        // Add VIRTUAL generated column
        // SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
        // So we catch the error if column already exists
        this.db.exec(`
          ALTER TABLE nodes
          ADD COLUMN ${field} TEXT
          GENERATED ALWAYS AS (json_extract(frontmatter, '$.${field}')) VIRTUAL;
        `);
      } catch (error) {
        // Ignore "duplicate column" errors (makes this idempotent)
        if (!(error instanceof Error && error.message.includes('duplicate column'))) {
          throw error;
        }
      }

      // Create index on the generated column (IF NOT EXISTS supported for indexes)
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_nodes_${field} ON nodes(${field});
      `);
    }
  }

  /**
   * Query nodes by date range
   *
   * @param startDate - Start date (inclusive) in ISO format (YYYY-MM-DD)
   * @param endDate - End date (inclusive) in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Array of matching GraphNodes
   */
  queryByDateRange(
    startDate: string,
    endDate: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): GraphNode[] {
    const { entityType, sortOrder = 'asc', limit = 100 } = options || {};

    let sql = `
      SELECT * FROM nodes
      WHERE json_extract(frontmatter, '$.${dateField}') BETWEEN ? AND ?
    `;

    const params: unknown[] = [startDate, endDate];

    if (entityType) {
      sql += ' AND type = ?';
      params.push(entityType);
    }

    sql += ` ORDER BY json_extract(frontmatter, '$.${dateField}') ${sortOrder.toUpperCase()}`;
    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Query nodes before a specific date
   *
   * @param date - Date threshold in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Array of matching GraphNodes (default: desc order - most recent first)
   */
  queryByDateBefore(
    date: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): GraphNode[] {
    const { entityType, sortOrder = 'desc', limit = 100 } = options || {};

    let sql = `
      SELECT * FROM nodes
      WHERE json_extract(frontmatter, '$.${dateField}') < ?
    `;

    const params: unknown[] = [date];

    if (entityType) {
      sql += ' AND type = ?';
      params.push(entityType);
    }

    sql += ` ORDER BY json_extract(frontmatter, '$.${dateField}') ${sortOrder.toUpperCase()}`;
    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Query nodes after a specific date
   *
   * @param date - Date threshold in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Array of matching GraphNodes (default: asc order - earliest first)
   */
  queryByDateAfter(
    date: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): GraphNode[] {
    const { entityType, sortOrder = 'asc', limit = 100 } = options || {};

    let sql = `
      SELECT * FROM nodes
      WHERE json_extract(frontmatter, '$.${dateField}') > ?
    `;

    const params: unknown[] = [date];

    if (entityType) {
      sql += ' AND type = ?';
      params.push(entityType);
    }

    sql += ` ORDER BY json_extract(frontmatter, '$.${dateField}') ${sortOrder.toUpperCase()}`;
    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Query nodes by exact date match
   *
   * @param date - Date to match in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Array of matching GraphNodes
   */
  queryByExactDate(
    date: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): GraphNode[] {
    const { entityType, sortOrder = 'asc', limit = 100 } = options || {};

    let sql = `
      SELECT * FROM nodes
      WHERE json_extract(frontmatter, '$.${dateField}') = ?
    `;

    const params: unknown[] = [date];

    if (entityType) {
      sql += ' AND type = ?';
      params.push(entityType);
    }

    sql += ` ORDER BY json_extract(frontmatter, '$.${dateField}') ${sortOrder.toUpperCase()}`;
    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Query nodes whose date range overlaps with the specified range
   * Useful for events with start_date and end_date
   *
   * @param startDate - Query range start in ISO format (YYYY-MM-DD)
   * @param endDate - Query range end in ISO format (YYYY-MM-DD)
   * @param startField - Name of the start date field
   * @param endField - Name of the end date field
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Array of matching GraphNodes
   */
  queryByDateOverlap(
    startDate: string,
    endDate: string,
    startField: string,
    endField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): GraphNode[] {
    const { entityType, sortOrder = 'asc', limit = 100 } = options || {};

    // Overlap condition: entity starts before query ends AND (entity ends after query starts OR entity has no end date)
    let sql = `
      SELECT * FROM nodes
      WHERE json_extract(frontmatter, '$.${startField}') <= ?
        AND (
          json_extract(frontmatter, '$.${endField}') >= ?
          OR json_extract(frontmatter, '$.${endField}') IS NULL
        )
    `;

    const params: unknown[] = [endDate, startDate];

    if (entityType) {
      sql += ' AND type = ?';
      params.push(entityType);
    }

    sql += ` ORDER BY json_extract(frontmatter, '$.${startField}') ${sortOrder.toUpperCase()}`;
    sql += ' LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as NodeRow[];
    return rows.map(row => this.rowToGraphNode(row));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

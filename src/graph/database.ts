import Database from 'better-sqlite3';
import type { VaultNote, GraphNode, GraphEdge } from '../types/index.js';
import { dirname } from 'path';
import { mkdirSync } from 'fs';

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

export class HivemindDatabase {
  private db: Database.Database;

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
    } catch (error) {
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
  insertRelationship(sourceId: string, targetId: string, relType?: string, properties?: Record<string, any>): void {
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
   * Get a node by ID
   */
  getNode(id: string): GraphNode | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM nodes WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      content: row.content,
      properties: JSON.parse(row.frontmatter),
      filePath: row.file_path,
      created: new Date(row.created_at),
      updated: new Date(row.updated_at),
    };
  }

  /**
   * Get all nodes
   */
  getAllNodes(): GraphNode[] {
    const stmt = this.db.prepare('SELECT * FROM nodes ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      content: row.content,
      properties: JSON.parse(row.frontmatter),
      filePath: row.file_path,
      created: new Date(row.created_at),
      updated: new Date(row.updated_at),
    }));
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: string): GraphNode[] {
    const stmt = this.db.prepare('SELECT * FROM nodes WHERE type = ? ORDER BY title');
    const rows = stmt.all(type) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      content: row.content,
      properties: JSON.parse(row.frontmatter),
      filePath: row.file_path,
      created: new Date(row.created_at),
      updated: new Date(row.updated_at),
    }));
  }

  /**
   * Get relationships for a node
   */
  getRelationships(nodeId: string): GraphEdge[] {
    const stmt = this.db.prepare(`
      SELECT * FROM relationships 
      WHERE source_id = ? OR target_id = ?
    `);

    const rows = stmt.all(nodeId, nodeId) as any[];

    return rows.map(row => ({
      id: row.id.toString(),
      sourceId: row.source_id,
      targetId: row.target_id,
      relationType: row.rel_type,
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

    const rows = stmt.all(query, limit) as any[];
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
    const nodeCount = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as { count: number };
    const relCount = this.db.prepare('SELECT COUNT(*) as count FROM relationships').get() as { count: number };
    
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
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

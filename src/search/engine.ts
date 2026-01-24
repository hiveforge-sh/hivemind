import type { HivemindDatabase } from '../graph/database.js';

export interface QueryResult {
  nodes: any[];
  relationships?: any[];
  metadata: {
    source: 'fts' | 'graph' | 'hybrid';
    executionTime: number;
    totalResults: number;
  };
}

export class SearchEngine {
  private db: HivemindDatabase;

  constructor(db: HivemindDatabase) {
    this.db = db;
  }

  /**
   * Enhanced search combining FTS5 and graph traversal
   */
  async search(query: string, options?: {
    limit?: number;
    includeRelationships?: boolean;
    filters?: {
      type?: string[];
      status?: string[];
    };
  }): Promise<QueryResult> {
    const startTime = Date.now();
    const limit = options?.limit || 10;

    // Use FTS5 for full-text search
    const ftsResults = this.db.search(query, limit * 2); // Get more than needed for filtering
    
    // Get full node details
    let nodes = ftsResults
      .map(result => this.db.getNode(result.id))
      .filter(node => node !== undefined);

    // Apply filters
    if (options?.filters) {
      nodes = nodes.filter(node => {
        if (options.filters?.type && !options.filters.type.includes(node!.type)) {
          return false;
        }
        if (options.filters?.status && !options.filters.status.includes(node!.status)) {
          return false;
        }
        return true;
      });
    }

    // Limit results
    nodes = nodes.slice(0, limit);

    // Optionally include relationships
    let relationships: any[] = [];
    if (options?.includeRelationships) {
      for (const node of nodes) {
        const rels = this.db.getRelationships(node!.id);
        relationships.push(...rels);
      }
    }

    return {
      nodes,
      relationships: options?.includeRelationships ? relationships : undefined,
      metadata: {
        source: 'fts',
        executionTime: Date.now() - startTime,
        totalResults: ftsResults.length,
      },
    };
  }

  /**
   * Get a node with its relationships
   */
  async getNodeWithRelationships(id: string): Promise<{
    node: any;
    relationships: any[];
    relatedNodes: any[];
  } | null> {
    const node = this.db.getNode(id);
    if (!node) return null;

    const relationships = this.db.getRelationships(id);
    
    // Get related nodes
    const relatedIds = new Set<string>();
    for (const rel of relationships) {
      if (rel.sourceId !== id) relatedIds.add(rel.sourceId);
      if (rel.targetId !== id) relatedIds.add(rel.targetId);
    }

    const relatedNodes = Array.from(relatedIds)
      .map(rid => this.db.getNode(rid))
      .filter(n => n !== undefined);

    return {
      node,
      relationships,
      relatedNodes,
    };
  }

  /**
   * Find nodes by type
   */
  async getNodesByType(type: string): Promise<any[]> {
    return this.db.getNodesByType(type);
  }

  /**
   * Get graph statistics
   */
  getStats() {
    return this.db.getStats();
  }
}

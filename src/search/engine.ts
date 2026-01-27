import type { HivemindDatabase } from '../graph/database.js';
import type { GraphNode, GraphEdge } from '../types/index.js';

export interface QueryResult {
  nodes: GraphNode[];
  relationships?: GraphEdge[];
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
    /** Filter relationships by type (only applies when includeRelationships is true) */
    relationshipType?: string;
  }): Promise<QueryResult> {
    const startTime = Date.now();
    const limit = options?.limit || 10;

    let nodes: GraphNode[];
    let totalResults: number;
    const trimmedQuery = query.trim();

    // Handle empty query - bypass FTS5 and get nodes directly
    if (!trimmedQuery) {
      // Get nodes directly from database based on filters
      if (options?.filters?.type && options.filters.type.length === 1) {
        // Single type filter - use optimized getNodesByType
        nodes = this.db.getNodesByType(options.filters.type[0]);
      } else {
        // No type filter or multiple types - get all nodes
        nodes = this.db.getAllNodes();
      }

      // Apply filters
      if (options?.filters) {
        nodes = nodes.filter(node => {
          if (options.filters?.type && options.filters.type.length > 1 && !options.filters.type.includes(node.type)) {
            return false;
          }
          if (options.filters?.status && !options.filters.status.includes(node.status)) {
            return false;
          }
          return true;
        });
      }

      totalResults = nodes.length;
      nodes = nodes.slice(0, limit);
    } else {
      // Use FTS5 for full-text search
      const ftsResults = this.db.search(trimmedQuery, limit * 2); // Get more than needed for filtering

      // Get full node details
      nodes = ftsResults
        .map(result => this.db.getNode(result.id))
        .filter(node => node !== undefined) as GraphNode[];

      // Apply filters
      if (options?.filters) {
        nodes = nodes.filter(node => {
          if (options.filters?.type && !options.filters.type.includes(node.type)) {
            return false;
          }
          if (options.filters?.status && !options.filters.status.includes(node.status)) {
            return false;
          }
          return true;
        });
      }

      totalResults = ftsResults.length;
      nodes = nodes.slice(0, limit);
    }

    // Optionally include relationships
    const relationships: GraphEdge[] = [];
    if (options?.includeRelationships) {
      for (const node of nodes) {
        let rels = this.db.getRelationships(node.id);
        // Filter by relationship type if specified
        if (options.relationshipType) {
          rels = rels.filter((rel) => rel.relationType === options.relationshipType);
        }
        relationships.push(...rels);
      }
    }

    return {
      nodes,
      relationships: options?.includeRelationships ? relationships : undefined,
      metadata: {
        source: trimmedQuery ? 'fts' : 'graph',
        executionTime: Date.now() - startTime,
        totalResults,
      },
    };
  }

  /**
   * Get a node with its relationships
   *
   * @param id - Node ID to retrieve
   * @param options - Optional filtering options
   * @param options.relationshipType - Filter relationships by type
   */
  async getNodeWithRelationships(id: string, options?: {
    relationshipType?: string;
  }): Promise<{
    node: GraphNode;
    relationships: GraphEdge[];
    relatedNodes: GraphNode[];
  } | null> {
    const node = this.db.getNode(id);
    if (!node) return null;

    let relationships = this.db.getRelationships(id);

    // Filter by relationship type if specified
    if (options?.relationshipType) {
      relationships = relationships.filter((rel) => rel.relationType === options.relationshipType);
    }

    // Get related nodes (only from filtered relationships)
    const relatedIds = new Set<string>();
    for (const rel of relationships) {
      if (rel.sourceId !== id) relatedIds.add(rel.sourceId);
      if (rel.targetId !== id) relatedIds.add(rel.targetId);
    }

    const relatedNodes = Array.from(relatedIds)
      .map(rid => this.db.getNode(rid))
      .filter(n => n !== undefined) as GraphNode[];

    return {
      node,
      relationships,
      relatedNodes,
    };
  }

  /**
   * Find nodes by type
   */
  async getNodesByType(type: string): Promise<GraphNode[]> {
    return this.db.getNodesByType(type);
  }

  /**
   * Get graph statistics
   */
  getStats() {
    return this.db.getStats();
  }
}

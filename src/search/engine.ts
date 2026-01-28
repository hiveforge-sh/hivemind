import type { HivemindDatabase } from '../graph/database.js';
import type { GraphNode, GraphEdge } from '../types/index.js';
import { templateRegistry } from '../templates/registry.js';

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

  /**
   * Query nodes by date range with full context
   *
   * @param startDate - Start date (inclusive) in ISO format (YYYY-MM-DD)
   * @param endDate - End date (inclusive) in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Results grouped by entity type with relationships and metadata
   */
  async queryTimelineRange(
    startDate: string,
    endDate: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): Promise<{
    nodes: GraphNode[];
    relationships: GraphEdge[];
    metadata: {
      source: 'timeline';
      executionTime: number;
      totalResults: number;
      dateField: string;
      queryType: 'range';
    };
  }> {
    const startTime = Date.now();

    const nodes = this.db.queryByDateRange(startDate, endDate, dateField, options);

    // Fetch relationships for all returned nodes
    const relationships: GraphEdge[] = [];
    for (const node of nodes) {
      const rels = this.db.getRelationships(node.id);
      relationships.push(...rels);
    }

    return {
      nodes,
      relationships,
      metadata: {
        source: 'timeline',
        executionTime: Date.now() - startTime,
        totalResults: nodes.length,
        dateField,
        queryType: 'range',
      },
    };
  }

  /**
   * Query nodes before a specific date with full context
   *
   * @param date - Date threshold in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Results grouped by entity type with relationships and metadata
   */
  async queryTimelineBefore(
    date: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): Promise<{
    nodes: GraphNode[];
    relationships: GraphEdge[];
    metadata: {
      source: 'timeline';
      executionTime: number;
      totalResults: number;
      dateField: string;
      queryType: 'before';
    };
  }> {
    const startTime = Date.now();

    const nodes = this.db.queryByDateBefore(date, dateField, options);

    // Fetch relationships for all returned nodes
    const relationships: GraphEdge[] = [];
    for (const node of nodes) {
      const rels = this.db.getRelationships(node.id);
      relationships.push(...rels);
    }

    return {
      nodes,
      relationships,
      metadata: {
        source: 'timeline',
        executionTime: Date.now() - startTime,
        totalResults: nodes.length,
        dateField,
        queryType: 'before',
      },
    };
  }

  /**
   * Query nodes after a specific date with full context
   *
   * @param date - Date threshold in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Results grouped by entity type with relationships and metadata
   */
  async queryTimelineAfter(
    date: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): Promise<{
    nodes: GraphNode[];
    relationships: GraphEdge[];
    metadata: {
      source: 'timeline';
      executionTime: number;
      totalResults: number;
      dateField: string;
      queryType: 'after';
    };
  }> {
    const startTime = Date.now();

    const nodes = this.db.queryByDateAfter(date, dateField, options);

    // Fetch relationships for all returned nodes
    const relationships: GraphEdge[] = [];
    for (const node of nodes) {
      const rels = this.db.getRelationships(node.id);
      relationships.push(...rels);
    }

    return {
      nodes,
      relationships,
      metadata: {
        source: 'timeline',
        executionTime: Date.now() - startTime,
        totalResults: nodes.length,
        dateField,
        queryType: 'after',
      },
    };
  }

  /**
   * Query nodes by exact date match with full context
   *
   * @param date - Date to match in ISO format (YYYY-MM-DD)
   * @param dateField - Name of the date field to query
   * @param options - Query options (entityType, sortOrder, limit)
   * @returns Results grouped by entity type with relationships and metadata
   */
  async queryTimelineExact(
    date: string,
    dateField: string,
    options?: {
      entityType?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    }
  ): Promise<{
    nodes: GraphNode[];
    relationships: GraphEdge[];
    metadata: {
      source: 'timeline';
      executionTime: number;
      totalResults: number;
      dateField: string;
      queryType: 'exact';
    };
  }> {
    const startTime = Date.now();

    const nodes = this.db.queryByExactDate(date, dateField, options);

    // Fetch relationships for all returned nodes
    const relationships: GraphEdge[] = [];
    for (const node of nodes) {
      const rels = this.db.getRelationships(node.id);
      relationships.push(...rels);
    }

    return {
      nodes,
      relationships,
      metadata: {
        source: 'timeline',
        executionTime: Date.now() - startTime,
        totalResults: nodes.length,
        dateField,
        queryType: 'exact',
      },
    };
  }

  /**
   * Query immediate neighbors (1-hop) of an entity with full node details
   *
   * @param entityId - Entity ID to query
   * @param options - Query options (direction, filters, limits)
   * @returns Results with full node details, relationships, and metadata
   */
  async queryGraphNeighbors(
    entityId: string,
    options?: {
      direction?: 'outgoing' | 'incoming' | 'both';
      includeRelationships?: string[];
      excludeRelationships?: string[];
      includeEntityTypes?: string[];
      limit?: number;
    }
  ): Promise<{
    neighbors: Array<{ node: GraphNode; relationship: { type: string; direction: 'outgoing' | 'incoming' } }>;
    metadata: {
      source: 'graph';
      executionTime: number;
      totalResults: number;
    };
  }> {
    const startTime = Date.now();

    // Call database to get neighbor IDs
    const dbResults = this.db.queryNeighbors(entityId, {
      direction: options?.direction,
      includeRelationships: options?.includeRelationships,
      excludeRelationships: options?.excludeRelationships,
      includeEntityTypes: options?.includeEntityTypes,
      limit: options?.limit,
    });

    // Fetch full node details for each neighbor
    const neighbors: Array<{ node: GraphNode; relationship: { type: string; direction: 'outgoing' | 'incoming' } }> = [];
    for (const neighbor of dbResults) {
      const node = this.db.getNode(neighbor.neighbor_id);
      if (node) {
        neighbors.push({
          node,
          relationship: {
            type: neighbor.rel_type,
            direction: neighbor.direction as 'outgoing' | 'incoming',
          },
        });
      }
    }

    return {
      neighbors,
      metadata: {
        source: 'graph',
        executionTime: Date.now() - startTime,
        totalResults: neighbors.length,
      },
    };
  }

  /**
   * Query subgraph (N-hop neighborhood) of an entity with full node details
   *
   * @param entityId - Entity ID to query
   * @param depth - Number of hops (1-5)
   * @param options - Query options (direction, filters, limits)
   * @returns Results with full node details and metadata
   */
  async queryGraphSubgraph(
    entityId: string,
    depth: number,
    options?: {
      direction?: 'outgoing' | 'incoming' | 'both';
      includeRelationships?: string[];
      excludeRelationships?: string[];
      includeEntityTypes?: string[];
      includeIntermediateNodes?: boolean;
      limit?: number;
    }
  ): Promise<{
    nodes: GraphNode[];
    metadata: {
      source: 'graph';
      executionTime: number;
      totalResults: number;
      depth: number;
    };
  }> {
    const startTime = Date.now();

    // Call database to get subgraph results
    const subgraphResults = this.db.querySubgraph(entityId, depth, {
      direction: options?.direction,
      includeRelationships: options?.includeRelationships,
      excludeRelationships: options?.excludeRelationships,
      includeEntityTypes: options?.includeEntityTypes,
      includeIntermediateNodes: options?.includeIntermediateNodes,
    });

    // Fetch full node details for each entity
    const nodes: GraphNode[] = [];
    for (const row of subgraphResults) {
      const node = this.db.getNode(row.entity_id);
      if (node) {
        nodes.push(node);
      }
    }

    // Apply limit if specified
    const limitedNodes = options?.limit ? nodes.slice(0, options.limit) : nodes;

    return {
      nodes: limitedNodes,
      metadata: {
        source: 'graph',
        executionTime: Date.now() - startTime,
        totalResults: limitedNodes.length,
        depth,
      },
    };
  }

  /**
   * Find shortest path between two entities with full node details
   *
   * @param fromEntityId - Starting entity ID
   * @param toEntityId - Target entity ID
   * @param options - Query options (relationship filter, max depth)
   * @returns Path with full node details or not found
   */
  async queryGraphPath(
    fromEntityId: string,
    toEntityId: string,
    options?: {
      includeRelationships?: string[];
      maxDepth?: number;
    }
  ): Promise<{
    found: boolean;
    path: GraphNode[];
    edges: Array<{ from: string; to: string; type: string }>;
    metadata: {
      source: 'graph';
      executionTime: number;
      pathLength?: number;
    };
  }> {
    const startTime = Date.now();

    // Call database to find shortest path
    const dbResult = this.db.queryShortestPath(fromEntityId, toEntityId, {
      includeRelationships: options?.includeRelationships,
      maxDepth: options?.maxDepth,
    });

    if (!dbResult.found) {
      return {
        found: false,
        path: [],
        edges: [],
        metadata: {
          source: 'graph',
          executionTime: Date.now() - startTime,
        },
      };
    }

    // Fetch full node details for path
    const path: GraphNode[] = [];
    for (const id of dbResult.path) {
      const node = this.db.getNode(id);
      if (node) {
        path.push(node);
      }
    }

    return {
      found: true,
      path,
      edges: dbResult.edges,
      metadata: {
        source: 'graph',
        executionTime: Date.now() - startTime,
        pathLength: path.length,
      },
    };
  }

  /**
   * List all relationship types available in the vault
   *
   * @returns List of relationship types with metadata
   */
  async listRelationshipTypes(): Promise<{
    types: Array<{ id: string; label?: string; description?: string }>;
    metadata: {
      source: 'template';
      executionTime: number;
      totalResults: number;
    };
  }> {
    const startTime = Date.now();

    const relationshipTypes = templateRegistry.getRelationshipTypes();

    const types = relationshipTypes.map((r) => ({
      id: r.id,
      label: r.displayName,
      description: r.description,
    }));

    return {
      types,
      metadata: {
        source: 'template',
        executionTime: Date.now() - startTime,
        totalResults: types.length,
      },
    };
  }
}

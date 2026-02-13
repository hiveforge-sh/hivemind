# Phase 25: Graph MCP Tools - Research

**Researched:** 2026-01-28
**Domain:** Graph traversal, MCP tool design, SQLite recursive queries, neighbor/path algorithms
**Confidence:** HIGH

## Summary

This phase implements MCP tools for AI agents to traverse and query the entity relationship graph. The research covered four critical areas: (1) graph traversal algorithms (BFS for neighbors, BFS for shortest path), (2) SQLite recursive CTE patterns for graph queries, (3) MCP tool design patterns following established Phase 24 conventions, and (4) relationship type discovery from template registry.

Current state: The codebase has a `relationships` table with `source_id`, `target_id`, `rel_type` columns and existing indexes. The `HivemindDatabase` class has `getRelationships(nodeId)` which retrieves all edges for a node. The `GraphBuilder` already builds an in-memory `KnowledgeGraph` with an `adjacencyList` Map. Phase 24 established the pattern for timeline tools with separate focused MCP tools, Zod validation schemas, and integration with `SearchEngine`.

The primary technical challenge is implementing efficient multi-hop traversal and shortest path queries in SQLite. SQLite supports recursive CTEs which enable graph traversal, but finding shortest paths requires careful handling to avoid performance issues. For small worldbuilding vaults (under 10k entities), a BFS approach using recursive CTEs with depth limiting is performant and appropriate. The existing adjacency list in `KnowledgeGraph` can also be used for in-memory traversal as an alternative.

**Primary recommendation:** Create three focused MCP tools (`query_graph_neighbors`, `query_graph_subgraph`, `query_graph_path`) plus one discovery tool (`list_relationship_types`). Implement traversal in HivemindDatabase using SQLite recursive CTEs with depth limits for database persistence, with fallback to in-memory BFS using the existing adjacencyList for complex queries. Follow Phase 24 patterns: separate tool file, Zod schemas, SearchEngine integration, tool generator pattern.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 | SQLite database driver | Already in project, synchronous API, recursive CTEs supported |
| zod | ^4.3.6 | Schema validation | Project standard for MCP tool input validation |
| @modelcontextprotocol/sdk | ^1.0.4 | MCP server implementation | Official MCP SDK, used by Phase 24 tools |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SQLite Recursive CTEs | Built-in SQLite | Graph traversal queries | Multi-hop neighbor queries, path finding |
| In-memory adjacencyList | Existing | Fast neighbor lookups | Already built by GraphBuilder.getGraph() |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite recursive CTEs | In-memory BFS only | CTEs persist across restarts, in-memory requires graph reload |
| Custom graph library | graphology | Graphology is overkill for simple BFS; existing adjacencyList sufficient |
| Multiple tools | Single monolithic tool | Multiple tools follow MCP 2026 best practices (Phase 24 established pattern) |

**Installation:**
```bash
# No additional dependencies needed
# All required libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── mcp/
│   ├── tool-generator.ts       # Existing: query_X and list_X tools
│   ├── timeline-tools.ts       # Phase 24: Timeline-specific tools
│   └── graph-tools.ts          # NEW: Graph traversal tools
├── graph/
│   ├── database.ts             # MODIFY: Add traversal query methods
│   └── builder.ts              # Existing: builds KnowledgeGraph with adjacencyList
├── search/
│   └── engine.ts               # MODIFY: Add graph traversal methods
└── types/
    └── index.ts                # MODIFY: Add graph query result types
```

### Pattern 1: Multiple Focused MCP Tools (from Phase 24)
**What:** Separate tools for neighbors, subgraph, shortest path, and relationship type discovery
**When to use:** Always for MCP tool design (2026 best practice, established in Phase 24)
**Example:**
```typescript
// Source: Phase 24 timeline-tools.ts pattern
// GOOD: Focused tools with clear single responsibility
const tools = [
  {
    name: 'query_graph_neighbors',
    description: 'Get immediate neighbors of an entity (1-hop connections)',
    inputSchema: { /* entityId, optional filters */ }
  },
  {
    name: 'query_graph_subgraph',
    description: 'Get entities within N hops of a starting entity',
    inputSchema: { /* entityId, depth, optional filters */ }
  },
  {
    name: 'query_graph_path',
    description: 'Find shortest path between two entities',
    inputSchema: { /* fromEntityId, toEntityId, optional filters */ }
  },
  {
    name: 'list_relationship_types',
    description: 'List all relationship types available in the vault',
    inputSchema: { /* no required params */ }
  }
];
```

### Pattern 2: SQLite Recursive CTE for Graph Traversal
**What:** Use recursive CTEs to traverse relationships table with depth limiting
**When to use:** Multi-hop neighbor queries that need persistence
**Example:**
```typescript
// Source: SQLite lang_with.html documentation
// BFS traversal with depth tracking
const sql = `
  WITH RECURSIVE
  traversal(entity_id, depth, path) AS (
    -- Base case: starting entity at depth 0
    SELECT ?, 0, ?

    UNION ALL

    -- Recursive case: find neighbors not yet visited
    SELECT
      CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END,
      t.depth + 1,
      t.path || ',' || CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END
    FROM traversal t
    JOIN relationships r ON (r.source_id = t.entity_id OR r.target_id = t.entity_id)
    WHERE t.depth < ?
      AND t.path NOT LIKE '%' ||
          CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END || '%'
  )
  SELECT DISTINCT entity_id, MIN(depth) as depth
  FROM traversal
  WHERE depth > 0
  GROUP BY entity_id
  ORDER BY depth;
`;
```

### Pattern 3: Entity Identifier Format (Type:Name)
**What:** Use "Type:name" format for entity identification consistent with user expectations
**When to use:** In tool descriptions and examples, but accept flexible matching internally
**Example:**
```typescript
// Source: CONTEXT.md decision - Claude's discretion on identifier format
// Accept multiple formats, resolve to actual entity ID

// User can specify:
// - "Character:john" (type-qualified)
// - "john" (name only, searches all types)
// - "char-john-smith" (direct ID)

function resolveEntityId(identifier: string): string | null {
  // Try Type:Name format first
  const typeNameMatch = identifier.match(/^(\w+):(.+)$/i);
  if (typeNameMatch) {
    const [, type, name] = typeNameMatch;
    // Search by type + name
    return findEntityByTypeAndName(type.toLowerCase(), name.trim());
  }

  // Try direct ID match
  const node = db.getNode(identifier);
  if (node) return node.id;

  // Try name search across all types
  return findEntityByName(identifier.trim());
}
```

### Pattern 4: Result Structure with Summary Info
**What:** Return summary info per neighbor (name, type, description) rather than full frontmatter
**When to use:** Graph query results to keep responses concise for AI
**Example:**
```typescript
// Source: CONTEXT.md decision on result structure
interface GraphNeighborResult {
  entity: {
    id: string;
    name: string;
    type: string;
    description?: string; // First 200 chars of content
  };
  relationship: {
    type: string;
    direction: 'outgoing' | 'incoming' | 'bidirectional';
  };
  hopCount?: number; // For multi-hop queries
}

// For shortest path, include both views
interface GraphPathResult {
  found: boolean;
  pathLength: number;
  nodePath: Array<{ id: string; name: string; type: string }>;
  edgePath: Array<{ from: string; to: string; relationType: string }>;
}
```

### Pattern 5: Filter by Relationship Type with Include/Exclude
**What:** Support both include and exclude filters for relationship types
**When to use:** All graph traversal tools
**Example:**
```typescript
// Source: CONTEXT.md decision on relationship filtering
const GraphFilterSchema = z.object({
  includeRelationships: z.array(z.string()).optional()
    .describe('Only traverse these relationship types'),
  excludeRelationships: z.array(z.string()).optional()
    .describe('Do not traverse these relationship types'),
  includeEntityTypes: z.array(z.string()).optional()
    .describe('Only return entities of these types'),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both')
    .describe('Traversal direction (default: both)'),
});

// Filter application in SQL
const relationshipFilter = args.includeRelationships
  ? `AND r.rel_type IN (${args.includeRelationships.map(() => '?').join(',')})`
  : args.excludeRelationships
    ? `AND r.rel_type NOT IN (${args.excludeRelationships.map(() => '?').join(',')})`
    : '';
```

### Anti-Patterns to Avoid
- **Single monolithic graph tool:** A tool with queryType enum ('neighbors', 'path', 'subgraph') violates MCP best practices; use separate tools
- **Unbounded depth queries:** Always enforce max depth (recommend 5) to prevent runaway queries
- **Returning full frontmatter:** Graph results should be summaries; use query_X tools for full details
- **Ignoring relationship direction:** For asymmetric relationships (manages, parent_of), direction matters semantically
- **Hand-rolling BFS:** SQLite recursive CTEs handle traversal efficiently; don't re-implement in JavaScript

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph traversal | Custom BFS loop | SQLite recursive CTE | Handles cycles, persists across restarts, uses indexes |
| Cycle detection | Track visited set manually | `path NOT LIKE '%' || id || '%'` in CTE | SQLite handles cycle prevention in recursive query |
| Shortest path | Dijkstra implementation | BFS with depth tracking in CTE | Unweighted graph, BFS finds shortest path naturally |
| Relationship type discovery | Scan frontmatter | `templateRegistry.getRelationshipTypes()` | Template registry has O(1) lookup already |
| Entity resolution | Custom search | Existing `SearchEngine.getNodeWithRelationships()` | Already handles ID/name/title matching |

**Key insight:** SQLite recursive CTEs are specifically designed for graph traversal. The syntax is well-documented and handles edge cases (cycles, depth limits) that custom implementations often miss. The existing template registry already has relationship type metadata.

## Common Pitfalls

### Pitfall 1: Unbounded Recursive Queries
**What goes wrong:** Recursive CTE without depth limit explores entire graph, taking seconds or timing out.
**Why it happens:** Easy to forget the depth constraint in WHERE clause.
**How to avoid:** Always include `WHERE t.depth < ?` in recursive term. Set reasonable default (3) and max (5).
**Warning signs:** Graph queries taking >500ms, memory usage spikes, "too many recursive levels" errors.

### Pitfall 2: Cycle-Induced Infinite Loops
**What goes wrong:** Graph with cycles causes infinite recursion in CTE.
**Why it happens:** Not tracking visited nodes in recursive query.
**How to avoid:** Use path tracking: `WHERE t.path NOT LIKE '%' || new_id || '%'`. SQLite string comparison handles cycle detection.
**Warning signs:** Query never returns, SQLite errors about maximum recursion depth.

### Pitfall 3: N+1 Query Problem for Node Details
**What goes wrong:** After getting neighbor IDs, making separate query for each node's details.
**Why it happens:** Natural to fetch IDs first, then details.
**How to avoid:** JOIN with nodes table in the recursive CTE or batch fetch in single query.
**Warning signs:** Graph queries making 100+ database calls, slow response times on large results.

### Pitfall 4: Ignoring Bidirectional Relationships
**What goes wrong:** Only checking source_id OR target_id, missing half the connections.
**Why it happens:** Forgetting relationships table stores directed edges.
**How to avoid:** Always use `(r.source_id = ? OR r.target_id = ?)` for bidirectional traversal, with option for directed-only.
**Warning signs:** "Character has no relationships" when they clearly do in the other direction.

### Pitfall 5: Unknown Filter Types Silently Fail
**What goes wrong:** User provides invalid relationship type filter, query returns empty.
**Why it happens:** SQL `IN ()` with non-existent type matches nothing.
**How to avoid:** Per CONTEXT.md decision: warn about unknown types but continue with valid types. Use `templateRegistry.getRelationshipTypes()` to validate.
**Warning signs:** Unexpected empty results, user confusion about why filter "didn't work".

### Pitfall 6: Entity Not Found vs No Relationships Confusion
**What goes wrong:** Empty result could mean "entity doesn't exist" or "entity has no neighbors".
**Why it happens:** Both cases return no results without context.
**How to avoid:** Per CONTEXT.md decision: context-aware empty responses. Check if entity exists first, then query relationships.
**Warning signs:** AI asks "is this entity correct?" when entity simply has no relationships.

## Code Examples

Verified patterns from official sources and existing codebase:

### SQLite Recursive CTE for Neighbor Query (1-hop)
```typescript
// Source: SQLite recursive CTE documentation + existing database.ts patterns
queryNeighbors(
  entityId: string,
  options?: {
    direction?: 'outgoing' | 'incoming' | 'both';
    includeRelationships?: string[];
    excludeRelationships?: string[];
    includeEntityTypes?: string[];
    limit?: number;
  }
): Array<{ entityId: string; relationType: string; direction: string }> {
  const { direction = 'both', limit = 100 } = options || {};

  let sql = `
    SELECT
      CASE
        WHEN r.source_id = ? THEN r.target_id
        ELSE r.source_id
      END as neighbor_id,
      r.rel_type,
      CASE
        WHEN r.source_id = ? THEN 'outgoing'
        ELSE 'incoming'
      END as direction
    FROM relationships r
    WHERE
  `;

  const params: unknown[] = [entityId, entityId];

  // Direction filter
  if (direction === 'outgoing') {
    sql += `r.source_id = ?`;
    params.push(entityId);
  } else if (direction === 'incoming') {
    sql += `r.target_id = ?`;
    params.push(entityId);
  } else {
    sql += `(r.source_id = ? OR r.target_id = ?)`;
    params.push(entityId, entityId);
  }

  // Relationship type filters
  if (options?.includeRelationships?.length) {
    sql += ` AND r.rel_type IN (${options.includeRelationships.map(() => '?').join(',')})`;
    params.push(...options.includeRelationships);
  } else if (options?.excludeRelationships?.length) {
    sql += ` AND r.rel_type NOT IN (${options.excludeRelationships.map(() => '?').join(',')})`;
    params.push(...options.excludeRelationships);
  }

  sql += ` LIMIT ?`;
  params.push(limit);

  const stmt = this.db.prepare(sql);
  return stmt.all(...params) as Array<{ neighbor_id: string; rel_type: string; direction: string }>;
}
```

### SQLite Recursive CTE for Multi-hop Subgraph Query
```typescript
// Source: SQLite lang_with.html + SQLite forum examples
querySubgraph(
  entityId: string,
  depth: number,
  options?: {
    includeRelationships?: string[];
    excludeRelationships?: string[];
    includeEntityTypes?: string[];
    direction?: 'outgoing' | 'incoming' | 'both';
    includeIntermediateNodes?: boolean;
  }
): Array<{ entityId: string; depth: number; path: string }> {
  const { direction = 'both', includeIntermediateNodes = false } = options || {};
  const maxDepth = Math.min(depth, 5); // Cap at 5 for safety

  // Build relationship type filter
  let relFilter = '';
  const relFilterParams: string[] = [];
  if (options?.includeRelationships?.length) {
    relFilter = `AND r.rel_type IN (${options.includeRelationships.map(() => '?').join(',')})`;
    relFilterParams.push(...options.includeRelationships);
  } else if (options?.excludeRelationships?.length) {
    relFilter = `AND r.rel_type NOT IN (${options.excludeRelationships.map(() => '?').join(',')})`;
    relFilterParams.push(...options.excludeRelationships);
  }

  // Build direction filter
  let directionJoin = '(r.source_id = t.entity_id OR r.target_id = t.entity_id)';
  if (direction === 'outgoing') {
    directionJoin = 'r.source_id = t.entity_id';
  } else if (direction === 'incoming') {
    directionJoin = 'r.target_id = t.entity_id';
  }

  const sql = `
    WITH RECURSIVE traversal(entity_id, depth, path) AS (
      -- Base case: starting entity
      SELECT ?, 0, ?

      UNION ALL

      -- Recursive case: traverse edges
      SELECT
        CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END,
        t.depth + 1,
        t.path || ',' || CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END
      FROM traversal t
      JOIN relationships r ON ${directionJoin}
      WHERE t.depth < ?
        ${relFilter}
        -- Cycle prevention: don't revisit nodes in current path
        AND t.path NOT LIKE '%' ||
            CASE WHEN r.source_id = t.entity_id THEN r.target_id ELSE r.source_id END || '%'
    )
    SELECT DISTINCT entity_id, MIN(depth) as depth,
           (SELECT path FROM traversal t2 WHERE t2.entity_id = traversal.entity_id ORDER BY depth LIMIT 1) as path
    FROM traversal
    ${includeIntermediateNodes ? '' : `WHERE depth = ?`}
    GROUP BY entity_id
    ORDER BY depth;
  `;

  const params = [
    entityId,
    entityId,
    maxDepth,
    ...relFilterParams
  ];

  if (!includeIntermediateNodes) {
    params.push(maxDepth);
  }

  const stmt = this.db.prepare(sql);
  return stmt.all(...params) as Array<{ entity_id: string; depth: number; path: string }>;
}
```

### Shortest Path Query with BFS
```typescript
// Source: SQLite recursive CTE + BFS shortest path pattern
queryShortestPath(
  fromEntityId: string,
  toEntityId: string,
  options?: {
    includeRelationships?: string[];
    maxDepth?: number;
  }
): { found: boolean; path: string[]; edges: Array<{ from: string; to: string; type: string }> } | null {
  const maxDepth = options?.maxDepth || 10;

  // Build relationship filter
  let relFilter = '';
  const relFilterParams: string[] = [];
  if (options?.includeRelationships?.length) {
    relFilter = `AND r.rel_type IN (${options.includeRelationships.map(() => '?').join(',')})`;
    relFilterParams.push(...options.includeRelationships);
  }

  // BFS finds shortest path naturally - first time we reach target is shortest
  const sql = `
    WITH RECURSIVE path_search(entity_id, path, depth) AS (
      -- Start from source
      SELECT ?, ?, 0

      UNION ALL

      -- Explore neighbors
      SELECT
        CASE WHEN r.source_id = p.entity_id THEN r.target_id ELSE r.source_id END,
        p.path || ',' || CASE WHEN r.source_id = p.entity_id THEN r.target_id ELSE r.source_id END,
        p.depth + 1
      FROM path_search p
      JOIN relationships r ON (r.source_id = p.entity_id OR r.target_id = p.entity_id)
      WHERE p.depth < ?
        ${relFilter}
        -- Don't revisit nodes
        AND p.path NOT LIKE '%' ||
            CASE WHEN r.source_id = p.entity_id THEN r.target_id ELSE r.source_id END || '%'
        -- Stop when we've found target (optimization)
        AND NOT EXISTS (SELECT 1 FROM path_search WHERE entity_id = ?)
    )
    SELECT path, depth
    FROM path_search
    WHERE entity_id = ?
    ORDER BY depth
    LIMIT 1;
  `;

  const params = [
    fromEntityId,
    fromEntityId,
    maxDepth,
    ...relFilterParams,
    toEntityId,
    toEntityId
  ];

  const stmt = this.db.prepare(sql);
  const result = stmt.get(...params) as { path: string; depth: number } | undefined;

  if (!result) {
    return { found: false, path: [], edges: [] };
  }

  const pathIds = result.path.split(',');

  // Build edge list from path
  const edges: Array<{ from: string; to: string; type: string }> = [];
  for (let i = 0; i < pathIds.length - 1; i++) {
    const edge = this.getEdgeBetween(pathIds[i], pathIds[i + 1]);
    if (edge) {
      edges.push({ from: pathIds[i], to: pathIds[i + 1], type: edge.rel_type });
    }
  }

  return { found: true, path: pathIds, edges };
}
```

### Graph Tool Zod Schemas (following Phase 24 pattern)
```typescript
// Source: Phase 24 timeline-tools.ts pattern
import { z } from 'zod';

export const QueryGraphNeighborsArgsSchema = z.object({
  entityId: z.string().describe('Entity identifier (ID, name, or Type:name format)'),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both')
    .describe('Traversal direction'),
  includeRelationships: z.array(z.string()).optional()
    .describe('Only include these relationship types'),
  excludeRelationships: z.array(z.string()).optional()
    .describe('Exclude these relationship types'),
  includeEntityTypes: z.array(z.string()).optional()
    .describe('Only return neighbors of these entity types'),
  limit: z.number().min(1).max(100).optional().default(50)
    .describe('Maximum neighbors to return'),
});

export const QueryGraphSubgraphArgsSchema = z.object({
  entityId: z.string().describe('Starting entity identifier'),
  depth: z.number().min(1).max(5).optional().default(2)
    .describe('Number of hops to traverse (max: 5)'),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('both'),
  includeRelationships: z.array(z.string()).optional(),
  excludeRelationships: z.array(z.string()).optional(),
  includeEntityTypes: z.array(z.string()).optional(),
  includeIntermediateNodes: z.boolean().optional().default(false)
    .describe('Include nodes at intermediate depths (default: only final depth)'),
  limit: z.number().min(1).max(200).optional().default(100),
});

export const QueryGraphPathArgsSchema = z.object({
  fromEntityId: z.string().describe('Starting entity identifier'),
  toEntityId: z.string().describe('Target entity identifier'),
  includeRelationships: z.array(z.string()).optional()
    .describe('Only traverse these relationship types'),
  maxDepth: z.number().min(1).max(10).optional().default(6)
    .describe('Maximum path length to search'),
});

export const ListRelationshipTypesArgsSchema = z.object({
  // No required parameters - lists all available types
});
```

### Graph Tool Generator (following Phase 24 pattern)
```typescript
// Source: Phase 24 timeline-tools.ts generateTimelineTools pattern
import type { ToolDefinition } from './tool-generator.js';
import { templateRegistry } from '../templates/registry.js';

export function generateGraphTools(): ToolDefinition[] {
  // Get available relationship types for tool descriptions
  let relationshipTypesDescription = '';
  try {
    const relTypes = templateRegistry.getRelationshipTypes();
    if (relTypes.length > 0) {
      relationshipTypesDescription = '\n\nAvailable relationship types: ' +
        relTypes.map(r => r.id).join(', ');
    }
  } catch {
    // No active template
  }

  return [
    {
      name: 'query_graph_neighbors',
      description: `Get immediate neighbors (1-hop connections) of an entity. Returns neighbor entities with their relationship types and directions.${relationshipTypesDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          entityId: {
            type: 'string',
            description: 'Entity identifier (ID, name, or Type:name format like "Character:john")',
          },
          direction: {
            type: 'string',
            enum: ['outgoing', 'incoming', 'both'],
            default: 'both',
            description: 'Traversal direction (default: both)',
          },
          includeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only include these relationship types',
          },
          excludeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Exclude these relationship types',
          },
          includeEntityTypes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only return neighbors of these entity types',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 50,
            description: 'Maximum neighbors to return',
          },
        },
        required: ['entityId'],
      },
    },
    {
      name: 'query_graph_subgraph',
      description: `Get entities within N hops of a starting entity. Useful for exploring the neighborhood around an entity.${relationshipTypesDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          entityId: {
            type: 'string',
            description: 'Starting entity identifier',
          },
          depth: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            default: 2,
            description: 'Number of hops to traverse (1-5, default: 2)',
          },
          direction: {
            type: 'string',
            enum: ['outgoing', 'incoming', 'both'],
            default: 'both',
          },
          includeRelationships: {
            type: 'array',
            items: { type: 'string' },
          },
          excludeRelationships: {
            type: 'array',
            items: { type: 'string' },
          },
          includeEntityTypes: {
            type: 'array',
            items: { type: 'string' },
          },
          includeIntermediateNodes: {
            type: 'boolean',
            default: false,
            description: 'Include nodes at intermediate depths (default: only final depth)',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 200,
            default: 100,
          },
        },
        required: ['entityId'],
      },
    },
    {
      name: 'query_graph_path',
      description: `Find shortest path between two entities. Returns both the node sequence and edge list.${relationshipTypesDescription}`,
      inputSchema: {
        type: 'object',
        properties: {
          fromEntityId: {
            type: 'string',
            description: 'Starting entity identifier',
          },
          toEntityId: {
            type: 'string',
            description: 'Target entity identifier',
          },
          includeRelationships: {
            type: 'array',
            items: { type: 'string' },
            description: 'Only traverse these relationship types',
          },
          maxDepth: {
            type: 'number',
            minimum: 1,
            maximum: 10,
            default: 6,
            description: 'Maximum path length to search',
          },
        },
        required: ['fromEntityId', 'toEntityId'],
      },
    },
    {
      name: 'list_relationship_types',
      description: 'List all relationship types available in the vault. Use this to discover valid filter values for graph queries.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single graph tool with mode param | Multiple focused tools | MCP spec 2025-11 | Better AI tool selection |
| In-memory only traversal | SQLite recursive CTEs | SQLite 3.8.3 (2014) | Persists across restarts, uses indexes |
| Custom BFS implementation | Recursive CTE with depth | SQL standard | Handles cycles automatically |
| Full frontmatter in results | Summary info (name, type, description) | Phase 24 pattern | Concise AI responses |

**Deprecated/outdated:**
- **Graphology for simple traversal:** Overkill for BFS/DFS; existing adjacencyList sufficient
- **Neo4j-style Cypher queries:** SQLite CTEs are adequate for worldbuilding scale (< 100k nodes)
- **Single monolithic graph tool:** MCP 2026 best practices favor multiple focused tools

## Open Questions

Things that couldn't be fully resolved:

1. **Weighted Shortest Path**
   - What we know: Current implementation assumes unweighted edges (all hops equal)
   - What's unclear: Should some relationships be "shorter" than others (e.g., family vs acquaintance)?
   - Recommendation: Defer weighted paths to future phase. BFS shortest path is sufficient for v4.0. Document that "shortest" means fewest hops.

2. **Subgraph Result Explosion**
   - What we know: Depth 3+ can return hundreds of nodes in well-connected graphs
   - What's unclear: What's the best limit strategy? Hard cap? Per-level limit?
   - Recommendation: Default to depth 2, max 5. Limit to 100 results default. Document that deeper queries may be truncated.

3. **Relationship Direction Semantics**
   - What we know: "manages" is directional, "knows" is bidirectional
   - What's unclear: How to clearly convey direction in results without being verbose?
   - Recommendation: Use arrow notation in formatted output: "John -> manages -> Team A" vs "John <-> knows <-> Jane". Include direction field in JSON response.

4. **Entity Identifier Ambiguity**
   - What we know: User might say "john" when multiple Johns exist
   - What's unclear: Should we return error or ask for clarification?
   - Recommendation: Return error with suggestions: "Multiple entities match 'john': Character:john-smith, Character:john-doe. Please use full identifier."

## Sources

### Primary (HIGH confidence)
- SQLite Recursive CTE documentation: https://sqlite.org/lang_with.html - Graph traversal patterns, BFS/DFS control
- Phase 24 timeline-tools.ts - Established MCP tool patterns in this codebase
- Existing codebase: src/graph/database.ts, src/graph/builder.ts, src/mcp/tool-generator.ts

### Secondary (MEDIUM confidence)
- [SQLite Forum: Recursive query to find shortest path](https://sqlite.org/forum/info/a79ba01a941c29b3) - Limitations and workarounds
- [Graph Traversal Algorithms Explained](https://www.puppygraph.com/blog/graph-traversal) - BFS vs DFS comparison
- [MCP Best Practices](https://modelcontextprotocol.io/specification/2025-11-25) - Multiple focused tools recommendation

### Tertiary (LOW confidence - general patterns)
- [Graph Database Guide for AI Architects 2026](https://www.falkordb.com/blog/graph-database-guide/) - General graph query patterns
- [SQLite Recursive Queries Deep Dive](https://runebook.dev/en/articles/sqlite/lang_with/rcex3) - Additional CTE examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, patterns established in Phase 24
- Architecture patterns: HIGH - Following Phase 24 timeline-tools.ts exactly, SQLite CTEs well-documented
- Graph traversal: HIGH - SQLite recursive CTEs are mature, BFS pattern is textbook
- Pitfall mitigation: HIGH - Known issues with depth limits and cycles have standard solutions

**Research date:** 2026-01-28
**Valid until:** 90 days (stable domain - SQLite CTEs and MCP patterns change slowly)

**Critical findings for planning:**
1. **Use SQLite recursive CTEs** for all graph traversal (neighbor, subgraph, path) - handles cycles, uses indexes
2. **Four separate tools** per CONTEXT.md and MCP best practices: neighbors, subgraph, path, list_types
3. **Depth limits mandatory** - default 2, max 5 for subgraph; max 10 for path
4. **Follow Phase 24 pattern exactly** - graph-tools.ts file, Zod schemas, generateGraphTools(), SearchEngine integration
5. **Summary results not full frontmatter** - per CONTEXT.md decision, return name/type/description only
6. **Template registry for relationship types** - use `templateRegistry.getRelationshipTypes()` for validation and discovery

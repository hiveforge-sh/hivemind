/**
 * HTTP Bridge for Hivemind MCP
 *
 * Provides REST API endpoints for external services (like SillyTavern)
 * to query the Hivemind knowledge graph without using MCP protocol.
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type { SearchEngine } from '../search/engine.js';
import type { VaultReader } from '../vault/reader.js';
import type { HivemindDatabase } from '../graph/database.js';
import type { GraphNode } from '../types/index.js';

export interface HttpBridgeConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  apiKey?: string;
}

export interface HttpBridgeContext {
  searchEngine: SearchEngine;
  vaultReader: VaultReader;
  database: HivemindDatabase;
}

/**
 * Create the HTTP bridge router with all API endpoints
 */
export function createBridgeRouter(context: HttpBridgeContext): Router {
  const router = Router();
  const { searchEngine, vaultReader, database } = context;

  // Health check endpoint
  router.get('/health', (_req: Request, res: Response) => {
    const stats = database.getStats();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      stats: {
        nodes: stats.nodes,
        relationships: stats.relationships,
      },
    });
  });

  // Vault statistics endpoint
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const vaultStats = vaultReader.getStats();
      const dbStats = database.getStats();

      res.json({
        vault: {
          totalNotes: vaultStats.totalNotes,
          byType: vaultStats.byType,
          byStatus: vaultStats.byStatus,
        },
        graph: {
          nodes: dbStats.nodes,
          relationships: dbStats.relationships,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Search endpoint - wraps search_vault tool
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const {
        query,
        filters,
        limit = 10,
        includeContent = true,
        contentLimit = 500,
        includeRelationships = true,
      } = req.body;

      if (typeof query !== 'string') {
        res.status(400).json({ error: 'Query must be a string' });
        return;
      }

      const results = await searchEngine.search(query, {
        limit: Math.min(limit, 100),
        includeRelationships,
        filters,
      });

      // Format results for external consumption
      const formattedNodes = results.nodes.map(node => formatNodeForApi(node, includeContent, contentLimit));

      res.json({
        results: formattedNodes,
        relationships: results.relationships || [],
        metadata: {
          totalResults: results.metadata.totalResults,
          executionTime: results.metadata.executionTime,
          source: results.metadata.source,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Query specific entity type endpoint
  router.post('/query/:entityType', async (req: Request, res: Response) => {
    try {
      const entityType = req.params.entityType as string;
      const {
        id,
        limit = 20,
        status,
        includeContent = true,
        contentLimit = 500,
        includeRelationships = true,
      } = req.body as {
        id?: string;
        limit?: number;
        status?: string | string[];
        includeContent?: boolean;
        contentLimit?: number;
        includeRelationships?: boolean;
      };

      // If specific ID provided, get that entity with relationships
      if (id) {
        const result = await searchEngine.getNodeWithRelationships(id);

        if (!result) {
          // Try fuzzy search
          const searchResults = await searchEngine.search(id, {
            limit: 5,
            filters: { type: [entityType] },
          });

          if (searchResults.nodes.length === 0) {
            res.status(404).json({
              error: 'Entity not found',
              query: id,
              entityType,
            });
            return;
          }

          // Return suggestions
          res.json({
            found: false,
            suggestions: searchResults.nodes.map(n => ({
              id: n.id,
              title: n.title,
              type: n.type,
            })),
          });
          return;
        }

        // Verify type matches
        if (result.node.type !== entityType) {
          res.status(400).json({
            error: `Entity "${id}" is a ${result.node.type}, not a ${entityType}`,
            actualType: result.node.type,
          });
          return;
        }

        res.json({
          found: true,
          entity: formatNodeForApi(result.node, includeContent, contentLimit),
          relationships: includeRelationships ? result.relationships : [],
          relatedEntities: includeRelationships
            ? result.relatedNodes.map(n => formatNodeForApi(n, false, 0))
            : [],
        });
        return;
      }

      // List entities of type
      const filters: { type: string[]; status?: string[] } = { type: [entityType] };
      if (status) {
        filters.status = Array.isArray(status) ? status : [status as string];
      }

      const results = await searchEngine.search('', {
        limit: Math.min(limit, 100),
        filters,
        includeRelationships,
      });

      const formattedNodes = results.nodes.map(node => formatNodeForApi(node, includeContent, contentLimit));

      res.json({
        entities: formattedNodes,
        total: results.metadata.totalResults,
        relationships: includeRelationships ? results.relationships : [],
      });
    } catch (error) {
      res.status(500).json({
        error: 'Query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Batch query endpoint - get multiple entities by IDs
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const {
        ids,
        includeContent = true,
        contentLimit = 500,
        includeRelationships = true,
      } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: 'ids must be a non-empty array' });
        return;
      }

      if (ids.length > 50) {
        res.status(400).json({ error: 'Maximum 50 IDs per batch request' });
        return;
      }

      const results: Array<{
        id: string;
        found: boolean;
        entity?: ReturnType<typeof formatNodeForApi>;
        relationships?: unknown[];
        relatedEntities?: ReturnType<typeof formatNodeForApi>[];
      }> = await Promise.all(
        (ids as string[]).map(async id => {
          const result = await searchEngine.getNodeWithRelationships(id);

          if (result) {
            return {
              id,
              found: true,
              entity: formatNodeForApi(result.node, includeContent, contentLimit),
              relationships: includeRelationships ? result.relationships : [],
              relatedEntities: includeRelationships
                ? result.relatedNodes.map(n => formatNodeForApi(n, false, 0))
                : [],
            };
          }

          return { id, found: false };
        })
      );

      res.json({ results });
    } catch (error) {
      res.status(500).json({
        error: 'Batch query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Graph neighbors endpoint
  router.post('/graph/neighbors', async (req: Request, res: Response) => {
    try {
      const {
        entityId,
        direction = 'both',
        includeRelationships,
        excludeRelationships,
        includeEntityTypes,
        limit = 20,
      } = req.body;

      if (!entityId) {
        res.status(400).json({ error: 'entityId is required' });
        return;
      }

      const results = await searchEngine.queryGraphNeighbors(entityId, {
        direction,
        includeRelationships,
        excludeRelationships,
        includeEntityTypes,
        limit,
      });

      res.json({
        neighbors: results.neighbors.map(n => ({
          entity: formatNodeForApi(n.node, false, 0),
          relationship: n.relationship,
        })),
        metadata: results.metadata,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Graph query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

/**
 * Format a GraphNode for API response
 */
function formatNodeForApi(
  node: GraphNode,
  includeContent: boolean,
  contentLimit: number
): {
  id: string;
  type: string;
  status: string;
  title: string;
  content?: string;
  properties: Record<string, unknown>;
  filePath: string;
  created: Date;
  updated: Date;
} {
  let content: string | undefined;

  if (includeContent && node.content) {
    content = node.content.trim();
    if (contentLimit > 0 && content.length > contentLimit) {
      content = content.substring(0, contentLimit) + '...';
    }
  }

  return {
    id: node.id,
    type: node.type,
    status: node.status,
    title: node.title,
    content,
    properties: node.properties,
    filePath: node.filePath,
    created: node.created,
    updated: node.updated,
  };
}

/**
 * API key authentication middleware
 */
export function createAuthMiddleware(apiKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const providedKey = req.headers['x-api-key'];

    if (providedKey !== apiKey) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }

    next();
  };
}

/**
 * Create and configure the Express app for HTTP bridge
 */
export function createHttpBridge(
  config: HttpBridgeConfig,
  context: HttpBridgeContext
): express.Application {
  const app = express();
  const { vaultReader, database } = context;
  const allowAnyOrigin = config.corsOrigins.includes('*');

  // Middleware
  app.use(express.json({ limit: '1mb' }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowAnyOrigin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
    credentials: !allowAnyOrigin,
  }));

  // Optional API key authentication
  if (config.apiKey) {
    app.use('/api', createAuthMiddleware(config.apiKey));
  }

  // Mount the API router
  const router = createBridgeRouter(context);
  app.get('/health', (_req: Request, res: Response) => {
    try {
      const stats = database.getStats();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        stats: {
          nodes: stats.nodes,
          relationships: stats.relationships,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get health status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  app.get('/stats', (_req: Request, res: Response) => {
    try {
      const vaultStats = vaultReader.getStats();
      const dbStats = database.getStats();

      res.json({
        vault: {
          totalNotes: vaultStats.totalNotes,
          byType: vaultStats.byType,
          byStatus: vaultStats.byStatus,
        },
        graph: {
          nodes: dbStats.nodes,
          relationships: dbStats.relationships,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  app.use('/api', router);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[HTTP Bridge] Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  });

  return app;
}

/**
 * Start the HTTP bridge server
 */
export async function startHttpBridge(
  config: HttpBridgeConfig,
  context: HttpBridgeContext
): Promise<{ app: express.Application; close: () => Promise<void> }> {
  const app = createHttpBridge(config, context);

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, () => {
      console.error(`[HTTP Bridge] Listening on http://${config.host}:${config.port}`);
      console.error(`[HTTP Bridge] CORS origins: ${config.corsOrigins.join(', ')}`);
      if (config.apiKey) {
        console.error('[HTTP Bridge] API key authentication enabled');
      }

      resolve({
        app,
        close: () => {
          return new Promise<void>((resolveClose, rejectClose) => {
            server.close((err) => {
              if (err) {
                rejectClose(err);
              } else {
                resolveClose();
              }
            });
          });
        },
      });
    });

    server.on('error', (err) => {
      console.error('[HTTP Bridge] Failed to start:', err);
      reject(err);
    });
  });
}

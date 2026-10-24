/**
 * HTTP Bridge for Hivemind MCP
 *
 * Provides REST API endpoints for external services (like SillyTavern)
 * to query the Hivemind knowledge graph without using MCP protocol.
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { randomBytes, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import type { SearchEngine } from '../search/engine.js';
import type { VaultReader } from '../vault/reader.js';
import type { HivemindDatabase } from '../graph/database.js';
import type { GraphNode } from '../types/index.js';

export interface HttpBridgeConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  /**
   * Required by createHttpBridge. startHttpBridge fills it in from apiKeyFile
   * (generating a key there if needed) when it is not configured.
   */
  apiKey?: string;
  /** Where to load or persist an auto-generated API key when apiKey is unset */
  apiKeyFile?: string;
  /**
   * Extra Host header names to accept besides the loopback names and `host`,
   * e.g. a LAN hostname when binding to 0.0.0.0.
   */
  allowedHosts?: string[];
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

const LOOPBACK_HOSTNAMES = ['localhost', '127.0.0.1', '::1'];
const WILDCARD_BIND_HOSTS = ['0.0.0.0', '::'];

/**
 * Raised by the CORS origin check so the error handler can answer 403
 */
class CorsOriginError extends Error {
  constructor(origin: string) {
    super(`Origin not allowed by CORS: ${origin}`);
    this.name = 'CorsOriginError';
  }
}

/**
 * Lowercase a hostname and strip IPv6 brackets ("[::1]" -> "::1")
 */
function normalizeHostname(hostname: string): string {
  const lower = hostname.trim().toLowerCase();
  return lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;
}

/**
 * Host header names the bridge answers to: loopback names, the configured
 * bind host (unless it is a wildcard address) and any allowedHosts.
 */
export function getAllowedHostnames(config: HttpBridgeConfig): Set<string> {
  const allowed = new Set(LOOPBACK_HOSTNAMES);
  for (const host of [config.host, ...(config.allowedHosts ?? [])]) {
    const normalized = normalizeHostname(host ?? '');
    if (normalized && !WILDCARD_BIND_HOSTS.includes(normalized)) {
      allowed.add(normalized);
    }
  }
  return allowed;
}

/**
 * Host header validation middleware. Blocks DNS rebinding: a page on
 * attacker.example that re-resolves to 127.0.0.1 still sends
 * "Host: attacker.example", which is rejected here.
 */
export function createHostValidationMiddleware(allowedHostnames: Set<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const hostname = normalizeHostname(req.hostname ?? '');

    if (!allowedHostnames.has(hostname)) {
      res.status(403).json({ error: 'Host not allowed' });
      return;
    }

    next();
  };
}

/**
 * Constant-time key comparison. timingSafeEqual needs equal lengths, so on a
 * length mismatch compare expected with itself to spend the same time and
 * reveal only the key length (fixed at 64 for generated keys).
 */
function keysMatch(provided: Buffer, expected: Buffer): boolean {
  if (provided.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(provided, expected);
}

/**
 * API key authentication middleware
 */
export function createAuthMiddleware(apiKey: string) {
  const expected = Buffer.from(apiKey, 'utf8');

  return (req: Request, res: Response, next: NextFunction) => {
    const providedKey = req.headers['x-api-key'];

    if (typeof providedKey !== 'string' || !keysMatch(Buffer.from(providedKey, 'utf8'), expected)) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }

    next();
  };
}

/**
 * Return the configured API key, or load one from apiKeyFile, generating and
 * persisting a new key there (mode 0o600) on first run.
 */
export async function resolveApiKey(
  config: HttpBridgeConfig
): Promise<{ apiKey: string; source: 'config' | 'file' | 'generated' }> {
  if (config.apiKey) {
    return { apiKey: config.apiKey, source: 'config' };
  }

  if (!config.apiKeyFile) {
    throw new Error('[HTTP Bridge] Refusing to start without an API key: set http.apiKey');
  }

  const existing = await readKeyFile(config.apiKeyFile);
  if (existing) {
    return { apiKey: existing, source: 'file' };
  }

  const apiKey = randomBytes(32).toString('hex');
  await fs.mkdir(dirname(config.apiKeyFile), { recursive: true });
  try {
    await fs.writeFile(config.apiKeyFile, `${apiKey}\n`, { mode: 0o600, flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
    // Another process created the file first; use its key
    const raced = await readKeyFile(config.apiKeyFile);
    if (raced) {
      return { apiKey: raced, source: 'file' };
    }
    // The file exists but is empty: replace it. mode only applies when a
    // file is created, so tighten the existing one explicitly.
    await fs.writeFile(config.apiKeyFile, `${apiKey}\n`, { mode: 0o600 });
    await fs.chmod(config.apiKeyFile, 0o600);
  }

  return { apiKey, source: 'generated' };
}

async function readKeyFile(path: string): Promise<string | undefined> {
  try {
    const key = (await fs.readFile(path, 'utf-8')).trim();
    return key || undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
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

  if (!config.apiKey) {
    throw new Error('[HTTP Bridge] Refusing to start without an API key: set http.apiKey');
  }
  if (config.corsOrigins.includes('*')) {
    throw new Error('[HTTP Bridge] corsOrigins must list explicit origins; "*" is not allowed');
  }

  // Reject unexpected Host headers before doing any other work
  app.use(createHostValidationMiddleware(getAllowedHostnames(config)));

  // CORS configuration. Requests without an Origin (curl, server-side
  // clients, same-origin GETs) still have to pass the API key check below.
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new CorsOriginError(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
    credentials: true,
  }));

  // Middleware
  app.use(express.json({ limit: '1mb' }));

  const requireApiKey = createAuthMiddleware(config.apiKey);
  app.use('/api', requireApiKey);

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
  app.get('/stats', requireApiKey, (_req: Request, res: Response) => {
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
    if (err instanceof CorsOriginError) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }
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
  const { apiKey, source } = await resolveApiKey(config);
  const app = createHttpBridge({ ...config, apiKey }, context);

  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, () => {
      console.error(`[HTTP Bridge] Listening on http://${config.host}:${config.port}`);
      console.error(`[HTTP Bridge] CORS origins: ${config.corsOrigins.join(', ')}`);
      if (source === 'config') {
        console.error('[HTTP Bridge] API key authentication enabled');
      } else {
        const verb = source === 'generated' ? 'Generated' : 'Using';
        console.error(`[HTTP Bridge] ${verb} API key stored in ${config.apiKeyFile}`);
        console.error('[HTTP Bridge] Send it as the X-API-Key header, or set http.apiKey');
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

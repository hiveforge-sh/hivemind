import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  SearchVaultArgsSchema,
  StoreWorkflowArgsSchema,
  GenerateImageArgsSchema,
  StoreAssetArgsSchema,
  QueryAssetArgsSchema,
  ListAssetsArgsSchema,
  GetCanonStatusArgsSchema,
  SubmitForReviewArgsSchema,
  ValidateConsistencyArgsSchema,
  type HivemindConfig,
} from './types/index.js';
import { templateRegistry } from './templates/registry.js';
import { initializeTemplates } from './templates/loader.js';
import {
  generateToolsForEntityTypes,
  parseQueryToolName,
  parseListToolName,
  formatEntityWithRelationships,
  formatEntityList,
  QueryEntityArgsSchema,
  ListEntityArgsSchema,
} from './mcp/tool-generator.js';
import {
  generateTimelineTools,
  discoverTemporalTypes,
  validateDateField,
  QueryTimelineRangeArgsSchema,
  QueryTimelineBeforeArgsSchema,
  QueryTimelineAfterArgsSchema,
  QueryTimelineExactArgsSchema,
} from './mcp/timeline-tools.js';
import {
  generateGraphTools,
  QueryGraphNeighborsArgsSchema,
  QueryGraphSubgraphArgsSchema,
  QueryGraphPathArgsSchema,
  ListRelationshipTypesArgsSchema,
} from './mcp/graph-tools.js';
import { VaultReader } from './vault/reader.js';
import { VaultWatcher } from './vault/watcher.js';
import { HivemindDatabase } from './graph/database.js';
import { GraphBuilder } from './graph/builder.js';
import { SearchEngine, QueryResult } from './search/engine.js';
import type { FieldConfig } from './templates/types.js';
import type { GraphNode, GraphEdge } from './types/index.js';
import { ComfyUIClient } from './comfyui/client.js';
import { WorkflowManager } from './comfyui/workflow.js';
import { startHttpBridge, type HttpBridgeConfig } from './http/bridge.js';
import { join } from 'path';
import * as path from 'path';
import * as fs from 'fs';

/** Row shape returned from the assets SQLite table. */
interface AssetRow {
  id: string;
  asset_type: string;
  file_path: string;
  depicts: string | null;
  workflow_id: string | null;
  prompt: string | null;
  parameters: string | null;
  created: string;
  status: string;
}

/** Search filter structure matching SearchEngine.search() options. */
interface SearchFilters {
  type?: string[];
  status?: string[];
}

/** Shape of a ComfyUI node in a workflow definition. */
interface ComfyUIWorkflowNode {
  class_type?: string;
  inputs?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Shape of a ComfyUI output node result. */
interface ComfyUIOutputNode {
  images?: Array<{ filename: string; subfolder: string; type: string }>;
  [key: string]: unknown;
}

export class HivemindServer {
  private server: Server;
  private config: HivemindConfig;
  private vaultReader: VaultReader;
  private vaultWatcher: VaultWatcher;
  private database: HivemindDatabase;
  private graphBuilder: GraphBuilder;
  private searchEngine: SearchEngine;
  private comfyuiClient?: ComfyUIClient;
  private workflowManager?: WorkflowManager;
  private httpBridge?: { app: import('express').Application; close: () => void };
  private isIndexed: boolean = false;
  private queryMetrics = {
    totalQueries: 0,
    totalTokensReturned: 0,
    totalTokensSaved: 0,
  };

  constructor(config: HivemindConfig) {
    this.config = config;
    
    this.vaultReader = new VaultReader(config.vault);
    this.vaultWatcher = new VaultWatcher(config.vault);
    
    // Initialize database
    const dbPath = join(config.vault.path, '.hivemind', 'vault.db');
    this.database = new HivemindDatabase({ path: dbPath });
    this.graphBuilder = new GraphBuilder(this.database);
    this.searchEngine = new SearchEngine(this.database);
    
    // Initialize ComfyUI if enabled
    if (config.comfyui?.enabled) {
      console.error('[Server] Initializing ComfyUI integration...');
      console.error(`[Server] ComfyUI endpoint: ${config.comfyui.endpoint}`);
      console.error(`[Server] Workflows path: ${config.comfyui.workflowsPath}`);
      
      this.comfyuiClient = new ComfyUIClient(config.comfyui);
      this.workflowManager = new WorkflowManager(
        this.database,
        config.vault.path,
        config.comfyui.workflowsPath
      );
      
      console.error('[Server] ComfyUI initialized');
    } else {
      console.error('[Server] ComfyUI is disabled in config');
    }
    
    this.server = new Server(
      {
        name: 'hivemind-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.setupVaultWatcher();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Generate dynamic tools from active template
      const activeTemplate = templateRegistry.getActive();
      const dynamicTools = activeTemplate
        ? generateToolsForEntityTypes(activeTemplate.entityTypes)
        : [];

      // Generate timeline tools if template has date fields
      const temporalTypes = discoverTemporalTypes();
      const timelineTools = temporalTypes.length > 0
        ? generateTimelineTools(temporalTypes)
        : [];

      // Generate graph tools (always available)
      const graphTools = generateGraphTools();

      return {
        tools: [
          // Dynamic entity tools (query_X and list_X for each entity type)
          ...dynamicTools,

          // Timeline tools (conditional on date fields in template)
          ...timelineTools,

          // Graph tools (always available)
          ...graphTools,

          // Static tools
          {
            name: 'search_vault',
            description: 'Search across all worldbuilding content using hybrid search (keyword + semantic + graph)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query text',
                },
                filters: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['character', 'location', 'event', 'faction', 'system', 'asset', 'lore'],
                      },
                      description: 'Filter by note type',
                    },
                    status: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['draft', 'pending', 'canon', 'non-canon', 'archived'],
                      },
                      description: 'Filter by canon status',
                    },
                  },
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (1-100)',
                  default: 10,
                },
                includeContent: {
                  type: 'boolean',
                  description: 'Include content snippets in results (default: false for efficiency)',
                  default: false,
                },
                contentLimit: {
                  type: 'number',
                  description: 'Maximum characters of content per result (default: 300, max: 2000)',
                  default: 300,
                  minimum: 100,
                  maximum: 2000,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'rebuild_index',
            description: 'Force a complete rebuild of the vault index. Use this when files have been added or modified outside of normal detection.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'get_vault_stats',
            description: 'Get statistics about the vault and context savings from using MCP. Shows vault size, potential token savings, and efficiency metrics.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'query_asset',
            description: 'Get a specific asset by ID with its generation settings and metadata',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Asset ID to query',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'list_assets',
            description: 'List assets with optional filters by entity, type, status, or workflow',
            inputSchema: {
              type: 'object',
              properties: {
                depicts: {
                  type: 'string',
                  description: 'Filter by entity ID depicted in asset',
                },
                assetType: {
                  type: 'string',
                  enum: ['image', 'audio', 'video', 'document'],
                  description: 'Filter by asset type',
                },
                status: {
                  type: 'string',
                  enum: ['draft', 'pending', 'canon', 'non-canon', 'archived'],
                  description: 'Filter by approval status',
                },
                workflowId: {
                  type: 'string',
                  description: 'Filter by workflow used',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum results to return (1-100, default 20)',
                  default: 20,
                },
              },
              required: [],
            },
          },
          {
            name: 'get_canon_status',
            description: 'Get entities grouped by their canon status (draft, pending, canon, non-canon, archived)',
            inputSchema: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['draft', 'pending', 'canon', 'non-canon', 'archived'],
                  description: 'Filter to specific status',
                },
                type: {
                  type: 'string',
                  enum: ['character', 'location', 'event', 'faction', 'lore', 'asset'],
                  description: 'Filter by entity type',
                },
              },
              required: [],
            },
          },
          {
            name: 'submit_for_review',
            description: 'Submit an entity for review, changing its status from draft to pending',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Entity ID to submit for review',
                },
                notes: {
                  type: 'string',
                  description: 'Optional notes for reviewers',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'validate_consistency',
            description: 'Check for consistency issues in the vault (duplicate names, broken links, conflicting data)',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Specific entity ID to validate, or omit for full vault check',
                },
                type: {
                  type: 'string',
                  enum: ['character', 'location', 'event', 'faction', 'lore', 'asset'],
                  description: 'Filter validation to specific type',
                },
              },
              required: [],
            },
          },
          ...(this.config.comfyui?.enabled ? [
            {
              name: 'store_workflow',
              description: 'Store a ComfyUI workflow definition in the vault',
              inputSchema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique workflow identifier',
                  },
                  name: {
                    type: 'string',
                    description: 'Human-readable workflow name',
                  },
                  description: {
                    type: 'string',
                    description: 'Workflow description',
                  },
                  workflow: {
                    type: 'object',
                    description: 'ComfyUI workflow JSON',
                  },
                  contextFields: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Fields to inject from context (e.g., appearance, personality)',
                  },
                  outputPath: {
                    type: 'string',
                    description: 'Custom output path for generated images',
                  },
                },
                required: ['id', 'name', 'workflow'],
              },
            },
            {
              name: 'list_workflows',
              description: 'List all stored ComfyUI workflows',
              inputSchema: {
                type: 'object',
                properties: {},
                required: [],
              },
            },
            {
              name: 'get_workflow',
              description: 'Get a specific ComfyUI workflow by ID',
              inputSchema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Workflow ID to retrieve',
                  },
                },
                required: ['id'],
              },
            },
            {
              name: 'generate_image',
              description: 'Generate an image using ComfyUI with vault context',
              inputSchema: {
                type: 'object',
                properties: {
                  workflowId: {
                    type: 'string',
                    description: 'ID of workflow to execute',
                  },
                  contextId: {
                    type: 'string',
                    description: 'ID of character/location to use as context',
                  },
                  contextType: {
                    type: 'string',
                    enum: ['character', 'location'],
                    description: 'Type of context entity',
                  },
                  seed: {
                    type: 'number',
                    description: 'Random seed for generation (optional)',
                  },
                  overrides: {
                    type: 'object',
                    description: 'Additional workflow parameter overrides',
                  },
                },
                required: ['workflowId', 'contextId', 'contextType'],
              },
            },
            {
              name: 'store_asset',
              description: 'Store a generated asset (image) in the vault with metadata',
              inputSchema: {
                type: 'object',
                properties: {
                  assetType: {
                    type: 'string',
                    enum: ['image', 'audio', 'video', 'document'],
                    default: 'image',
                    description: 'Type of asset',
                  },
                  filePath: {
                    type: 'string',
                    description: 'Path to asset file in vault',
                  },
                  depicts: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Entity IDs depicted in asset',
                  },
                  workflowId: {
                    type: 'string',
                    description: 'Workflow used to generate asset',
                  },
                  prompt: {
                    type: 'string',
                    description: 'Generation prompt',
                  },
                  parameters: {
                    type: 'object',
                    description: 'Generation parameters (seed, steps, cfg, etc.)',
                  },
                },
                required: ['filePath'],
              },
            },
          ] : []),
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check for dynamic query_<entityType> tools
        const queryTypeName = parseQueryToolName(name);
        if (queryTypeName) {
          const entityType = templateRegistry.getEntityType(queryTypeName);
          if (entityType) {
            const parsed = QueryEntityArgsSchema.parse(args);
            return await this.handleGenericQuery(queryTypeName, entityType, parsed);
          }
        }

        // Check for dynamic list_<entityType> tools
        const listTypeName = parseListToolName(name);
        if (listTypeName) {
          const entityType = templateRegistry.getEntityType(listTypeName);
          if (entityType) {
            const parsed = ListEntityArgsSchema.parse(args);
            return await this.handleGenericList(listTypeName, entityType, parsed);
          }
        }

        // Check for timeline tools
        if (name.startsWith('query_timeline_')) {
          switch (name) {
            case 'query_timeline_range': {
              const parsed = QueryTimelineRangeArgsSchema.parse(args);
              // Validate dateField if entityType provided
              if (parsed.entityType && !validateDateField(parsed.entityType, parsed.dateField)) {
                throw new Error(`Invalid date field "${parsed.dateField}" for entity type "${parsed.entityType}"`);
              }
              return await this.handleTimelineRange(parsed);
            }
            case 'query_timeline_before': {
              const parsed = QueryTimelineBeforeArgsSchema.parse(args);
              if (parsed.entityType && !validateDateField(parsed.entityType, parsed.dateField)) {
                throw new Error(`Invalid date field "${parsed.dateField}" for entity type "${parsed.entityType}"`);
              }
              return await this.handleTimelineBefore(parsed);
            }
            case 'query_timeline_after': {
              const parsed = QueryTimelineAfterArgsSchema.parse(args);
              if (parsed.entityType && !validateDateField(parsed.entityType, parsed.dateField)) {
                throw new Error(`Invalid date field "${parsed.dateField}" for entity type "${parsed.entityType}"`);
              }
              return await this.handleTimelineAfter(parsed);
            }
            case 'query_timeline_exact': {
              const parsed = QueryTimelineExactArgsSchema.parse(args);
              if (parsed.entityType && !validateDateField(parsed.entityType, parsed.dateField)) {
                throw new Error(`Invalid date field "${parsed.dateField}" for entity type "${parsed.entityType}"`);
              }
              return await this.handleTimelineExact(parsed);
            }
          }
        }

        // Check for graph tools
        if (name.startsWith('query_graph_') || name === 'list_relationship_types') {
          switch (name) {
            case 'query_graph_neighbors': {
              const parsed = QueryGraphNeighborsArgsSchema.parse(args);
              return await this.handleGraphNeighbors(parsed);
            }
            case 'query_graph_subgraph': {
              const parsed = QueryGraphSubgraphArgsSchema.parse(args);
              return await this.handleGraphSubgraph(parsed);
            }
            case 'query_graph_path': {
              const parsed = QueryGraphPathArgsSchema.parse(args);
              return await this.handleGraphPath(parsed);
            }
            case 'list_relationship_types': {
              ListRelationshipTypesArgsSchema.parse(args);
              return await this.handleListRelationshipTypes();
            }
          }
        }

        // Static tools
        switch (name) {
          case 'search_vault': {
            const parsed = SearchVaultArgsSchema.parse(args);
            return await this.handleSearchVault(parsed);
          }
          case 'rebuild_index': {
            return await this.handleRebuildIndex();
          }
          case 'get_vault_stats': {
            return await this.handleGetVaultStats();
          }
          case 'store_workflow': {
            if (!this.workflowManager) {
              throw new Error('ComfyUI is not enabled');
            }
            const parsed = StoreWorkflowArgsSchema.parse(args);
            return await this.handleStoreWorkflow(parsed);
          }
          case 'list_workflows': {
            if (!this.workflowManager) {
              throw new Error('ComfyUI is not enabled');
            }
            return await this.handleListWorkflows();
          }
          case 'get_workflow': {
            if (!this.workflowManager) {
              throw new Error('ComfyUI is not enabled');
            }
            return await this.handleGetWorkflow(args as { id: string });
          }
          case 'generate_image': {
            if (!this.comfyuiClient || !this.workflowManager) {
              throw new Error('ComfyUI is not enabled');
            }
            const parsed = GenerateImageArgsSchema.parse(args);
            return await this.handleGenerateImage(parsed);
          }
          case 'store_asset': {
            const parsed = StoreAssetArgsSchema.parse(args);
            return await this.handleStoreAsset(parsed);
          }
          case 'query_asset': {
            const parsed = QueryAssetArgsSchema.parse(args);
            return await this.handleQueryAsset(parsed);
          }
          case 'list_assets': {
            const parsed = ListAssetsArgsSchema.parse(args);
            return await this.handleListAssets(parsed);
          }
          case 'get_canon_status': {
            const parsed = GetCanonStatusArgsSchema.parse(args);
            return await this.handleGetCanonStatus(parsed);
          }
          case 'submit_for_review': {
            const parsed = SubmitForReviewArgsSchema.parse(args);
            return await this.handleSubmitForReview(parsed);
          }
          case 'validate_consistency': {
            const parsed = ValidateConsistencyArgsSchema.parse(args);
            return await this.handleValidateConsistency(parsed);
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'vault://index',
            name: 'Vault Index',
            description: 'Complete index of all entities in the worldbuilding vault',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'vault://index') {
        await this.ensureIndexed();
        
        const stats = this.vaultReader.getStats();
        const allNotes = this.vaultReader.getAllNotes();
        
        const index = {
          vault: this.config.vault.path,
          stats,
          notes: allNotes.map(note => ({
            id: note.id,
            type: note.frontmatter.type,
            status: note.frontmatter.status,
            title: note.frontmatter.title || note.fileName,
            path: note.filePath,
            links: note.links,
          })),
        };

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(index, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  /**
   * Generic query handler for dynamically generated query_<entityType> tools.
   */
  private async handleGenericQuery(
    typeName: string,
    entityType: { name: string; displayName: string; pluralName: string; fields: FieldConfig[] },
    args: { id: string; includeContent?: boolean; contentLimit?: number }
  ) {
    await this.ensureIndexed();

    // Use search engine to get node with relationships
    const result = await this.searchEngine.getNodeWithRelationships(args.id);

    if (!result) {
      // Try fuzzy search with type filter
      const searchResults = await this.searchEngine.search(args.id, {
        limit: 5,
        filters: { type: [typeName] }
      });

      if (searchResults.nodes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `${entityType.displayName} not found: "${args.id}"\n\nTry searching with: search_vault`,
          }],
        };
      }

      // Return suggestions
      const suggestions = searchResults.nodes.map(n => `- ${n.title} (${n.id})`).join('\n');
      return {
        content: [{
          type: 'text',
          text: `${entityType.displayName} "${args.id}" not found. Did you mean:\n\n${suggestions}`,
        }],
      };
    }

    // Verify type matches
    if (result.node.type !== typeName) {
      return {
        content: [{
          type: 'text',
          text: `Entity "${args.id}" is a ${result.node.type}, not a ${typeName}.\n\nUse query_${result.node.type} instead.`,
        }],
      };
    }

    // Format response using generic formatter
    const response = formatEntityWithRelationships(
      entityType,
      result,
      args.includeContent ?? true,
      args.contentLimit ?? 500
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Generic list handler for dynamically generated list_<entityType> tools.
   */
  private async handleGenericList(
    typeName: string,
    entityType: { name: string; displayName: string; pluralName: string; fields: FieldConfig[] },
    args: { limit?: number; status?: string; includeContent?: boolean; contentLimit?: number }
  ) {
    await this.ensureIndexed();

    // Build filters
    const filters: SearchFilters = { type: [typeName] };
    if (args.status) {
      filters.status = [args.status];
    }

    // Search with empty query returns all matching entities
    const results = await this.searchEngine.search('', {
      limit: args.limit ?? 20,
      filters,
    });

    if (results.nodes.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No ${entityType.pluralName.toLowerCase()} found${args.status ? ` with status "${args.status}"` : ''}.`,
        }],
      };
    }

    // Format response using generic formatter
    const response = formatEntityList(
      entityType,
      results.nodes,
      args.includeContent ?? false,
      args.contentLimit ?? 200
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleSearchVault(args: { query: string; filters?: SearchFilters; limit?: number; includeContent?: boolean; contentLimit?: number }) {
    await this.ensureIndexed();

    // Use enhanced search engine
    const results = await this.searchEngine.search(args.query, {
      limit: args.limit || 10,
      includeRelationships: true,
      filters: args.filters,
    });

    if (results.nodes.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No results found for: "${args.query}"\n\nTry different keywords or check spelling.`,
        }],
      };
    }

    const response = this.formatSearchResults(
      results,
      args.includeContent ?? false,
      args.contentLimit ?? 300
    );

    // Track metrics
    this.queryMetrics.totalQueries++;
    const tokensReturned = Math.round(response.length / 4);
    this.queryMetrics.totalTokensReturned += tokensReturned;
    // Estimate tokens saved (if user loaded all searched files manually)
    const vaultStats = this.vaultReader.getStats();
    const avgFileSize = 2500;
    const tokensSaved = Math.round((vaultStats.totalNotes * avgFileSize / 4) - tokensReturned);
    this.queryMetrics.totalTokensSaved += tokensSaved;

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleRebuildIndex() {
    console.error('Manual index rebuild requested...');
    
    const startTime = Date.now();
    
    // Force re-scan
    await this.vaultReader.scanVault();
    const allNotes = this.vaultReader.getAllNotes();
    this.graphBuilder.buildGraph(allNotes);
    
    const elapsed = Date.now() - startTime;
    const vaultStats = this.vaultReader.getStats();
    const dbStats = this.database.getStats();
    
    const response = `# Index Rebuild Complete\n\n` +
      `✅ Successfully rebuilt vault index in ${elapsed}ms\n\n` +
      `**Statistics:**\n` +
      `- Total notes: ${vaultStats.totalNotes}\n` +
      `- Database nodes: ${dbStats.nodes}\n` +
      `- Database relationships: ${dbStats.relationships}\n\n` +
      `**Notes by type:**\n` +
      Object.entries(vaultStats.byType)
        .map(([type, count]) => `- ${type}: ${count}`)
        .join('\n');
    
    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleGetVaultStats() {
    const vaultStats = this.vaultReader.getStats();
    const dbStats = this.database.getStats();
    
    // Calculate file sizes
    const avgFileSize = 2500; // Average characters per markdown file (estimated)
    const totalVaultSize = vaultStats.totalNotes * avgFileSize;
    
    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const totalVaultTokens = Math.round(totalVaultSize / 4);
    const avgQueryTokens = 500; // Average tokens returned per query
    
    // Calculate savings
    const tokensPerFullLoad = totalVaultTokens;
    const tokensSavedPerQuery = tokensPerFullLoad - avgQueryTokens;
    const savingsPercent = ((tokensSavedPerQuery / tokensPerFullLoad) * 100).toFixed(1);
    
    // Context window comparison (Claude 3.5 Sonnet = 200k tokens)
    const contextWindow = 200000;
    const timesVaultFits = (totalVaultTokens / contextWindow).toFixed(2);
    
    const response = 
`# 📊 Hivemind MCP Value Metrics

## Vault Overview
- **Total Notes:** ${vaultStats.totalNotes.toLocaleString()}
- **Knowledge Graph Nodes:** ${dbStats.nodes.toLocaleString()}
- **Knowledge Graph Relationships:** ${dbStats.relationships.toLocaleString()}
- **Estimated Vault Size:** ~${totalVaultSize.toLocaleString()} characters (~${totalVaultTokens.toLocaleString()} tokens)

## Context Savings per Query

### Without MCP (Loading all relevant files):
- Need to manually find and paste relevant files
- Typical scenario: 5-10 related files = ~${(avgFileSize * 7).toLocaleString()} chars (~${Math.round((avgFileSize * 7) / 4).toLocaleString()} tokens)
- Risk: Missing connected information, hallucinations

### With MCP (Targeted retrieval):
- **Average response:** ~${avgQueryTokens} tokens
- **Tokens saved per query:** ~${tokensSavedPerQuery.toLocaleString()} tokens
- **Efficiency:** ${savingsPercent}% reduction in context usage
- **Benefit:** Graph-aware, always finds connections

## Scale Benefits

### Your Vault Size:
${parseFloat(timesVaultFits) > 1 
  ? `⚠️ Your vault is **${timesVaultFits}x** the size of Claude's 200k context window!
- **Impossible to load entire vault** into context at once
- **MCP is essential** for accessing this knowledge base`
  : `✅ Your vault fits in ${(parseFloat(timesVaultFits) * 100).toFixed(0)}% of Claude's context window
- Still, loading everything wastes tokens on irrelevant content
- **MCP provides targeted retrieval** for efficiency`}

### Query Efficiency:
- **Without MCP:** Limited by context window, manual file selection
- **With MCP:** Can efficiently query across **all ${vaultStats.totalNotes} notes**
- **Hybrid Search:** Vector + Graph + Keyword = Superior relevance

## Session Metrics (This Session)
- **Total Queries:** ${this.queryMetrics.totalQueries}
- **Total Tokens Returned:** ~${this.queryMetrics.totalTokensReturned.toLocaleString()}
- **Estimated Tokens Saved:** ~${this.queryMetrics.totalTokensSaved.toLocaleString()}
${this.queryMetrics.totalQueries > 0 ? `- **Average Tokens per Query:** ~${Math.round(this.queryMetrics.totalTokensReturned / this.queryMetrics.totalQueries)}` : ''}

## Value Proposition

### 1. **Unlimited Scale**
Your vault can grow infinitely - MCP only retrieves what's relevant.

### 2. **Graph Intelligence**
Automatically finds connected information through ${dbStats.relationships.toLocaleString()} relationships.

### 3. **Token Efficiency**
Save ~${savingsPercent}% of tokens per query = more queries per session.

### 4. **Consistency**
Canonical source of truth prevents AI hallucinations about your lore.

### 5. **Always Current**
File watcher keeps index updated automatically.

---
**Bottom line:** Without MCP, you'd need to manually manage ${vaultStats.totalNotes} files and risk missing connections. With MCP, get precise, graph-aware context every time.`;

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private setupVaultWatcher(): void {
    // Register change handler
    this.vaultWatcher.onChange((event, filePath) => {
      console.error(`Vault change detected: ${event} - ${filePath}`);

      // Re-index on changes
      if (event === 'add' || event === 'change') {
        void (async () => {
          await this.vaultReader.scanVault();
          const allNotes = this.vaultReader.getAllNotes();
          this.graphBuilder.buildGraph(allNotes);
        })();
      }
    });
  }

  private async ensureIndexed(): Promise<void> {
    if (!this.isIndexed) {
      // Check if database exists and has data
      const hasExistingData = this.database.hasNodes();
      
      if (hasExistingData) {
        // Check for stale index
        const latestDbTimestamp = this.database.getLatestTimestamp();
        
        if (latestDbTimestamp) {
          console.error(`Checking for changes since ${new Date(latestDbTimestamp).toISOString()}...`);
          const isStale = await this.vaultReader.checkForStaleFiles(latestDbTimestamp);
          
          if (isStale) {
            console.error('Detected modified files, rebuilding index...');
            await this.vaultReader.scanVault();
            const allNotes = this.vaultReader.getAllNotes();
            this.graphBuilder.buildGraph(allNotes);
          } else {
            console.error('Index is up to date, skipping re-scan');
          }
        } else {
          // Database exists but no timestamp, force re-index
          console.error('No timestamp found, rebuilding index...');
          await this.vaultReader.scanVault();
          const allNotes = this.vaultReader.getAllNotes();
          this.graphBuilder.buildGraph(allNotes);
        }
      } else {
        // No existing data, perform initial scan
        console.error('Performing initial index...');
        await this.vaultReader.scanVault();
        const allNotes = this.vaultReader.getAllNotes();
        this.graphBuilder.buildGraph(allNotes);
      }
      
      this.isIndexed = true;
    }
  }

  private formatSearchResults(results: QueryResult, includeContent = false, contentLimit = 300): string {
    const { nodes, metadata } = results;

    let response = `# Search Results\n\n`;
    response += `Found ${metadata.totalResults} results in ${metadata.executionTime}ms (showing ${nodes.length}):\n\n`;

    for (const node of nodes) {
      response += `## ${node.title}\n`;
      response += `- **Type**: ${node.type} | **Status**: ${node.status}\n`;
      response += `- **ID**: \`${node.id}\`\n`;
      response += `- **Path**: ${node.filePath}\n`;
      
      if (includeContent && node.content) {
        const content = node.content.trim();
        if (content.length > contentLimit) {
          response += `- **Snippet**: ${content.substring(0, contentLimit)}...\n`;
        } else {
          response += `- **Snippet**: ${content}\n`;
        }
      }
      
      response += `\n`;
    }

    return response;
  }

  private async handleStoreWorkflow(args: z.infer<typeof StoreWorkflowArgsSchema>) {
    const workflow = await this.workflowManager!.storeWorkflow(args);
    
    return {
      content: [{
        type: 'text',
        text: `# Workflow Stored\n\n` +
          `✅ Successfully stored workflow **${workflow.name}**\n\n` +
          `**Details:**\n` +
          `- ID: \`${workflow.id}\`\n` +
          `- Description: ${workflow.description || 'None'}\n` +
          `- Context Fields: ${workflow.contextFields?.join(', ') || 'None'}\n` +
          `- Created: ${workflow.created.toLocaleString()}\n\n` +
          `Workflow saved to: \`${this.config.comfyui?.workflowsPath}/${workflow.id}.json\``,
      }],
    };
  }

  private async handleListWorkflows() {
    const workflows = await this.workflowManager!.listWorkflows();
    
    if (workflows.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No workflows found. Use `store_workflow` to add one.',
        }],
      };
    }

    let response = `# ComfyUI Workflows\n\nFound ${workflows.length} workflow(s):\n\n`;
    
    for (const wf of workflows) {
      response += `## ${wf.name}\n`;
      response += `- **ID**: \`${wf.id}\`\n`;
      if (wf.description) response += `- **Description**: ${wf.description}\n`;
      if (wf.contextFields) response += `- **Context Fields**: ${wf.contextFields.join(', ')}\n`;
      response += `- **Updated**: ${wf.updated.toLocaleString()}\n\n`;
    }

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleGetWorkflow(args: { id: string }) {
    const workflow = await this.workflowManager!.getWorkflow(args.id);
    
    if (!workflow) {
      return {
        content: [{
          type: 'text',
          text: `Workflow not found: "${args.id}"`,
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `# Workflow: ${workflow.name}\n\n` +
          `**ID**: \`${workflow.id}\`\n` +
          `**Description**: ${workflow.description || 'None'}\n` +
          `**Context Fields**: ${workflow.contextFields?.join(', ') || 'None'}\n` +
          `**Created**: ${workflow.created.toLocaleString()}\n` +
          `**Updated**: ${workflow.updated.toLocaleString()}\n\n` +
          `**Workflow JSON**:\n\`\`\`json\n${JSON.stringify(workflow.workflow, null, 2)}\n\`\`\``,
      }],
    };
  }

  private async handleGenerateImage(args: z.infer<typeof GenerateImageArgsSchema>) {
    await this.ensureIndexed();

    // Get workflow
    const workflow = await this.workflowManager!.getWorkflow(args.workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${args.workflowId}`);
    }

    // Get context entity
    const contextNode = await this.searchEngine.getNodeWithRelationships(args.contextId);
    if (!contextNode) {
      throw new Error(`Context entity not found: ${args.contextId}`);
    }

    // Inject context into workflow
    // Build a comprehensive context object with sensible defaults
    const props = contextNode.node.properties || {};
    const context = {
      id: contextNode.node.id,
      name: props.name || contextNode.node.title,
      title: contextNode.node.title,
      content: contextNode.node.content,
      age: props.age || 'unknown age',
      gender: props.gender || '',
      race: props.race || 'humanoid',
      species: props.race || props.species || 'humanoid',
      // Flatten appearance properties for easier template access
      ...(props.appearance && typeof props.appearance === 'object'
        ? (() => {
            const app = props.appearance as Record<string, unknown>;
            return {
              appearance: props.appearance,
              'appearance.height': app.height || '',
              'appearance.build': app.build || 'average',
              'appearance.hair': app.hair || 'hair',
              'appearance.eyes': app.eyes || 'eyes',
              'appearance.clothing': app.clothing || 'clothing',
              'appearance.distinctive_features': app.distinctive_features || '',
            };
          })()
        : {
            appearance: {},
            'appearance.height': '',
            'appearance.build': 'average',
            'appearance.hair': 'hair',
            'appearance.eyes': 'eyes',
            'appearance.clothing': 'clothing',
            'appearance.distinctive_features': '',
          }),
      // Include any other properties
      ...props,
    };

    let workflowWithContext = this.comfyuiClient!.injectContext(
      workflow.workflow,
      context
    );

    // Apply seed if provided
    if (args.seed !== undefined) {
      // Find KSampler nodes and set seed
      for (const [, node] of Object.entries(workflowWithContext)) {
        const nodeData = node as ComfyUIWorkflowNode;
        if (nodeData.class_type?.includes('Sampler') || nodeData.class_type?.includes('KSampler')) {
          if (nodeData.inputs) {
            nodeData.inputs.seed = args.seed;
          }
        }
      }
    }

    // Apply additional overrides
    if (args.overrides) {
      workflowWithContext = { ...workflowWithContext, ...args.overrides };
    }

    // Execute workflow
    console.error(`Executing ComfyUI workflow ${args.workflowId} with context from ${args.contextId}...`);
    
    const result = await this.comfyuiClient!.executeWorkflow(workflowWithContext, (progress) => {
      console.error(`ComfyUI Progress: ${JSON.stringify(progress)}`);
    });

    // Extract output images
    const outputs = result.outputs || {};
    const imageNodes = Object.entries(outputs).filter(([, value]) => {
      const v = value as ComfyUIOutputNode;
      return v.images && Array.isArray(v.images);
    });

    if (imageNodes.length === 0) {
      throw new Error('No images generated by workflow');
    }

    // Get first image
    const [, nodeOutput] = imageNodes[0];
    const firstImage = (nodeOutput as ComfyUIOutputNode).images![0];
    
    // Download image from ComfyUI
    console.error(`Downloading image ${firstImage.filename} from ComfyUI...`);
    const imageBuffer = await this.comfyuiClient!.downloadImage(firstImage.filename, firstImage.subfolder, firstImage.type);
    
    // Save to vault
    const vaultAssetsPath = path.join(this.config.vault.path, this.config.comfyui!.assetsPath || 'assets/images');
    const assetsDir = path.join(vaultAssetsPath, args.contextType, args.contextId);
    
    // Ensure directory exists
    await fs.promises.mkdir(assetsDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const ext = path.extname(firstImage.filename);
    const filename = `${workflow.id}_${timestamp}${ext}`;
    const imagePath = path.join(assetsDir, filename);
    
    // Write image file
    await fs.promises.writeFile(imagePath, imageBuffer);
    console.error(`Image saved to: ${imagePath}`);
    
    // Get relative path for display
    const relativePath = path.relative(this.config.vault.path, imagePath).replace(/\\/g, '/');
    
    return {
      content: [{
        type: 'text',
        text: `# ✅ Image Generated Successfully!\n\n` +
          `**Image saved to vault:**\n` +
          `\`${relativePath}\`\n\n` +
          `**Details:**\n` +
          `- Context: ${contextNode.node.title} (${args.contextType})\n` +
          `- Workflow: ${workflow.name}\n` +
          `- Seed: ${args.seed || 'Random'}\n` +
          `- Original: ${firstImage.filename}\n\n` +
          `**Next steps:**\n` +
          `- Embed in note: \`![[${relativePath}]]\`\n` +
          `- Or use \`store_asset\` to add metadata`,
      }],
    };
  }

  private async handleStoreAsset(args: z.infer<typeof StoreAssetArgsSchema>) {
    const assetId = `asset-${Date.now()}`;
    
    this.database.db.prepare(`
      INSERT INTO assets (id, asset_type, file_path, depicts, workflow_id, prompt, parameters, created, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      args.assetType || 'image',
      args.filePath,
      args.depicts ? JSON.stringify(args.depicts) : null,
      args.workflowId || null,
      args.prompt || null,
      args.parameters ? JSON.stringify(args.parameters) : null,
      new Date().toISOString(),
      'draft'
    );

    return {
      content: [{
        type: 'text',
        text: `# Asset Stored\n\n` +
          `✅ Successfully stored asset\n\n` +
          `**Details:**\n` +
          `- ID: \`${assetId}\`\n` +
          `- Type: ${args.assetType || 'image'}\n` +
          `- Path: ${args.filePath}\n` +
          `- Workflow: ${args.workflowId || 'None'}\n` +
          `- Status: draft\n\n` +
          `Use the Obsidian plugin or manually create a note in \`Assets/\` directory to reference this asset.`,
      }],
    };
  }

  private async handleQueryAsset(args: z.infer<typeof QueryAssetArgsSchema>) {
    const asset = this.database.db.prepare(`
      SELECT * FROM assets WHERE id = ?
    `).get(args.id) as AssetRow | undefined;

    if (!asset) {
      return {
        content: [{
          type: 'text',
          text: `Asset not found: "${args.id}"`,
        }],
      };
    }

    const depicts = asset.depicts ? JSON.parse(asset.depicts) : [];
    const parameters = asset.parameters ? JSON.parse(asset.parameters) : {};

    let response = `# Asset: ${asset.id}\n\n`;
    response += `**Type**: ${asset.asset_type} | **Status**: ${asset.status}\n\n`;
    response += `## File\n\`${asset.file_path}\`\n\n`;

    if (depicts.length > 0) {
      response += `## Depicts\n${depicts.map((d: string) => `- ${d}`).join('\n')}\n\n`;
    }

    if (asset.workflow_id) {
      response += `## Generation\n`;
      response += `- **Workflow**: ${asset.workflow_id}\n`;
      if (asset.prompt) response += `- **Prompt**: ${asset.prompt}\n`;
      if (Object.keys(parameters).length > 0) {
        response += `- **Parameters**:\n`;
        for (const [key, value] of Object.entries(parameters)) {
          response += `  - ${key}: ${value}\n`;
        }
      }
      response += `\n`;
    }

    response += `## Metadata\n`;
    response += `- **Created**: ${asset.created}\n`;
    response += `- **Status**: ${asset.status}\n`;

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleListAssets(args: z.infer<typeof ListAssetsArgsSchema>) {
    let query = 'SELECT * FROM assets WHERE 1=1';
    const params: (string | number)[] = [];

    if (args.depicts) {
      query += ` AND depicts LIKE ?`;
      params.push(`%${args.depicts}%`);
    }
    if (args.assetType) {
      query += ` AND asset_type = ?`;
      params.push(args.assetType);
    }
    if (args.status) {
      query += ` AND status = ?`;
      params.push(args.status);
    }
    if (args.workflowId) {
      query += ` AND workflow_id = ?`;
      params.push(args.workflowId);
    }

    query += ` ORDER BY created DESC LIMIT ?`;
    params.push(args.limit || 20);

    const assets = this.database.db.prepare(query).all(...params) as AssetRow[];

    if (assets.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No assets found matching the specified filters.',
        }],
      };
    }

    let response = `# Assets\n\nFound ${assets.length} asset(s):\n\n`;

    for (const asset of assets) {
      const depicts = asset.depicts ? JSON.parse(asset.depicts) : [];
      response += `## ${asset.id}\n`;
      response += `- **Type**: ${asset.asset_type} | **Status**: ${asset.status}\n`;
      response += `- **Path**: \`${asset.file_path}\`\n`;
      if (depicts.length > 0) {
        response += `- **Depicts**: ${depicts.join(', ')}\n`;
      }
      if (asset.workflow_id) {
        response += `- **Workflow**: ${asset.workflow_id}\n`;
      }
      response += `- **Created**: ${asset.created}\n`;
      response += `\n`;
    }

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleGetCanonStatus(args: z.infer<typeof GetCanonStatusArgsSchema>) {
    await this.ensureIndexed();

    const allNotes = this.vaultReader.getAllNotes();

    // Group notes by status
    const byStatus: Record<string, Array<{ id: string; title: string; type: string; path: string }>> = {
      draft: [],
      pending: [],
      canon: [],
      'non-canon': [],
      archived: [],
    };

    for (const note of allNotes) {
      const status = note.frontmatter.status || 'draft';
      const type = note.frontmatter.type;

      // Apply filters
      if (args.status && status !== args.status) continue;
      if (args.type && type !== args.type) continue;

      if (byStatus[status]) {
        byStatus[status].push({
          id: note.id,
          title: note.frontmatter.title || note.fileName,
          type: type,
          path: note.filePath,
        });
      }
    }

    let response = `# Canon Status Overview\n\n`;

    const statusLabels: Record<string, string> = {
      draft: 'Draft (Work in Progress)',
      pending: 'Pending Review',
      canon: 'Canon (Approved)',
      'non-canon': 'Non-Canon',
      archived: 'Archived',
    };

    for (const [status, notes] of Object.entries(byStatus)) {
      if (args.status && status !== args.status) continue;

      response += `## ${statusLabels[status]} (${notes.length})\n\n`;

      if (notes.length === 0) {
        response += `*No entities*\n\n`;
      } else {
        for (const note of notes) {
          response += `- **${note.title}** (${note.type}) — \`${note.id}\`\n`;
        }
        response += `\n`;
      }
    }

    // Summary
    const total = Object.values(byStatus).reduce((sum, arr) => sum + arr.length, 0);
    response += `---\n**Total**: ${total} entities\n`;

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleSubmitForReview(args: z.infer<typeof SubmitForReviewArgsSchema>) {
    await this.ensureIndexed();

    // Find the note
    const note = this.vaultReader.getAllNotes().find(n => n.id === args.id);

    if (!note) {
      return {
        content: [{
          type: 'text',
          text: `Entity not found: "${args.id}"`,
        }],
        isError: true,
      };
    }

    const currentStatus = note.frontmatter.status || 'draft';

    if (currentStatus !== 'draft') {
      return {
        content: [{
          type: 'text',
          text: `Cannot submit for review: Entity "${args.id}" is currently "${currentStatus}", not "draft".\n\nOnly draft entities can be submitted for review.`,
        }],
        isError: true,
      };
    }

    // Note: This tool reports what needs to change but doesn't modify files directly.
    // The user should update the frontmatter manually or use Obsidian.
    let response = `# Submit for Review: ${note.frontmatter.title || note.fileName}\n\n`;
    response += `**Entity**: ${args.id}\n`;
    response += `**Current Status**: ${currentStatus}\n`;
    response += `**New Status**: pending\n\n`;

    if (args.notes) {
      response += `**Review Notes**: ${args.notes}\n\n`;
    }

    response += `## Action Required\n\n`;
    response += `Update the frontmatter in \`${note.filePath}\`:\n\n`;
    response += `\`\`\`yaml\n`;
    response += `status: pending\n`;
    response += `\`\`\`\n\n`;
    response += `The MCP server will detect the change automatically.\n`;

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleValidateConsistency(args: z.infer<typeof ValidateConsistencyArgsSchema>) {
    await this.ensureIndexed();

    const allNotes = this.vaultReader.getAllNotes();
    const issues: string[] = [];

    // Filter notes if specific ID or type requested
    let notesToCheck = allNotes;
    if (args.id) {
      notesToCheck = allNotes.filter(n => n.id === args.id);
      if (notesToCheck.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Entity not found: "${args.id}"`,
          }],
          isError: true,
        };
      }
    }
    if (args.type) {
      notesToCheck = notesToCheck.filter(n => n.frontmatter.type === args.type);
    }

    // Check 1: Duplicate IDs
    const idCounts = new Map<string, string[]>();
    for (const note of allNotes) {
      const paths = idCounts.get(note.id) || [];
      paths.push(note.filePath);
      idCounts.set(note.id, paths);
    }
    for (const [id, paths] of idCounts) {
      if (paths.length > 1) {
        issues.push(`**Duplicate ID** \`${id}\` found in:\n${paths.map(p => `  - ${p}`).join('\n')}`);
      }
    }

    // Check 2: Broken wikilinks
    for (const note of notesToCheck) {
      for (const link of note.links) {
        const linkLower = link.toLowerCase();
        // Check if link resolves to any note
        const found = allNotes.some(n =>
          n.id === link ||
          (n.frontmatter.title || n.fileName).toLowerCase() === linkLower ||
          n.fileName.toLowerCase() === linkLower ||
          n.fileName.toLowerCase() === linkLower + '.md'
        );
        if (!found) {
          issues.push(`**Broken link** in \`${note.filePath}\`: [[${link}]]`);
        }
      }
    }

    // Check 3: Missing required fields
    for (const note of notesToCheck) {
      if (!note.frontmatter.type) {
        issues.push(`**Missing type** in \`${note.filePath}\``);
      }
      if (!note.frontmatter.id && !note.id) {
        issues.push(`**Missing ID** in \`${note.filePath}\``);
      }
    }

    // Check 4: Canon entities referencing non-canon
    const canonNotes = allNotes.filter(n => n.frontmatter.status === 'canon');
    for (const note of canonNotes) {
      if (!notesToCheck.includes(note) && !args.id) continue;

      for (const link of note.links) {
        const linkedNote = allNotes.find(n =>
          n.id === link ||
          (n.frontmatter.title || n.fileName).toLowerCase() === link.toLowerCase()
        );
        if (linkedNote && linkedNote.frontmatter.status === 'draft') {
          issues.push(`**Canon → Draft reference**: \`${note.filePath}\` links to draft entity [[${link}]]`);
        }
      }
    }

    // Format response
    let response = `# Consistency Validation\n\n`;

    if (args.id) {
      response += `**Checking**: ${args.id}\n\n`;
    } else if (args.type) {
      response += `**Checking**: All ${args.type} entities\n\n`;
    } else {
      response += `**Checking**: Full vault (${allNotes.length} entities)\n\n`;
    }

    if (issues.length === 0) {
      response += `✅ **No issues found!**\n\nAll checked entities are consistent.`;
    } else {
      response += `⚠️ **Found ${issues.length} issue(s)**:\n\n`;
      for (const issue of issues) {
        response += `${issue}\n\n`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle timeline range query
   */
  private async handleTimelineRange(args: z.infer<typeof QueryTimelineRangeArgsSchema>) {
    await this.ensureIndexed();

    const results = await this.searchEngine.queryTimelineRange(
      args.startDate,
      args.endDate,
      args.dateField,
      {
        entityType: args.entityType,
        sortOrder: args.sortOrder,
        limit: args.limit,
      }
    );

    const response = this.formatTimelineResults(
      results.nodes,
      results.relationships,
      results.metadata.dateField,
      `${args.startDate} to ${args.endDate}`,
      args.sortOrder || 'asc',
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle timeline before query
   */
  private async handleTimelineBefore(args: z.infer<typeof QueryTimelineBeforeArgsSchema>) {
    await this.ensureIndexed();

    const results = await this.searchEngine.queryTimelineBefore(
      args.date,
      args.dateField,
      {
        entityType: args.entityType,
        sortOrder: args.sortOrder,
        limit: args.limit,
      }
    );

    const response = this.formatTimelineResults(
      results.nodes,
      results.relationships,
      results.metadata.dateField,
      `before ${args.date}`,
      args.sortOrder || 'desc',
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle timeline after query
   */
  private async handleTimelineAfter(args: z.infer<typeof QueryTimelineAfterArgsSchema>) {
    await this.ensureIndexed();

    const results = await this.searchEngine.queryTimelineAfter(
      args.date,
      args.dateField,
      {
        entityType: args.entityType,
        sortOrder: args.sortOrder,
        limit: args.limit,
      }
    );

    const response = this.formatTimelineResults(
      results.nodes,
      results.relationships,
      results.metadata.dateField,
      `after ${args.date}`,
      args.sortOrder || 'asc',
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle timeline exact query
   */
  private async handleTimelineExact(args: z.infer<typeof QueryTimelineExactArgsSchema>) {
    await this.ensureIndexed();

    const results = await this.searchEngine.queryTimelineExact(
      args.date,
      args.dateField,
      {
        entityType: args.entityType,
        sortOrder: args.sortOrder,
        limit: args.limit,
      }
    );

    const response = this.formatTimelineResults(
      results.nodes,
      results.relationships,
      results.metadata.dateField,
      `on ${args.date}`,
      args.sortOrder || 'asc',
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Format timeline query results
   */
  private formatTimelineResults(
    nodes: GraphNode[],
    relationships: GraphEdge[],
    dateField: string,
    rangeDescription: string,
    sortOrder: string,
    executionTime: number
  ): string {
    if (nodes.length === 0) {
      return `# Timeline Results: ${dateField} ${rangeDescription}\n\nNo entities found.`;
    }

    // Group by entity type
    const byType = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      const existing = byType.get(node.type) || [];
      existing.push(node);
      byType.set(node.type, existing);
    }

    let response = `# Timeline Results: ${dateField} ${rangeDescription}\n\n`;
    response += `Found ${nodes.length} entities across ${byType.size} type(s).\n\n`;

    // Format each type group
    for (const [type, typeNodes] of byType.entries()) {
      response += `## ${type} (${typeNodes.length})\n\n`;

      for (const node of typeNodes) {
        const dateValue = (node.properties as Record<string, unknown>)?.[dateField] || 'unknown';

        response += `### ${node.title}\n`;
        response += `- **Date**: ${dateValue}\n`;
        response += `- **Type**: ${node.type} | **Status**: ${node.status}\n`;
        response += `- **ID**: \`${node.id}\`\n`;

        // Show key frontmatter fields
        const props = node.properties as Record<string, unknown>;
        if (props) {
          for (const [key, value] of Object.entries(props)) {
            if (key !== dateField && key !== 'id' && key !== 'type' && key !== 'status' && key !== 'title') {
              if (typeof value === 'string' || typeof value === 'number') {
                response += `- **${key}**: ${value}\n`;
              }
            }
          }
        }

        // Show relationships
        const nodeRels = relationships.filter(r => r.sourceId === node.id || r.targetId === node.id);
        if (nodeRels.length > 0) {
          response += `- **Relationships**: `;
          const relStrings = nodeRels.slice(0, 5).map(r => {
            const otherNodeId = r.sourceId === node.id ? r.targetId : r.sourceId;
            const direction = r.sourceId === node.id ? '→' : '←';
            return `${direction} ${otherNodeId} (${r.relationType})`;
          });
          response += relStrings.join(', ');
          if (nodeRels.length > 5) {
            response += ` and ${nodeRels.length - 5} more`;
          }
          response += `\n`;
        }

        response += `\n`;
      }
    }

    response += `---\n*Query: ${dateField} ${rangeDescription} | Sort: ${sortOrder} | Time: ${executionTime}ms*\n`;

    return response;
  }

  /**
   * Handle graph neighbors query
   */
  private async handleGraphNeighbors(args: z.infer<typeof QueryGraphNeighborsArgsSchema>) {
    await this.ensureIndexed();

    // Resolve entity ID
    const entityId = await this.resolveEntityId(args.entityId);
    if (!entityId) {
      return {
        content: [{
          type: 'text',
          text: `Entity not found: "${args.entityId}"\n\nTry searching with: search_vault`,
        }],
      };
    }

    const results = await this.searchEngine.queryGraphNeighbors(entityId, {
      direction: args.direction,
      includeRelationships: args.includeRelationships,
      excludeRelationships: args.excludeRelationships,
      includeEntityTypes: args.includeEntityTypes,
      limit: args.limit,
    });

    const response = this.formatGraphNeighborsResults(
      entityId,
      results.neighbors,
      args.direction || 'both',
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle graph subgraph query
   */
  private async handleGraphSubgraph(args: z.infer<typeof QueryGraphSubgraphArgsSchema>) {
    await this.ensureIndexed();

    // Resolve entity ID
    const entityId = await this.resolveEntityId(args.entityId);
    if (!entityId) {
      return {
        content: [{
          type: 'text',
          text: `Entity not found: "${args.entityId}"\n\nTry searching with: search_vault`,
        }],
      };
    }

    const results = await this.searchEngine.queryGraphSubgraph(entityId, args.depth || 2, {
      direction: args.direction,
      includeRelationships: args.includeRelationships,
      excludeRelationships: args.excludeRelationships,
      includeEntityTypes: args.includeEntityTypes,
      includeIntermediateNodes: args.includeIntermediateNodes,
      limit: args.limit,
    });

    const response = this.formatGraphSubgraphResults(
      entityId,
      results.nodes,
      results.metadata.depth,
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle graph path query
   */
  private async handleGraphPath(args: z.infer<typeof QueryGraphPathArgsSchema>) {
    await this.ensureIndexed();

    // Resolve both entity IDs
    const fromEntityId = await this.resolveEntityId(args.fromEntityId);
    if (!fromEntityId) {
      return {
        content: [{
          type: 'text',
          text: `Starting entity not found: "${args.fromEntityId}"\n\nTry searching with: search_vault`,
        }],
      };
    }

    const toEntityId = await this.resolveEntityId(args.toEntityId);
    if (!toEntityId) {
      return {
        content: [{
          type: 'text',
          text: `Target entity not found: "${args.toEntityId}"\n\nTry searching with: search_vault`,
        }],
      };
    }

    const results = await this.searchEngine.queryGraphPath(fromEntityId, toEntityId, {
      includeRelationships: args.includeRelationships,
      maxDepth: args.maxDepth,
    });

    const response = this.formatGraphPathResults(
      fromEntityId,
      toEntityId,
      results.found,
      results.path,
      results.edges,
      results.metadata.executionTime
    );

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Handle list relationship types
   */
  private async handleListRelationshipTypes() {
    const results = await this.searchEngine.listRelationshipTypes();

    if (results.types.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No relationship types found. Ensure a template is active.',
        }],
      };
    }

    let response = `# Relationship Types\n\nAvailable relationship types in vault:\n\n`;

    for (const type of results.types) {
      response += `## ${type.label || type.id}\n`;
      response += `- **ID**: \`${type.id}\`\n`;
      if (type.description) {
        response += `- **Description**: ${type.description}\n`;
      }
      response += `\n`;
    }

    response += `---\n*Total: ${results.types.length} relationship types | Time: ${results.metadata.executionTime}ms*\n`;

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  /**
   * Resolve entity ID from various formats (Type:name, direct ID, name search)
   */
  private async resolveEntityId(entityId: string): Promise<string | null> {
    // Try Type:name format first
    if (entityId.includes(':')) {
      const [type, name] = entityId.split(':', 2);
      const results = await this.searchEngine.search(name, {
        limit: 5,
        filters: { type: [type.toLowerCase()] },
      });
      if (results.nodes.length > 0) {
        return results.nodes[0].id;
      }
    }

    // Try direct ID match
    const node = this.database.getNode(entityId);
    if (node) {
      return node.id;
    }

    // Try name search (exact match preferred)
    const results = await this.searchEngine.search(entityId, { limit: 5 });
    if (results.nodes.length > 0) {
      // Prefer exact title match
      for (const node of results.nodes) {
        if (node.title.toLowerCase() === entityId.toLowerCase()) {
          return node.id;
        }
      }
      // Otherwise return first result
      return results.nodes[0].id;
    }

    return null;
  }

  /**
   * Format graph neighbors results
   */
  private formatGraphNeighborsResults(
    entityId: string,
    neighbors: Array<{ node: GraphNode; relationship: { type: string; direction: 'outgoing' | 'incoming' } }>,
    direction: string,
    executionTime: number
  ): string {
    if (neighbors.length === 0) {
      return `# Graph Neighbors: ${entityId}\n\nNo neighbors found (direction: ${direction}).`;
    }

    // Group by relationship type
    const byRelType = new Map<string, Array<{ node: GraphNode; direction: 'outgoing' | 'incoming' }>>();
    for (const neighbor of neighbors) {
      const existing = byRelType.get(neighbor.relationship.type) || [];
      existing.push({ node: neighbor.node, direction: neighbor.relationship.direction });
      byRelType.set(neighbor.relationship.type, existing);
    }

    let response = `# Graph Neighbors: ${entityId}\n\n`;
    response += `Found ${neighbors.length} neighbors across ${byRelType.size} relationship type(s).\n\n`;

    // Format each relationship type group
    for (const [relType, relNeighbors] of byRelType.entries()) {
      response += `## ${relType} (${relNeighbors.length})\n\n`;

      for (const { node, direction: dir } of relNeighbors) {
        const arrow = dir === 'outgoing' ? '→' : '←';
        response += `### ${arrow} ${node.title}\n`;
        response += `- **Type**: ${node.type} | **Status**: ${node.status}\n`;
        response += `- **ID**: \`${node.id}\`\n`;

        // Show description if available
        const props = node.properties as Record<string, unknown>;
        if (props?.description && typeof props.description === 'string') {
          const desc = props.description.trim();
          const truncated = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
          response += `- **Description**: ${truncated}\n`;
        }

        response += `\n`;
      }
    }

    response += `---\n*Direction: ${direction} | Time: ${executionTime}ms*\n`;

    return response;
  }

  /**
   * Format graph subgraph results
   */
  private formatGraphSubgraphResults(
    entityId: string,
    nodes: GraphNode[],
    depth: number,
    executionTime: number
  ): string {
    if (nodes.length === 0) {
      return `# Graph Subgraph: ${entityId} (depth: ${depth})\n\nNo entities found.`;
    }

    // Group by entity type
    const byType = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      const existing = byType.get(node.type) || [];
      existing.push(node);
      byType.set(node.type, existing);
    }

    let response = `# Graph Subgraph: ${entityId} (depth: ${depth})\n\n`;
    response += `Found ${nodes.length} entities across ${byType.size} type(s).\n\n`;

    // Format each type group
    for (const [type, typeNodes] of byType.entries()) {
      response += `## ${type} (${typeNodes.length})\n\n`;

      for (const node of typeNodes) {
        response += `- **${node.title}** (\`${node.id}\`) — ${node.status}\n`;

        // Show brief description if available
        const props = node.properties as Record<string, unknown>;
        if (props?.description && typeof props.description === 'string') {
          const desc = props.description.trim();
          const truncated = desc.length > 100 ? desc.substring(0, 100) + '...' : desc;
          response += `  ${truncated}\n`;
        }
      }

      response += `\n`;
    }

    response += `---\n*Depth: ${depth} hops | Time: ${executionTime}ms*\n`;

    return response;
  }

  /**
   * Format graph path results
   */
  private formatGraphPathResults(
    fromEntityId: string,
    toEntityId: string,
    found: boolean,
    path: GraphNode[],
    edges: Array<{ from: string; to: string; type: string }>,
    executionTime: number
  ): string {
    if (!found) {
      return `# Graph Path: ${fromEntityId} → ${toEntityId}\n\nNo path found.\n\n` +
        `---\n*Time: ${executionTime}ms*\n`;
    }

    let response = `# Graph Path: ${fromEntityId} → ${toEntityId}\n\n`;
    response += `Path found: ${path.length} hops\n\n`;

    response += `## Path Sequence\n\n`;
    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      response += `${i + 1}. **${node.title}** (\`${node.id}\`) — ${node.type}\n`;

      if (i < edges.length) {
        const edge = edges[i];
        response += `   ↓ via ${edge.type}\n`;
      }
    }

    response += `\n## Path Details\n\n`;
    for (const node of path) {
      response += `### ${node.title}\n`;
      response += `- **Type**: ${node.type} | **Status**: ${node.status}\n`;
      response += `- **ID**: \`${node.id}\`\n`;

      // Show brief description if available
      const props = node.properties as Record<string, unknown>;
      if (props?.description && typeof props.description === 'string') {
        const desc = props.description.trim();
        const truncated = desc.length > 150 ? desc.substring(0, 150) + '...' : desc;
        response += `- **Description**: ${truncated}\n`;
      }

      response += `\n`;
    }

    response += `---\n*Path length: ${path.length} nodes, ${edges.length} edges | Time: ${executionTime}ms*\n`;

    return response;
  }

  async start(): Promise<void> {
    // Initialize template system
    console.error('[Server] Initializing template system...');
    try {
      const config = initializeTemplates();
      console.error(`[Server] Template initialized: ${config.activeTemplate}`);
    } catch (err) {
      console.error('[Server] Warning: Template init failed:', err);
      // Continue without templates - backwards compatibility
    }

    // Initialize date columns for timeline queries
    const temporalTypes = discoverTemporalTypes();
    if (temporalTypes.length > 0) {
      const allDateFields = Array.from(
        new Set(temporalTypes.flatMap(t => t.dateFields.map(f => f.name)))
      );
      console.error(`[Server] Initializing date columns: ${allDateFields.join(', ')}`);
      this.database.initializeDateColumns(allDateFields);
    }

    // Initial vault scan
    console.error('Performing initial vault scan...');
    await this.vaultReader.scanVault();
    
    // Build knowledge graph
    const allNotes = this.vaultReader.getAllNotes();
    this.graphBuilder.buildGraph(allNotes);
    
    this.isIndexed = true;

    // Scan workflows directory if ComfyUI is enabled
    if (this.workflowManager) {
      console.error('[Server] ComfyUI is enabled, scanning workflows directory...');
      await this.workflowManager.scanWorkflowsDirectory();
      console.error('[Server] Workflow scan complete');
    } else {
      console.error('[Server] ComfyUI is disabled or not configured');
    }

    // Start file watcher
    if (this.config.vault.watchForChanges) {
      this.vaultWatcher.start();
    }

    // Start HTTP bridge if enabled
    if (this.config.http?.enabled) {
      const httpConfig: HttpBridgeConfig = {
        port: this.config.http.port || 3847,
        host: this.config.http.host || 'localhost',
        corsOrigins: this.config.http.corsOrigins || ['http://localhost:8000'],
        apiKey: this.config.http.apiKey,
      };

      this.httpBridge = await startHttpBridge(httpConfig, {
        searchEngine: this.searchEngine,
        vaultReader: this.vaultReader,
        database: this.database,
      });
    }

    // Start MCP server (stdio transport)
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Print ready banner
    const dbStats = this.database.getStats();
    await this.printReadyBanner(dbStats);
  }

  private async printReadyBanner(stats: { nodes: number; relationships: number }) {
    const httpStatus = this.config.http?.enabled
      ? `✓ HTTP Bridge: http://${this.config.http.host || 'localhost'}:${this.config.http.port || 3847}`
      : '○ HTTP Bridge: disabled';

    console.error(`
     _______________
    /               \\
   /   .--. .--.   \\
  /   ( o ) ( o )   \\
 /     '|'   '|'     \\
/   .--+-+---+-+--.   \\
\\   |  | |   | |  |  /
 \\   \\-+-+---+-+-/  /
  \\    ( o ) ( o )  /
   \\               /
    \\____HM_____/

   HIVEMIND MCP Server

   ✓ Vault: ${this.config.vault.path}
   ✓ Graph: ${stats.nodes} nodes, ${stats.relationships} edges
   ${httpStatus}
   ✓ Ready for queries
`);

    // Display vault stats automatically
    const statsResult = await this.handleGetVaultStats();
    if (statsResult.content && statsResult.content[0]) {
      console.error('\n' + statsResult.content[0].text);
    }
  }

  /**
   * Stop the server and clean up resources
   */
  async stop(): Promise<void> {
    // Stop HTTP bridge if running
    if (this.httpBridge) {
      await this.httpBridge.close();
      console.error('[Server] HTTP bridge stopped');
    }

    // Stop file watcher
    await this.vaultWatcher.stop();
    console.error('[Server] File watcher stopped');

    // Close database
    this.database.close();
    console.error('[Server] Database closed');
  }
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  QueryCharacterArgsSchema,
  QueryLocationArgsSchema,
  SearchVaultArgsSchema,
  type HivemindConfig,
} from './types/index.js';
import { VaultReader } from './vault/reader.js';
import { VaultWatcher } from './vault/watcher.js';
import { HivemindDatabase } from './graph/database.js';
import { GraphBuilder } from './graph/builder.js';
import { SearchEngine } from './search/engine.js';
import { join } from 'path';

export class HivemindServer {
  private server: Server;
  private config: HivemindConfig;
  private vaultReader: VaultReader;
  private vaultWatcher: VaultWatcher;
  private database: HivemindDatabase;
  private graphBuilder: GraphBuilder;
  private searchEngine: SearchEngine;
  private isIndexed: boolean = false;

  constructor(config: HivemindConfig) {
    this.config = config;
    
    this.vaultReader = new VaultReader(config.vault);
    this.vaultWatcher = new VaultWatcher(config.vault);
    
    // Initialize database
    const dbPath = join(config.vault.path, '.hivemind', 'vault.db');
    this.database = new HivemindDatabase({ path: dbPath });
    this.graphBuilder = new GraphBuilder(this.database);
    this.searchEngine = new SearchEngine(this.database);
    
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
      return {
        tools: [
          {
            name: 'query_character',
            description: 'Retrieve detailed information about a character from the worldbuilding vault',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Character ID or name to query',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'query_location',
            description: 'Retrieve information about a location from the worldbuilding vault',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Location ID or name to query',
                },
              },
              required: ['id'],
            },
          },
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
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'query_character': {
            const parsed = QueryCharacterArgsSchema.parse(args);
            return await this.handleQueryCharacter(parsed);
          }
          case 'query_location': {
            const parsed = QueryLocationArgsSchema.parse(args);
            return await this.handleQueryLocation(parsed);
          }
          case 'search_vault': {
            const parsed = SearchVaultArgsSchema.parse(args);
            return await this.handleSearchVault(parsed);
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

  private async handleQueryCharacter(args: { id: string }) {
    await this.ensureIndexed();

    // Use search engine to get node with relationships
    const result = await this.searchEngine.getNodeWithRelationships(args.id);

    if (!result) {
      // Try fuzzy search
      const searchResults = await this.searchEngine.search(args.id, { 
        limit: 5,
        filters: { type: ['character'] }
      });

      if (searchResults.nodes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Character not found: "${args.id}"\n\nTry searching with: search_vault`,
          }],
        };
      }

      // Return suggestions
      const suggestions = searchResults.nodes.map(n => `- ${n.title} (${n.id})`).join('\n');
      return {
        content: [{
          type: 'text',
          text: `Character "${args.id}" not found. Did you mean:\n\n${suggestions}`,
        }],
      };
    }

    // Format comprehensive response with relationships
    const response = this.formatCharacterWithRelationships(result);

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleQueryLocation(args: { id: string }) {
    await this.ensureIndexed();

    // Use search engine to get node with relationships
    const result = await this.searchEngine.getNodeWithRelationships(args.id);

    if (!result) {
      // Try fuzzy search
      const searchResults = await this.searchEngine.search(args.id, { 
        limit: 5,
        filters: { type: ['location'] }
      });

      if (searchResults.nodes.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Location not found: "${args.id}"\n\nTry searching with: search_vault`,
          }],
        };
      }

      // Return suggestions
      const suggestions = searchResults.nodes.map(n => `- ${n.title} (${n.id})`).join('\n');
      return {
        content: [{
          type: 'text',
          text: `Location "${args.id}" not found. Did you mean:\n\n${suggestions}`,
        }],
      };
    }

    // Format comprehensive response with relationships
    const response = this.formatLocationWithRelationships(result);

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private async handleSearchVault(args: { query: string; filters?: any; limit?: number }) {
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

    const response = this.formatSearchResults(results);

    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
  }

  private setupVaultWatcher(): void {
    // Register change handler
    this.vaultWatcher.onChange(async (event, filePath) => {
      console.error(`Vault change detected: ${event} - ${filePath}`);
      
      // Re-index on changes
      if (event === 'add' || event === 'change') {
        await this.vaultReader.scanVault();
        const allNotes = this.vaultReader.getAllNotes();
        this.graphBuilder.buildGraph(allNotes);
      }
    });
  }

  private async ensureIndexed(): Promise<void> {
    if (!this.isIndexed) {
      await this.vaultReader.scanVault();
      const allNotes = this.vaultReader.getAllNotes();
      this.graphBuilder.buildGraph(allNotes);
      this.isIndexed = true;
    }
  }

  private formatCharacterWithRelationships(result: any): string {
    const { node, relatedNodes } = result;
    const props = node.properties;

    let response = `# ${node.title}\n\n`;
    response += `**Type**: Character | **Status**: ${node.status} | **ID**: \`${node.id}\`\n\n`;

    // Basic info
    if (props.age) response += `**Age**: ${props.age} | `;
    if (props.gender) response += `**Gender**: ${props.gender} | `;
    if (props.race) response += `**Race**: ${props.race}`;
    response += `\n\n`;

    // Appearance
    if (props.appearance) {
      response += `## Appearance\n`;
      if (typeof props.appearance === 'object') {
        for (const [key, value] of Object.entries(props.appearance)) {
          response += `- **${key}**: ${value}\n`;
        }
      } else {
        response += `${props.appearance}\n`;
      }
      response += `\n`;
    }

    // Personality
    if (props.personality) {
      response += `## Personality\n`;
      if (typeof props.personality === 'object') {
        for (const [key, value] of Object.entries(props.personality)) {
          response += `- **${key}**: ${JSON.stringify(value)}\n`;
        }
      } else {
        response += `${props.personality}\n`;
      }
      response += `\n`;
    }

    // Relationships (from graph)
    if (relatedNodes.length > 0) {
      response += `## Relationships\n`;
      const characters = relatedNodes.filter((n: any) => n.type === 'character');
      const locations = relatedNodes.filter((n: any) => n.type === 'location');
      
      if (characters.length > 0) {
        response += `**Characters**: ${characters.map((c: any) => c.title).join(', ')}\n`;
      }
      if (locations.length > 0) {
        response += `**Locations**: ${locations.map((l: any) => l.title).join(', ')}\n`;
      }
      response += `\n`;
    }

    response += `---\n*Source: ${node.filePath}*\n`;
    response += `*Last updated: ${new Date(node.updated).toLocaleString()}*`;

    return response;
  }

  private formatLocationWithRelationships(result: any): string {
    const { node, relatedNodes } = result;
    const props = node.properties;

    let response = `# ${node.title}\n\n`;
    response += `**Type**: Location | **Status**: ${node.status} | **ID**: \`${node.id}\`\n\n`;

    // Basic info
    if (props.region) response += `**Region**: ${props.region} | `;
    if (props.category) response += `**Category**: ${props.category} | `;
    if (props.climate) response += `**Climate**: ${props.climate}`;
    response += `\n\n`;

    // Connected entities (from graph)
    if (relatedNodes.length > 0) {
      response += `## Connected Entities\n`;
      const characters = relatedNodes.filter((n: any) => n.type === 'character');
      const locations = relatedNodes.filter((n: any) => n.type === 'location');
      
      if (characters.length > 0) {
        response += `**Inhabitants**: ${characters.map((c: any) => c.title).join(', ')}\n`;
      }
      if (locations.length > 0) {
        response += `**Connected Locations**: ${locations.map((l: any) => l.title).join(', ')}\n`;
      }
      response += `\n`;
    }

    response += `---\n*Source: ${node.filePath}*\n`;
    response += `*Last updated: ${new Date(node.updated).toLocaleString()}*`;

    return response;
  }

  private formatSearchResults(results: any): string {
    const { nodes, metadata } = results;

    let response = `# Search Results\n\n`;
    response += `Found ${metadata.totalResults} results in ${metadata.executionTime}ms (showing ${nodes.length}):\n\n`;

    for (const node of nodes) {
      response += `## ${node.title}\n`;
      response += `- **Type**: ${node.type} | **Status**: ${node.status}\n`;
      response += `- **ID**: \`${node.id}\`\n`;
      response += `- **Path**: ${node.filePath}\n\n`;
    }

    return response;
  }

  async start(): Promise<void> {
    // Initial vault scan
    console.error('Performing initial vault scan...');
    await this.vaultReader.scanVault();
    
    // Build knowledge graph
    const allNotes = this.vaultReader.getAllNotes();
    this.graphBuilder.buildGraph(allNotes);
    
    this.isIndexed = true;

    // Start file watcher
    if (this.config.vault.watchForChanges) {
      this.vaultWatcher.start();
    }

    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Hivemind MCP server started');
    console.error(`Vault path: ${this.config.vault.path}`);
    console.error(`Transport: ${this.config.server.transport}`);
    
    const vaultStats = this.vaultReader.getStats();
    const dbStats = this.database.getStats();
    console.error(`Vault: ${vaultStats.totalNotes} notes`);
    console.error(`Database: ${dbStats.nodes} nodes, ${dbStats.relationships} relationships`);
  }
}

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
import { MarkdownParser } from './parser/markdown.js';
import { HivemindDatabase } from './graph/database.js';
import { GraphBuilder } from './graph/builder.js';
import { join } from 'path';

export class HivemindServer {
  private server: Server;
  private config: HivemindConfig;
  private vaultReader: VaultReader;
  private vaultWatcher: VaultWatcher;
  private markdownParser: MarkdownParser;
  private database: HivemindDatabase;
  private graphBuilder: GraphBuilder;
  private isIndexed: boolean = false;

  constructor(config: HivemindConfig) {
    this.config = config;
    
    this.vaultReader = new VaultReader(config.vault);
    this.vaultWatcher = new VaultWatcher(config.vault);
    this.markdownParser = new MarkdownParser();
    
    // Initialize database
    const dbPath = join(config.vault.path, '.hivemind', 'vault.db');
    this.database = new HivemindDatabase({ path: dbPath });
    this.graphBuilder = new GraphBuilder(this.database);
    
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

    // Try to find character by ID or name
    const note = this.findNoteByIdOrName(args.id, 'character');

    if (!note) {
      return {
        content: [
          {
            type: 'text',
            text: `Character not found: ${args.id}\n\nAvailable characters: ${this.getAvailableNotes('character').join(', ')}`,
          },
        ],
      };
    }

    // Parse the full note content
    const fullPath = join(this.config.vault.path, note.filePath);
    const parsedNote = await this.markdownParser.parseFile(fullPath);

    // Format response
    const response = this.formatCharacterResponse(parsedNote);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleQueryLocation(args: { id: string }) {
    await this.ensureIndexed();

    // Try to find location by ID or name
    const note = this.findNoteByIdOrName(args.id, 'location');

    if (!note) {
      return {
        content: [
          {
            type: 'text',
            text: `Location not found: ${args.id}\n\nAvailable locations: ${this.getAvailableNotes('location').join(', ')}`,
          },
        ],
      };
    }

    // Parse the full note content
    const fullPath = join(this.config.vault.path, note.filePath);
    const parsedNote = await this.markdownParser.parseFile(fullPath);

    // Format response
    const response = this.formatLocationResponse(parsedNote);

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleSearchVault(args: { query: string; filters?: any; limit?: number }) {
    await this.ensureIndexed();

    const limit = args.limit || 10;
    const query = args.query;

    // Use database full-text search
    const searchResults = this.database.search(query, limit);
    
    // Get full node details for results
    const results = searchResults.map(result => {
      const node = this.database.getNode(result.id);
      return node;
    }).filter(node => node !== undefined);

    // Apply filters if provided
    const filteredResults = results.filter(node => {
      if (!node) return false;
      
      if (args.filters) {
        if (args.filters.type && !args.filters.type.includes(node.type)) {
          return false;
        }
        if (args.filters.status && !args.filters.status.includes(node.status)) {
          return false;
        }
      }
      
      return true;
    });

    return {
      content: [
        {
          type: 'text',
          text: this.formatDatabaseSearchResults(filteredResults, query, searchResults.length),
        },
      ],
    };
  }

  private setupVaultWatcher(): void {
    // Register change handler
    this.vaultWatcher.onChange(async (event, filePath) => {
      console.error(`Vault change detected: ${event} - ${filePath}`);
      
      // Re-index on changes
      if (event === 'add' || event === 'change') {
        await this.vaultReader.scanVault();
      }
    });
  }

  private async ensureIndexed(): Promise<void> {
    if (!this.isIndexed) {
      await this.vaultReader.scanVault();
      this.isIndexed = true;
    }
  }

  private findNoteByIdOrName(idOrName: string, type?: string): any {
    const normalized = idOrName.toLowerCase().replace(/\s+/g, '-');
    
    // Try exact ID match first
    let note = this.vaultReader.getNote(normalized);
    
    // Try searching all notes
    if (!note) {
      const allNotes = this.vaultReader.getAllNotes();
      note = allNotes.find(n => 
        n.id === normalized || 
        n.id.includes(normalized) ||
        n.fileName.toLowerCase().includes(idOrName.toLowerCase())
      );
    }

    // Filter by type if specified
    if (note && type && note.frontmatter.type !== type) {
      return undefined;
    }

    return note;
  }

  private getAvailableNotes(type: string): string[] {
    const notes = this.vaultReader.getNotesByType(type);
    return notes.map(n => n.frontmatter.title || n.fileName).slice(0, 10);
  }

  private formatCharacterResponse(note: any): string {
    const fm = note.frontmatter;
    
    return `# ${fm.name || fm.title || note.fileName}

**Type**: Character
**Status**: ${fm.status}
**ID**: ${fm.id}

${fm.age ? `**Age**: ${fm.age}\n` : ''}${fm.gender ? `**Gender**: ${fm.gender}\n` : ''}${fm.race ? `**Race**: ${fm.race}\n` : ''}
${fm.appearance ? `## Appearance\n${JSON.stringify(fm.appearance, null, 2)}\n` : ''}
${fm.personality ? `## Personality\n${JSON.stringify(fm.personality, null, 2)}\n` : ''}
${note.links.length > 0 ? `## Related Notes\n${note.links.map((l: string) => `- [[${l}]]`).join('\n')}\n` : ''}
## Content

${note.content.substring(0, 1000)}${note.content.length > 1000 ? '...' : ''}

---
*Source: ${note.filePath}*
*Last modified: ${note.stats.modified}*`;
  }

  private formatLocationResponse(note: any): string {
    const fm = note.frontmatter;
    
    return `# ${fm.name || fm.title || note.fileName}

**Type**: Location
**Status**: ${fm.status}
**ID**: ${fm.id}

${fm.region ? `**Region**: ${fm.region}\n` : ''}${fm.category ? `**Category**: ${fm.category}\n` : ''}${fm.climate ? `**Climate**: ${fm.climate}\n` : ''}
${note.links.length > 0 ? `## Connected Locations\n${note.links.map((l: string) => `- [[${l}]]`).join('\n')}\n` : ''}
## Description

${note.content.substring(0, 1000)}${note.content.length > 1000 ? '...' : ''}

---
*Source: ${note.filePath}*
*Last modified: ${note.stats.modified}*`;
  }

  private formatDatabaseSearchResults(results: any[], query: string, totalMatches: number): string {
    if (results.length === 0) {
      return `No results found for: "${query}"`;
    }

    let response = `# Search Results for "${query}"\n\nFound ${totalMatches} matches (showing ${results.length}):\n\n`;

    for (const node of results) {
      response += `## ${node.title}\n`;
      response += `- **Type**: ${node.type}\n`;
      response += `- **Status**: ${node.status}\n`;
      response += `- **ID**: ${node.id}\n`;
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

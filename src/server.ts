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

export class HivemindServer {
  private server: Server;
  private config: HivemindConfig;

  constructor(config: HivemindConfig) {
    this.config = config;
    
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
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                message: 'Vault index not yet implemented',
                vaultPath: this.config.vault.path,
              }, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async handleQueryCharacter(args: { id: string }) {
    // TODO: Implement actual character query
    return {
      content: [
        {
          type: 'text',
          text: `Character query not yet implemented. Requested ID: ${args.id}\n\nVault path: ${this.config.vault.path}`,
        },
      ],
    };
  }

  private async handleQueryLocation(args: { id: string }) {
    // TODO: Implement actual location query
    return {
      content: [
        {
          type: 'text',
          text: `Location query not yet implemented. Requested ID: ${args.id}\n\nVault path: ${this.config.vault.path}`,
        },
      ],
    };
  }

  private async handleSearchVault(args: { query: string; filters?: any; limit?: number }) {
    // TODO: Implement actual hybrid search
    return {
      content: [
        {
          type: 'text',
          text: `Search not yet implemented. Query: "${args.query}"\nLimit: ${args.limit || 10}\n\nVault path: ${this.config.vault.path}`,
        },
      ],
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Hivemind MCP server started');
    console.error(`Vault path: ${this.config.vault.path}`);
    console.error(`Transport: ${this.config.server.transport}`);
  }
}

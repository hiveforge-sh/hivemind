import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateQueryTool,
  generateListTool,
  generateToolsForEntityTypes,
  parseQueryToolName,
  parseListToolName,
  formatEntityWithRelationships,
  formatEntityList,
  QueryEntityArgsSchema,
  ListEntityArgsSchema,
} from '../../src/mcp/tool-generator.js';
import type { EntityTypeConfig } from '../../src/templates/types.js';
import { templateRegistry } from '../../src/templates/registry.js';
import { worldbuildingTemplate } from '../../src/templates/builtin/worldbuilding.js';

describe('Tool Generator', () => {
  const characterType: EntityTypeConfig = {
    name: 'character',
    displayName: 'Character',
    pluralName: 'Characters',
    description: 'NPCs and player characters',
    icon: 'user',
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'age', type: 'number' },
      { name: 'race', type: 'string' },
      { name: 'traits', type: 'array', arrayItemType: 'string' },
    ],
  };

  const locationFieldConfig: EntityTypeConfig = {
    name: 'location',
    displayName: 'Location',
    pluralName: 'Locations',
    description: 'Places and regions',
    icon: 'map-pin',
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'region', type: 'string' },
      { name: 'climate', type: 'enum', enumValues: ['tropical', 'temperate', 'arctic'] },
    ],
  };

  describe('generateQueryTool', () => {
    it('should generate a query tool with correct name', () => {
      const tool = generateQueryTool(characterType);
      expect(tool.name).toBe('query_character');
    });

    it('should generate a query tool with entity-specific description', () => {
      const tool = generateQueryTool(characterType);
      expect(tool.description).toContain('character');
      expect(tool.description).toContain('ID or name');
    });

    it('should include standard query parameters', () => {
      const tool = generateQueryTool(characterType);
      expect(tool.inputSchema.properties).toHaveProperty('id');
      expect(tool.inputSchema.properties).toHaveProperty('includeContent');
      expect(tool.inputSchema.properties).toHaveProperty('contentLimit');
    });

    it('should require only the id parameter', () => {
      const tool = generateQueryTool(characterType);
      expect(tool.inputSchema.required).toEqual(['id']);
    });

    it('should have correct type for inputSchema', () => {
      const tool = generateQueryTool(characterType);
      expect(tool.inputSchema.type).toBe('object');
    });
  });

  describe('generateListTool', () => {
    it('should generate a list tool with correct name', () => {
      const tool = generateListTool(characterType);
      expect(tool.name).toBe('list_character');
    });

    it('should generate a list tool with plural description', () => {
      const tool = generateListTool(characterType);
      expect(tool.description).toContain('characters');
    });

    it('should include list parameters', () => {
      const tool = generateListTool(characterType);
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.properties).toHaveProperty('status');
      expect(tool.inputSchema.properties).toHaveProperty('includeContent');
    });

    it('should not require any parameters', () => {
      const tool = generateListTool(characterType);
      expect(tool.inputSchema.required).toEqual([]);
    });
  });

  describe('generateToolsForEntityTypes', () => {
    it('should generate two tools per entity type', () => {
      const tools = generateToolsForEntityTypes([characterType]);
      expect(tools).toHaveLength(2);
    });

    it('should generate query and list tools', () => {
      const tools = generateToolsForEntityTypes([characterType]);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('query_character');
      expect(toolNames).toContain('list_character');
    });

    it('should handle multiple entity types', () => {
      const tools = generateToolsForEntityTypes([characterType, locationFieldConfig]);
      expect(tools).toHaveLength(4);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('query_character');
      expect(toolNames).toContain('list_character');
      expect(toolNames).toContain('query_location');
      expect(toolNames).toContain('list_location');
    });

    it('should handle empty array', () => {
      const tools = generateToolsForEntityTypes([]);
      expect(tools).toHaveLength(0);
    });
  });

  describe('parseQueryToolName', () => {
    it('should parse query_character', () => {
      expect(parseQueryToolName('query_character')).toBe('character');
    });

    it('should parse query_location', () => {
      expect(parseQueryToolName('query_location')).toBe('location');
    });

    it('should return null for non-query tools', () => {
      expect(parseQueryToolName('list_character')).toBeNull();
      expect(parseQueryToolName('search_vault')).toBeNull();
      expect(parseQueryToolName('query')).toBeNull();
    });
  });

  describe('parseListToolName', () => {
    it('should parse list_character', () => {
      expect(parseListToolName('list_character')).toBe('character');
    });

    it('should parse list_location', () => {
      expect(parseListToolName('list_location')).toBe('location');
    });

    it('should return null for non-list tools', () => {
      expect(parseListToolName('query_character')).toBeNull();
      expect(parseListToolName('search_vault')).toBeNull();
      expect(parseListToolName('list')).toBeNull();
    });
  });

  describe('QueryEntityArgsSchema', () => {
    it('should parse valid arguments', () => {
      const args = { id: 'char-123' };
      const parsed = QueryEntityArgsSchema.parse(args);
      expect(parsed.id).toBe('char-123');
      expect(parsed.includeContent).toBe(true);
      expect(parsed.contentLimit).toBe(500);
    });

    it('should accept all optional parameters', () => {
      const args = { id: 'char-123', includeContent: false, contentLimit: 1000 };
      const parsed = QueryEntityArgsSchema.parse(args);
      expect(parsed.includeContent).toBe(false);
      expect(parsed.contentLimit).toBe(1000);
    });

    it('should reject missing id', () => {
      expect(() => QueryEntityArgsSchema.parse({})).toThrow();
    });
  });

  describe('ListEntityArgsSchema', () => {
    it('should parse with defaults', () => {
      const parsed = ListEntityArgsSchema.parse({});
      expect(parsed.limit).toBe(20);
      expect(parsed.includeContent).toBe(false);
      expect(parsed.contentLimit).toBe(200);
    });

    it('should accept status filter', () => {
      const parsed = ListEntityArgsSchema.parse({ status: 'canon' });
      expect(parsed.status).toBe('canon');
    });

    it('should reject invalid status', () => {
      expect(() => ListEntityArgsSchema.parse({ status: 'invalid' })).toThrow();
    });
  });

  describe('formatEntityWithRelationships', () => {
    const mockResult = {
      node: {
        id: 'char-alice',
        title: 'Alice',
        type: 'character',
        status: 'canon',
        content: 'A brave adventurer.',
        filePath: 'characters/alice.md',
        updated: new Date('2024-01-01'),
        properties: {
          name: 'Alice',
          age: 25,
          race: 'Human',
        },
      },
      relatedNodes: [
        { id: 'loc-town', title: 'Hometown', type: 'location' },
        { id: 'char-bob', title: 'Bob', type: 'character' },
      ],
    };

    it('should include title and basic info', () => {
      const response = formatEntityWithRelationships(characterType, mockResult);
      expect(response).toContain('# Alice');
      expect(response).toContain('Character');
      expect(response).toContain('canon');
      expect(response).toContain('char-alice');
    });

    it('should include entity fields', () => {
      const response = formatEntityWithRelationships(characterType, mockResult);
      expect(response).toContain('Name');
      expect(response).toContain('Alice');
      expect(response).toContain('Age');
      expect(response).toContain('25');
    });

    it('should include content when requested', () => {
      const response = formatEntityWithRelationships(characterType, mockResult, true);
      expect(response).toContain('A brave adventurer');
    });

    it('should truncate long content', () => {
      const longContent = 'x'.repeat(1000);
      const resultWithLongContent = {
        ...mockResult,
        node: { ...mockResult.node, content: longContent },
      };
      const response = formatEntityWithRelationships(characterType, resultWithLongContent, true, 100);
      expect(response).toContain('Truncated at 100 chars');
    });

    it('should include relationships', () => {
      const response = formatEntityWithRelationships(characterType, mockResult);
      expect(response).toContain('Relationships');
      expect(response).toContain('Bob');
      expect(response).toContain('Hometown');
    });

    it('should include source file path', () => {
      const response = formatEntityWithRelationships(characterType, mockResult);
      expect(response).toContain('characters/alice.md');
    });
  });

  describe('formatEntityList', () => {
    const mockNodes = [
      { id: 'char-alice', title: 'Alice', type: 'character', status: 'canon', filePath: 'a.md', content: 'Content A' },
      { id: 'char-bob', title: 'Bob', type: 'character', status: 'draft', filePath: 'b.md', content: 'Content B' },
    ];

    it('should include count in header', () => {
      const response = formatEntityList(characterType, mockNodes);
      expect(response).toContain('Found 2');
      expect(response).toContain('characters');
    });

    it('should list all entities', () => {
      const response = formatEntityList(characterType, mockNodes);
      expect(response).toContain('Alice');
      expect(response).toContain('Bob');
    });

    it('should include status for each entity', () => {
      const response = formatEntityList(characterType, mockNodes);
      expect(response).toContain('canon');
      expect(response).toContain('draft');
    });

    it('should include content snippets when requested', () => {
      const response = formatEntityList(characterType, mockNodes, true);
      expect(response).toContain('Content A');
      expect(response).toContain('Content B');
    });

    it('should not include content by default', () => {
      const response = formatEntityList(characterType, mockNodes, false);
      expect(response).not.toContain('Content A');
    });
  });

  describe('Integration with Template Registry', () => {
    beforeEach(() => {
      templateRegistry.clear();
      templateRegistry.register(worldbuildingTemplate, 'builtin');
      templateRegistry.activate('worldbuilding');
    });

    afterEach(() => {
      templateRegistry.clear();
    });

    it('should generate tools for all worldbuilding entity types', () => {
      const activeTemplate = templateRegistry.getActive();
      expect(activeTemplate).not.toBeNull();

      const tools = generateToolsForEntityTypes(activeTemplate!.entityTypes);

      // Worldbuilding has 8 entity types (character, location, event, faction, lore, asset, system, reference)
      // Each generates 2 tools (query + list)
      expect(tools.length).toBeGreaterThanOrEqual(14); // At least 7 types * 2 tools

      // Check for specific tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('query_character');
      expect(toolNames).toContain('list_character');
      expect(toolNames).toContain('query_location');
      expect(toolNames).toContain('list_location');
      expect(toolNames).toContain('query_event');
      expect(toolNames).toContain('list_event');
    });

    it('should allow entity type lookup from registry', () => {
      const characterType = templateRegistry.getEntityType('character');
      expect(characterType).toBeDefined();
      expect(characterType!.name).toBe('character');
      expect(characterType!.displayName).toBe('Character');
    });
  });
});

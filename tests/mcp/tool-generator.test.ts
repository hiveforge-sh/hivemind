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

    it('should format array fields as comma-separated values', () => {
      const resultWithTraits = {
        ...mockResult,
        node: {
          ...mockResult.node,
          properties: {
            ...mockResult.node.properties,
            traits: ['brave', 'clever', 'kind'],
          },
        },
      };
      const response = formatEntityWithRelationships(characterType, resultWithTraits);
      expect(response).toContain('brave, clever, kind');
    });

    it('should skip empty array fields', () => {
      const resultWithEmptyTraits = {
        ...mockResult,
        node: {
          ...mockResult.node,
          properties: {
            ...mockResult.node.properties,
            traits: [],
          },
        },
      };
      const response = formatEntityWithRelationships(characterType, resultWithEmptyTraits);
      expect(response).not.toContain('Traits');
    });

    it('should group relationships by relationship type when edges are provided', () => {
      const resultWithEdges = {
        node: mockResult.node,
        relationships: [
          { sourceId: 'char-alice', targetId: 'char-bob', relationType: 'knows' },
          { sourceId: 'char-alice', targetId: 'loc-town', relationType: 'lives_in' },
        ],
        relatedNodes: [
          { id: 'char-bob', title: 'Bob', type: 'character' },
          { id: 'loc-town', title: 'Hometown', type: 'location' },
        ],
      };
      const response = formatEntityWithRelationships(characterType, resultWithEdges);
      expect(response).toContain('**Knows**: Bob');
      expect(response).toContain('**Lives In**: Hometown');
    });

    it('should use "related" as default relationship type when relationType is missing', () => {
      const resultWithEdges = {
        node: mockResult.node,
        relationships: [
          { sourceId: 'char-alice', targetId: 'char-bob' },
        ],
        relatedNodes: [
          { id: 'char-bob', title: 'Bob', type: 'character' },
        ],
      };
      const response = formatEntityWithRelationships(characterType, resultWithEdges);
      expect(response).toContain('**Related**: Bob');
    });

    it('should deduplicate relationship titles', () => {
      const resultWithDupes = {
        node: mockResult.node,
        relationships: [
          { sourceId: 'char-alice', targetId: 'char-bob', relationType: 'knows' },
          { sourceId: 'char-bob', targetId: 'char-alice', relationType: 'knows' },
        ],
        relatedNodes: [
          { id: 'char-bob', title: 'Bob', type: 'character' },
        ],
      };
      const response = formatEntityWithRelationships(characterType, resultWithDupes);
      // Bob should appear only once under Knows
      const knowsMatch = response.match(/\*\*Knows\*\*: (.+)/);
      expect(knowsMatch).not.toBeNull();
      expect(knowsMatch![1]).toBe('Bob');
    });

    it('should handle reverse relationships (target is current node)', () => {
      const resultWithReverse = {
        node: mockResult.node,
        relationships: [
          { sourceId: 'char-bob', targetId: 'char-alice', relationType: 'mentors' },
        ],
        relatedNodes: [
          { id: 'char-bob', title: 'Bob', type: 'character' },
        ],
      };
      const response = formatEntityWithRelationships(characterType, resultWithReverse);
      expect(response).toContain('**Mentors**: Bob');
    });

    it('should skip relationships where other node is not in relatedNodes', () => {
      const resultWithMissing = {
        node: mockResult.node,
        relationships: [
          { sourceId: 'char-alice', targetId: 'char-unknown', relationType: 'knows' },
        ],
        relatedNodes: [],
      };
      // No relationships section since no related nodes match
      const response = formatEntityWithRelationships(characterType, resultWithMissing);
      expect(response).not.toContain('## Relationships');
    });

    it('should exclude content when includeContent is false', () => {
      const response = formatEntityWithRelationships(characterType, mockResult, false);
      expect(response).not.toContain('Description');
      expect(response).not.toContain('A brave adventurer');
    });

    it('should fallback to grouping by entity type when no edges provided', () => {
      // This is the existing mockResult path (no relationships field)
      const response = formatEntityWithRelationships(characterType, mockResult);
      expect(response).toContain('## Relationships');
      // Should group by type with plural labels
      expect(response).toContain('Locations');
      expect(response).toContain('Characters');
    });

    it('should skip record type fields', () => {
      const typeWithRecord: EntityTypeConfig = {
        ...characterType,
        fields: [
          ...characterType.fields,
          { name: 'metadata', type: 'record' },
        ],
      };
      const resultWithRecord = {
        ...mockResult,
        node: {
          ...mockResult.node,
          properties: {
            ...mockResult.node.properties,
            metadata: { foo: 'bar' },
          },
        },
      };
      const response = formatEntityWithRelationships(typeWithRecord, resultWithRecord);
      expect(response).not.toContain('Metadata');
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

    it('should truncate long content snippets', () => {
      const nodesWithLongContent = [
        { id: 'char-alice', title: 'Alice', type: 'character', status: 'canon', filePath: 'a.md', content: 'x'.repeat(500) },
      ];
      const response = formatEntityList(characterType, nodesWithLongContent, true, 100);
      expect(response).toContain('...');
      expect(response).toContain('x'.repeat(100));
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

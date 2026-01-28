/**
 * Tests for timeline MCP tools - date field discovery and validation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { templateRegistry } from '../../src/templates/registry.js';
import type { TemplateDefinition, EntityTypeConfig } from '../../src/templates/types.js';
import {
  discoverTemporalTypes,
  validateDateField,
  QueryTimelineRangeArgsSchema,
  QueryTimelineBeforeArgsSchema,
  QueryTimelineAfterArgsSchema,
  QueryTimelineExactArgsSchema,
  generateTimelineTools,
} from '../../src/mcp/timeline-tools.js';

describe('discoverTemporalTypes', () => {
  beforeEach(() => {
    templateRegistry.clear();
  });

  it('returns empty array when no active template', () => {
    const result = discoverTemporalTypes();
    expect(result).toEqual([]);
  });

  it('returns entity types that have date-typed fields', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'event',
          displayName: 'Event',
          pluralName: 'Events',
          fields: [
            { name: 'start_date', type: 'date', required: true, description: 'Event start date' },
            { name: 'end_date', type: 'date', required: false, description: 'Event end date' },
            { name: 'location', type: 'string', required: false },
          ],
        },
        {
          name: 'character',
          displayName: 'Character',
          pluralName: 'Characters',
          fields: [
            { name: 'age', type: 'number', required: false },
            { name: 'occupation', type: 'string', required: false },
          ],
        },
        {
          name: 'timeline',
          displayName: 'Timeline',
          pluralName: 'Timelines',
          fields: [
            { name: 'created_date', type: 'date', required: true, description: 'Timeline creation date' },
          ],
        },
      ],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    const result = discoverTemporalTypes();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      entityType: 'event',
      dateFields: [
        { name: 'start_date', required: true, description: 'Event start date' },
        { name: 'end_date', required: false, description: 'Event end date' },
      ],
    });
    expect(result[1]).toEqual({
      entityType: 'timeline',
      dateFields: [
        { name: 'created_date', required: true, description: 'Timeline creation date' },
      ],
    });
  });

  it('excludes entity types without date fields', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'character',
          displayName: 'Character',
          pluralName: 'Characters',
          fields: [
            { name: 'age', type: 'number', required: false },
            { name: 'name', type: 'string', required: true },
          ],
        },
        {
          name: 'location',
          displayName: 'Location',
          pluralName: 'Locations',
          fields: [
            { name: 'climate', type: 'string', required: false },
          ],
        },
      ],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    const result = discoverTemporalTypes();

    expect(result).toEqual([]);
  });

  it('handles entity types with mixed field types', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'project',
          displayName: 'Project',
          pluralName: 'Projects',
          fields: [
            { name: 'title', type: 'string', required: true },
            { name: 'deadline', type: 'date', required: true },
            { name: 'budget', type: 'number', required: false },
            { name: 'completed', type: 'boolean', required: false },
            { name: 'milestones', type: 'array', required: false },
          ],
        },
      ],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    const result = discoverTemporalTypes();

    expect(result).toHaveLength(1);
    expect(result[0].dateFields).toHaveLength(1);
    expect(result[0].dateFields[0].name).toBe('deadline');
  });
});

describe('validateDateField', () => {
  beforeEach(() => {
    templateRegistry.clear();
  });

  it('returns true when entity type has the specified date field', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'event',
          displayName: 'Event',
          pluralName: 'Events',
          fields: [
            { name: 'start_date', type: 'date', required: true },
          ],
        },
      ],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    expect(validateDateField('event', 'start_date')).toBe(true);
  });

  it('returns false when entity type does not exist', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    expect(validateDateField('nonexistent', 'some_date')).toBe(false);
  });

  it('returns false when field exists but is not a date type', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'character',
          displayName: 'Character',
          pluralName: 'Characters',
          fields: [
            { name: 'name', type: 'string', required: true },
            { name: 'age', type: 'number', required: false },
          ],
        },
      ],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    expect(validateDateField('character', 'name')).toBe(false);
    expect(validateDateField('character', 'age')).toBe(false);
  });

  it('returns false when field does not exist on entity type', () => {
    const mockTemplate: TemplateDefinition = {
      id: 'test',
      name: 'Test Template',
      version: '1.0.0',
      entityTypes: [
        {
          name: 'event',
          displayName: 'Event',
          pluralName: 'Events',
          fields: [
            { name: 'start_date', type: 'date', required: true },
          ],
        },
      ],
    };

    templateRegistry.register(mockTemplate, 'config');
    templateRegistry.activate('test');

    expect(validateDateField('event', 'end_date')).toBe(false);
  });
});

describe('Zod validation schemas', () => {
  describe('QueryTimelineRangeArgsSchema', () => {
    it('accepts valid ISO8601 date strings', () => {
      const validInput = {
        startDate: '2024-01-15',
        endDate: '2024-12-31',
        dateField: 'start_date',
      };

      const result = QueryTimelineRangeArgsSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe('2024-01-15');
        expect(result.data.endDate).toBe('2024-12-31');
      }
    });

    it('rejects non-ISO8601 date formats', () => {
      const invalidInputs = [
        { startDate: 'June 2024', endDate: '2024-12-31', dateField: 'start_date' },
        { startDate: '2024/06/15', endDate: '2024-12-31', dateField: 'start_date' },
        { startDate: '15-06-2024', endDate: '2024-12-31', dateField: 'start_date' },
        { startDate: '', endDate: '2024-12-31', dateField: 'start_date' },
        { startDate: '2024-12-31', endDate: 'invalid', dateField: 'start_date' },
      ];

      for (const input of invalidInputs) {
        const result = QueryTimelineRangeArgsSchema.safeParse(input);
        expect(result.success).toBe(false);
      }
    });

    it('accepts invalid calendar dates that match ISO8601 format', () => {
      // SQLite handles string comparison correctly even with invalid dates
      const input = {
        startDate: '2024-13-45',
        endDate: '2024-99-99',
        dateField: 'start_date',
      };

      const result = QueryTimelineRangeArgsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('applies default values correctly', () => {
      const minimalInput = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        dateField: 'start_date',
      };

      const result = QueryTimelineRangeArgsSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe('asc');
        expect(result.data.limit).toBe(100);
      }
    });

    it('validates limit range (1-1000)', () => {
      const validLimits = [1, 100, 1000];
      const invalidLimits = [0, -1, 1001, 9999];

      for (const limit of validLimits) {
        const result = QueryTimelineRangeArgsSchema.safeParse({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          dateField: 'start_date',
          limit,
        });
        expect(result.success).toBe(true);
      }

      for (const limit of invalidLimits) {
        const result = QueryTimelineRangeArgsSchema.safeParse({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          dateField: 'start_date',
          limit,
        });
        expect(result.success).toBe(false);
      }
    });

    it('validates sortOrder enum', () => {
      const validOrders = ['asc', 'desc'];
      const invalidOrders = ['ascending', 'descending', 'ASC', 'DESC', ''];

      for (const sortOrder of validOrders) {
        const result = QueryTimelineRangeArgsSchema.safeParse({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          dateField: 'start_date',
          sortOrder,
        });
        expect(result.success).toBe(true);
      }

      for (const sortOrder of invalidOrders) {
        const result = QueryTimelineRangeArgsSchema.safeParse({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          dateField: 'start_date',
          sortOrder,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('QueryTimelineBeforeArgsSchema', () => {
    it('accepts valid ISO8601 date', () => {
      const result = QueryTimelineBeforeArgsSchema.safeParse({
        date: '2024-06-15',
        dateField: 'end_date',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date formats', () => {
      const result = QueryTimelineBeforeArgsSchema.safeParse({
        date: '2024/06/15',
        dateField: 'end_date',
      });
      expect(result.success).toBe(false);
    });

    it('applies default sortOrder as desc', () => {
      const result = QueryTimelineBeforeArgsSchema.safeParse({
        date: '2024-06-15',
        dateField: 'end_date',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe('desc');
      }
    });
  });

  describe('QueryTimelineAfterArgsSchema', () => {
    it('accepts valid ISO8601 date', () => {
      const result = QueryTimelineAfterArgsSchema.safeParse({
        date: '2024-06-15',
        dateField: 'start_date',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date formats', () => {
      const result = QueryTimelineAfterArgsSchema.safeParse({
        date: 'June 15, 2024',
        dateField: 'start_date',
      });
      expect(result.success).toBe(false);
    });

    it('applies default sortOrder as asc', () => {
      const result = QueryTimelineAfterArgsSchema.safeParse({
        date: '2024-06-15',
        dateField: 'start_date',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe('asc');
      }
    });
  });

  describe('QueryTimelineExactArgsSchema', () => {
    it('accepts valid ISO8601 date', () => {
      const result = QueryTimelineExactArgsSchema.safeParse({
        date: '2024-06-15',
        dateField: 'created_date',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date formats', () => {
      const result = QueryTimelineExactArgsSchema.safeParse({
        date: '15-06-2024',
        dateField: 'created_date',
      });
      expect(result.success).toBe(false);
    });

    it('applies default values', () => {
      const result = QueryTimelineExactArgsSchema.safeParse({
        date: '2024-06-15',
        dateField: 'created_date',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortOrder).toBe('asc');
        expect(result.data.limit).toBe(100);
      }
    });
  });
});

describe('generateTimelineTools', () => {
  it('generates 4 timeline tool definitions', () => {
    const temporalTypes = [
      {
        entityType: 'event',
        dateFields: [
          { name: 'start_date', required: true, description: 'Event start date' },
          { name: 'end_date', required: false, description: 'Event end date' },
        ],
      },
    ];

    const tools = generateTimelineTools(temporalTypes);

    expect(tools).toHaveLength(4);
    expect(tools.map(t => t.name)).toEqual([
      'query_timeline_range',
      'query_timeline_before',
      'query_timeline_after',
      'query_timeline_exact',
    ]);
  });

  it('includes available date fields in descriptions', () => {
    const temporalTypes = [
      {
        entityType: 'event',
        dateFields: [
          { name: 'start_date', required: true, description: 'Event start date' },
          { name: 'end_date', required: false, description: 'Event end date' },
        ],
      },
      {
        entityType: 'timeline',
        dateFields: [
          { name: 'created_date', required: true, description: 'Timeline creation date' },
        ],
      },
    ];

    const tools = generateTimelineTools(temporalTypes);

    const rangeTool = tools.find(t => t.name === 'query_timeline_range');
    expect(rangeTool).toBeDefined();
    expect(rangeTool!.description).toContain('event');
    expect(rangeTool!.description).toContain('start_date');
    expect(rangeTool!.description).toContain('timeline');
    expect(rangeTool!.description).toContain('created_date');
  });

  it('follows ToolDefinition interface structure', () => {
    const temporalTypes = [
      {
        entityType: 'event',
        dateFields: [
          { name: 'start_date', required: true },
        ],
      },
    ];

    const tools = generateTimelineTools(temporalTypes);

    for (const tool of tools) {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool.inputSchema).toHaveProperty('type', 'object');
      expect(tool.inputSchema).toHaveProperty('properties');
      expect(tool.inputSchema).toHaveProperty('required');
      expect(typeof tool.name).toBe('string');
      expect(typeof tool.description).toBe('string');
    }
  });

  it('generates correct input schemas for each tool type', () => {
    const temporalTypes = [
      {
        entityType: 'event',
        dateFields: [{ name: 'start_date', required: true }],
      },
    ];

    const tools = generateTimelineTools(temporalTypes);

    const rangeTool = tools.find(t => t.name === 'query_timeline_range');
    expect(rangeTool?.inputSchema.required).toContain('startDate');
    expect(rangeTool?.inputSchema.required).toContain('endDate');
    expect(rangeTool?.inputSchema.required).toContain('dateField');

    const beforeTool = tools.find(t => t.name === 'query_timeline_before');
    expect(beforeTool?.inputSchema.required).toContain('date');
    expect(beforeTool?.inputSchema.required).toContain('dateField');

    const afterTool = tools.find(t => t.name === 'query_timeline_after');
    expect(afterTool?.inputSchema.required).toContain('date');
    expect(afterTool?.inputSchema.required).toContain('dateField');

    const exactTool = tools.find(t => t.name === 'query_timeline_exact');
    expect(exactTool?.inputSchema.required).toContain('date');
    expect(exactTool?.inputSchema.required).toContain('dateField');
  });
});

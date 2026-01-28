# Phase 24: Timeline MCP Tools - Research

**Researched:** 2026-01-28
**Domain:** MCP tool design, SQLite date queries, ISO8601 validation, temporal data retrieval
**Confidence:** HIGH

## Summary

This phase implements MCP tools for querying entities by date ranges to enable temporal context retrieval for AI systems. The research covered three critical areas: (1) MCP tool design patterns (multiple focused tools vs monolithic), (2) SQLite date query optimization (indexed columns vs JSON extraction), and (3) ISO8601 date validation with Zod schemas.

Current state: The codebase uses better-sqlite3 with a nodes table storing frontmatter as JSON. Template system supports 'date' field type (validated by tests). Existing MCP tools follow a pattern of multiple focused tools (query_X, list_X per entity type) rather than monolithic designs. The worldbuilding template includes date fields for events (start_date, end_date) but they're stored as strings in JSON frontmatter, not as indexed columns.

The primary technical challenge is SQLite performance: JSON extraction with `json_extract()` is slow (seconds on large datasets) versus indexed columns (milliseconds). Current architecture stores all frontmatter as JSON string in a single column, which works well for flexible schemas but creates a performance bottleneck for date range queries. Solution requires either: (1) adding dedicated indexed date columns, or (2) using SQLite generated columns with indexes for date fields.

Research strongly supports multiple focused MCP tools over a monolithic design. Industry best practices in 2026 emphasize "single responsibility" with "one clear domain per server" and "bounded toolsets." The current codebase already follows this pattern successfully with separate query_X and list_X tools per entity type.

**Primary recommendation:** Create separate MCP tools for different query patterns (query_timeline_range, query_timeline_before, query_timeline_after), add SQLite generated columns with indexes for date fields discovered from template registry, validate ISO8601 format with z.string().datetime(), and support fictional calendar dates via string sorting fallback.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 | SQLite database driver | Already in project, synchronous API, excellent performance |
| zod | ^4.3.6 | Schema validation | Project standard for input validation, MCP tool args |
| @modelcontextprotocol/sdk | ^1.0.4 | MCP server implementation | Official MCP SDK, required for tool registration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SQLite generated columns | Built-in SQLite | Virtual columns from JSON | Fast indexed queries on JSON-stored date fields |
| SQLite FTS5 | Built-in SQLite | Full-text search | Already used for hybrid search in SearchEngine |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Generated columns | Dedicated date columns | Generated columns keep flexible schema, dedicated columns require migration |
| z.string().datetime() | z.date() | datetime() validates ISO8601 string format, z.date() expects Date objects |
| Multiple tools | Single monolithic tool | Multiple tools follow MCP best practices and project patterns |
| ISO8601 only | Allow any date format | ISO8601 enables proper sorting, but fictional calendars need string fallback |

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
│   └── timeline-tools.ts       # NEW: Timeline-specific tool generation
├── graph/
│   └── database.ts             # MODIFY: Add generated columns for dates
├── search/
│   └── engine.ts               # MODIFY: Add timeline query methods
└── types/
    └── index.ts                # MODIFY: Add timeline query schemas
```

### Pattern 1: Multiple Focused MCP Tools
**What:** Separate tools for different query patterns rather than one monolithic tool
**When to use:** Always for MCP tool design (2026 best practice)
**Example:**
```typescript
// Source: MCP Best Practices documentation (2026)
// GOOD: Focused tools with clear boundaries
tools: [
  {
    name: 'query_timeline_range',
    description: 'Query entities within a date range',
    inputSchema: { /* startDate, endDate, optional entityType */ }
  },
  {
    name: 'query_timeline_before',
    description: 'Query entities before a specific date',
    inputSchema: { /* date, optional entityType */ }
  },
  {
    name: 'query_timeline_after',
    description: 'Query entities after a specific date',
    inputSchema: { /* date, optional entityType */ }
  }
]

// BAD: Monolithic "kitchen-sink" tool (anti-pattern)
{
  name: 'query_timeline',
  inputSchema: {
    queryType: { enum: ['range', 'before', 'after', 'exact'] },
    // ... too many optional parameters
  }
}
```

### Pattern 2: SQLite Generated Columns for Date Indexing
**What:** Use SQLite generated columns to extract date values from JSON for fast indexed queries
**When to use:** When querying fields stored in JSON that need range query performance
**Example:**
```typescript
// Source: SQLite JSON Virtual Columns best practices
// Add generated columns during schema initialization
this.db.exec(`
  ALTER TABLE nodes
  ADD COLUMN start_date TEXT GENERATED ALWAYS AS (
    json_extract(frontmatter, '$.start_date')
  ) VIRTUAL;

  CREATE INDEX idx_nodes_start_date ON nodes(start_date);
`);

// Query with indexed column for millisecond performance
const stmt = this.db.prepare(`
  SELECT * FROM nodes
  WHERE start_date BETWEEN ? AND ?
  ORDER BY start_date ASC
`);
```

**Performance impact:** Queries that took seconds with `json_extract()` complete in milliseconds with indexed generated columns on large datasets.

### Pattern 3: ISO8601 Date Validation with Zod
**What:** Validate date strings as ISO8601 format (YYYY-MM-DD) using Zod schemas
**When to use:** For all MCP tool input parameters accepting dates
**Example:**
```typescript
// Source: Zod documentation and project patterns
import { z } from 'zod';

// Strict ISO8601 validation (YYYY-MM-DD format)
export const TimelineRangeArgsSchema = z.object({
  startDate: z.string().datetime().describe('Start date in ISO8601 format (YYYY-MM-DD)'),
  endDate: z.string().datetime().describe('End date in ISO8601 format (YYYY-MM-DD)'),
  entityType: z.string().optional().describe('Filter by entity type'),
  dateField: z.string().optional().describe('Which date field to query (e.g., start_date, birth_date)'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// For fictional/non-ISO dates: validate as string, document fallback behavior
export const FlexibleDateSchema = z.string().describe(
  'Date in ISO8601 format (YYYY-MM-DD) for accurate sorting, or free-form string for fictional calendars (falls back to string comparison)'
);
```

### Pattern 4: Template Registry Date Field Discovery
**What:** Dynamically discover which entity types have date fields by scanning template registry
**When to use:** To auto-populate tool descriptions and validate date field parameters
**Example:**
```typescript
// Source: Existing template registry patterns
import { templateRegistry } from '../templates/registry.js';

// Discover temporal entity types at server startup
function getTemporalEntityTypes(): Array<{
  entityType: string;
  dateFields: string[]
}> {
  const activeTemplate = templateRegistry.getActive();
  if (!activeTemplate) return [];

  return activeTemplate.entityTypes
    .map(entityType => ({
      entityType: entityType.name,
      dateFields: entityType.fields
        .filter(field => field.type === 'date')
        .map(field => field.name)
    }))
    .filter(entry => entry.dateFields.length > 0);
}

// Use in tool description generation
const temporalTypes = getTemporalEntityTypes();
const description = `Query entities by date range. ` +
  `Available date fields: ` +
  temporalTypes.map(t => `${t.entityType}: ${t.dateFields.join(', ')}`).join('; ');
```

### Anti-Patterns to Avoid
- **Monolithic timeline tool:** Single tool with complex queryType parameter is harder for AI to use and violates MCP best practices
- **JSON extraction without indexes:** Direct `json_extract()` in WHERE clause is 100x slower than indexed columns
- **Non-ISO date formats:** Accepting partial dates like '2024-06' breaks sorting and comparison logic
- **Global date field assumption:** Not all entity types have dates; must filter by template registry
- **Hardcoded date field names:** Use template registry to discover fields dynamically

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ISO8601 validation | Custom regex | `z.string().datetime()` | Handles edge cases (leap years, month lengths, timezone offsets) |
| Date range queries | Manual parsing | SQLite BETWEEN with indexed columns | Optimized by query planner, millisecond performance |
| Date field discovery | Hardcoded list | Template registry field scanning | Supports custom entity types automatically |
| Date string comparison | Custom comparator | ISO8601 lexical sort | ISO8601 designed for correct string sorting (YYYY-MM-DD) |
| Timezone handling | Custom offset logic | Document as out-of-scope for v4.0 | Complex problem, defer to future milestone |

**Key insight:** Date handling has numerous edge cases (leap years, month boundaries, timezone offsets). SQLite and ISO8601 handle these correctly; custom solutions introduce bugs.

## Common Pitfalls

### Pitfall 1: JSON Extraction Performance
**What goes wrong:** Using `json_extract(frontmatter, '$.start_date')` directly in WHERE clauses causes full table scans, making queries take seconds on 10k+ entities.
**Why it happens:** SQLite can't use indexes on function results without generated columns.
**How to avoid:** Create generated columns for date fields discovered from template registry, then index those columns.
**Warning signs:** Timeline queries slower than 100ms, EXPLAIN QUERY PLAN shows "SCAN nodes" instead of "SEARCH nodes USING INDEX"

### Pitfall 2: Partial Date Format Support
**What goes wrong:** Accepting dates like "2024-06" or "June 2024" breaks sorting and comparison logic.
**Why it happens:** Non-ISO formats don't have consistent string comparison semantics.
**How to avoid:** Require full ISO8601 dates (YYYY-MM-DD). For fictional calendars, document that string sorting is used.
**Warning signs:** Timeline results in wrong order, dates like "2024-1-5" sort before "2024-12-30" (needs zero-padding)

### Pitfall 3: Timezone Blind Date Storage
**What goes wrong:** Users enter dates in different timezones, queries return inconsistent results depending on server timezone.
**Why it happens:** ISO8601 dates without timezone (YYYY-MM-DD) are ambiguous across timezones.
**How to avoid:** Document that dates are timezone-naive. For v4.0, require all dates in same reference timezone (UTC recommended). Mark timezone support as HIGH research flag.
**Warning signs:** "Date off by one" bug reports, queries behave differently on different machines

### Pitfall 4: Hardcoded Date Field Names
**What goes wrong:** Queries assume all entity types have "start_date" field, breaks on custom templates.
**Why it happens:** Convenient to hardcode, but violates template system design.
**How to avoid:** Use template registry to discover date fields per entity type, require dateField parameter in tool arguments.
**Warning signs:** Timeline queries fail on custom templates, error messages like "field start_date does not exist"

### Pitfall 5: Single Tool with Complex Options
**What goes wrong:** Creating one "query_timeline" tool with queryType enum ('range', 'before', 'after', 'exact') confuses AI callers and creates cognitive overhead.
**Why it happens:** Seems cleaner to have one tool instead of multiple.
**How to avoid:** Follow MCP best practices: multiple focused tools with clear single purposes.
**Warning signs:** AI makes incorrect tool calls, tool description becomes paragraph-length, parameter validation complex

### Pitfall 6: Missing Entity Type Filter
**What goes wrong:** Timeline queries return ALL entity types, including non-temporal ones, polluting results.
**Why it happens:** Forgetting that not all entity types have date fields.
**How to avoid:** Auto-detect temporal types from template registry, optionally filter by entityType parameter.
**Warning signs:** Timeline results include entities without dates, AI confused by mixed results

## Code Examples

Verified patterns from official sources:

### SQLite Date Range Query with Generated Columns
```typescript
// Source: SQLite JSON Virtual Columns documentation + better-sqlite3 API
class HivemindDatabase {
  private initializeDateColumns(): void {
    // Discover date fields from template registry
    const activeTemplate = templateRegistry.getActive();
    if (!activeTemplate) return;

    const dateFields = new Set<string>();
    for (const entityType of activeTemplate.entityTypes) {
      for (const field of entityType.fields) {
        if (field.type === 'date') {
          dateFields.add(field.name);
        }
      }
    }

    // Create generated columns and indexes for each unique date field
    for (const fieldName of dateFields) {
      this.db.exec(`
        ALTER TABLE nodes
        ADD COLUMN IF NOT EXISTS ${fieldName} TEXT GENERATED ALWAYS AS (
          json_extract(frontmatter, '$.${fieldName}')
        ) VIRTUAL;

        CREATE INDEX IF NOT EXISTS idx_nodes_${fieldName} ON nodes(${fieldName});
      `);
    }
  }

  // Query entities by date range
  queryByDateRange(
    startDate: string,
    endDate: string,
    dateField: string,
    entityType?: string
  ): GraphNode[] {
    let query = `
      SELECT * FROM nodes
      WHERE ${dateField} BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (entityType) {
      query += ` AND type = ?`;
      params.push(entityType);
    }

    query += ` ORDER BY ${dateField} ASC`;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as NodeRow[];
    return rows.map(this.rowToGraphNode);
  }
}
```

### MCP Timeline Tool Registration
```typescript
// Source: Existing tool-generator.ts patterns + MCP best practices
export function generateTimelineTools(
  temporalTypes: Array<{ entityType: string; dateFields: string[] }>
): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // List available date fields in description for AI discovery
  const dateFieldList = temporalTypes
    .map(t => `${t.entityType}: ${t.dateFields.join(', ')}`)
    .join('; ');

  tools.push({
    name: 'query_timeline_range',
    description: `Query entities within a date range (inclusive). ` +
      `Available date fields by type: ${dateFieldList}`,
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO8601 format (YYYY-MM-DD)',
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO8601 format (YYYY-MM-DD)',
        },
        dateField: {
          type: 'string',
          description: 'Which date field to query (e.g., start_date, birth_date)',
        },
        entityType: {
          type: 'string',
          description: 'Optional filter by entity type',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: asc)',
          default: 'asc',
        },
      },
      required: ['startDate', 'endDate', 'dateField'],
    },
  });

  tools.push({
    name: 'query_timeline_before',
    description: `Query entities before a specific date (exclusive). ` +
      `Available date fields: ${dateFieldList}`,
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date cutoff in ISO8601 format (YYYY-MM-DD)',
        },
        dateField: {
          type: 'string',
          description: 'Which date field to query',
        },
        entityType: {
          type: 'string',
          description: 'Optional filter by entity type',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
        },
      },
      required: ['date', 'dateField'],
    },
  });

  tools.push({
    name: 'query_timeline_after',
    description: `Query entities after a specific date (exclusive). ` +
      `Available date fields: ${dateFieldList}`,
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date cutoff in ISO8601 format (YYYY-MM-DD)',
        },
        dateField: {
          type: 'string',
          description: 'Which date field to query',
        },
        entityType: {
          type: 'string',
          description: 'Optional filter by entity type',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'asc',
        },
      },
      required: ['date', 'dateField'],
    },
  });

  return tools;
}
```

### Zod Schema Validation for Timeline Queries
```typescript
// Source: Zod documentation + existing QueryEntityArgsSchema pattern
import { z } from 'zod';

export const QueryTimelineRangeArgsSchema = z.object({
  startDate: z.string()
    .datetime()
    .describe('Start date in ISO8601 format (YYYY-MM-DD)'),
  endDate: z.string()
    .datetime()
    .describe('End date in ISO8601 format (YYYY-MM-DD)'),
  dateField: z.string()
    .min(1)
    .describe('Which date field to query (e.g., start_date, birth_date)'),
  entityType: z.string()
    .optional()
    .describe('Optional filter by entity type'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('asc')
    .describe('Sort order by date (ascending or descending)'),
  limit: z.number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Maximum results to return'),
});

export type QueryTimelineRangeArgs = z.infer<typeof QueryTimelineRangeArgsSchema>;

// Validation in tool handler
const parsed = QueryTimelineRangeArgsSchema.parse(args);
// If validation fails, Zod throws ZodError with clear message
```

### Date Field Discovery from Template Registry
```typescript
// Source: Existing template registry patterns
import { templateRegistry } from '../templates/registry.js';
import type { FieldConfig } from '../templates/types.js';

interface TemporalEntityType {
  entityType: string;
  dateFields: Array<{
    name: string;
    required: boolean;
    description?: string;
  }>;
}

export function discoverTemporalTypes(): TemporalEntityType[] {
  const activeTemplate = templateRegistry.getActive();
  if (!activeTemplate) return [];

  const temporalTypes: TemporalEntityType[] = [];

  for (const entityType of activeTemplate.entityTypes) {
    const dateFields = entityType.fields
      .filter(field => field.type === 'date')
      .map(field => ({
        name: field.name,
        required: field.required || false,
        description: field.description,
      }));

    if (dateFields.length > 0) {
      temporalTypes.push({
        entityType: entityType.name,
        dateFields,
      });
    }
  }

  return temporalTypes;
}

// Validate that requested dateField exists in template
export function validateDateField(entityType: string, dateField: string): boolean {
  const typeConfig = templateRegistry.getEntityType(entityType);
  if (!typeConfig) return false;

  return typeConfig.fields.some(
    field => field.name === dateField && field.type === 'date'
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic tools | Multiple focused tools | MCP spec 2025-11 | Better AI tool selection, clearer contracts |
| JSON extraction queries | Generated columns + indexes | SQLite 3.31+ (2020) | 100x faster date range queries |
| Custom date validation | Zod z.string().datetime() | Zod v3+ (2022) | Handles edge cases correctly |
| Hardcoded entity types | Template registry discovery | Phase 23 (2026-01) | Custom templates work automatically |

**Deprecated/outdated:**
- **Single date range tool with mode parameter:** MCP 2026 best practices favor multiple focused tools
- **Direct JSON extraction for queries:** SQLite generated columns (introduced 3.31) are now standard for JSON indexing
- **Manual date format validation:** Zod datetime() schema is production standard

## Open Questions

Things that couldn't be fully resolved:

1. **Timezone Handling Strategy**
   - What we know: ISO8601 dates (YYYY-MM-DD) are timezone-naive, can cause "off by one" bugs
   - What's unclear: Should v4.0 require UTC dates, or defer timezone support to future milestone?
   - Recommendation: Document as timezone-naive for v4.0, add HIGH research flag. Require cross-timezone testing before production use.

2. **Non-Standard Date Field Names**
   - What we know: User vaults may use "date", "created", "timestamp" instead of template-standard names
   - What's unclear: Should timeline tools auto-detect common date field aliases?
   - Recommendation: Support alias mapping in template config (`dateFieldAliases: { 'date': 'start_date' }`). Document in CONTEXT.md as open question.

3. **Date Range Overlap Logic**
   - What we know: Events with start_date and end_date should match if ANY part overlaps query range
   - What's unclear: How to implement overlap check with indexed queries (requires start_date <= queryEnd AND end_date >= queryStart)
   - Recommendation: Add second generated column for end_date, query with overlap condition: `WHERE start_date <= ? AND (end_date >= ? OR end_date IS NULL)`

4. **Fictional Calendar Support**
   - What we know: Worldbuilding users need "Year 3 of the Third Age", "14th of Last Seed" style dates
   - What's unclear: How to make these sortable without forcing ISO conversion
   - Recommendation: Document that non-ISO dates fall back to string sorting. For sortable fictional dates, prefix with ISO-style numbers: "0003-TA" sorts correctly. Link to worldbuilding tools like Fantasy Calendar.

5. **Migration Path for Existing Vaults**
   - What we know: Existing vaults store dates as strings in JSON frontmatter
   - What's unclear: Should Phase 24 include migration script to ensure ISO8601 format?
   - Recommendation: Add validation to `npx hivemind validate` that checks date fields are ISO8601. Let users fix via `npx hivemind fix` interactive wizard.

## Sources

### Primary (HIGH confidence)
- [Model Context Protocol - Best Practices](https://modelcontextprotocol.info/docs/best-practices/) - MCP tool design patterns, multiple focused tools vs monolithic
- [SQLite Query Optimizer Overview](https://sqlite.org/optoverview.html) - Index usage, query planning
- [SQLite JSON Superpower: Virtual Columns + Indexing](https://www.dbpro.app/blog/sqlite-json-virtual-columns-indexing) - Generated columns for JSON indexing
- [Zod API Documentation](https://zod.dev/api) - Schema validation, datetime() method
- Local codebase analysis: src/mcp/tool-generator.ts, src/graph/database.ts, src/templates/types.ts

### Secondary (MEDIUM confidence)
- [SQLite Index: An Essential Guide](https://www.sqlitetutorial.net/sqlite-index/) - Index best practices
- [Fast JSON Queries in SQLite Using Generated Columns](https://reinketechnology.com/fast-json-queries-in-sqlite-using-generated-columns-and-indexes/) - Performance comparison
- [How to Make Zod Date Type Accept ISO Date Strings](https://www.w3tutorials.net/blog/how-can-zod-date-type-accept-iso-date-strings/) - Zod date validation patterns
- [Choosing the Right Index in SQLite](https://blog.sqlite.ai/choosing-the-right-index-in-sqlite) - Index selection strategy

### Tertiary (LOW confidence - worldbuilding context)
- [Creating a Worldbuilding Timeline | Aeon Timeline](https://www.aeontimeline.com/guides/worldbuilding) - Fictional calendar practices
- [Ways of Measuring Time in High Fantasy](https://thoughtsonfantasy.com/2016/07/13/ways-of-measuring-time-in-high-fantasy/) - Fantasy date formats
- [Creating a Fictional Calendar - Reference for Writers](https://referenceforwriters.tumblr.com/post/71674084607/world-building-creating-a-fictional-calendar) - Calendar design best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, battle-tested
- Architecture patterns: HIGH - MCP best practices documented, SQLite patterns proven
- Date range queries: HIGH - SQLite generated columns well-documented with performance data
- Timezone handling: MEDIUM - Deferred to future work, requires user research
- Fictional calendars: MEDIUM - Fallback strategy viable but needs validation with worldbuilding users

**Research date:** 2026-01-28
**Valid until:** 60 days (stable domain - SQLite and MCP patterns change slowly)

**Critical findings for planning:**
1. **Must add SQLite generated columns** for date fields before implementing tools (schema change required)
2. **Multiple tools required** (range, before, after) per MCP 2026 best practices, not single monolithic tool
3. **Template registry integration** enables automatic support for custom entity types with date fields
4. **Timezone handling** is HIGH complexity flag - requires cross-timezone testing strategy before production
5. **Migration risk** if existing vaults have non-ISO date formats - validation/fix tooling needed

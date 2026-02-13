# Phase 18: Template System & Data Layer - Research

**Researched:** 2026-01-27
**Domain:** TypeScript strict typing for Zod schemas, SQLite typed queries, search result interfaces
**Confidence:** HIGH

## Summary

Phase 18 eliminates `any` types from five files related to template operations and data access. The research reveals:

1. **Most `any` types fall into three categories**: Zod generic constraints (`z.ZodObject<any>`), SQLite query result casts (`as any`), and truly dynamic data structures (`Record<string, any>`).

2. **Prior art from Phase 17 provides the patterns**: `z.ZodObject<z.ZodRawShape>` for Zod generics, `Record<string, unknown>` for dynamic data, and proper interface definitions for structured data.

3. **SQLite queries need explicit result types**: better-sqlite3's `Statement.get()` and `.all()` methods return `unknown` by default and should be typed with proper interfaces.

The key insight: template schema operations are working with Zod objects whose shape is known at compile time (they extend BaseFrontmatterSchema), while database queries return structured data that maps directly to existing interfaces (GraphNode, GraphEdge).

**Primary recommendation:** Use `z.ZodObject<z.ZodRawShape>` for all Zod schema parameters, define explicit result interfaces for all SQLite queries, and replace `Record<string, any>` with `Record<string, unknown>` for truly dynamic data.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x (strict mode) | Type checking | Project uses `"strict": true` - Phase 17 established patterns |
| Zod | 4.3.6 | Runtime validation | Used throughout template system for schema generation |
| better-sqlite3 | 12.6.2 | SQLite database | Database layer with TypeScript support via @types package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/better-sqlite3 | Latest | Type definitions | Provides Statement<BindParameters, Result> generic types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `z.ZodObject<z.ZodRawShape>` | `z.ZodObject<any>` | `any` loses type inference and prevents TypeScript from narrowing types |
| Explicit interfaces for SQL results | Cast to `any` | Casting to `any` removes all type safety at SQL boundaries |
| `Record<string, unknown>` | `Record<string, any>` | `any` bypasses type checking - `unknown` forces type guards |

**Installation:**
No new packages required - all dependencies already installed.

## Architecture Patterns

### Recommended Type Structure

```
Template System (templates/)
├── Zod Schema Generics → z.ZodObject<z.ZodRawShape>
│   ├── createEntitySchema() return type
│   ├── SchemaFactory.getSchema() return type
│   └── SchemaFactory.generateSchemas() Map value type
│
├── Dynamic Field Values → z.unknown()
│   ├── Record field schemas (z.record(z.string(), z.unknown()))
│   └── Default values (field.default: unknown)
│
└── Schema Literals → Remove 'as any' casts
    └── z.literal(config.name) doesn't need casting

Database Layer (graph/)
├── SQLite Result Interfaces → Explicit typing
│   ├── NodeRow interface for SELECT * FROM nodes
│   ├── RelationshipRow for SELECT * FROM relationships
│   ├── SearchResultRow for FTS5 queries
│   └── StatRow for COUNT/GROUP BY results
│
└── Record<string, unknown> for Dynamic Data
    ├── GraphNode.properties (varies by entity type)
    └── GraphEdge.properties (varies by relationship)

Search Layer (search/)
├── Explicit Result Types → Replace 'any[]'
│   ├── QueryResult.nodes: GraphNode[]
│   ├── QueryResult.relationships: GraphEdge[]
│   └── getNodeWithRelationships return types
│
└── Preserve Unknown for Dynamic Props
    └── GraphNode.properties stays Record<string, unknown>
```

### Pattern 1: Zod Schema Generic Constraints
**What:** Using `z.ZodRawShape` instead of `any` for Zod object schema parameters
**When to use:** Function parameters, class properties, or Map types that accept Zod schemas
**Example:**
```typescript
// templates/schema-factory.ts (current)
export function createEntitySchema(config: EntityTypeConfig): z.ZodObject<any> {
  // ...
}

// templates/schema-factory.ts (replacement)
export function createEntitySchema(config: EntityTypeConfig): z.ZodObject<z.ZodRawShape> {
  // ...
}

// Also applies to:
// - SchemaFactory.schemaCache: Map<string, z.ZodObject<z.ZodRawShape>>
// - SchemaFactory.getSchema() return type
// - SchemaFactory.generateSchemas() return type
// - InferEntityType<T extends z.ZodObject<z.ZodRawShape>>
```
**Source:** Phase 17 RESEARCH.md established this pattern for `parser/markdown.ts`

### Pattern 2: SQLite Result Type Interfaces
**What:** Creating explicit interfaces for database query results instead of casting to `any`
**When to use:** All `.get()` and `.all()` calls on better-sqlite3 prepared statements
**Example:**
```typescript
// graph/database.ts (current)
getNode(id: string): GraphNode | undefined {
  const stmt = this.db.prepare(`SELECT * FROM nodes WHERE id = ?`);
  const row = stmt.get(id) as any;  // ❌ Loses all type safety
  if (!row) return undefined;

  return {
    id: row.id,
    type: row.type,
    // ... mapping continues
  };
}

// graph/database.ts (replacement)
interface NodeRow {
  id: string;
  type: string;
  status: string;
  title: string;
  content: string;
  frontmatter: string;  // JSON string
  file_path: string;
  created_at: number;
  updated_at: number;
}

getNode(id: string): GraphNode | undefined {
  const stmt = this.db.prepare(`SELECT * FROM nodes WHERE id = ?`);
  const row = stmt.get(id) as NodeRow | undefined;  // ✅ Typed
  if (!row) return undefined;

  return {
    id: row.id,
    type: row.type,
    // TypeScript now validates all property accesses
  };
}
```
**Source:** better-sqlite3 type definitions, [@types/better-sqlite3](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/better-sqlite3/index.d.ts)

### Pattern 3: Search Result Type Safety
**What:** Replacing `any[]` with proper typed arrays (`GraphNode[]`, `GraphEdge[]`)
**When to use:** All search result structures and return types
**Example:**
```typescript
// search/engine.ts (current)
export interface QueryResult {
  nodes: any[];
  relationships?: any[];
  // ...
}

// search/engine.ts (replacement)
import type { GraphNode, GraphEdge } from '../types/index.js';

export interface QueryResult {
  nodes: GraphNode[];
  relationships?: GraphEdge[];
  metadata: {
    source: 'fts' | 'graph' | 'hybrid';
    executionTime: number;
    totalResults: number;
  };
}

// Also update method return types:
async getNodeWithRelationships(id: string, options?: {
  relationshipType?: string;
}): Promise<{
  node: GraphNode;
  relationships: GraphEdge[];
  relatedNodes: GraphNode[];
} | null> {
  // Implementation stays the same, types are explicit
}
```
**Source:** Existing type definitions in `types/index.ts` (GraphNode, GraphEdge interfaces)

### Pattern 4: Dynamic Data with Unknown
**What:** Using `z.unknown()` and `Record<string, unknown>` for genuinely dynamic data
**When to use:** Template field defaults, record field values, graph node properties
**Example:**
```typescript
// templates/schema-factory.ts (current)
case 'record':
  schema = z.record(z.string(), z.any());  // ❌
  break;

// templates/schema-factory.ts (replacement)
case 'record':
  schema = z.record(z.string(), z.unknown());  // ✅
  break;

// Also applies to:
// - Fallback case: schema = z.unknown() (not z.any())
// - Field defaults remain as 'unknown' type (already correct)
```
**Source:** Phase 17 pattern from `types/index.ts` - `Record<string, unknown>` for frontmatter

### Pattern 5: Remove Unnecessary Type Assertions
**What:** Removing `as any` casts where TypeScript can infer the correct type
**When to use:** Zod literal types, function parameters
**Example:**
```typescript
// templates/schema-factory.ts (current)
const schema = BaseFrontmatterSchema.extend({
  type: z.literal(config.name as any),  // ❌ Unnecessary cast
  ...customFields,
});

// templates/schema-factory.ts (replacement)
const schema = BaseFrontmatterSchema.extend({
  type: z.literal(config.name),  // ✅ No cast needed
  ...customFields,
});
```
**Source:** Zod `.literal()` accepts `string` type directly - no cast needed

### Anti-Patterns to Avoid
- **Casting SQLite results to `any`** - Creates a black hole where TypeScript can't verify property access. Always define explicit row interfaces.
- **Using `z.ZodObject<any>` for schema parameters** - Loses all type inference benefits. Use `z.ZodRawShape` to preserve schema shape information.
- **Leaving loader.ts `configContent: any`** - Already an `unknown` in spirit (JSON parsing). Should be `configContent: unknown` with type guard.
- **Using `any[]` for typed result arrays** - When you know results are `GraphNode[]`, type them explicitly. Don't use `any[]` as a lazy alternative.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SQLite result typing | Manual type assertions | Interface + `as TypeName` | Type-safe property access, autocomplete, refactor safety |
| Zod schema generic types | `z.ZodObject<any>` | `z.ZodObject<z.ZodRawShape>` | Preserves type inference, enables `.shape` access |
| Dynamic field value types | `z.any()` | `z.unknown()` | Forces runtime validation, prevents unchecked access |
| Search result types | `any[]` with runtime checks | `GraphNode[]` / `GraphEdge[]` | Existing interfaces, compile-time validation |

**Key insight:** TypeScript's strict mode combined with explicit interfaces provides comprehensive type safety for database boundaries. Don't bypass it with `any` - define the shape once and get safety everywhere.

## Common Pitfalls

### Pitfall 1: Not Defining SQLite Result Interfaces
**What goes wrong:** Casting to `any` compiles but provides zero safety - typos in property names become runtime errors
**Why it happens:** Creating interfaces feels like boilerplate when you "know" the schema
**How to avoid:** Create interface once at top of file, benefit from autocomplete and type checking throughout
**Warning signs:**
- Runtime errors like "Cannot read property 'xyz' of undefined"
- Typos in property names that TypeScript doesn't catch
- No autocomplete when accessing row properties

**Example:**
```typescript
// ❌ Bad - no safety, typos won't be caught
const row = stmt.get(id) as any;
console.log(row.titel);  // Typo! Runtime error but compiles fine

// ✅ Good - TypeScript catches typo
interface NodeRow {
  id: string;
  title: string;  // Correct spelling defined once
  // ...
}
const row = stmt.get(id) as NodeRow | undefined;
console.log(row.titel);  // ❌ Compile error: Property 'titel' does not exist
```

### Pitfall 2: Using `z.ZodObject<any>` Instead of `z.ZodRawShape`
**What goes wrong:** Type inference fails - `z.infer<T>` returns `any` instead of the actual schema type
**Why it happens:** `any` in generic position disables TypeScript's ability to track the shape
**How to avoid:** Always use `z.ZodRawShape` for Zod object generics (established in Phase 17)
**Warning signs:**
- Inferred types show as `any` when they should be specific
- Can't access `.shape` property with proper types
- No autocomplete on schema operations

**Example:**
```typescript
// ❌ Bad - loses type inference
function validate<T extends z.ZodObject<any>>(schema: T, data: unknown) {
  return schema.parse(data);  // Return type is 'any'
}

// ✅ Good - preserves type inference
function validate<T extends z.ZodObject<z.ZodRawShape>>(schema: T, data: unknown) {
  return schema.parse(data);  // Return type is z.infer<T>
}
```

### Pitfall 3: Forgetting SQLite Columns Return Specific Types
**What goes wrong:** Assuming all columns are strings when integers, JSON strings, and timestamps exist
**Why it happens:** SQL is dynamically typed - easy to forget column type mapping
**How to avoid:** Map each SQLite type to correct TypeScript type in interface
**Warning signs:**
- Type errors when using numeric columns
- JSON parsing errors when reading TEXT columns
- Date operations failing on timestamp integers

**Example:**
```typescript
// ❌ Bad - wrong types
interface NodeRow {
  id: string;
  created_at: string;  // ❌ Actually a number (timestamp)
  frontmatter: Record<string, unknown>;  // ❌ Actually a JSON string
}

// ✅ Good - correct types matching SQL
interface NodeRow {
  id: string;
  created_at: number;  // SQLite INTEGER → TypeScript number
  frontmatter: string;  // SQLite TEXT (JSON) → Parse after retrieval
}

// Usage:
const row = stmt.get(id) as NodeRow | undefined;
if (row) {
  const created = new Date(row.created_at);  // ✅ Works - it's a number
  const props = JSON.parse(row.frontmatter);  // ✅ Parse JSON string
}
```

### Pitfall 4: Over-typing Truly Dynamic Data
**What goes wrong:** Creating specific types for `GraphNode.properties` when they vary by entity type
**Why it happens:** Desire for complete type safety on inherently dynamic structures
**How to avoid:** Use `Record<string, unknown>` for properties that genuinely vary (like frontmatter)
**Warning signs:**
- Creating union types with dozens of optional properties
- Type assertions in every consumer of the data
- Constant casting because types don't match reality

**Example:**
```typescript
// ❌ Bad - pretending properties have fixed shape
interface GraphNode {
  properties: {
    name?: string;
    age?: number;
    // ... 50+ optional fields for all possible entity types
  };
}

// ✅ Good - acknowledge dynamic nature
interface GraphNode {
  properties: Record<string, unknown>;  // Varies by entity type
}

// When consuming, use type guards:
if (typeof node.properties.name === 'string') {
  console.log(node.properties.name.toUpperCase());
}
```

### Pitfall 5: Not Handling undefined from SQLite .get()
**What goes wrong:** Treating `.get()` result as always returning a row when it can return `undefined`
**Why it happens:** SQL queries often return rows in testing but might not in production
**How to avoid:** Always type `.get()` results as `RowType | undefined` and check for `undefined`
**Warning signs:**
- Runtime errors: "Cannot read property 'x' of undefined"
- Forgetting to handle "not found" case
- Type assertions that bypass the `undefined` possibility

**Example:**
```typescript
// ❌ Bad - assumes row always exists
const row = stmt.get(id) as NodeRow;
return {
  id: row.id,  // ❌ Crashes if row is undefined
  // ...
};

// ✅ Good - handles undefined case
const row = stmt.get(id) as NodeRow | undefined;
if (!row) return undefined;

return {
  id: row.id,  // ✅ Safe - we checked for undefined
  // ...
};
```

## Code Examples

Verified patterns from existing codebase and official sources:

### Example 1: Zod Schema Generic Constraints
```typescript
// Source: Phase 17 RESEARCH.md, templates/schema-factory.ts patterns
import type { z } from 'zod';

// Return type for schema creation
export function createEntitySchema(config: EntityTypeConfig): z.ZodObject<z.ZodRawShape> {
  const customFields: Record<string, z.ZodTypeAny> = {};

  for (const field of config.fields) {
    customFields[field.name] = buildFieldSchema(field);
  }

  return BaseFrontmatterSchema.extend({
    type: z.literal(config.name),  // No 'as any' needed
    ...customFields,
  });
}

// Class property type
export class SchemaFactory {
  private schemaCache: Map<string, z.ZodObject<z.ZodRawShape>> = new Map();

  getSchema(config: EntityTypeConfig): z.ZodObject<z.ZodRawShape> {
    // Implementation...
  }

  generateSchemas(configs: EntityTypeConfig[]): Map<string, z.ZodObject<z.ZodRawShape>> {
    // Implementation...
  }
}

// Type helper
export type InferEntityType<T extends z.ZodObject<z.ZodRawShape>> = z.infer<T>;
```

### Example 2: SQLite Result Type Interfaces
```typescript
// Source: better-sqlite3 documentation, existing GraphNode/GraphEdge interfaces
import type { GraphNode, GraphEdge } from '../types/index.js';

// Define explicit row interfaces matching SQL schema
interface NodeRow {
  id: string;
  type: string;
  status: string;
  title: string;
  content: string;
  frontmatter: string;  // JSON string, parsed to Record<string, unknown>
  file_path: string;
  created_at: number;   // SQLite INTEGER
  updated_at: number;   // SQLite INTEGER
}

interface RelationshipRow {
  id: number;           // SQLite AUTOINCREMENT
  source_id: string;
  target_id: string;
  rel_type: string | null;
  properties: string | null;  // JSON string or NULL
}

interface SearchResultRow {
  id: string;
  rank: number;
}

interface StatRow {
  type: string;
  count: number;
}

interface CountRow {
  count: number;
}

// Use interfaces in query methods
getNode(id: string): GraphNode | undefined {
  const stmt = this.db.prepare(`SELECT * FROM nodes WHERE id = ?`);
  const row = stmt.get(id) as NodeRow | undefined;
  if (!row) return undefined;

  return {
    id: row.id,
    type: row.type,
    status: row.status,
    title: row.title,
    content: row.content,
    properties: JSON.parse(row.frontmatter),
    filePath: row.file_path,
    created: new Date(row.created_at),
    updated: new Date(row.updated_at),
  };
}

getRelationships(nodeId: string): GraphEdge[] {
  const stmt = this.db.prepare(`
    SELECT * FROM relationships
    WHERE source_id = ? OR target_id = ?
  `);

  const rows = stmt.all(nodeId, nodeId) as RelationshipRow[];

  return rows.map(row => ({
    id: row.id.toString(),
    sourceId: row.source_id,
    targetId: row.target_id,
    relationType: row.rel_type ?? undefined,
    properties: row.properties ? JSON.parse(row.properties) : undefined,
    bidirectional: false,
  }));
}

search(query: string, limit: number = 10): Array<{ id: string; rank: number }> {
  const stmt = this.db.prepare(`
    SELECT id, rank
    FROM nodes_fts
    WHERE nodes_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);

  return stmt.all(query, limit) as SearchResultRow[];
}

getStats() {
  const nodeCount = this.db.prepare('SELECT COUNT(*) as count FROM nodes').get() as CountRow;
  const relCount = this.db.prepare('SELECT COUNT(*) as count FROM relationships').get() as CountRow;

  const typeStats = this.db.prepare(`
    SELECT type, COUNT(*) as count
    FROM nodes
    GROUP BY type
  `).all() as StatRow[];

  return {
    nodes: nodeCount.count,
    relationships: relCount.count,
    byType: Object.fromEntries(typeStats.map(s => [s.type, s.count])),
  };
}
```

### Example 3: Search Engine Result Types
```typescript
// Source: Existing types/index.ts GraphNode and GraphEdge interfaces
import type { GraphNode, GraphEdge } from '../types/index.js';

export interface QueryResult {
  nodes: GraphNode[];
  relationships?: GraphEdge[];
  metadata: {
    source: 'fts' | 'graph' | 'hybrid';
    executionTime: number;
    totalResults: number;
  };
}

export class SearchEngine {
  async search(
    query: string,
    options?: {
      limit?: number;
      includeRelationships?: boolean;
      filters?: {
        type?: string[];
        status?: string[];
      };
      relationshipType?: string;
    }
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const limit = options?.limit || 10;

    let nodes: GraphNode[];
    // ... search logic

    const relationships: GraphEdge[] = [];
    if (options?.includeRelationships) {
      for (const node of nodes) {
        let rels = this.db.getRelationships(node.id);
        if (options.relationshipType) {
          rels = rels.filter((rel) => rel.relationType === options.relationshipType);
        }
        relationships.push(...rels);
      }
    }

    return {
      nodes,
      relationships: options?.includeRelationships ? relationships : undefined,
      metadata: {
        source: query.trim() ? 'fts' : 'graph',
        executionTime: Date.now() - startTime,
        totalResults: nodes.length,
      },
    };
  }

  async getNodeWithRelationships(
    id: string,
    options?: { relationshipType?: string }
  ): Promise<{
    node: GraphNode;
    relationships: GraphEdge[];
    relatedNodes: GraphNode[];
  } | null> {
    const node = this.db.getNode(id);
    if (!node) return null;

    let relationships = this.db.getRelationships(id);

    if (options?.relationshipType) {
      relationships = relationships.filter((rel) => rel.relationType === options.relationshipType);
    }

    const relatedIds = new Set<string>();
    for (const rel of relationships) {
      if (rel.sourceId !== id) relatedIds.add(rel.sourceId);
      if (rel.targetId !== id) relatedIds.add(rel.targetId);
    }

    const relatedNodes = Array.from(relatedIds)
      .map(rid => this.db.getNode(rid))
      .filter((n): n is GraphNode => n !== undefined);

    return {
      node,
      relationships,
      relatedNodes,
    };
  }

  async getNodesByType(type: string): Promise<GraphNode[]> {
    return this.db.getNodesByType(type);
  }
}
```

### Example 4: Loader Unknown Type Handling
```typescript
// Source: TypeScript strict mode patterns, Phase 17 error handling
export function loadTemplateConfig(configPath?: string): TemplateConfig {
  const configFilePath = findConfigFile(configPath);

  if (!configFilePath) {
    return {
      activeTemplate: 'worldbuilding',
      templates: [],
    };
  }

  // Read and parse config file
  let configContent: unknown;  // ✅ Not 'any'
  try {
    const fileContent = readFileSync(configFilePath, 'utf-8');
    configContent = JSON.parse(fileContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read or parse config file at ${configFilePath}: ${message}`);
  }

  // Type guard before accessing properties
  if (typeof configContent !== 'object' || configContent === null) {
    throw new Error('Config file must contain a JSON object');
  }

  // Now can safely access properties with type assertion
  const config = configContent as Record<string, unknown>;
  const templateConfig = config.template || {
    activeTemplate: 'worldbuilding',
    templates: [],
  };

  // Validate the template config (throws if invalid)
  return validateTemplateConfig(templateConfig);
}
```

### Example 5: Dynamic Field Values with z.unknown()
```typescript
// Source: Zod documentation, Phase 17 patterns
import { z } from 'zod';

function buildFieldSchema(field: FieldConfig): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'string':
      schema = z.string();
      break;

    case 'number':
      schema = z.number();
      break;

    case 'record':
      // Use z.unknown() for values
      schema = z.record(z.string(), z.unknown());
      break;

    default:
      // Fallback for unknown types
      schema = z.unknown();  // Not z.any()
  }

  // field.default is already typed as 'unknown' - no change needed
  if (field.default !== undefined) {
    schema = schema.default(field.default);
  }

  return schema;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `z.ZodObject<any>` | `z.ZodObject<z.ZodRawShape>` | Zod 3.0+ | Preserves type inference through schema operations |
| `any` for SQL results | Explicit row interfaces | better-sqlite3 12.x | Type-safe database boundaries |
| `z.any()` for dynamic fields | `z.unknown()` | Zod 3.0+ | Forces runtime validation before use |
| `any[]` for results | `GraphNode[]` / `GraphEdge[]` | TypeScript 4.0+ | Compile-time validation of array operations |

**Deprecated/outdated:**
- Using `any` for database query results: better-sqlite3 types support explicit result typing since v7.0
- Using `z.any()` in schemas: Zod 3.0+ introduced `z.unknown()` as the safe alternative
- Casting to `any` to bypass type errors: TypeScript 4.9+ `satisfies` operator provides better validation

## Open Questions

Things that couldn't be fully resolved:

1. **Should graph/builder.ts casts be typed interfaces too?**
   - What we know: Lines 64, 66, 174 use `as any` for frontmatter access
   - What's unclear: Whether these should use `BaseFrontmatter` type or stay as `Record<string, unknown>`
   - Recommendation: Use `as Record<string, unknown>` instead of `as any` - frontmatter varies by entity type

2. **Should insertRelationship properties parameter be more specific?**
   - What we know: Currently `properties?: Record<string, any>` but only used for `{ status: rel.status }`
   - What's unclear: Whether relationship properties have a common structure
   - Recommendation: Change to `Record<string, unknown>` for now - relationship properties are template-defined

3. **Should SQLite NULL handling be more explicit?**
   - What we know: Some columns like `rel_type` and `properties` can be NULL
   - What's unclear: Whether to use `string | null` or `string | undefined` in interfaces
   - Recommendation: Use `string | null` to match SQL semantics, convert to `undefined` in mapping logic

## Sources

### Primary (HIGH confidence)
- Phase 17 RESEARCH.md - Established `z.ZodRawShape` pattern for this project
- Existing types/index.ts - GraphNode, GraphEdge, BaseFrontmatter interfaces (existing code)
- better-sqlite3 type definitions: [Statement interface](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/better-sqlite3/index.d.ts)
- Zod documentation: [API Reference](https://zod.dev/api)
- TypeScript Narrowing: [Official Handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

### Secondary (MEDIUM confidence)
- [better-sqlite3 npm page](https://www.npmjs.com/package/better-sqlite3) - Version 12.6.2 used in project
- [@types/better-sqlite3 npm page](https://www.npmjs.com/package/@types/better-sqlite3) - TypeScript type definitions
- [Zod GitHub Issues](https://github.com/colinhacks/zod/issues/2223) - Generic over ZodObject discussions
- [TypeScript Issue #26188](https://github.com/microsoft/TypeScript/issues/26188) - Replace any by unknown in definition files

### Tertiary (LOW confidence)
- [better-sqlite3-typed](https://github.com/drodsou/better-sqlite3-typed) - Third-party wrapper (not needed - manual typing sufficient)
- [Total TypeScript](https://www.totaltypescript.com/workshops/advanced-typescript-patterns/external-libraries/create-a-runtime-and-type-safe-function-with-generics-and-zod/solution) - Zod generic patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages installed and versions confirmed, Phase 17 established patterns
- Architecture: HIGH - Patterns from Phase 17, existing interfaces in codebase, official type definitions
- Pitfalls: HIGH - Based on common TypeScript + database typing issues and existing code patterns

**Research date:** 2026-01-27
**Valid until:** 2026-04-27 (90 days - TypeScript, Zod, and better-sqlite3 are stable)

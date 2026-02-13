# Phase 19: Server & MCP - Research

**Researched:** 2026-01-27
**Domain:** MCP Server Type Safety & Dynamic Tool Generation
**Confidence:** HIGH

## Summary

Phase 19 focuses on eliminating `any` types from the MCP server layer (server.ts) and dynamic tool generation system (tool-generator.ts). The Model Context Protocol SDK (v1.0.4) uses Zod for runtime validation with `request.params.arguments` typed as `Record<string, unknown>` by default. The codebase already follows proper patterns from Phase 18, using Zod schemas for validation and typed interfaces for data structures.

The research confirms that MCP tool handlers receive arguments as `Record<string, unknown>` from the SDK's CallToolRequest type, requiring explicit Zod parsing for type safety. Dynamic tool generation requires generic constraints on entity type configurations and proper typing for tool definition structures. All current `any` types in the target files are replaceable with explicit interfaces or generic constraints.

**Primary recommendation:** Use explicit argument type interfaces (from existing Zod schemas), generic constraints with proper bounds, and Record<string, unknown> with type narrowing for dynamic property access.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.0.4 | MCP server framework | Official MCP TypeScript SDK, provides server primitives and type schemas |
| zod | 4.3.6 | Schema validation & type inference | Standard for runtime validation with static type inference, officially used by MCP SDK |
| TypeScript | 5.7.2 | Type system | Strong type checking, generics support for dynamic code generation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-sqlite3 | 12.6.2 | Database queries | Already using typed row interfaces from Phase 18 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | io-ts, yup | Zod is MCP SDK's choice, better TypeScript inference |
| Explicit types | Type assertions (`as`) | Type assertions bypass safety, should be avoided per project decisions |

**Installation:**
```bash
# Already installed in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── server.ts              # MCP request handlers with typed arguments
├── mcp/
│   └── tool-generator.ts  # Generic tool generation with constrained types
└── types/
    └── index.ts           # Shared type definitions and Zod schemas
```

### Pattern 1: MCP Tool Handler Type Safety
**What:** Parse MCP tool arguments using Zod schemas, avoid `any` casts
**When to use:** Every CallToolRequest handler
**Example:**
```typescript
// Source: MCP SDK types.d.ts + existing codebase patterns
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SearchVaultArgsSchema } from './types/index.js';

this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // args is Record<string, unknown> from SDK

  switch (name) {
    case 'search_vault': {
      // Parse with Zod for type safety
      const parsed = SearchVaultArgsSchema.parse(args);
      return await this.handleSearchVault(parsed);
    }
  }
});
```

**Key insight:** The MCP SDK types `arguments` as `z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>`, which infers to `Record<string, unknown> | undefined`. Always use Zod `.parse()` to validate and narrow types.

### Pattern 2: Generic Tool Definition Interface
**What:** Use explicit interface for tool definitions instead of inline types
**When to use:** Dynamic tool generation functions
**Example:**
```typescript
// Source: Existing tool-generator.ts + TypeScript generics best practices
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;  // JSON Schema allows unknown values
    required: string[];
  };
}

// Generic function with constrained parameter
export function generateQueryTool(
  entityType: EntityTypeConfig
): ToolDefinition {
  // Return properly typed tool definition
}
```

### Pattern 3: Generic Constraints for Entity Types
**What:** Use explicit type parameters with structural constraints instead of `any`
**When to use:** Functions operating on dynamic entity type configurations
**Example:**
```typescript
// Source: Phase 18 patterns + TypeScript generics documentation
interface EntityTypeConfig {
  name: string;
  displayName: string;
  pluralName: string;
  fields: FieldConfig[];
}

// Constrain parameter type explicitly
export function formatEntityWithRelationships(
  entityType: EntityTypeConfig,
  result: QueryResult,
  includeContent = true,
  contentLimit = 500
): string {
  // Type-safe access to entityType properties
}

// Instead of: entityType: { name: string; fields: any[] }
```

### Pattern 4: Type Narrowing for Dynamic Properties
**What:** Use `Record<string, unknown>` with explicit narrowing instead of `any`
**When to use:** Accessing dynamic frontmatter or node properties
**Example:**
```typescript
// Source: Phase 18 decisions + existing patterns
interface GraphNode {
  properties: Record<string, unknown>;  // Not any
}

function formatNode(node: GraphNode) {
  const props = node.properties;

  // Type narrowing before access
  const name = typeof props.name === 'string' ? props.name : 'Unknown';

  // Or use optional chaining with defaults
  const age = props.age ?? 'unknown age';
}
```

### Anti-Patterns to Avoid
- **Cast to `any` for dynamic access:** Use `Record<string, unknown>` with type narrowing instead
- **Inline `any[]` in function signatures:** Define explicit array types even if elements are generic
- **Skip Zod validation:** Always parse MCP arguments, never trust `request.params.arguments` directly

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP argument validation | Manual type guards | Zod `.parse()` with existing schemas | Zod provides runtime validation + type inference, MCP SDK expects it |
| Tool input schema generation | Custom JSON schema builder | Zod schema definition with MCP format | MCP SDK uses Zod schemas internally, consistent patterns |
| Generic type constraints | `any` with comments | Explicit interface types | TypeScript generics provide compile-time safety without runtime cost |
| Dynamic property access | `as any` casts | `Record<string, unknown>` with narrowing | Maintains type safety, catches errors at boundaries |

**Key insight:** The codebase already has proper Zod schemas for all tools (SearchVaultArgsSchema, GenerateImageArgsSchema, etc.). Phase 19 is about using them consistently and removing the remaining `any` escape hatches.

## Common Pitfalls

### Pitfall 1: Casting MCP Arguments Directly
**What goes wrong:** `args as { id: string }` bypasses runtime validation
**Why it happens:** Looks simpler than Zod parsing, TypeScript doesn't complain
**How to avoid:** Always use `Schema.parse(args)` for MCP arguments
**Warning signs:** Line like `args as { id: string }` in server.ts (line 483)

### Pitfall 2: Using `any` for Generic Parameters
**What goes wrong:** Loses all type safety for parameters that have structure
**Why it happens:** Developer doesn't know the exact type so uses `any` as catch-all
**How to avoid:** Define minimal interface with known properties, use `unknown` for truly dynamic
**Warning signs:** Function parameter like `entityType: { name: string; fields: any[] }` (server.ts lines 590, 655)

### Pitfall 3: `Record<string, any>` Instead of `Record<string, unknown>`
**What goes wrong:** TypeScript allows unsafe property access without narrowing
**Why it happens:** `any` is more permissive, seems to "just work"
**How to avoid:** Use `unknown` for values that need narrowing, per project decisions
**Warning signs:** `properties: Record<string, any>` in interface (tool-generator.ts line 19)

### Pitfall 4: Inline `any` Types in Complex Signatures
**What goes wrong:** Search results typed as `any`, relationships as `any[]`, loses graph structure
**Why it happens:** Complex return types feel verbose to spell out
**How to avoid:** Import existing types (GraphNode[], GraphEdge[]) or define interfaces
**Warning signs:** Functions returning `any` or `any[]` (server.ts lines 697, 920, multiple tool-generator.ts)

### Pitfall 5: Mixing Generic Constraints and `any`
**What goes wrong:** Generic function says "works with any entity" but then breaks type checking
**Why it happens:** Function needs to work with multiple entity types, `any` seems universal
**How to avoid:** Define shared interface (EntityTypeConfig), constrain generic to that
**Warning signs:** Generic function with `any` parameter alongside typed parameters

## Code Examples

Verified patterns from official sources:

### MCP Tool Handler with Zod Parsing
```typescript
// Source: MCP SDK CallToolRequest type + existing codebase patterns
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // args is Record<string, unknown> | undefined from SDK

  try {
    switch (name) {
      case 'generate_image': {
        // Parse with existing Zod schema
        const parsed = GenerateImageArgsSchema.parse(args);
        return await this.handleGenerateImage(parsed);
      }

      case 'get_workflow': {
        // Simple schema inline with Zod
        const parsed = z.object({ id: z.string() }).parse(args);
        return await this.handleGetWorkflow(parsed);
      }
    }
  } catch (error) {
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});
```

### Generic Tool Generator with Constraints
```typescript
// Source: TypeScript generics documentation + existing tool-generator.ts
import type { EntityTypeConfig } from '../templates/types.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export function generateQueryTool(
  entityType: EntityTypeConfig
): ToolDefinition {
  return {
    name: `query_${entityType.name}`,
    description: `Retrieve detailed information about a ${entityType.displayName.toLowerCase()}`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: `${entityType.displayName} ID to query` },
      },
      required: ['id'],
    },
  };
}

// Use explicit interface for result parameter
interface QueryResult {
  node: GraphNode;
  relationships?: GraphEdge[];
  relatedNodes: GraphNode[];
}

export function formatEntityWithRelationships(
  entityType: EntityTypeConfig,
  result: QueryResult,
  includeContent = true,
  contentLimit = 500
): string {
  // Type-safe access throughout
  const { node, relationships, relatedNodes } = result;
  // ...
}
```

### Type Narrowing for Dynamic Properties
```typescript
// Source: Phase 18 decisions + TypeScript best practices
interface GraphNode {
  properties: Record<string, unknown>;  // Not any
}

function accessDynamicProperties(node: GraphNode): string {
  const props = node.properties;

  // Type narrowing before access
  const name = typeof props.name === 'string'
    ? props.name
    : 'Unknown';

  const age = typeof props.age === 'number'
    ? props.age
    : (typeof props.age === 'string' ? props.age : 'unknown age');

  // Safe array access
  const tags = Array.isArray(props.tags)
    ? props.tags.filter((t): t is string => typeof t === 'string')
    : [];

  return `${name} (${age})`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `request.params.arguments as ToolArgs` | `ToolArgsSchema.parse(request.params.arguments)` | MCP SDK v1.0+ | Runtime validation + type safety |
| `any` for generic parameters | Explicit interface constraints | TypeScript 5.0+ | Better IDE support, catch errors earlier |
| `Record<string, any>` | `Record<string, unknown>` | Project Phase 18 | Forces type narrowing, prevents silent errors |
| Manual type assertions | Zod schema inference | Zod 4.x | Single source of truth for types + validation |

**Deprecated/outdated:**
- Direct type assertions on MCP arguments: MCP SDK expects Zod validation
- `any` escape hatches: Project standard is `unknown` with narrowing
- Inline JSON schema objects: Zod schemas provide both validation and types

## Open Questions

None - domain is well-understood from existing codebase patterns and MCP SDK documentation.

## Sources

### Primary (HIGH confidence)
- MCP SDK v1.0.4 types.d.ts - CallToolRequestSchema type definition confirms `arguments: Record<string, unknown>`
- Existing codebase Phase 18 plans - Established patterns for `Record<string, unknown>` and Zod usage
- src/types/index.ts - All tool argument schemas already defined with proper Zod types

### Secondary (MEDIUM confidence)
- [GitHub - modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) - Official MCP TypeScript SDK repository
- [Add Custom Tools to TypeScript MCP Servers - Complete Guide | MCPcat](https://mcpcat.io/guides/adding-custom-tools-mcp-server-typescript/) - MCP tool handler patterns
- [TypeScript: Documentation - Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) - Official TypeScript generics guide
- [TypeScript Fundamentals in 2026](https://www.nucamp.co/blog/typescript-fundamentals-in-2026-why-every-full-stack-developer-needs-type-safety) - Current best practices

### Tertiary (LOW confidence)
None - all findings verified against source code and official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - MCP SDK version confirmed in package.json, types verified in node_modules
- Architecture: HIGH - Patterns verified in existing Phase 18 code and MCP SDK types
- Pitfalls: HIGH - Identified by analyzing actual `any` occurrences in target files

**Research date:** 2026-01-27
**Valid until:** 2026-03-27 (60 days - MCP SDK and TypeScript are stable)

# Phase 17: Foundation Types - Research

**Researched:** 2026-01-27
**Domain:** TypeScript strict typing, Zod schema types, type-safe AST traversal
**Confidence:** HIGH

## Summary

This phase eliminates all `any` types from three core files (`types/index.ts`, `parser/markdown.ts`, `vault/reader.ts`) by replacing them with appropriate strict types. The research reveals that:

1. **Most `any` types are intentional flexibility points** - They represent truly dynamic data (ComfyUI workflows, YAML frontmatter, JSON parameters) where the exact shape isn't known at compile time.

2. **The codebase already has strong patterns** - `Record<string, unknown>` is used consistently in recent code (e.g., `cli/fix/types.ts`, `cli/validate/types.ts`) for untyped frontmatter.

3. **Type-safe alternatives exist for all cases** - Zod schemas provide runtime validation, mdast provides AST node types, and the existing patterns can be extended.

**Primary recommendation:** Replace `any` with `Record<string, unknown>` for dynamic data, use specific mdast types for AST nodes, and create proper Zod generic constraints for schema parameters.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x (strict mode) | Type checking | Project uses `"strict": true` with all strictness flags enabled |
| Zod | 4.3.6 | Runtime validation | Already used extensively for schema validation throughout codebase |
| @types/mdast | 4.0.4 | AST node types | Official types for remark/markdown AST traversal |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gray-matter | 4.0.3 | Frontmatter parsing | Returns untyped object - needs `Record<string, unknown>` wrapper |
| remark | 15.0.1 | Markdown parsing | Provides typed AST via mdast types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Record<string, unknown>` | `Record<string, any>` | `any` bypasses type checking entirely - loses all safety |
| `unknown` | `any` | `unknown` requires type narrowing before use - more safe |
| Specific mdast types | `any` nodes | Specific types enable autocomplete and catch errors |

**Installation:**
No new packages required - all dependencies already installed.

## Architecture Patterns

### Recommended Type Hierarchy

```
Core Types (types/index.ts)
├── Dynamic Data → Record<string, unknown>
│   ├── ComfyUI workflows (JSON from external system)
│   ├── Frontmatter parameters (user-defined fields)
│   └── Graph node properties (varies by entity type)
│
├── Zod Schema Types → Proper generics
│   ├── z.ZodObject<any> → z.ZodObject<z.ZodRawShape>
│   └── z.ZodType<string> → Already correct
│
└── Error Types → unknown (narrow as needed)
    └── error?: any → error?: unknown
```

### Pattern 1: Dynamic Data with Known Key Type
**What:** Data structures where keys are known to be strings, but values vary
**When to use:** Frontmatter, JSON parameters, workflow configurations
**Example:**
```typescript
// types/index.ts (current)
parameters: z.record(z.string(), z.any()).optional()

// types/index.ts (replacement)
parameters: z.record(z.string(), z.unknown()).optional()

// Real usage
export interface GraphNode {
  properties: Record<string, unknown>;  // Not 'any' - requires type guard
}
```
**Source:** Existing codebase patterns in `cli/fix/types.ts:43` and `cli/validate/types.ts:41`

### Pattern 2: Zod Schema Generic Constraints
**What:** Using proper Zod generic types for schema parameters
**When to use:** Constructor/function parameters that accept Zod schemas
**Example:**
```typescript
// parser/markdown.ts (current)
private frontmatterSchema: z.ZodObject<any>;
constructor(frontmatterSchema?: z.ZodObject<any>) { ... }

// parser/markdown.ts (replacement)
private frontmatterSchema: z.ZodObject<z.ZodRawShape>;
constructor(frontmatterSchema?: z.ZodObject<z.ZodRawShape>) { ... }
```
**Source:** Zod documentation and existing usage in `templates/schema-factory.ts:111,135,146,166`

### Pattern 3: Type Guards for Unknown Data
**What:** Narrowing `unknown` to specific types before use
**When to use:** When consuming data typed as `unknown` or `Record<string, unknown>`
**Example:**
```typescript
// vault/reader.ts
private async indexFile(filePath: string): Promise<void> {
  // ... parsing ...

  // Type guard for error
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Now can safely use message
  }
}
```
**Source:** TypeScript best practices and existing pattern in `parser/markdown.ts:97-98`

### Pattern 4: Typed AST Node Traversal
**What:** Using specific mdast types instead of `any` for AST nodes
**When to use:** Traversing or examining markdown AST nodes
**Example:**
```typescript
// parser/markdown.ts (current)
private extractHeadings(ast: Root): Heading[] {
  const visit = (node: any, pos: number) => {
    if (node.type === 'heading') {
      const mdHeading = node as MdHeading;
      // ...
    }
  }
}

// parser/markdown.ts (replacement)
import type { Root, Heading as MdHeading, Content } from 'mdast';

private extractHeadings(ast: Root): Heading[] {
  const visit = (node: Content, pos: number) => {
    if (node.type === 'heading') {
      // TypeScript now knows this is MdHeading - no cast needed
      const text = this.extractTextFromNode(node);
      // ...
    }
  }
}
```
**Source:** @types/mdast@4.0.4 type definitions

### Anti-Patterns to Avoid
- **Using `any` for "I don't want to think about this"** - Every `any` is a hole in type safety. Use `unknown` and narrow when needed.
- **Casting `unknown` to specific types without guards** - Always check type at runtime before casting.
- **Over-specific types for truly dynamic data** - ComfyUI workflows are arbitrary JSON - `Record<string, unknown>` is correct, not a specific interface.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type-safe Zod generics | Custom schema type wrappers | `z.ZodRawShape` | Official Zod type for object shape definitions |
| AST node typing | String-based type checks | mdast discriminated unions | TypeScript can narrow types after `node.type === 'heading'` check |
| Runtime type validation | Manual `typeof` checks | Zod schemas with `.parse()` | Already used throughout codebase |
| Error object typing | `catch (e: Error)` | `catch (e: unknown)` with guard | Errors can be anything thrown - use guard pattern |

**Key insight:** TypeScript's strict mode + discriminated unions + type guards provide comprehensive type safety without custom wrapper types.

## Common Pitfalls

### Pitfall 1: Using `z.ZodObject<any>` in Generics
**What goes wrong:** TypeScript can't infer proper types from schemas typed as `z.ZodObject<any>`
**Why it happens:** `any` in generics disables all type checking for the generic parameter
**How to avoid:** Use `z.ZodObject<z.ZodRawShape>` or `z.ZodTypeAny` depending on whether you need object-specific methods
**Warning signs:**
- Can't use autocomplete on schema.shape
- No errors when passing wrong schema types
- Inferred types show as `any`

**Example:**
```typescript
// ❌ Bad - loses all type information
function validate<T extends z.ZodObject<any>>(schema: T, data: unknown) {
  return schema.parse(data);  // Return type is 'any'
}

// ✅ Good - preserves type information
function validate<T extends z.ZodObject<z.ZodRawShape>>(schema: T, data: unknown) {
  return schema.parse(data);  // Return type is z.infer<T>
}
```

### Pitfall 2: Over-typing Dynamic External Data
**What goes wrong:** Creating specific interfaces for data that's inherently unstructured (JSON from external APIs, user YAML)
**Why it happens:** Desire for perfect type safety on data you don't control
**How to avoid:** Use `Record<string, unknown>` for truly dynamic data; create interfaces only when the shape is guaranteed
**Warning signs:**
- Creating interface for ComfyUI workflow JSON (it's arbitrary)
- Creating interface for frontmatter `parameters` field (user-defined)
- Lots of optional fields with `?` because shape varies

**Example:**
```typescript
// ❌ Bad - pretending we know the workflow structure
interface ComfyUIWorkflowNode {
  class_type?: string;
  inputs?: Record<string, any>;  // Still using 'any' anyway!
  // ... 50 more optional fields
}

// ✅ Good - acknowledge the dynamic nature
workflow: Record<string, unknown>  // ComfyUI workflow JSON
```

### Pitfall 3: Not Narrowing `unknown` Before Use
**What goes wrong:** Changing `any` to `unknown` but forgetting that `unknown` requires type narrowing
**Why it happens:** `unknown` is stricter than `any` - it forces you to prove what type you have
**How to avoid:** Add type guards immediately after changing `any` to `unknown`
**Warning signs:**
- TypeScript errors: "Object is of type 'unknown'"
- Trying to access properties directly on `unknown` values

**Example:**
```typescript
// ❌ Bad - changed to unknown but no guard
catch (error: unknown) {
  console.error(error.message);  // ❌ Error: Object is of type 'unknown'
}

// ✅ Good - narrow before use
catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);  // ✅ Works
}
```

### Pitfall 4: Incorrect mdast Node Types
**What goes wrong:** Using `Root` as the type for all nodes, or using `any` for child nodes
**Why it happens:** mdast has a complex type hierarchy - `Root` is only the top-level document
**How to avoid:** Use `Content` for general child nodes, `PhrasingContent` for inline nodes, or specific types when known
**Warning signs:**
- Type errors when accessing node properties
- Having to cast nodes constantly
- TypeScript says property doesn't exist when it clearly does

**Example:**
```typescript
// ❌ Bad - Root is not the right type for children
ast.children.forEach((child: Root) => { ... });  // Root has no 'type' property

// ✅ Good - Content is the union of all content types
import type { Content } from 'mdast';
ast.children.forEach((child: Content) => {
  if (child.type === 'heading') {
    // TypeScript narrows to Heading type
  }
});
```

## Code Examples

Verified patterns from official sources:

### Example 1: Record<string, unknown> for Dynamic Frontmatter
```typescript
// Source: Existing codebase patterns (cli/fix/types.ts, cli/validate/types.ts)
export interface FileOperation {
  /** Generated frontmatter to add/merge */
  frontmatter: Record<string, unknown>;
}

export interface ValidationResult {
  /** Parsed frontmatter (included for debugging) */
  frontmatter?: Record<string, unknown>;
}
```

### Example 2: Proper Zod Generic Constraints
```typescript
// Source: Zod types and existing schema-factory.ts patterns
import type { z } from 'zod';

// For object schemas specifically
function createParser<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return (data: unknown) => schema.parse(data);
}

// For any Zod type
function createValidator<T extends z.ZodTypeAny>(schema: T) {
  return (data: unknown): data is z.infer<T> => schema.safeParse(data).success;
}
```

### Example 3: Error Type Narrowing
```typescript
// Source: TypeScript best practices, existing parser/markdown.ts:97-98
try {
  // Operation that might throw
  await fs.readFile(path);
} catch (error: unknown) {
  // Type guard to narrow unknown to Error
  const message = error instanceof Error
    ? error.message
    : String(error);

  throw new Error(`Failed to read file: ${message}`);
}
```

### Example 4: Typed AST Traversal with mdast
```typescript
// Source: @types/mdast@4.0.4 type definitions
import type { Root, Content, Heading as MdHeading, Text } from 'mdast';

function extractHeadings(ast: Root): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];

  // Root.children is Content[]
  for (const node of ast.children) {
    if (node.type === 'heading') {
      // TypeScript narrows to MdHeading type automatically
      headings.push({
        level: node.depth,  // TypeScript knows this exists
        text: extractText(node),
      });
    }
  }

  return headings;
}

function extractText(node: MdHeading | Text): string {
  if (node.type === 'text') {
    return node.value;  // TypeScript knows Text has 'value'
  }

  if ('children' in node) {
    // Recursively extract from children
    return node.children.map(child => extractText(child)).join('');
  }

  return '';
}
```

### Example 5: Zod Schema with Record<string, unknown>
```typescript
// Source: Existing types/index.ts patterns, updated for strict types
import { z } from 'zod';

// For truly dynamic data, use z.unknown() instead of z.any()
export const AssetFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('asset'),
  asset_type: z.enum(['image', 'audio', 'video', 'document']).default('image'),

  // Generation parameters are dynamic - use unknown
  parameters: z.record(z.string(), z.unknown()).optional(),

  // File metadata we don't control
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// When using the parsed data, narrow as needed
function processAsset(asset: z.infer<typeof AssetFrontmatterSchema>) {
  if (asset.parameters?.seed !== undefined) {
    // Type guard before use
    const seed = typeof asset.parameters.seed === 'number'
      ? asset.parameters.seed
      : undefined;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `any` everywhere | `unknown` + type guards | TypeScript 3.0+ | Forces runtime validation |
| `z.ZodObject<any>` | `z.ZodObject<z.ZodRawShape>` | Zod 3.0+ | Preserves type inference |
| String-based AST checks | Discriminated unions | TypeScript 2.0+ | Automatic type narrowing |
| Manual type guards | `satisfies` operator | TypeScript 4.9+ | Catches type errors at definition |

**Deprecated/outdated:**
- Using `any` for error handling: TypeScript 4.4+ has proper `unknown` in catch clauses
- Using `Object` type: Replaced by `Record<string, unknown>` for clarity
- Using `{}` for "any object": Confusing - means "any non-nullish value", not "any object"

## Open Questions

Things that couldn't be fully resolved:

1. **Should z.ZodObject<any> use z.ZodRawShape or z.ZodTypeAny?**
   - What we know: `z.ZodRawShape` is for object-specific operations, `z.ZodTypeAny` is the most general
   - What's unclear: Whether `parser/markdown.ts` needs object-specific methods on the schema
   - Recommendation: Use `z.ZodObject<z.ZodRawShape>` since the constructor specifically expects object schemas (extends BaseFrontmatterSchema)

2. **Should ComfyUI workflow JSON have any structure typing?**
   - What we know: ComfyUI workflows are arbitrary JSON, vary by workflow type
   - What's unclear: Whether there's a minimal common structure (e.g., always has node IDs)
   - Recommendation: Keep as `Record<string, unknown>` - it's external data we don't control

3. **Should graph node properties be more strictly typed?**
   - What we know: Properties vary by entity type (character has different fields than location)
   - What's unclear: Whether template schemas could be used for runtime validation
   - Recommendation: Keep as `Record<string, unknown>` for now - this is working as designed (entities have different shapes)

## Sources

### Primary (HIGH confidence)
- TypeScript Handbook: Strict Mode - https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness
- TypeScript Handbook: Narrowing - https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Zod GitHub: Type Inference - https://github.com/colinhacks/zod#type-inference
- @types/mdast@4.0.4: Node type definitions (installed dependency)
- Existing codebase patterns: `cli/fix/types.ts`, `cli/validate/types.ts`, `templates/schema-factory.ts`

### Secondary (MEDIUM confidence)
- TypeScript strict mode is project standard: Confirmed in `tsconfig.json:9` (`"strict": true`)
- Zod 4.3.6 installed: Confirmed via `npm list zod`
- mdast 4.0.4 types: Confirmed via `npm list @types/mdast`

### Tertiary (LOW confidence)
- None - all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies installed, versions confirmed
- Architecture: HIGH - Patterns exist in codebase, TypeScript features documented
- Pitfalls: HIGH - Based on common TypeScript strict-mode issues and existing code review

**Research date:** 2026-01-27
**Valid until:** 2026-04-27 (90 days - TypeScript and Zod are stable, unlikely to change patterns)

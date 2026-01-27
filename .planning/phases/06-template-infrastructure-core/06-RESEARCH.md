# Phase 6: Template Infrastructure Core - Research

**Researched:** 2026-01-25
**Domain:** Dynamic schema generation, plugin/template registries, config-driven type systems
**Confidence:** MEDIUM

## Summary

Template infrastructure systems allow users to define custom entity types via configuration without coding. This phase implements a pluggable template system where worldbuilding becomes one template among many potential templates (project management, documentation systems, etc.).

The standard approach in TypeScript ecosystems uses:
1. **Factory functions** to generate Zod schemas dynamically from JSON config at startup
2. **Registry pattern** with type-safe plugin architecture for template management
3. **JSON Schema or TypeBox** for config file validation with clear error messages
4. **Migration patterns** (Expand-Migrate-Contract) to transition from hardcoded to template-based schemas

Critical insight: **Dynamic Zod schemas are an anti-pattern** for purely runtime generation. Instead, use factory functions that generate schemas at startup from config, maintaining TypeScript's static type guarantees while enabling runtime flexibility.

**Primary recommendation:** Use Zod factory functions to build schemas from validated JSON config at startup. Validate config with Zod itself (meta-validation), use the registry pattern for template lifecycle, and leverage TypeScript's declaration merging for extensibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.24.1 | Schema validation and type inference | Already in use, TypeScript-first design, minimal bundle size (2kb) |
| cosmiconfig | ^9.x | Config file discovery and loading | Industry standard for finding .rc files, package.json, etc. Supports TypeScript, YAML, JSON |
| ajv | ^8.x | JSON Schema validation for config | Fastest JSON Schema validator, generates optimized code, official JSON Schema compliance |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sinclair/typebox | ^0.34.x | JSON Schema builder with TypeScript types | Alternative to Zod for config schemas when JSON Schema compatibility needed |
| @techery/zod-dynamic-schema | ^1.x | Type-safe factory functions for Zod | Simplifies building dynamic schemas from config |
| cosmiconfig-typescript-loader | ^5.x | TypeScript config file support | Enable .ts config files for complex template definitions |
| better-comments | Built-in | Structured error messages | Create user-friendly validation errors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod factory pattern | Pure JSON Schema + Ajv | Lose static TypeScript types, gain JSON Schema tooling compatibility |
| Registry pattern | Class-based plugins | More OOP boilerplate, less functional composition |
| JSON config | TypeScript config files | Type safety in config, but requires build step |

**Installation:**
```bash
npm install cosmiconfig ajv
npm install --save-dev @types/better-sqlite3
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── templates/
│   ├── registry.ts          # Template registry singleton
│   ├── types.ts             # Template config interfaces
│   ├── validator.ts         # Config validation with Ajv/Zod
│   ├── schema-factory.ts    # Zod schema generator from config
│   └── builtin/
│       └── worldbuilding.ts # Worldbuilding template definition
├── config/
│   └── loader.ts            # Cosmiconfig integration
└── types/
    └── index.ts             # Generated types (will become dynamic)
```

### Pattern 1: Schema Factory Pattern
**What:** Generate Zod schemas from JSON config at startup using factory functions
**When to use:** Need runtime flexibility with compile-time type safety
**Example:**
```typescript
// Source: https://github.com/techery/zod-dynamic-schema
import { z } from 'zod';

// Config defines entity type structure
interface EntityTypeConfig {
  name: string;
  fields: FieldConfig[];
  relationships?: RelationshipConfig[];
}

interface FieldConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array';
  required?: boolean;
  default?: any;
  enumValues?: string[];
}

// Factory function generates Zod schema
function createEntitySchema(config: EntityTypeConfig): z.ZodObject<any> {
  const fields = config.fields.reduce((acc, field) => {
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case 'string':
        schema = z.string();
        break;
      case 'number':
        schema = z.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      case 'enum':
        if (!field.enumValues) throw new Error(`Enum field ${field.name} missing enumValues`);
        schema = z.enum(field.enumValues as [string, ...string[]]);
        break;
      case 'array':
        schema = z.array(z.string()); // Simplified
        break;
      default:
        schema = z.unknown();
    }

    // Make optional if not required
    if (!field.required) {
      schema = schema.optional();
    }

    // Add default if provided
    if (field.default !== undefined) {
      schema = schema.default(field.default);
    }

    return { ...acc, [field.name]: schema };
  }, {} as Record<string, z.ZodTypeAny>);

  return z.object(fields);
}

// Usage
const characterConfig: EntityTypeConfig = {
  name: 'character',
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'age', type: 'number', required: false },
    { name: 'status', type: 'enum', enumValues: ['alive', 'deceased'], required: false }
  ]
};

const CharacterSchema = createEntitySchema(characterConfig);
type Character = z.infer<typeof CharacterSchema>;
```

### Pattern 2: Template Registry with Type Safety
**What:** Central registry managing template lifecycle with TypeScript declaration merging
**When to use:** Need to register, validate, and activate templates dynamically
**Example:**
```typescript
// Source: Adapted from https://frontendmasters.com/courses/typescript-v4/type-registry-pattern/
// and https://puzzles.slash.com/blog/scaling-1m-lines-of-typescript-registries

// Use base interface pattern instead of unions for better performance
interface BaseTemplate {
  id: string;
  name: string;
  version: string;
  entityTypes: Map<string, EntityTypeConfig>;
}

// Registry uses Map for O(1) lookups at scale
class TemplateRegistry {
  private templates = new Map<string, BaseTemplate>();
  private activeTemplateId: string | null = null;

  register(template: BaseTemplate): void {
    // Validation happens here
    this.validateTemplate(template);
    this.templates.set(template.id, template);
  }

  activate(templateId: string): void {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }
    this.activeTemplateId = templateId;
  }

  getActive(): BaseTemplate | null {
    if (!this.activeTemplateId) return null;
    return this.templates.get(this.activeTemplateId) || null;
  }

  private validateTemplate(template: BaseTemplate): void {
    // Validate template structure
    if (!template.id || !template.name || !template.version) {
      throw new Error('Template missing required fields: id, name, version');
    }

    // Validate entity types
    template.entityTypes.forEach((entityType, key) => {
      if (!entityType.fields || entityType.fields.length === 0) {
        throw new Error(`Entity type '${key}' has no fields defined`);
      }
    });
  }
}

// Singleton instance
export const templateRegistry = new TemplateRegistry();
```

### Pattern 3: Config Validation with Detailed Error Messages
**What:** Validate config files before schema generation with clear, actionable errors
**When to use:** Startup validation to catch config issues early
**Example:**
```typescript
// Source: https://ajv.js.org/guide/typescript.html
import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Define config schema using JSONSchemaType for type safety
const TemplateConfigSchema: JSONSchemaType<TemplateConfig> = {
  type: 'object',
  properties: {
    templates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
          name: { type: 'string', minLength: 1 },
          version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
          entityTypes: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                fields: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string', enum: ['string', 'number', 'boolean', 'enum', 'array'] },
                      required: { type: 'boolean', nullable: true },
                      enumValues: { type: 'array', items: { type: 'string' }, nullable: true }
                    },
                    required: ['name', 'type']
                  },
                  minItems: 1
                }
              },
              required: ['name', 'fields']
            }
          }
        },
        required: ['id', 'name', 'version', 'entityTypes']
      }
    },
    activeTemplate: { type: 'string' }
  },
  required: ['templates']
};

const validateConfig = ajv.compile(TemplateConfigSchema);

function loadAndValidateConfig(configData: unknown): TemplateConfig {
  if (!validateConfig(configData)) {
    // Format errors for users
    const errors = validateConfig.errors!.map(err => {
      const path = err.instancePath || 'root';
      const message = err.message || 'validation failed';
      return `Config error at '${path}': ${message}`;
    });

    throw new Error(
      `Template configuration is invalid:\n${errors.join('\n')}\n\n` +
      `Please check your config.json file.`
    );
  }

  return configData;
}
```

### Pattern 4: Expand-Migrate-Contract for Hardcoded → Template Migration
**What:** Three-phase migration strategy to move from hardcoded schemas to templates
**When to use:** Migrating existing systems to template-based architecture
**Example:**
```typescript
// EXPAND PHASE: Add template system alongside existing hardcoded schemas
// Both systems coexist

// OLD: Hardcoded schema (stays for now)
export const CharacterFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('character'),
  name: z.string(),
  age: z.number().optional(),
  // ... rest of hardcoded fields
});

// NEW: Template-based schema generator
export function getCharacterSchema(): z.ZodObject<any> {
  const activeTemplate = templateRegistry.getActive();
  if (activeTemplate) {
    const characterType = activeTemplate.entityTypes.get('character');
    if (characterType) {
      return createEntitySchema(characterType);
    }
  }
  // Fallback to hardcoded during migration
  return CharacterFrontmatterSchema;
}

// MIGRATE PHASE: Update code to use template schemas
// Application code uses getCharacterSchema() which checks template first

// CONTRACT PHASE: Remove hardcoded schemas once fully migrated
// Delete old CharacterFrontmatterSchema, keep only template version
```

### Anti-Patterns to Avoid
- **Purely dynamic runtime schemas:** Don't create Zod schemas on every validation. Generate once at startup from config.
- **Type unions for registry:** Large type unions hurt TypeScript performance. Use base interfaces and Maps instead.
- **No config validation:** Always validate config before schema generation. Invalid config = unclear errors later.
- **Tight coupling:** Don't let templates access core system internals. Define clear interface boundaries.
- **Skipping migration phases:** Don't try to replace all hardcoded schemas at once. Use expand-migrate-contract pattern.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config file discovery | Custom .json finder | cosmiconfig | Handles .rc files, package.json, multiple formats, search paths, caching |
| JSON Schema validation | String-based validators | Ajv | 10x faster via code generation, full JSON Schema compliance, type guards |
| Error message formatting | template strings | Ajv's error objects + custom formatter | Structured errors with paths, multiple errors in one pass |
| Schema versioning | Manual version checks | Semantic versioning parser + migration functions | Handles major/minor/patch, compatibility checks |
| Plugin dependency resolution | Custom dependency graph | Existing topological sort libraries | Edge cases: circular deps, version conflicts |
| Type inference from schemas | Manual type definitions | z.infer<typeof Schema> | Automatic, stays in sync, no duplication |

**Key insight:** Schema validation, config discovery, and type inference are solved problems with battle-tested libraries. Custom solutions introduce bugs (circular dependencies, cache invalidation, format edge cases).

## Common Pitfalls

### Pitfall 1: Invalid Config Silent Failures
**What goes wrong:** Template config has typos or invalid structure, but system loads with partial data
**Why it happens:** No validation before schema generation, or validation errors swallowed
**How to avoid:**
- Validate config with Ajv/Zod before any schema generation
- Fail fast on startup with detailed error messages
- Include config file path in error messages
**Warning signs:**
- "Property undefined" errors during runtime
- Missing entity types that should exist
- Schemas don't match config

### Pitfall 2: Schema Generation Performance Issues
**What goes wrong:** Generating schemas on every validation call causes performance degradation
**Why it happens:** Treating schema generation as a runtime operation instead of startup operation
**How to avoid:**
- Generate all schemas once at startup
- Cache schemas in registry
- Only regenerate if config changes (file watcher)
**Warning signs:**
- High CPU usage during normal operations
- Slow validation times
- Memory leaks from uncached schemas

### Pitfall 3: Type Safety Loss in Dynamic Schemas
**What goes wrong:** TypeScript can't infer types from dynamic schemas, lose compile-time safety
**Why it happens:** Over-reliance on `any` types, no factory function pattern
**How to avoid:**
- Use factory functions that return properly typed Zod schemas
- Leverage z.infer<> for type extraction
- Create TypeScript declaration files for common templates
**Warning signs:**
- Lots of `as any` casts in code
- Type errors only caught at runtime
- IDE autocomplete not working

### Pitfall 4: Breaking Changes During Migration
**What goes wrong:** Existing data becomes invalid when migrating to template system
**Why it happens:** Skipping compatibility checks, removing old schemas too early
**How to avoid:**
- Use Expand-Migrate-Contract pattern
- Maintain backward compatibility for at least one version
- Add schema version fields to data
- Test migration with real vault data before deploying
**Warning signs:**
- Vault indexing fails after update
- Old notes rejected as invalid
- Database corruption errors

### Pitfall 5: Template Dependencies Not Resolved
**What goes wrong:** Template B depends on Template A, but A isn't loaded/validated first
**Why it happens:** No dependency resolution in registry
**How to avoid:**
- Templates declare dependencies in config
- Registry validates dependency graph before activation
- Load templates in topological order
- Detect circular dependencies early
**Warning signs:**
- "Entity type not found" errors
- Relationship validation failures
- Inconsistent behavior based on load order

### Pitfall 6: Over-Engineering Template System
**What goes wrong:** Template system becomes more complex than problems it solves
**Why it happens:** Adding features for hypothetical future needs, not current requirements
**How to avoid:**
- Start with minimal viable template system (just entity types)
- Add features only when requirements exist
- Keep template config format simple (flat structure initially)
**Warning signs:**
- Template config has 4+ levels of nesting
- Documentation longer than implementation
- More time spent on template system than using it

## Code Examples

Verified patterns from official sources:

### Dynamic Record Keys with Enum
```typescript
// Source: https://github.com/colinhacks/zod/discussions/2134
import { z } from 'zod';

// For truly dynamic key-value pairs
const DynamicEntityFields = z.record(z.string(), z.any());

// For known keys from enum
const EntityTypeKeys = z.enum(['character', 'location', 'event']);
const TemplateEntityTypes = z.record(EntityTypeKeys, z.object({
  name: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string()
  }))
}));

type TemplateEntityTypes = z.infer<typeof TemplateEntityTypes>;
// { character: {...}, location: {...}, event: {...} }
```

### Config Loading with Cosmiconfig
```typescript
// Source: https://github.com/cosmiconfig/cosmiconfig
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('hivemind', {
  searchPlaces: [
    'package.json',
    '.hivemindrc',
    '.hivemindrc.json',
    '.hivemindrc.yaml',
    '.hivemindrc.yml',
    'hivemind.config.js',
    'hivemind.config.ts',
  ],
  loaders: {
    '.ts': async (filepath: string) => {
      // Custom TypeScript loader if needed
      const module = await import(filepath);
      return module.default;
    }
  }
});

async function loadConfig() {
  const result = await explorer.search();
  if (!result) {
    throw new Error('No hivemind config found');
  }
  return result.config;
}
```

### Ajv Standalone Code Generation
```typescript
// Source: https://ajv.js.org/standalone.html
import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone';
import fs from 'fs';

// Generate optimized validation code at build time
const ajv = new Ajv({ code: { source: true } });
const validate = ajv.compile(TemplateConfigSchema);

const moduleCode = standaloneCode(ajv, validate);
fs.writeFileSync('src/generated/validate-config.js', moduleCode);

// Import and use in production (no Ajv runtime needed)
import { default as validateConfig } from './generated/validate-config.js';
```

### Zod Schema Extension
```typescript
// Source: https://zod.dev/
import { z } from 'zod';

// Base schema for all entities
const BaseEntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.string().datetime(),
  updated: z.string().datetime()
});

// Extend for specific entity types
function createTemplateEntitySchema(
  baseSchema: z.ZodObject<any>,
  additionalFields: Record<string, z.ZodTypeAny>
): z.ZodObject<any> {
  return baseSchema.extend(additionalFields);
}

// Usage
const CharacterSchema = createTemplateEntitySchema(
  BaseEntitySchema,
  {
    name: z.string(),
    age: z.number().optional(),
    relationships: z.array(z.string()).default([])
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded Zod schemas per entity | Factory functions generating schemas from config | 2024-2025 | Enables user customization without code changes |
| Class-based plugin systems | Functional registry with Maps | 2023-2024 | Better TypeScript performance, less OOP boilerplate |
| Runtime JSON Schema validation | Compile-time code generation (Ajv standalone) | 2022-2023 | 10x+ faster validation, smaller bundles |
| Type unions for extensibility | Base interfaces + declaration merging | 2023-2024 | Better TypeScript compiler performance at scale |
| Zod-only validation | Hybrid: JSON Schema (config) + Zod (data) | 2024-2025 | Better tooling support, clearer separation of concerns |

**Deprecated/outdated:**
- **ts-to-zod for runtime:** Designed for build-time code generation, not runtime schema creation. Use factory functions instead.
- **Large Zod union types:** TypeScript performance degrades with 50+ union members. Use base interfaces.
- **JSON Schema Draft-04:** Ajv 8.x supports Draft 2020-12. Use modern features like `unevaluatedProperties`.
- **Synchronous config loading:** Modern tools use async (cosmiconfig async explorer). Plan for async from start.

## Open Questions

Things that couldn't be fully resolved:

1. **TypeBox vs Zod for Config Schema**
   - What we know: TypeBox generates JSON Schema, Zod is TypeScript-first
   - What's unclear: Performance impact of using both (TypeBox for config, Zod for entities)
   - Recommendation: Start with Zod for both (already in project). Migrate config to TypeBox only if JSON Schema tooling integration needed (e.g., VS Code validation)

2. **Template Versioning Strategy**
   - What we know: Semantic versioning recommended, breaking changes need migration
   - What's unclear: How to handle template version mismatches with existing vault data
   - Recommendation: Store template version in database. On version mismatch, warn user and provide migration path. Research schema migration tools in next phase.

3. **Hot Reload vs Restart for Config Changes**
   - What we know: File watchers (chokidar) can detect config changes
   - What's unclear: Safety of hot-reloading schemas vs requiring restart
   - Recommendation: Start with restart-required. Hot reload is optimization for later phase if user feedback demands it.

4. **Relationship Validation Across Templates**
   - What we know: Templates define entity types and their relationships
   - What's unclear: How to validate cross-template relationships (Template A's entity references Template B's entity)
   - Recommendation: Phase 6 supports single active template only. Multi-template relationships deferred to later phase based on real use cases.

## Sources

### Primary (HIGH confidence)
- [Zod Official Documentation](https://zod.dev/) - Schema definition, composition, validation
- [Ajv JSON Schema Validator Documentation](https://ajv.js.org/) - TypeScript integration, standalone compilation
- [Ajv TypeScript Guide](https://ajv.js.org/guide/typescript.html) - Type-safe schema validation
- [Cosmiconfig Official Repository](https://github.com/cosmiconfig/cosmiconfig) - Config file discovery and loading

### Secondary (MEDIUM confidence)
- [TypeBox GitHub Repository](https://github.com/sinclairzx81/typebox) - JSON Schema builder with TypeScript types
- [Frontend Masters: Type Registry Pattern](https://frontendmasters.com/courses/typescript-v4/type-registry-pattern/) - TypeScript registry patterns at scale
- [Slash Engineering: Scaling TypeScript Registries](https://puzzles.slash.com/blog/scaling-1m-lines-of-typescript-registries) - Base interface pattern vs unions
- [Strapi vs Directus Architecture Comparison](https://weframetech.com/blog/strapi-vs-directus) - How headless CMS handle custom content types
- [Directus vs Strapi Technical Comparison](https://www.glukhov.org/post/2025/11/headless-cms-comparison-strapi-directus-payload/) - Database-first vs code-first approaches
- [JSON Schema to Zod Converter](https://github.com/dmitryrechkin/json-schema-to-zod) - Dynamic schema conversion
- [Schema Evolution Article](https://medium.com/@kaushalsinh73/typescript-schema-evolution-safe-contract-migrations-across-distributed-services-bd8bd04cda4d) - Migration strategies
- [Schema Migrations with Zod](https://medium.com/@hjparmar1944/typescript-schema-migrations-safe-evolution-with-zod-openapi-diff-4b2a8cf1988d) - Safe evolution patterns
- [FreeCodeCamp: Breaking Changes Guide](https://www.freecodecamp.org/news/how-to-handle-breaking-changes/) - API/schema breaking change strategies

### Tertiary (LOW confidence - requires verification)
- [@techery/zod-dynamic-schema](https://github.com/techery/zod-dynamic-schema) - Factory pattern library (recent, limited production use)
- [Zod GitHub Discussion #1099](https://github.com/colinhacks/zod/discussions/1099) - Community patterns for dynamic schemas
- [Zod GitHub Discussion #2262](https://github.com/colinhacks/zod/discussions/2262) - Dynamic key extraction patterns
- [Builder Pattern with Zod](https://shadisbaih.medium.com/builder-pattern-in-javascript-practical-example-with-zod-validation-3b92c431c59d) - Factory pattern examples
- [Plugin Architecture Best Practices](https://chateau-logic.com/content/designing-plugin-architecture-application) - General plugin design (not TypeScript-specific)
- [TypeScript Error Handling Guide](https://medium.com/with-orus/the-5-commandments-of-clean-error-handling-in-typescript-93a9cbdf1af5) - Error message patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod and Ajv are well-established, widely used
- Architecture: MEDIUM - Patterns verified across multiple sources, but template-specific implementation untested
- Pitfalls: MEDIUM - Based on documented issues in similar systems, not specific to this codebase
- Migration strategy: MEDIUM - Expand-Migrate-Contract is proven, but specific execution details need validation

**Research date:** 2026-01-25
**Valid until:** ~30 days (stable ecosystem, but check for Zod/Ajv updates before implementation)

**Key limitations:**
- Most examples found are for generic plugin systems, not specifically template-based entity systems
- Limited production examples of Zod factory patterns at scale
- Template versioning and migration strategies are conceptual, not battle-tested in this context
- Multi-template interactions (relationships across templates) not fully researched

# Phase 14: Validate CLI - Research

**Researched:** 2026-01-26
**Domain:** CLI validation, markdown frontmatter scanning, file validation
**Confidence:** HIGH

## Summary

Phase 14 implements `npx hivemind validate` — a vault scanning command that reports files with missing or invalid frontmatter. This is a read-only operation that helps users understand what needs fixing before making changes.

The standard approach uses existing codebase infrastructure: VaultReader for file discovery, MarkdownParser with gray-matter for frontmatter parsing, Zod schemas from SchemaFactory for validation, and FolderMapper for type inference. Exit codes follow Unix conventions (0 = success, 1 = errors, 2 = config errors), and JSON output enables CI/CD integration.

**Primary recommendation:** Reuse existing vault scanning infrastructure (VaultReader, MarkdownParser, FolderMapper) and extend with validation-specific result collection and formatting. Follow Unix CLI conventions for silent success, grouped error output, and standard exit codes.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | 4.0.3 | Parse YAML frontmatter from markdown | De facto standard for markdown frontmatter parsing, already in use |
| Zod | 4.3.6 | Runtime schema validation | Type-safe validation with excellent error messages, already generates entity schemas |
| picomatch | 4.0.3 | Glob pattern matching | Fast, accurate glob matcher used by Jest, Astro, 5M+ projects, already in use for FolderMapper |
| picocolors | 1.1.1 | Terminal color formatting | Zero-dependency, already in use for CLI output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @github-docs/frontmatter | latest | Frontmatter validation | NOT NEEDED - Zod schemas already validate frontmatter |
| zod-matter | latest | Zod + gray-matter integration | NOT NEEDED - MarkdownParser already integrates both |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| VaultReader | Custom file scanner | VaultReader already handles exclusions, hidden files, progress reporting |
| Zod | JSON Schema validators | Zod provides better TypeScript integration and is already generating entity schemas |
| Custom result formatter | ESLint/Prettier formatters | Custom formatter provides domain-specific grouping (by issue type vs by file) |

**Installation:**
No new dependencies required - all infrastructure already exists in codebase.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── validate/           # NEW: validate command
│   │   ├── index.ts        # Command entry point
│   │   ├── scanner.ts      # Validation scanner (uses VaultReader)
│   │   ├── validator.ts    # Frontmatter validator (uses SchemaFactory)
│   │   ├── formatter.ts    # Output formatters (text and JSON)
│   │   └── types.ts        # Validation result types
│   └── ...
└── ...
```

### Pattern 1: Reuse Vault Infrastructure
**What:** Leverage VaultReader's file discovery but bypass entity indexing
**When to use:** When scanning vault files without needing full MCP index
**Example:**
```typescript
// Source: Based on existing VaultReader pattern in src/vault/reader.ts
import { VaultReader } from '../../vault/reader.js';

class ValidationScanner {
  private vaultPath: string;

  async scanVault(): Promise<ValidationResult[]> {
    // Reuse VaultReader's file discovery logic
    const files = await this.findMarkdownFiles(this.vaultPath);

    const results: ValidationResult[] = [];
    for (const filePath of files) {
      results.push(await this.validateFile(filePath));
    }

    return results;
  }

  // Copy VaultReader's findMarkdownFiles and shouldExclude methods
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    // Same logic as VaultReader - handles exclusions, hidden files
  }
}
```

### Pattern 2: Schema-Based Validation
**What:** Use SchemaFactory to generate validators for each entity type
**When to use:** When validating frontmatter against template schemas
**Example:**
```typescript
// Source: Existing pattern from src/templates/schema-factory.ts
import { schemaFactory } from '../../templates/schema-factory.js';
import { templateRegistry } from '../../templates/registry.js';

function validateFrontmatter(frontmatter: any, expectedType?: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check if type field exists
  if (!frontmatter.type) {
    issues.push({ type: 'missing_field', field: 'type' });
    return issues;
  }

  // Get schema for this entity type
  const template = templateRegistry.getActive();
  const entityConfig = template?.entityTypes.find(e => e.name === frontmatter.type);

  if (!entityConfig) {
    issues.push({ type: 'invalid_type', value: frontmatter.type });
    return issues;
  }

  // Validate against schema
  const schema = schemaFactory.getSchema(entityConfig);
  const result = schema.safeParse(frontmatter);

  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        type: 'schema_validation',
        field: issue.path.join('.'),
        message: issue.message
      });
    }
  }

  return issues;
}
```

### Pattern 3: Grouped Output Formatting
**What:** Group validation results by issue type, not by file
**When to use:** Following user decision for grouped output format
**Example:**
```typescript
// Human-readable output format
function formatTextOutput(results: ValidationResult[]): string {
  const groups = groupByIssueType(results);
  const output: string[] = [];

  // Group 1: Missing frontmatter
  if (groups.missing.length > 0) {
    output.push('Missing frontmatter:');
    for (const file of groups.missing) {
      output.push(`  ${file.path}`);
    }
    output.push('');
  }

  // Group 2: Invalid type
  if (groups.invalidType.length > 0) {
    output.push('Invalid entity type:');
    for (const file of groups.invalidType) {
      output.push(`  ${file.path} - type: ${file.frontmatter.type}`);
    }
    output.push('');
  }

  // Summary line (always shown)
  const totalIssues = countTotalIssues(results);
  const totalFiles = results.filter(r => !r.valid).length;
  output.push(`Found ${totalIssues} issues in ${totalFiles} files`);

  return output.join('\n');
}
```

### Pattern 4: Unix Silent Success
**What:** No output when validation passes (exit code 0)
**When to use:** Following Unix philosophy decision from CONTEXT.md
**Example:**
```typescript
// Silent on success
async function runValidate(): Promise<void> {
  const results = await scanner.scanVault();
  const hasErrors = results.some(r => !r.valid);

  if (!hasErrors) {
    // Silent success - no output
    process.exit(0);
  }

  // Only print output if there are errors
  console.log(formatTextOutput(results));
  process.exit(1);
}
```

### Anti-Patterns to Avoid
- **Verbose success output:** Users expect silence on success (Unix convention)
- **File-by-file output:** Group by issue type for easier scanning
- **Custom file scanner:** VaultReader already handles hidden files, exclusions, glob patterns
- **Inline schema generation:** SchemaFactory caches schemas for performance

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown file discovery | Custom recursive scanner | VaultReader.findMarkdownFiles | Handles hidden files (.obsidian), exclusions, platform differences |
| Frontmatter parsing | Custom YAML parser | MarkdownParser with gray-matter | Handles edge cases (empty frontmatter, malformed YAML, missing delimiters) |
| Schema validation | Manual field checking | SchemaFactory + Zod | Generates schemas from template config, handles nested objects, arrays, enums |
| Type inference | Path string parsing | FolderMapper | Supports glob patterns, specificity ordering, multiple types per folder |
| Exit codes | Custom conventions | Unix standard (0/1/2) | CI tools expect standard codes |

**Key insight:** The codebase already has all infrastructure needed - vault scanning (VaultReader), frontmatter parsing (MarkdownParser), schema validation (SchemaFactory), and type inference (FolderMapper). Building custom versions would duplicate 1000+ lines of battle-tested code and miss edge cases.

## Common Pitfalls

### Pitfall 1: Validating Before Template Initialization
**What goes wrong:** SchemaFactory can't generate schemas if templateRegistry isn't initialized
**Why it happens:** Template loading happens during server startup, but CLI commands run standalone
**How to avoid:** Initialize template registry before validation
**Warning signs:** "Template not found" errors, schema validation fails for all files
**Prevention:**
```typescript
// MUST initialize template registry before validation
import { templateRegistry } from '../../templates/registry.js';
import { worldbuildingTemplate } from '../../templates/builtin/worldbuilding.js';

async function validateCommand(): Promise<void> {
  // Load config to get active template
  const config = loadConfig();

  // Initialize template registry (same as server startup)
  if (!templateRegistry.has(config.template.activeTemplate)) {
    // Register built-in templates
    templateRegistry.register(worldbuildingTemplate, 'builtin');
    // ... register others
  }

  templateRegistry.activate(config.template.activeTemplate);

  // NOW safe to validate
  const scanner = new ValidationScanner(config.vault.path);
  await scanner.scanVault();
}
```

### Pitfall 2: File Path Platform Differences
**What goes wrong:** Validation results differ on Windows vs Unix due to path separators
**Why it happens:** FolderMapper normalizes to forward slashes, but file paths may use backslashes
**How to avoid:** Normalize all paths before comparison or output
**Warning signs:** Folder mappings don't match on Windows, paths look wrong in output
**Prevention:**
```typescript
// Always normalize paths for display
import { relative } from 'path';

function formatFilePath(absolutePath: string, vaultPath: string): string {
  // Use relative() which handles platform differences
  return relative(vaultPath, absolutePath);
}
```

### Pitfall 3: Missing Required Fields vs Invalid Values
**What goes wrong:** Reporting "invalid frontmatter" when field is just missing
**Why it happens:** Zod validation errors don't distinguish between missing and invalid
**How to avoid:** Check for missing fields first, then validate values
**Warning signs:** Confusing error messages like "Expected string, received undefined"
**Prevention:**
```typescript
function validateFrontmatter(frontmatter: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for completely missing frontmatter first
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return [{ type: 'missing_frontmatter' }];
  }

  // Check for missing required fields before schema validation
  const required = ['id', 'type', 'status'];
  for (const field of required) {
    if (!(field in frontmatter)) {
      issues.push({ type: 'missing_field', field });
    }
  }

  // Only run schema validation if required fields exist
  if (issues.length === 0) {
    // Schema validation here
  }

  return issues;
}
```

### Pitfall 4: Exit Code Confusion
**What goes wrong:** Using exit code 1 for both validation errors AND config errors
**Why it happens:** Common pattern to use 1 for any error
**How to avoid:** Use exit code 2 for config/system errors, 1 for validation errors
**Warning signs:** CI can't distinguish between "vault has issues" and "command failed"
**Prevention:**
```typescript
// REQUIREMENT: VALD-04 specifies exit code 2 for config errors
try {
  const config = loadConfig();
} catch (err) {
  console.error('❌ Configuration error:', err.message);
  process.exit(2); // Config error, NOT validation error
}

const results = await scanner.scanVault();
if (results.some(r => !r.valid)) {
  console.log(formatOutput(results));
  process.exit(1); // Validation errors found
}

process.exit(0); // Success
```

## Code Examples

Verified patterns from existing codebase:

### Reusing VaultReader File Discovery
```typescript
// Source: Adapted from src/vault/reader.ts lines 200-227
import { promises as fs } from 'fs';
import { join } from 'path';

async function findMarkdownFiles(dir: string, excludePatterns: string[]): Promise<string[]> {
  const results: string[] = [];

  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip excluded patterns (same logic as VaultReader)
    if (shouldExclude(entry.name, excludePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await findMarkdownFiles(fullPath, excludePatterns);
      results.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

function shouldExclude(name: string, patterns: string[]): boolean {
  const defaultExcludes = ['.obsidian', '.trash', '.git', 'node_modules'];
  const allPatterns = [...defaultExcludes, ...patterns];

  return allPatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(name);
    }
    return name === pattern || name.startsWith(pattern);
  });
}
```

### Parsing and Validating Frontmatter
```typescript
// Source: Based on src/parser/markdown.ts and src/templates/schema-factory.ts
import matter from 'gray-matter';
import { schemaFactory } from '../templates/schema-factory.js';

interface ValidationIssue {
  type: 'missing_frontmatter' | 'missing_field' | 'invalid_type' | 'schema_error' | 'folder_mismatch';
  field?: string;
  message?: string;
  expected?: string;
  actual?: string;
}

async function validateFile(filePath: string, vaultPath: string): Promise<{
  path: string;
  valid: boolean;
  issues: ValidationIssue[];
  frontmatter?: any;
}> {
  const content = await fs.readFile(filePath, 'utf-8');
  const { data: frontmatter } = matter(content);

  const issues: ValidationIssue[] = [];

  // Check for missing frontmatter
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return {
      path: relative(vaultPath, filePath),
      valid: false,
      issues: [{ type: 'missing_frontmatter' }]
    };
  }

  // Check for missing required fields
  const required = ['id', 'type', 'status'];
  for (const field of required) {
    if (!(field in frontmatter)) {
      issues.push({ type: 'missing_field', field });
    }
  }

  // Validate type against template
  if (frontmatter.type) {
    const template = templateRegistry.getActive();
    const entityConfig = template?.entityTypes.find(e => e.name === frontmatter.type);

    if (!entityConfig) {
      const validTypes = template?.entityTypes.map(e => e.name).join(', ') || 'none';
      issues.push({
        type: 'invalid_type',
        actual: frontmatter.type,
        expected: validTypes
      });
    } else {
      // Schema validation
      const schema = schemaFactory.getSchema(entityConfig);
      const result = schema.safeParse(frontmatter);

      if (!result.success) {
        for (const zodIssue of result.error.issues) {
          issues.push({
            type: 'schema_error',
            field: zodIssue.path.join('.'),
            message: zodIssue.message
          });
        }
      }
    }
  }

  return {
    path: relative(vaultPath, filePath),
    valid: issues.length === 0,
    issues,
    frontmatter
  };
}
```

### Folder Mismatch Detection
```typescript
// Source: Based on FolderMapper from src/templates/folder-mapper.ts
import { FolderMapper } from '../templates/folder-mapper.js';

async function checkFolderMismatch(
  filePath: string,
  frontmatterType: string,
  folderMapper: FolderMapper
): Promise<ValidationIssue | null> {
  const result = await folderMapper.resolveType(filePath);

  // Only warn if folder mapping suggests a different type
  if (result.confidence === 'exact' && result.types[0] !== frontmatterType) {
    return {
      type: 'folder_mismatch',
      expected: result.types[0],
      actual: frontmatterType,
      message: `File in ${result.matchedPattern} folder but has type: ${frontmatterType}`
    };
  }

  return null;
}
```

### JSON Output Format
```typescript
// Source: Based on CLI patterns and CONTEXT.md decisions
interface JsonOutput {
  valid: boolean;
  timestamp: string;
  vaultPath: string;
  totalFiles: number;
  totalIssues: number;
  files: Record<string, string[]>; // path -> array of issue messages
  summary: {
    missingFrontmatter: number;
    invalidType: number;
    schemaErrors: number;
    folderMismatches: number;
  };
}

function formatJsonOutput(results: ValidationResult[], vaultPath: string): string {
  const files: Record<string, string[]> = {};
  const summary = {
    missingFrontmatter: 0,
    invalidType: 0,
    schemaErrors: 0,
    folderMismatches: 0
  };

  for (const result of results) {
    if (!result.valid) {
      const messages = result.issues.map(issue => formatIssueMessage(issue));
      files[result.path] = messages;

      // Count by type
      for (const issue of result.issues) {
        if (issue.type === 'missing_frontmatter') summary.missingFrontmatter++;
        else if (issue.type === 'invalid_type') summary.invalidType++;
        else if (issue.type === 'schema_error') summary.schemaErrors++;
        else if (issue.type === 'folder_mismatch') summary.folderMismatches++;
      }
    }
  }

  const output: JsonOutput = {
    valid: Object.keys(files).length === 0,
    timestamp: new Date().toISOString(),
    vaultPath,
    totalFiles: results.length,
    totalIssues: Object.values(files).flat().length,
    files,
    summary
  };

  return JSON.stringify(output, null, 2);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded entity types | Template-based validation | Phase 13 (Jan 2026) | Validator must use SchemaFactory for dynamic types |
| Manual frontmatter checks | Zod schema validation | v2.0 (Jan 2026) | Leverage existing schema generation infrastructure |
| String matching for folders | Glob patterns with picomatch | Phase 13 (Jan 2026) | FolderMapper already supports complex patterns |
| Custom exit codes | Standard Unix codes (0/1/2) | Current | Follows CLI best practices |

**Deprecated/outdated:**
- LegacyFolderMapper: Use async FolderMapper.create() for glob support
- Manual YAML parsing: MarkdownParser already integrates gray-matter
- Custom validation logic: SchemaFactory generates validators from template config

## Open Questions

None — all technical decisions have been made in CONTEXT.md and existing infrastructure addresses all requirements.

## Sources

### Primary (HIGH confidence)
- Existing codebase:
  - `src/vault/reader.ts` - File discovery, exclusion patterns, progress reporting
  - `src/parser/markdown.ts` - Frontmatter parsing with gray-matter
  - `src/templates/schema-factory.ts` - Zod schema generation from template config
  - `src/templates/folder-mapper.ts` - Type inference from file paths
  - `src/cli.ts` - CLI command patterns, exit codes
  - `src/config/schema.ts` - Config validation patterns
  - `tests/cli/validate-template.test.ts` - CLI test patterns
- [Node.js v25.3.0 Documentation - CLI](https://nodejs.org/api/cli.html)
- [picomatch GitHub](https://github.com/micromatch/picomatch)
- [gray-matter npm](https://www.npmjs.com/package/gray-matter)

### Secondary (MEDIUM confidence)
- [Node.js CLI Best Practices Repository](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [zod-matter GitHub](https://github.com/HiDeoo/zod-matter) - Validated approach (Zod + gray-matter)
- [Mastering Node.js CLI: Best Practices and Tips](https://dev.to/boudydegeer/mastering-nodejs-cli-best-practices-and-tips-7j5)
- [Building CLI Tools with Node.js](https://www.javacodegeeks.com/2025/03/building-cli-tools-with-node-js.html)

### Tertiary (LOW confidence)
None - all findings verified with existing codebase and official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json and battle-tested
- Architecture: HIGH - Based on existing codebase patterns (VaultReader, MarkdownParser, SchemaFactory)
- Pitfalls: HIGH - Identified from actual code patterns and template system requirements
- Exit codes: HIGH - Standard Unix conventions, verified in Node.js docs
- JSON output: MEDIUM - Structure based on CONTEXT.md decisions, not external standard

**Research date:** 2026-01-26
**Valid until:** 30 days (stable domain - CLI validation patterns are established)

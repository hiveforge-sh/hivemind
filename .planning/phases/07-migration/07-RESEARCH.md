# Phase 7: Migration - Research

**Researched:** 2026-01-25
**Domain:** Code refactoring, database migration, backwards compatibility, deprecation patterns
**Confidence:** MEDIUM

## Summary

Phase 7 migrates hardcoded worldbuilding schemas to the template system built in Phase 6. This is a refactoring migration, not a user-facing schema change - existing vaults must work unchanged.

The standard approach combines:
1. **Database rebuild** (not in-place migration) - SQLite limitation: column operations require rebuild
2. **Tool aliasing with deprecation warnings** - Standard API evolution pattern for MCP tools
3. **Snapshot testing for parity validation** - Vitest built-in snapshot support ensures behavior equivalence
4. **Template auto-detection** - Convention-based folder structure analysis (similar to ESLint config discovery)

**Primary recommendation:** Use database rebuild with metadata versioning, not in-place migration. SQLite's column limitations and the user's decision to treat markdown as source of truth makes rebuild the correct choice.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-sqlite3 | ^12.6.2 | SQLite driver | Already in use, current version (Jan 2026), fastest Node.js SQLite driver |
| vitest | ^4.0.18 | Testing framework | Already in use, built-in snapshot testing |
| zod | ^4.3.6 | Schema validation | Already in use for type checking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | - | No additional libraries needed | Existing stack covers all requirements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database rebuild | In-place ALTER TABLE | SQLite doesn't support DROP COLUMN or complex column changes - rebuild is necessary |
| Vitest snapshots | Custom JSON comparison | Vitest snapshots provide built-in diff tooling and update workflow |

**Installation:**
```bash
# No new dependencies needed - already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── server.ts                    # MCP tool handlers (add deprecation warnings)
├── graph/
│   └── database.ts              # Add metadata table, template_id column
├── templates/
│   ├── builtin/
│   │   └── worldbuilding.ts     # Already exists from Phase 6
│   ├── detector.ts              # NEW: Template auto-detection
│   └── loader.ts                # Already exists, extend for detection
tests/
├── migration/                   # NEW: Migration-specific tests
│   ├── snapshots/               # Vitest snapshot storage
│   ├── parity.test.ts           # Compare v1.0 vs template system
│   └── fixtures/                # Test vault structures
└── integration/
    └── vault-graph-search.test.ts  # Already exists, becomes regression test
```

### Pattern 1: Database Rebuild with Metadata Versioning

**What:** Add metadata table for version tracking, rebuild database when schema changes detected
**When to use:** SQLite schema changes that require column modifications
**Example:**
```typescript
// Source: Research findings + better-sqlite3 patterns
interface DatabaseMetadata {
  key: string;
  value: string;
}

class HivemindDatabase {
  private initializeSchema(): void {
    // Add metadata table for versioning
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Check schema version
    const currentVersion = this.getMetadata('schema_version');
    const expectedVersion = '2.0.0'; // Template system version

    if (currentVersion !== expectedVersion) {
      console.error(`Schema mismatch: ${currentVersion} -> ${expectedVersion}. Rebuilding...`);
      this.rebuildFromMarkdown();
      this.setMetadata('schema_version', expectedVersion);
    }

    // Store active template in metadata
    const activeTemplate = this.getMetadata('active_template');
    if (!activeTemplate) {
      this.setMetadata('active_template', 'worldbuilding');
    }

    // Add template_id column to nodes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        template_id TEXT NOT NULL DEFAULT 'worldbuilding',
        -- ... existing columns
      );
    `);
  }

  private getMetadata(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key);
    return row ? (row as any).value : null;
  }

  private setMetadata(key: string, value: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)
    `).run(key, value);
  }

  private rebuildFromMarkdown(): void {
    // Clear existing data
    this.clear();

    // Trigger re-scan (vault reader will rebuild from markdown files)
    // This is called by VaultReader.scanVault() -> GraphBuilder.buildGraph()
  }
}
```

### Pattern 2: Tool Aliasing with Deprecation Warnings

**What:** Existing MCP tools become wrappers to generic query_entity, with deprecation metadata
**When to use:** API evolution while maintaining backwards compatibility
**Example:**
```typescript
// Source: OpenAPI deprecation patterns + MCP SDK patterns
interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  _meta?: {
    deprecated?: boolean;
    deprecationMessage?: string;
    sunset?: string;
  };
}

// Generic entity query (new implementation)
async function handleQueryEntity(args: {
  type: string;
  id: string;
  includeContent?: boolean;
  contentLimit?: number;
}): Promise<ToolResponse> {
  await this.ensureIndexed();

  const result = await this.searchEngine.getNodeWithRelationships(args.id);

  if (!result || result.node.type !== args.type) {
    // Fuzzy search within type
    const searchResults = await this.searchEngine.search(args.id, {
      limit: 5,
      filters: { type: [args.type] }
    });

    if (searchResults.nodes.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `${args.type} not found: "${args.id}"\n\nTry searching with: search_vault`,
        }],
      };
    }

    const suggestions = searchResults.nodes.map(n => `- ${n.title} (${n.id})`).join('\n');
    return {
      content: [{
        type: 'text',
        text: `${args.type} "${args.id}" not found. Did you mean:\n\n${suggestions}`,
      }],
    };
  }

  // Format based on entity type using template-driven formatter
  const response = this.formatEntityWithRelationships(
    result,
    args.type,
    args.includeContent ?? true,
    args.contentLimit ?? 500
  );

  return { content: [{ type: 'text', text: response }] };
}

// Deprecated wrapper (backwards compatible)
async function handleQueryCharacter(args: {
  id: string;
  includeContent?: boolean;
  contentLimit?: number;
}): Promise<ToolResponse> {
  const response = await this.handleQueryEntity({
    type: 'character',
    ...args
  });

  // Add deprecation metadata
  response._meta = {
    deprecated: true,
    deprecationMessage: 'query_character is deprecated. Use query_entity with type="character" instead. Removal planned for v3.0.0.',
    sunset: '2027-01-01' // One major version cycle
  };

  return response;
}

// Tool registration includes deprecation flag
{
  name: 'query_character',
  description: '[DEPRECATED] Use query_entity instead. Retrieve detailed information about a character from the worldbuilding vault',
  deprecated: true, // OpenAPI-style deprecation flag
  inputSchema: { /* ... */ }
}
```

### Pattern 3: Snapshot Testing for Parity Validation

**What:** Capture query results before migration, compare after to ensure equivalence
**When to use:** Refactoring with strict backwards compatibility requirements
**Example:**
```typescript
// Source: Vitest snapshot documentation
// tests/migration/parity.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { HivemindServer } from '../../src/server.js';
import { setupTestVault } from '../fixtures.js';

describe('Migration Parity: v1.0 → v2.0 Template System', () => {
  let server: HivemindServer;
  let testVault: string;

  beforeAll(async () => {
    // Setup test vault with v1.0 hardcoded entities
    testVault = await setupTestVault({
      characters: ['alice', 'bob'],
      locations: ['tavern', 'castle'],
      events: ['battle'],
    });

    server = new HivemindServer({
      vault: { path: testVault },
      // Force template system enabled
    });

    await server.start();
  });

  it('query_character returns identical structure to v1.0', async () => {
    const request = {
      params: {
        name: 'query_character',
        arguments: { id: 'alice' }
      }
    };

    const response = await server.handleToolCall(request);

    // Vitest snapshot - first run creates baseline, subsequent runs compare
    expect(response.content[0].text).toMatchSnapshot();
  });

  it('search_vault with type filter matches v1.0 behavior', async () => {
    const request = {
      params: {
        name: 'search_vault',
        arguments: {
          query: 'brave',
          filters: { type: ['character'] }
        }
      }
    };

    const response = await server.handleToolCall(request);

    // Snapshot comparison
    expect(response.content[0].text).toMatchSnapshot();
  });

  it('all MCP tools return v1.0-compatible responses', async () => {
    const tools = [
      'query_character',
      'query_location',
      'search_vault',
      'get_canon_status',
      'validate_consistency'
    ];

    const results: Record<string, any> = {};

    for (const tool of tools) {
      const response = await server.handleToolCall({
        params: {
          name: tool,
          arguments: getDefaultArgs(tool) // Helper for test args
        }
      });

      results[tool] = response.content[0].text;
    }

    // Single snapshot of all tool outputs
    expect(results).toMatchSnapshot();
  });
});

// Update snapshots with: npm test -- --update
```

### Pattern 4: Template Auto-Detection

**What:** Scan vault folder structure to identify template type without config file
**When to use:** First load of vault without config.json
**Example:**
```typescript
// Source: ESLint config detection patterns + conventions
// src/templates/detector.ts
interface DetectionResult {
  templateId: string;
  confidence: 'high' | 'medium' | 'low';
  matchedPatterns: string[];
}

export class TemplateDetector {
  /**
   * Detect template from vault folder structure.
   *
   * Strategy: Count folders matching template entity types,
   * assign template with highest match score.
   */
  async detectTemplate(vaultPath: string): Promise<DetectionResult | null> {
    const folders = await this.listTopLevelFolders(vaultPath);

    // Worldbuilding template signatures
    const worldbuildingPatterns = [
      'characters', 'character',
      'locations', 'location',
      'events', 'event',
      'factions', 'faction',
      'lore',
      'assets', 'asset'
    ];

    const matched = folders.filter(f =>
      worldbuildingPatterns.some(p =>
        f.toLowerCase().includes(p)
      )
    );

    if (matched.length >= 3) {
      return {
        templateId: 'worldbuilding',
        confidence: matched.length >= 4 ? 'high' : 'medium',
        matchedPatterns: matched
      };
    }

    // Add more template detection logic here
    // e.g., research vault, project management, etc.

    return null; // No template detected
  }

  private async listTopLevelFolders(vaultPath: string): Promise<string[]> {
    const entries = await fs.promises.readdir(vaultPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .filter(e => !e.name.startsWith('.')) // Ignore hidden folders
      .map(e => e.name);
  }
}

// Usage in server startup
async start(): Promise<void> {
  // Check for config.json
  const configPath = join(this.config.vault.path, 'config.json');
  let activeTemplate: string;

  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    activeTemplate = config.activeTemplate;
    console.error(`[Server] Using template from config: ${activeTemplate}`);
  } else {
    // Auto-detect
    const detector = new TemplateDetector();
    const result = await detector.detectTemplate(this.config.vault.path);

    if (result) {
      activeTemplate = result.templateId;
      console.error(`[Server] Auto-detected template: ${activeTemplate} (${result.confidence} confidence)`);
      console.error(`[Server] Matched patterns: ${result.matchedPatterns.join(', ')}`);

      // Notify user on every load (as per requirements)
      console.error(`[Server] ℹ️ Template auto-detected: ${activeTemplate}. To customize, create config.json.`);
    } else {
      // Prompt user (show modal in Obsidian plugin, fallback to default for MCP server)
      console.error(`[Server] ⚠️ Could not detect template. Using default: worldbuilding`);
      activeTemplate = 'worldbuilding';
    }
  }

  // Initialize template system with detected/configured template
  this.templateConfig = initializeTemplates(activeTemplate);
}
```

### Anti-Patterns to Avoid

- **In-place ALTER TABLE migrations**: SQLite doesn't support DROP COLUMN or complex column modifications. Rebuild is required.
- **Silent deprecation**: Tools must emit warnings so AI/calling code knows about planned removal.
- **Snapshot-only validation without human review**: Snapshot diffs may show intentional improvements - allow merge after review.
- **Hardcoding template detection rules**: Use extensible pattern matching that can support future templates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot testing | Custom JSON diff comparison | Vitest `toMatchSnapshot()` | Built-in diff tooling, update workflow (`--update`), version control integration |
| SQLite migrations | Custom migration system | Database rebuild + metadata versioning | SQLite limitations make in-place migrations complex; vault is source of truth |
| Deprecation warnings | Custom logging | Response metadata pattern | Standard API evolution pattern, machine-readable for tooling |
| Template detection | Complex heuristics | Folder name pattern matching | Simple, reliable, extensible, follows conventions |

**Key insight:** Database migrations in SQLite are fundamentally limited - rebuild from source of truth (markdown) is simpler and more reliable than complex migration scripts. This is especially true when schema changes involve column additions (template_id).

## Common Pitfalls

### Pitfall 1: Assuming In-Place Migration is Possible

**What goes wrong:** Attempting to ALTER TABLE to add template_id column while preserving all triggers and indexes leads to complex SQL and potential data loss.

**Why it happens:** Developers familiar with PostgreSQL/MySQL assume SQLite has equivalent ALTER TABLE support.

**How to avoid:**
- Accept that SQLite requires table rebuild for complex schema changes
- Treat markdown files as source of truth, not database
- Implement rebuild as: `CLEAR database → Re-scan vault → Rebuild graph`

**Warning signs:**
- Migration scripts with multiple CREATE TABLE AS SELECT statements
- Complex trigger re-creation logic
- Manual FTS5 index rebuilding

### Pitfall 2: Missing Deprecation in Response Metadata

**What goes wrong:** Deprecation warning only in docs/tool description - AI and calling code never see the warning at runtime.

**Why it happens:** Confusion between documentation deprecation (OpenAPI `deprecated: true`) and runtime deprecation (response metadata).

**How to avoid:**
- Add `_meta` field to response with deprecation info
- Include sunset date (planned removal version/date)
- Log warnings to stderr (AI assistants see stderr in MCP)

**Warning signs:**
- Tools marked deprecated in ListTools but no runtime warnings
- No migration timeline communicated to users

### Pitfall 3: Snapshot Tests Without Fixtures

**What goes wrong:** Snapshot tests use randomized or minimal data, missing edge cases that exist in real vaults.

**Why it happens:** Tests created without representative data.

**How to avoid:**
- Create comprehensive test vault fixtures with:
  - Multiple entity types
  - Complex relationships
  - Edge cases (missing fields, broken links, duplicate IDs)
- Use existing vault structure if available (sanitized)

**Warning signs:**
- Snapshots only test happy path
- Migration bugs appear with real vaults but tests pass

### Pitfall 4: Auto-Detection Without User Notification

**What goes wrong:** Template silently auto-detected, user confused when template-specific tools appear/disappear.

**Why it happens:** Trying to make detection "invisible" to user.

**How to avoid:**
- Always notify which template was detected (every plugin load)
- Provide clear path to customize via config.json
- Show confidence level (high/medium/low)

**Warning signs:**
- No console output about template detection
- Users asking "why don't I see X tool?"

## Code Examples

Verified patterns from research and existing codebase:

### Database Metadata Pattern
```typescript
// Source: SQLite versioning best practices + better-sqlite3 usage
class HivemindDatabase {
  private initializeSchema(): void {
    // Metadata table for versioning and config
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Check for schema mismatch
    const schemaVersion = this.getMetadata('schema_version');
    const activeTemplate = this.getMetadata('active_template');

    if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
      console.error('Schema version mismatch - triggering rebuild');
      this.setMetadata('schema_version', CURRENT_SCHEMA_VERSION);
      // Rebuild will be triggered by VaultReader
    }

    // Store template identity
    if (!activeTemplate) {
      this.setMetadata('active_template', 'worldbuilding');
    }
  }
}
```

### Vitest Snapshot Update Workflow
```bash
# Source: Vitest snapshot documentation
# Initial run - creates snapshots
npm test

# After refactoring - compare against snapshots
npm test
# If differences are intentional improvements:
npm test -- --update

# Commit updated snapshots
git add tests/**/__snapshots__
git commit -m "test: update snapshots for template system migration"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded entity schemas in src/types/index.ts | Template-defined schemas in src/templates/builtin/worldbuilding.ts | Phase 6 (Jan 2026) | Enables custom templates without code changes |
| Type-specific MCP tools (query_character, query_location) | Generic query_entity with type parameter | Phase 7 (current) | Reduces code duplication, template-agnostic |
| No database versioning | Metadata table with schema_version and active_template | Phase 7 (current) | Enables schema evolution and template switching |
| No template detection | Auto-detect from folder structure | Phase 7 (current) | Zero-config first-run experience |

**Deprecated/outdated:**
- **query_character, query_location**: Deprecated in v2.0, removal planned for v3.0 (one major version cycle)
- **Hardcoded entity type enums in src/types/index.ts**: Replaced by template registry lookups

## Open Questions

Things that couldn't be fully resolved:

1. **Detection algorithm specifics**
   - What we know: Folder name pattern matching is standard (ESLint, many tools)
   - What's unclear: Exact threshold (3+ folders? 4+?), case-sensitivity handling
   - Recommendation: Start with 3+ case-insensitive matches for "medium" confidence, 4+ for "high". Test with real vaults.

2. **Snapshot diff review workflow**
   - What we know: Vitest provides --update flag and diffs in test output
   - What's unclear: How to encode "this diff is intentional improvement" in test suite
   - Recommendation: Add comments in test file explaining expected differences, use describe blocks to group "expected changes"

3. **Database rebuild performance on large vaults**
   - What we know: Rebuild = CLEAR + re-scan + rebuild graph
   - What's unclear: Performance characteristics with 10k+ notes
   - Recommendation: Add progress logging, consider batching if performance issues emerge

4. **Template switching behavior**
   - What we know: metadata table stores active_template, nodes table has template_id
   - What's unclear: Should switching templates clear database or maintain multi-template data?
   - Recommendation: Based on user requirements ("filter by active template by default, allow filter: 'all'"), maintain multi-template data

## Sources

### Primary (HIGH confidence)
- [Vitest Snapshot Guide](https://vitest.dev/guide/snapshot) - Built-in snapshot testing documentation
- [SQLite Versioning and Migration Strategies](https://www.sqliteforum.com/p/sqlite-versioning-and-migration-strategies) - user_version PRAGMA and custom metadata tables
- [Managing Database Versions and Migrations in SQLite](https://www.sqliteforum.com/p/managing-database-versions-and-migrations) - Schema versioning patterns
- [better-sqlite3 Releases](https://github.com/WiseLibs/better-sqlite3/releases) - Current version v12.6.2 (Jan 2026)

### Secondary (MEDIUM confidence)
- [Deprecating REST APIs: A Developer's Guide](https://zuplo.com/learning-center/deprecating-rest-apis) - Deprecation header patterns (HTTP-based, adapted for MCP)
- [OpenAPI Deprecation Handling](https://openapispec.com/docs/how/how-does-openapi-handle-api-deprecation/) - deprecated flag and extension patterns
- [Declarative Schema Migration for SQLite](https://david.rothlis.net/declarative-schema-migration-for-sqlite/) - Rebuild approach rationale
- [ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated) - Hierarchical config detection pattern

### Tertiary (LOW confidence)
- [Effective Visual Regression Testing: Vitest vs Playwright](https://mayashavin.com/articles/visual-testing-vitest-playwright) - Snapshot testing use cases (2025 article)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already in use, versions verified
- Architecture: MEDIUM - Patterns verified via research, but migration-specific implementation needs validation
- Pitfalls: MEDIUM - Based on SQLite limitations research and deprecation pattern studies, but specific to this codebase

**Research date:** 2026-01-25
**Valid until:** 30 days (stable domain - database patterns, testing frameworks)

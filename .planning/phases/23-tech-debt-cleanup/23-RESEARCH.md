# Phase 23: Tech Debt Cleanup - Research

**Researched:** 2026-01-27
**Domain:** Technical debt refactoring, test coverage, monorepo code deduplication
**Confidence:** HIGH

## Summary

This phase addresses five specific technical debt items accumulated during v3.x development. The work focuses on three main areas: (1) deduplicating frontmatter template constants between the Obsidian plugin and the template registry, (2) adding test coverage to cli/init modules (currently 0%), and (3) resolving or documenting two Stryker/Obsidian exclusions.

The primary challenge is that the Obsidian plugin currently maintains a 200+ line duplicated `FRONTMATTER_TEMPLATES` constant that mirrors data available in the template registry. This duplication creates maintenance burden and blocks Phase 27 (graph view). The template registry already exports `templateRegistry` singleton and `worldbuildingTemplate` definition, making the plugin's duplication unnecessary.

For test coverage, cli/init modules have zero coverage (0% lines across 5 files). The project uses Vitest with existing patterns from other CLI tests (validate-template, add-template) that use `execSync`/`execFileSync` for integration testing. Testing interactive prompts from `@inquirer/prompts` requires mocking or non-interactive flag paths.

**Primary recommendation:** Deduplicate templates first (enables Phase 27), then add tests (isolated impact), then resolve exclusions (documentation-focused).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.0.18 | Test runner and coverage | Project standard, replaces Jest with faster ESM support |
| @vitest/coverage-v8 | ^4.0.18 | Code coverage reporting | Official Vitest coverage provider |
| @stryker-mutator/core | ^9.4.0 | Mutation testing | CI quality gate, tests 7 core modules |
| @inquirer/prompts | ^8.2.0 | Interactive CLI prompts | Used in cli/init wizard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitest/ui | ^4.0.18 | Test UI for debugging | Development only, helpful for complex test debugging |
| child_process (Node.js) | Built-in | Process spawning | Obsidian plugin MCP server auto-start |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest with ts-jest | Jest more common but slower ESM support, project already on Vitest |
| @inquirer/prompts | enquirer, prompts | @inquirer is official successor to inquirer.js |
| execSync for tests | Programmatic CLI imports | execSync tests CLI as user would, catches arg parsing bugs |

**Installation:**
```bash
# Already installed in package.json
npm install  # No additional dependencies needed
```

## Architecture Patterns

### Current Project Structure
```
src/
├── cli/
│   └── init/               # Zero coverage - target for DEBT-03
│       ├── detection.ts    # Template auto-detection
│       ├── index.ts        # Init command entry point
│       ├── output.ts       # Config file writing
│       ├── prompts.ts      # Interactive prompts
│       ├── validators.ts   # Path and config validation
│       └── wizard.ts       # Interactive wizard flow
├── templates/
│   ├── registry.ts         # TemplateRegistry singleton - source of truth
│   ├── types.ts            # Template type definitions
│   └── builtin/
│       └── worldbuilding.ts # Template definition with entity configs
obsidian-plugin/
└── main.ts                 # Contains duplicated FRONTMATTER_TEMPLATES (DEBT-01)
```

### Pattern 1: Template Registry Singleton (Existing Pattern)
**What:** Single source of truth for template definitions using singleton registry
**When to use:** When template data needs to be shared across CLI and plugin
**Example:**
```typescript
// Source: src/templates/registry.ts (existing codebase)
import { templateRegistry } from '../src/templates/registry.js';
import { worldbuildingTemplate } from '../src/templates/builtin/worldbuilding.js';

// Register template (happens at module load)
templateRegistry.register(worldbuildingTemplate, 'builtin');

// Access entity type frontmatter structure
const entityType = templateRegistry.getEntityType('character');
const frontmatterFields = entityType?.fields;
```

### Pattern 2: Template-to-Frontmatter Extraction (New Pattern for DEBT-01)
**What:** Extract frontmatter template structure from entity type configuration
**When to use:** When Obsidian plugin needs frontmatter defaults from template registry
**Example:**
```typescript
// Potential approach: Extract from entity type fields
function buildFrontmatterTemplate(entityType: EntityTypeConfig): Record<string, unknown> {
  const template: Record<string, unknown> = {
    id: '',
    type: entityType.name,
    status: 'draft',
    title: '',
    tags: [],
    aliases: [],
  };

  // Add entity-specific fields with defaults
  for (const field of entityType.fields) {
    template[field.name] = field.default ?? getTypeDefault(field.type);
  }

  return template;
}
```

### Pattern 3: CLI Testing with execSync (Existing Pattern)
**What:** Integration tests that invoke CLI as subprocess
**When to use:** Testing CLI commands end-to-end including argument parsing
**Example:**
```typescript
// Source: tests/cli/validate-template.test.ts (existing codebase)
import { execSync } from 'child_process';
import { resolve } from 'path';

const CLI_PATH = resolve(__dirname, '../../dist/cli.js');

const runCli = (args: string[]): { stdout: string; exitCode: number } => {
  const cmd = `node "${CLI_PATH}" ${args.join(' ')}`;
  try {
    const stdout = execSync(cmd, {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout || '', exitCode: err.status || 1 };
  }
};
```

### Pattern 4: Mocking Interactive Prompts (Recommended for DEBT-03)
**What:** Test non-interactive code paths or mock prompt responses
**When to use:** Testing CLI wizard flows without actual terminal interaction
**Example:**
```typescript
// For init wizard: Test non-interactive flags (--config, --vault)
it('should init from flags without prompts', async () => {
  const result = runCli(['init', '--vault', vaultPath, '--template', 'worldbuilding']);
  expect(result.exitCode).toBe(0);
  expect(configPath).toExist();
});

// For interactive paths: Use vi.mock if needed
import { vi } from 'vitest';
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn().mockResolvedValue('/path/to/vault'),
  confirm: vi.fn().mockResolvedValue(true),
}));
```

### Anti-Patterns to Avoid
- **Shared mutable state in tests:** Each test should create isolated temp directories and config files
- **Testing implementation details:** Focus on CLI output and file artifacts, not internal function calls
- **Duplicating validation logic:** Template validation already exists in schema-factory.ts, don't recreate in plugin
- **Ignoring existing patterns:** Use execSync pattern established in validate-template.test.ts, not new approaches

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template frontmatter extraction | Custom field mapping logic | EntityTypeConfig.fields from registry | Already typed, validated, and versioned |
| CLI argument parsing | Custom flag parser | Existing parseInitArgs() pattern | Already handles --config, --vault, --template |
| Interactive prompt testing | Custom TTY simulation | Mock @inquirer/prompts or test non-interactive paths | Prompts library handles TTY, mocking is simpler |
| Temp directory cleanup | Manual rmSync in afterEach | Use pattern from existing tests (beforeEach/afterEach) | Prevents test pollution |
| Stryker exclusion | Custom mutation skip logic | Document in stryker.config.json with comment or ADR | Stryker supports file-level exclusions |

**Key insight:** The codebase has established patterns for CLI testing, template management, and configuration. DEBT items should follow existing patterns rather than introducing new architectural approaches.

## Common Pitfalls

### Pitfall 1: Breaking Backward Compatibility in Plugin
**What goes wrong:** Changing plugin's frontmatter template structure breaks existing workflows
**Why it happens:** Template registry entity fields may not map 1:1 to existing hardcoded templates
**How to avoid:** Verify worldbuildingTemplate entity fields match existing FRONTMATTER_TEMPLATES before refactoring
**Warning signs:** Integration tests pass but manual testing shows missing or changed frontmatter fields

### Pitfall 2: Testing Interactive Prompts in CI
**What goes wrong:** Tests hang or fail in CI because stdin is not a TTY
**Why it happens:** @inquirer/prompts detects non-TTY environments and may behave differently
**How to avoid:** Focus tests on non-interactive code paths (--config flag, --vault flag) or mock prompts
**Warning signs:** Tests pass locally but hang/timeout in GitHub Actions

### Pitfall 3: process.chdir() in Parallel Tests
**What goes wrong:** Tests that change working directory interfere with each other
**Why it happens:** process.chdir() is global state, Vitest runs tests in parallel by default
**How to avoid:** Use try/finally blocks to restore original cwd, or use isolate: true in test config
**Warning signs:** Tests pass individually but fail when run in parallel (use --reporter=verbose to debug)

### Pitfall 4: Stryker Worker Thread Issues
**What goes wrong:** Stryker mutation testing fails with "ENOENT: no such file or directory, uv_chdir"
**Why it happens:** process.chdir() doesn't work in worker threads that Stryker uses
**How to avoid:** Either refactor to avoid process.chdir() or exclude test from Stryker
**Warning signs:** Normal tests pass but Stryker crashes during mutation testing

### Pitfall 5: Incomplete Template Deduplication
**What goes wrong:** Plugin still has template logic after "deduplication"
**Why it happens:** Template initialization may be spread across multiple functions/locations
**How to avoid:** Grep for all usages of FRONTMATTER_TEMPLATES and entity type names to find all callsites
**Warning signs:** Duplication removed but plugin still has hardcoded entity type logic elsewhere

## Code Examples

Verified patterns from codebase:

### Template Registry Usage (Current)
```typescript
// Source: src/templates/registry.ts
export class TemplateRegistry {
  getEntityType(name: string): EntityTypeConfig | undefined {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get entity type: no active template');
    }
    return active.entityTypeMap.get(name);
  }

  getEntityTypes(): EntityTypeConfig[] {
    const active = this.getActive();
    if (!active) {
      throw new Error('Cannot get entity types: no active template');
    }
    return active.entityTypes;
  }
}

// Singleton export
export const templateRegistry = new TemplateRegistry();
```

### Plugin Template Duplication (Current - DEBT-01)
```typescript
// Source: obsidian-plugin/main.ts (lines 49-140+)
// DUPLICATED - should use registry instead
const FRONTMATTER_TEMPLATES: Record<string, Record<string, unknown>> = {
  character: {
    id: '',
    type: 'character',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    name: '',
    age: null,
    gender: '',
    race: '',
    appearance: { /* ... */ },
    personality: { /* ... */ },
    // ... 200+ more lines
  },
  // ... more entity types
};
```

### CLI Test Pattern (Current)
```typescript
// Source: tests/cli/validate-template.test.ts
describe('CLI: validate-template', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-cli-validate-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should validate a valid template file', () => {
    const templatePath = join(tempDir, 'template.json');
    writeFileSync(templatePath, JSON.stringify(validTemplate, null, 2));

    const result = runCli(['validate-template', templatePath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Template is valid!');
  });
});
```

### Init Command Structure (Current)
```typescript
// Source: src/cli/init/index.ts
export async function initCommand(): Promise<void> {
  const options = parseInitArgs();

  try {
    // Mode 1: Preset file
    if (options.config) {
      await initFromPreset(options.config);
      return;
    }

    // Mode 2: Flags (vault required, template optional)
    if (options.vault) {
      await initFromFlags(options);
      return;
    }

    // Mode 3: Interactive wizard
    const result = await runInteractiveWizard();
    // ... handle result
  } catch (err) {
    console.error(error(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded entity schemas in src/types/index.ts | Template registry with pluggable definitions | Phase 2 (v3.0) | Templates now user-configurable |
| Manual frontmatter validation | Zod schema factory from template configs | Phase 18 (v3.1) | Type-safe validation |
| Jest with ts-jest | Vitest with native ESM | v3.0 foundation | Faster tests, simpler config |
| axios for HTTP | Native fetch | Phase 20 (v3.1) | One less dependency |

**Deprecated/outdated:**
- Direct imports of entity type constants: Use templateRegistry.getEntityType() instead
- Hardcoded schema definitions: Use schema-factory.ts to generate from template config
- Manual file path validation: Use validators.ts from cli/init

## Open Questions

Things that couldn't be fully resolved:

1. **Template field defaults vs plugin expectations**
   - What we know: worldbuildingTemplate defines fields but not all default values
   - What's unclear: Whether plugin expects specific default structure (e.g., appearance object with subfields)
   - Recommendation: Compare entityType.fields from worldbuildingTemplate against FRONTMATTER_TEMPLATES during implementation

2. **process.chdir() refactoring feasibility**
   - What we know: Used in tests/templates/loader.test.ts for config file lookup testing
   - What's unclear: Whether refactoring to avoid chdir is worth the effort vs documenting exclusion
   - Recommendation: Investigate during implementation - if complex, document with ADR in docs/ directory

3. **child_process Obsidian review requirements**
   - What we know: Plugin uses spawn() to auto-start MCP server, needs review team justification
   - What's unclear: Exact format/location reviewers expect for justification
   - Recommendation: Check Obsidian plugin submission guidelines, likely code comment + docs/ARCHITECTURE.md section

4. **Template initialization pattern**
   - What we know: User has discretion on shared function vs separate init flows
   - What's unclear: Whether CLI and plugin need different initialization timing/logic
   - Recommendation: Start with shared function approach, refactor if distinct needs emerge

## Sources

### Primary (HIGH confidence)
- Codebase analysis: src/templates/registry.ts, obsidian-plugin/main.ts, src/cli/init/, tests/cli/
- Existing test patterns: tests/cli/validate-template.test.ts, tests/cli/add-template.test.ts
- Project configuration: package.json, vitest.config.ts, stryker.config.json
- Milestone documentation: .planning/milestones/v3.1-ROADMAP.md (Stryker exclusion context)

### Secondary (MEDIUM confidence)
- [How to Test CLI Output in Jest & Vitest](https://www.lekoarts.de/how-to-test-cli-output-in-jest-vitest/) - CLI testing patterns
- [Technical debt: a strategic guide for 2026](https://monday.com/blog/rnd/technical-debt/) - Incremental refactoring approach
- [Refactor All The Time Instead of "Tech Debt Day"](https://dev.to/jesterxl/refactor-all-the-time-instead-of-tech-debt-day-1cj3) - Continuous refactoring mindset

### Tertiary (LOW confidence)
- WebSearch: Vitest interactive prompt testing (limited specific guidance, general awareness only)
- WebSearch: Stryker process.chdir worker thread issue (2018 edge case, may not apply to current version)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in package.json with versions verified
- Architecture: HIGH - Existing codebase patterns analyzed directly from source
- Pitfalls: HIGH - Based on actual codebase state (process.chdir in tests, FRONTMATTER_TEMPLATES duplication)

**Research date:** 2026-01-27
**Valid until:** 2026-02-27 (30 days - stable technologies, no fast-moving ecosystem concerns)

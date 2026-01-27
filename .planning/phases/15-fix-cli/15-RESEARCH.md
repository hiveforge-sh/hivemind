# Phase 15: Fix CLI - Research

**Researched:** 2026-01-26
**Domain:** CLI bulk file modification, interactive prompts, dry-run operations
**Confidence:** HIGH

## Summary

The fix CLI command enables safe bulk addition of frontmatter to existing markdown files with dry-run preview by default. Research focused on patterns already established in the codebase (validate command, init wizard) and verified industry best practices for dry-run operations, atomic file writes, and interactive CLI UX.

The standard approach uses libraries already in the dependency tree (@inquirer/prompts, picocolors, gray-matter) combined with established Node.js patterns for safe file modification (write-to-temp, atomic rename). The codebase already demonstrates TTY checking, exit code conventions, and JSON output patterns from Phase 14, providing consistency templates.

**Primary recommendation:** Reuse patterns from validate command (scanner, formatter, exit codes) and init wizard (TTY check, breadcrumb progress, ExitPromptError handling) for architectural consistency. Use gray-matter.stringify() for frontmatter injection and standard fs.rename() pattern for atomic writes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | ^4.0.3 | Frontmatter parsing and stringification | Already in use for validate, battle-tested (used by Gatsby, Netlify, VuePress), bidirectional parse/stringify |
| @inquirer/prompts | ^8.2.0 | Interactive CLI prompts | Lightweight modular inquirer, already in Phase 12, confirm/select prompt types |
| picocolors | ^1.1.1 | Terminal color output | Minimal, already in use, 14x faster than chalk |
| picomatch | ^4.0.3 | Glob pattern matching | Already used by FolderMapper, 4x faster than minimatch |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cli-progress | ^3.12.0 | Progress bars for bulk operations | Consider adding for --apply operations with many files (not yet in deps) |
| Node.js fs.rename | Built-in | Atomic file operations | Atomic on Unix-like, good enough for single-process writes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fs.rename | write-file-atomic | write-file-atomic adds dep, serializes concurrent writes (unnecessary for CLI), fs.rename sufficient for single-process |
| cli-progress | Custom spinner/dots | cli-progress gives % completion and ETA, custom solution simpler but less informative |
| @sindresorhus/slugify | Custom slugify | Slugify lib handles edge cases (unicode, umlauts), but simple .toLowerCase().replace() sufficient for English filenames |

**Installation:**
```bash
# All dependencies already installed except cli-progress (optional)
npm install cli-progress  # Only if adding progress bar
```

## Architecture Patterns

### Recommended Project Structure
```
src/cli/fix/
├── index.ts          # Entry point, arg parsing, orchestration
├── types.ts          # FixOptions, FixResult, FileOperation interfaces
├── fixer.ts          # Core fix logic (validate + generate frontmatter)
├── writer.ts         # Safe file writing (atomic operations)
├── formatter.ts      # Dry-run output, completion summary
└── id-generator.ts   # Slugify filename → ID, collision detection
```

### Pattern 1: Reuse Validate Scanner
**What:** The validate command already scans markdown files and parses frontmatter. Fix command extends this to generate missing fields.
**When to use:** For file discovery and frontmatter analysis before fixing.
**Example:**
```typescript
// Source: src/cli/validate/scanner.ts (existing pattern)
import { ValidationScanner } from '../validate/scanner.js';

// Reuse scanner to find files needing fixes
const scanner = new ValidationScanner(options);
const results = await scanner.scan();

// Filter to files with issues
const filesToFix = results.filter(r => !r.valid);
```

### Pattern 2: TTY Check Before Prompts
**What:** Check process.stdin.isTTY before running interactive prompts. Fail fast with helpful message in non-interactive environments.
**When to use:** Entry point of fix command, before any @inquirer/prompts calls.
**Example:**
```typescript
// Source: src/cli/init/wizard.ts (lines 44-50)
if (!process.stdin.isTTY) {
  console.error(error('Interactive mode requires a terminal.'));
  console.error('Use --yes to skip prompts for non-interactive mode.');
  process.exit(1);
}
```

### Pattern 3: Gray-Matter Bidirectional Parse/Stringify
**What:** Use gray-matter to parse frontmatter, modify data object, then stringify back to file format.
**When to use:** Adding or updating frontmatter in existing markdown files.
**Example:**
```typescript
// Source: gray-matter documentation
import matter from 'gray-matter';

// Parse existing file
const file = matter(content);

// Update frontmatter data
file.data.id = 'character-john-doe';
file.data.type = 'character';
file.data.status = 'draft';

// Stringify back to markdown
const output = matter.stringify(file.content, file.data);
```

### Pattern 4: Atomic Write with Temp File
**What:** Write to temporary file, then rename to target (atomic operation on Unix-like systems).
**When to use:** All file writes in --apply mode to prevent partial writes.
**Example:**
```typescript
// Source: Node.js fs patterns
import { writeFile, rename, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const tempPath = join(tmpdir(), `hivemind-${Date.now()}-${Math.random()}.md`);

try {
  await writeFile(tempPath, content, 'utf-8');
  await rename(tempPath, targetPath);  // Atomic
} catch (error) {
  await unlink(tempPath).catch(() => {}); // Cleanup on failure
  throw error;
}
```

### Pattern 5: Batch Prompts by Folder
**What:** When folder mapping is ambiguous (multiple possible types), ask once per folder and apply to all files in it.
**When to use:** Resolving ambiguous types in interactive mode.
**Example:**
```typescript
// Group files by folder
const byFolder = new Map<string, string[]>();
for (const file of ambiguousFiles) {
  const folder = dirname(file.path);
  if (!byFolder.has(folder)) byFolder.set(folder, []);
  byFolder.get(folder)!.push(file.path);
}

// Prompt once per folder
for (const [folder, files] of byFolder) {
  const type = await select({
    message: `${files.length} files in ${folder}/ - choose type:`,
    choices: suggestedTypes.map(t => ({ name: t, value: t }))
  });
  // Apply type to all files in this folder
  for (const file of files) {
    fileTypeMap.set(file, type);
  }
}
```

### Pattern 6: Exit Code Semantics (Consistent with Validate)
**What:** Use POSIX exit code conventions matching validate command.
**When to use:** All exit points.
**Example:**
```typescript
// Source: src/cli/validate/index.ts (lines 96-118)
// 0 = success (all files fixed or nothing to do)
// 1 = operational failure (files couldn't be fixed)
// 2 = configuration error (missing config, invalid template)

if (summary.failedFiles > 0) {
  process.exit(1);
}
process.exit(0);
```

### Anti-Patterns to Avoid
- **Destructive by default:** Never modify files without explicit --apply flag (anti-pattern verified by multiple CLI tools research)
- **Silent failures:** Always report what couldn't be fixed and why
- **Blocking on single failure:** Continue processing other files when one fails, report all failures at end
- **Prompting in --yes mode:** Skip all prompts and use defaults when --yes flag set
- **JSON output with text:** Don't mix JSON and human-readable output, --json should produce only valid JSON

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slugify filename to ID | Custom .toLowerCase().replace() | Built-in pattern sufficient | English filenames only need simple replacement, unicode edge cases rare in this domain |
| Atomic file writes | Custom locking/transaction | fs.rename() pattern | Atomic on Unix-like systems, sufficient for single-process CLI |
| Progress feedback | Custom percentage calculation | cli-progress (if added) | Handles edge cases (0 files, very fast ops), provides ETA calculations |
| Terminal color detection | Environment variable checks | picocolors (already in use) | Handles NO_COLOR, FORCE_COLOR, CI detection automatically |
| Glob matching | Custom path.includes() | picomatch (already in use) | Handles edge cases (negation, brace expansion, case sensitivity) |
| TTY detection | Custom process.stdout checks | process.stdin.isTTY | Standard Node.js API, handles pipes/redirects correctly |

**Key insight:** File operations have subtle failure modes (partial writes, race conditions, permissions). Use established patterns (temp file + rename) rather than custom solutions.

## Common Pitfalls

### Pitfall 1: Modifying Files in Dry-Run Mode
**What goes wrong:** Accidentally writing files when user expects preview-only behavior.
**Why it happens:** Shared code path between dry-run and apply modes without clear gate.
**How to avoid:** Separate functions for analysis (safe, used by both) and writing (only in --apply mode). Use TypeScript discriminated union for dry-run vs apply results.
**Warning signs:** User reports "dry-run modified my files" or tests fail intermittently due to unexpected writes.

### Pitfall 2: ID Collisions in Batch Operations
**What goes wrong:** Multiple files with same name in different folders generate same ID, causing validation errors after fix.
**Why it happens:** Simple filename → ID conversion without checking existing IDs in vault.
**How to avoid:** Build set of existing IDs before generating new ones. On collision, add type prefix (character-john-doe vs location-john-doe). Warn user about collision resolution.
**Warning signs:** Fix command succeeds but validate immediately fails with "duplicate ID" errors.

### Pitfall 3: Partial Frontmatter Handling
**What goes wrong:** Files with partial frontmatter (e.g., only `id` field) get duplicate field errors after fix.
**Why it happens:** Fix command adds full template without checking existing fields.
**How to avoid:** Parse existing frontmatter first, only add missing required fields. Use object spread: `{ ...existingFields, ...newFields }` with newFields only containing what's missing.
**Warning signs:** Files that already had some frontmatter show errors like "unexpected duplicate key" or fail validation.

### Pitfall 4: Non-Interactive Mode Hanging
**What goes wrong:** CLI hangs indefinitely when run in CI/scripts without --yes flag.
**Why it happens:** @inquirer/prompts blocks on stdin when no TTY, no timeout.
**How to avoid:** Check process.stdin.isTTY at entry point. Exit with error message before any prompts if no TTY and no --yes flag. Document --yes requirement for automation.
**Warning signs:** GitHub Actions or scripts timeout after 10+ minutes, no output.

### Pitfall 5: Gray-Matter Delimiter Styles
**What goes wrong:** Fix command adds YAML frontmatter (---) to files that used TOML (+++), breaking parsing.
**Why it happens:** Gray-matter defaults to YAML, doesn't detect existing delimiter style.
**How to avoid:** Gray-matter's matter() function detects delimiter automatically. When adding NEW frontmatter (no existing), always use YAML (---) as standard. When updating existing, use matter.stringify() which preserves detected format.
**Warning signs:** Files with TOML frontmatter become unparseable after fix, or switch to YAML unexpectedly.

### Pitfall 6: Progress Bar in JSON Mode
**What goes wrong:** Progress bar output corrupts --json output, making it unparseable.
**Why it happens:** Progress bar writes to stdout, JSON mode expects only JSON on stdout.
**How to avoid:** Check options.json flag before initializing progress bar. Progress bars should write to stderr, never stdout. JSON output always to stdout only.
**Warning signs:** JSON parsing fails in CI with "unexpected token" errors from progress bar escape codes.

## Code Examples

Verified patterns from official sources:

### Generate Frontmatter for Empty File
```typescript
// Source: CONTEXT.md decisions + template registry pattern
import { templateRegistry } from '../../templates/registry.js';
import { basename } from 'path';

function generateFrontmatter(filePath: string, entityType: string): Record<string, unknown> {
  const template = templateRegistry.getActive();
  const entityConfig = template?.entityTypeMap.get(entityType);
  if (!entityConfig) throw new Error(`Entity type ${entityType} not found`);

  // Generate ID from filename
  const filename = basename(filePath, '.md');
  const id = filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Build frontmatter with required fields
  const frontmatter: Record<string, unknown> = {
    id,
    type: entityType,
    status: 'draft',
    tags: [],
    name: filename,  // Preserve original capitalization
  };

  // Add entity-specific fields with placeholders
  for (const field of entityConfig.fields || []) {
    if (field.required && !field.default) {
      // Add placeholder for required fields
      if (field.type === 'string') frontmatter[field.name] = '';
      else if (field.type === 'array') frontmatter[field.name] = [];
      else if (field.type === 'number') frontmatter[field.name] = 0;
    } else if (field.default !== undefined) {
      frontmatter[field.name] = field.default;
    }
  }

  return frontmatter;
}
```

### Add Missing Required Fields Only
```typescript
// Source: CONTEXT.md decisions + gray-matter pattern
import matter from 'gray-matter';

async function addMissingFields(
  content: string,
  entityType: string
): Promise<string> {
  // Parse existing frontmatter
  const { data: existing, content: body } = matter(content);

  // Generate full template
  const fullTemplate = generateFrontmatter('temp.md', entityType);

  // Only add missing required fields
  const requiredFields = ['id', 'type', 'status', 'tags', 'name'];
  const updated = { ...existing };

  for (const field of requiredFields) {
    if (!(field in existing)) {
      updated[field] = fullTemplate[field];
    }
  }

  // Preserve existing, add only missing
  return matter.stringify(body, updated);
}
```

### Dry-Run Diff Output
```typescript
// Source: CONTEXT.md decisions + picocolors
import { dim, cyan, green } from '../shared/colors.js';

function formatDryRunOutput(operations: FileOperation[]): string {
  const lines: string[] = [];

  lines.push('\n' + dim('Dry-run preview (no files modified):') + '\n');

  // Group by operation type
  const byType = new Map<string, FileOperation[]>();
  for (const op of operations) {
    if (!byType.has(op.type)) byType.set(op.type, []);
    byType.get(op.type)!.push(op);
  }

  for (const [type, ops] of byType) {
    lines.push(cyan(`${type}:`) + dim(` ${ops.length} files`));

    // Show field names to be added, not values (per CONTEXT.md)
    for (const op of ops) {
      lines.push(`  ${op.path}`);
      if (op.fieldsToAdd.length > 0) {
        lines.push(dim(`    + ${op.fieldsToAdd.join(', ')}`));
      }
    }
  }

  lines.push('');
  lines.push(dim('Run') + ' hivemind fix --apply ' + dim('to apply changes'));

  return lines.join('\n');
}
```

### Collision Detection and Resolution
```typescript
// Source: CONTEXT.md decisions on ID collisions
function generateUniqueId(
  filename: string,
  entityType: string,
  existingIds: Set<string>
): string {
  // Base ID from filename
  const baseId = filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // No collision - use base ID
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  // Collision detected - add type prefix
  const prefixedId = `${entityType}-${baseId}`;
  if (!existingIds.has(prefixedId)) {
    return prefixedId;
  }

  // Still collision - add counter
  let counter = 2;
  while (existingIds.has(`${prefixedId}-${counter}`)) {
    counter++;
  }
  return `${prefixedId}-${counter}`;
}
```

### Batch Folder Prompts
```typescript
// Source: CONTEXT.md decisions + @inquirer/prompts docs
import { select } from '@inquirer/prompts';
import { dirname } from 'path';

async function resolveAmbiguousTypes(
  files: ValidationResult[],
  options: FixOptions
): Promise<Map<string, string>> {
  const typeMap = new Map<string, string>();

  // --yes mode: skip ambiguous, warn
  if (options.yes) {
    console.warn(
      `Skipping ${files.length} files with ambiguous types (use --type to override)`
    );
    return typeMap;
  }

  // Group by folder
  const byFolder = new Map<string, ValidationResult[]>();
  for (const file of files) {
    const folder = dirname(file.path);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(file);
  }

  // Prompt once per folder
  for (const [folder, folderFiles] of byFolder) {
    const type = await select({
      message: `${folderFiles.length} files in ${folder}/ - choose type:`,
      choices: getSuggestedTypes(folder).map(t => ({
        name: t,
        value: t
      }))
    });

    for (const file of folderFiles) {
      typeMap.set(file.path, type);
    }
  }

  return typeMap;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| inquirer (monolithic) | @inquirer/prompts (modular) | 2023 | Smaller bundle, tree-shakeable, modern API with async/await |
| chalk (colors) | picocolors | 2021+ | 14x faster, 6x smaller, zero dependencies |
| minimatch (globs) | picomatch | 2019+ | 4x faster, more standard-compliant |
| Destructive by default | Dry-run by default | Emerging pattern | npm publish, terraform, git add --dry-run all use this pattern now |

**Deprecated/outdated:**
- inquirer@8 (monolithic): Use @inquirer/prompts (modular packages)
- --force flag: Anti-pattern, use --apply for explicit destructive operations
- Custom slugify for non-ASCII: @sindresorhus/slugify handles it, but English-only vaults don't need the dep

## Open Questions

Things that couldn't be fully resolved:

1. **Progress bar library decision**
   - What we know: cli-progress is most popular, but adds dependency (not currently in package.json)
   - What's unclear: Whether progress bar is worth the dependency for typical vault sizes (10-1000 files)
   - Recommendation: Start without progress bar, add if users request it. Simple "Fixed 5/100 files..." text updates sufficient for v1.

2. **Handling files with TOML frontmatter (+++)**
   - What we know: gray-matter detects and preserves delimiter style when parsing existing files
   - What's unclear: Whether to auto-convert TOML to YAML (standardize) or preserve TOML
   - Recommendation: Preserve existing delimiter style (gray-matter does this automatically). New files use YAML (---) as standard.

3. **ID collision resolution strategy preference**
   - What we know: CONTEXT.md says "add type prefix when collision detected"
   - What's unclear: Whether to always prefix with type for consistency, or only on collision
   - Recommendation: Prefix only on collision (per CONTEXT.md). Simpler IDs when no conflict, easier to read.

## Sources

### Primary (HIGH confidence)
- gray-matter documentation - [GitHub jonschlinkert/gray-matter](https://github.com/jonschlinkert/gray-matter)
- gray-matter stringify examples - [Snyk gray-matter.stringify](https://snyk.io/advisor/npm-package/gray-matter/functions/gray-matter.stringify)
- @inquirer/prompts documentation - [GitHub SBoudrias/Inquirer.js](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/prompts/README.md)
- Node.js CLI best practices - [GitHub lirantal/nodejs-cli-apps-best-practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- POSIX exit code standards - [Exit Status Wikipedia](https://en.wikipedia.org/wiki/Exit_status)
- Exit code conventions - [Standard Exit Status Codes Baeldung](https://www.baeldung.com/linux/status-codes)
- Existing codebase patterns:
  - src/cli/validate/index.ts (exit codes, JSON output, quiet mode)
  - src/cli/validate/validator.ts (initializeTemplateRegistry pattern)
  - src/cli/init/wizard.ts (TTY check, ExitPromptError handling, breadcrumb progress)
  - src/templates/folder-mapper.ts (resolveType pattern for ambiguous handling)

### Secondary (MEDIUM confidence)
- cli-progress library - [npm cli-progress](https://www.npmjs.com/package/cli-progress)
- write-file-atomic patterns - [GitHub npm/write-file-atomic](https://github.com/npm/write-file-atomic)
- Slugify patterns - [GitHub sindresorhus/slugify](https://github.com/sindresorhus/slugify)
- npm dry-run pattern - [npm publish documentation](https://docs.npmjs.com/cli/v9/commands/npm-publish/)

### Tertiary (LOW confidence)
- Progress bar library comparison (npm-compare.com) - Multiple options, no clear 2026 winner
- WebSearch results on CLI patterns - General guidance but not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already in package.json, patterns already used in codebase
- Architecture: HIGH - Validate and init commands provide clear templates to follow
- Pitfalls: MEDIUM - Based on common CLI pitfalls + gray-matter edge cases, not project-specific experience

**Research date:** 2026-01-26
**Valid until:** 30 days (stable domain - CLI patterns don't change rapidly)

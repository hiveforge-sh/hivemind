# Phase 13: Folder Mapping & Shared Infrastructure - Research

**Researched:** 2026-01-26
**Domain:** Glob pattern matching, cross-platform path normalization, shared TypeScript utilities
**Confidence:** HIGH

## Summary

Phase 13 creates shared infrastructure for mapping vault folder paths to entity types using glob patterns, with platform-agnostic path handling. The existing `FolderMapper` class (C:\Users\Preston\git\hivemind\src\templates\folder-mapper.ts) provides basic folder matching but lacks:

1. **Glob pattern support** - Currently only exact matches and prefix matching; needs `**/Characters/` pattern support
2. **Config-driven mappings** - Currently hardcoded defaults; needs template-specific mappings from config
3. **Multiple types per mapping** - No support for `{ folder: "Notes/", types: ["lore", "event"] }`
4. **Specificity resolution** - No "most specific wins" algorithm when multiple patterns match
5. **Async API** - Current sync API; phase requires `Promise<result>` for future extensibility

The standard stack uses **picomatch** (already in dependency tree via chokidar) for fast glob matching with zero dependencies. Cross-platform path normalization uses Node.js built-in `path` module or lightweight `normalize-path` library (also already present via chokidar dependencies).

**Primary recommendation:** Refactor `FolderMapper` into config-driven async API with picomatch for glob matching, using specificity algorithm based on pattern character count, and normalize paths to forward slashes internally.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| picomatch | 4.0.3+ | Glob pattern matching | Blazing fast (4M+ ops/sec vs 632K for minimatch), zero dependencies, used by Jest, Astro, Storybook, chokidar, 5M+ projects. Already in dependency tree. |
| Node.js path | Built-in | Path operations | Native platform-aware path handling, join/normalize/resolve |
| normalize-path | 3.0+ | Forward slash normalization | Used by chokidar and anymatch, lightweight (140 LOC), handles Windows UNC paths correctly. Already in dependency tree. |

**Note:** normalize-path is optional - can use `path.replace(/\\/g, '/')` for simple normalization. Include only if UNC path edge cases are needed.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| minimatch | 9.0.5+ | Fallback glob matcher | Only if picomatch unavailable (unlikely) |
| micromatch | 4.0.8+ | Advanced glob with brace expansion | Only if brace expansion needed (`{a,b}` patterns) - NOT needed for this phase |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| picomatch | minimatch | 7x slower, known Windows path issues, maintenance mode |
| picomatch | micromatch | 2x slower, larger bundle, adds brace expansion (not needed) |
| normalize-path | path.normalize() | Platform-specific (backslashes on Windows), not glob-friendly |
| Async API | Sync API | Future-proof for FS operations, consistent with async/await codebase |

**Installation:**

No new dependencies needed - picomatch and normalize-path already present via chokidar. If direct usage desired:

```bash
npm install picomatch normalize-path
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── templates/
│   ├── folder-mapper.ts        # Refactored: config-driven, async, glob support
│   ├── types.ts                # Add: FolderMappingConfig, ResolveResult interfaces
│   └── __tests__/
│       └── folder-mapper.test.ts
```

**Module location:** Keep in `src/templates/` (current location) - it's template-specific infrastructure, not generic utilities. Aligns with existing codebase structure where template system lives in `src/templates/`.

### Pattern 1: Async Static Factory Method

**What:** Create instances asynchronously when initialization requires async operations (future-proof for config loading)

**When to use:** When object creation needs async work but constructors can't be async

**Example:**
```typescript
// Source: https://dev.to/somedood/the-proper-way-to-write-async-constructors-in-javascript-1o8c
class FolderMapper {
  private constructor(private mappings: CompiledMapping[]) {}

  static async create(config: FolderMappingConfig): Promise<FolderMapper> {
    // Future: could load external config, validate patterns, etc.
    const compiled = await this.compileMappings(config.mappings);
    return new FolderMapper(compiled);
  }
}
```

### Pattern 2: Specificity via Pattern Complexity

**What:** Rank glob patterns by specificity using character count + wildcard penalties

**When to use:** When multiple patterns match and "most specific wins" is desired

**Example:**
```typescript
function calculateSpecificity(pattern: string): number {
  // Longer patterns = more specific
  let score = pattern.length;

  // Wildcards reduce specificity
  score -= (pattern.match(/\*/g) || []).length * 5;
  score -= (pattern.match(/\?/g) || []).length * 2;

  // Nested paths increase specificity
  score += (pattern.match(/\//g) || []).length * 3;

  return score;
}

// Sort matches by specificity (highest first)
matches.sort((a, b) => b.specificity - a.specificity);
```

### Pattern 3: Platform-Agnostic Internal Paths

**What:** Normalize all paths to forward slashes internally, only convert to platform-specific on output

**When to use:** Always, for glob compatibility and cross-platform consistency

**Example:**
```typescript
// Source: https://github.com/jonschlinkert/normalize-path
import normalizePath from 'normalize-path';

class FolderMapper {
  resolveType(filePath: string): Promise<ResolveResult> {
    // Normalize once on entry
    const normalized = normalizePath(filePath);

    // All internal operations use forward slashes
    return this.matchPatterns(normalized);
  }
}
```

### Pattern 4: Wrapper Pattern for External Libraries

**What:** Wrap external glob matchers behind consistent interface for testability and future changes

**When to use:** When external library API might change or need swapping (established pattern from Phase 12-01)

**Example:**
```typescript
// Wrapper isolates picomatch details
interface GlobMatcher {
  isMatch(path: string, pattern: string): boolean;
}

class PicomatchWrapper implements GlobMatcher {
  isMatch(path: string, pattern: string): boolean {
    return picomatch(pattern)(path);
  }
}

// Injected for testability
class FolderMapper {
  constructor(
    private config: FolderMappingConfig,
    private matcher: GlobMatcher = new PicomatchWrapper()
  ) {}
}
```

### Anti-Patterns to Avoid

- **Mixing path separators:** Don't store both forward and backslashes internally - pick one (forward) and stick to it
- **String concatenation for paths:** Use `path.join()` instead of `folder + '/' + file` (breaks on Windows)
- **Blocking I/O in hot paths:** No sync file operations in `resolveType()` - keep it pure matching logic
- **Case-insensitive matching by default:** Phase decision specifies case-sensitive matching - respect it
- **Mutating config objects:** Compile patterns once, treat as immutable

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glob pattern matching | Custom `*` and `**` parser | picomatch | Handles edge cases: escaping, character classes `[abc]`, extglobs `@(a\|b)`, Windows paths, performance optimization |
| Path normalization | Regex replace backslashes | normalize-path or path module | Windows UNC paths `\\?\C:\`, mixed separators, relative paths, trailing slashes |
| Pattern specificity | Simple string length | Weighted scoring algorithm | Accounts for wildcards, nesting depth, literal vs pattern segments |
| Async resolution | Promises in sync code | Async/await with proper API | Error handling, future I/O extensibility, consistent with codebase |

**Key insight:** Glob matching has 40+ years of edge cases (originated in Unix shell 1971). Libraries like picomatch handle character escaping, bracket expressions, Windows path edge cases, and performance optimization. Custom implementations miss edge cases and are slower.

## Common Pitfalls

### Pitfall 1: Glob Patterns Not Matching Due to Backslashes

**What goes wrong:** Windows file paths use backslashes, but glob patterns expect forward slashes. Pattern `**/Characters/` doesn't match `vault\Characters\file.md`.

**Why it happens:** picomatch treats backslashes as escape characters, not path separators.

**How to avoid:** Normalize all paths to forward slashes before matching:
```typescript
const normalized = filePath.replace(/\\/g, '/');
const matches = picomatch(pattern)(normalized);
```

**Warning signs:** Tests pass on Unix but fail on Windows, or Windows users report "folder mapping not working"

### Pitfall 2: Most Specific Pattern Logic Fails Edge Cases

**What goes wrong:** Simple "longest string wins" fails for `**/deep/specific/path` vs `exact/match`. Wildcard pattern is longer but less specific.

**Why it happens:** String length doesn't account for wildcard presence reducing specificity.

**How to avoid:** Weighted scoring: pattern length + path depth bonus - wildcard penalties

**Warning signs:** Users report wrong type selected, specific paths losing to generic patterns

### Pitfall 3: Async API Without Actual Async Operations

**What goes wrong:** Creating async function that does only sync work triggers "unnecessary Promise" warnings and adds overhead.

**Why it happens:** Phase specifies async API for future-proofing, but current implementation is pure logic.

**How to avoid:** Document in code comments that async API is intentional for future extensibility (config loading, FS checks). Use `Promise.resolve()` for immediate values:
```typescript
async resolveType(filePath: string): Promise<ResolveResult> {
  const result = this.syncMatchLogic(filePath); // Sync internally
  return Promise.resolve(result); // Async externally
}
```

**Warning signs:** Linter warnings about unnecessary async, team confusion about why it's async

### Pitfall 4: Config Pattern Validation Missing

**What goes wrong:** Invalid glob patterns in config cause runtime errors when matching: `**/[unclosed` throws from picomatch.

**Why it happens:** Config loaded without validation, errors surface during file processing.

**How to avoid:** Validate patterns on config load using picomatch's `parse()` which throws on invalid syntax:
```typescript
static validateConfig(config: FolderMappingConfig): string[] {
  const errors: string[] = [];
  for (const mapping of config.mappings) {
    try {
      picomatch.parse(mapping.folder); // Throws on invalid
    } catch (e) {
      errors.push(`Invalid pattern "${mapping.folder}": ${e.message}`);
    }
  }
  return errors;
}
```

**Warning signs:** Cryptic errors during file scanning, no clear indication which config entry is broken

### Pitfall 5: Multiple Type Resolution Without Confidence

**What goes wrong:** Mapping `{ folder: "Notes/", types: ["lore", "event"] }` returns both types, but consumer doesn't know if it should prompt or pick one.

**Why it happens:** Result object lacks confidence/ambiguity indication.

**How to avoid:** Return rich result object with confidence level:
```typescript
interface ResolveResult {
  types: string[];              // Matched types
  matchedPattern: string;       // Which pattern matched
  confidence: 'exact' | 'ambiguous' | 'fallback';
}

// Consumer can check:
if (result.confidence === 'ambiguous') {
  // Show picker UI
}
```

**Warning signs:** CLI and Obsidian plugin implementing different prompt logic, inconsistent UX

## Code Examples

Verified patterns for implementation:

### Glob Matching with Picomatch

```typescript
// Source: https://github.com/micromatch/picomatch (README)
import picomatch from 'picomatch';

// Basic matching
const isMatch = picomatch('**/*.md');
isMatch('vault/Characters/hero.md'); // true

// Multiple patterns
const matcher = picomatch(['**/Characters/**', '**/People/**']);
matcher('vault/Characters/subfolder/hero.md'); // true

// Case-sensitive (default)
const exact = picomatch('People/**');
exact('people/john.md'); // false - case matters

// Ignore patterns (negation)
const filtered = picomatch(['**/*.md', '!**/drafts/**']);
filtered('vault/drafts/notes.md'); // false
```

### Path Normalization

```typescript
// Source: https://github.com/jonschlinkert/normalize-path
import normalizePath from 'normalize-path';

// Windows to Unix style
normalizePath('\\foo\\bar\\baz\\');  // => '/foo/bar/baz'
normalizePath('C:\\Users\\vault\\'); // => 'C:/Users/vault'

// Condense multiple slashes
normalizePath('foo//bar');           // => 'foo/bar'

// Remove trailing slash (configurable)
normalizePath('foo/bar/', false);    // => 'foo/bar/'
```

### Async Static Factory Pattern

```typescript
// Source: https://www.xjavascript.com/blog/typescript-async-constructor/
class FolderMapper {
  private mappings: CompiledMapping[];

  private constructor(mappings: CompiledMapping[]) {
    this.mappings = mappings;
  }

  static async create(config: FolderMappingConfig): Promise<FolderMapper> {
    // Async initialization work here
    const validated = await this.validatePatterns(config);
    const compiled = this.compilePatterns(validated);
    return new FolderMapper(compiled);
  }

  async resolveType(filePath: string): Promise<ResolveResult> {
    const normalized = normalizePath(filePath);
    return this.matchWithSpecificity(normalized);
  }
}

// Usage
const mapper = await FolderMapper.create(templateConfig);
const result = await mapper.resolveType('vault/Characters/hero.md');
```

### Specificity-Based Pattern Matching

```typescript
// Implementation pattern based on CSS specificity algorithms
interface CompiledMapping {
  pattern: string;
  types: string[];
  matcher: (path: string) => boolean;
  specificity: number;
}

function calculateSpecificity(pattern: string): number {
  let score = 0;

  // Base: character count (longer = more specific)
  score += pattern.length;

  // Wildcards reduce specificity
  const wildcards = pattern.match(/\*\*/g)?.length || 0;
  const singles = pattern.match(/(?<!\*)\*(?!\*)/g)?.length || 0;
  score -= wildcards * 10;  // ** is very generic
  score -= singles * 5;     // * is somewhat generic

  // Path depth increases specificity
  const depth = pattern.split('/').length;
  score += depth * 8;

  // Literal segments (no wildcards) highly specific
  const segments = pattern.split('/');
  const literalSegs = segments.filter(s => !s.includes('*')).length;
  score += literalSegs * 12;

  return score;
}

// Sort by specificity (highest first)
function sortBySpecificity(mappings: CompiledMapping[]): CompiledMapping[] {
  return [...mappings].sort((a, b) => b.specificity - a.specificity);
}
```

### Multi-Consumer Shared Module

```typescript
// src/templates/folder-mapper.ts - Shared by CLI and Obsidian plugin

export interface FolderMappingConfig {
  mappings: Array<{
    folder: string;      // Glob pattern
    types: string[];     // Entity types (1+ entries)
  }>;
  fallbackType?: string; // Optional default when no match
}

export interface ResolveResult {
  types: string[];              // Resolved type(s)
  matchedPattern: string | null; // Pattern that matched
  confidence: 'exact' | 'ambiguous' | 'fallback' | 'none';
}

export class FolderMapper {
  // Both CLI and Obsidian plugin import and use this class
  static async create(config: FolderMappingConfig): Promise<FolderMapper> {
    // Shared logic
  }

  async resolveType(filePath: string): Promise<ResolveResult> {
    // Shared logic
  }
}

// CLI usage: C:\Users\Preston\git\hivemind\src\cli.ts
import { FolderMapper } from './templates/folder-mapper.js';
const mapper = await FolderMapper.create(config.template.folderMappings);

// Obsidian plugin usage: C:\Users\Preston\git\hivemind\obsidian-plugin\main.ts
// Via relative import or compiled bundle inclusion
import { FolderMapper } from '../src/templates/folder-mapper';
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| minimatch | picomatch | 2019+ | 5-7x performance improvement, zero dependencies, better Windows support |
| Sync-only APIs | Async by default | 2020+ (async/await stable) | Future-proof for I/O, consistent with modern Node.js patterns |
| Single-purpose modules | Shared infrastructure | Monorepo era (2021+) | Consistent logic across CLI/plugin, single source of truth |
| Manual path separator handling | normalize-path library | 2015+ | Handles Windows UNC paths, edge cases, battle-tested |
| String length specificity | Weighted scoring | gitignore/CSS-inspired | More accurate "most specific" resolution |

**Deprecated/outdated:**
- **minimatch for new projects**: Still maintained but picomatch is faster and more complete. Prefer picomatch.
- **micromatch for simple matching**: Only needed if brace expansion required. picomatch is lighter.
- **Sync folder mapper APIs**: Blocking I/O anti-pattern. Async enables future config loading, FS checks.

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-type resolution behavior: pick-one vs union**
   - What we know: Phase context says "Claude's discretion on pick-one vs union behavior"
   - What's unclear: Whether `types: ["lore", "event"]` means "prompt user to pick one" or "treat file as both types"
   - Recommendation: Implement as "ambiguous" confidence requiring prompt. Union behavior (file treated as multiple types simultaneously) adds complexity to entity loading and isn't clearly needed. Document in code that union behavior is possible future extension.

2. **Caching compiled patterns vs re-compiling**
   - What we know: Patterns compiled once at mapper creation, but config might change during runtime
   - What's unclear: Whether mapper should be long-lived (singleton) or recreated on config changes
   - Recommendation: Stateless design - create new mapper when config changes. Consumers cache mapper instance. Pattern compilation is cheap (< 1ms for dozens of patterns).

3. **Relative paths: vault-relative vs cwd-relative**
   - What we know: Phase specifies "Paths in config are relative to vault root only"
   - What's unclear: Whether file paths passed to `resolveType()` should be absolute or vault-relative
   - Recommendation: Accept both - normalize to vault-relative internally. Most robust: require vault root path in config, resolve all paths relative to vault root.

4. **Pattern validation: fail-fast vs warn**
   - What we know: Invalid patterns should be caught
   - What's unclear: Whether to throw on invalid patterns (prevent startup) or log warnings (degrade gracefully)
   - Recommendation: Throw on invalid patterns during `FolderMapper.create()`. Config errors should be caught early, not silently ignored. Aligns with existing config validation patterns in codebase.

## Sources

### Primary (HIGH confidence)

- [picomatch GitHub](https://github.com/micromatch/picomatch) - Official README and API documentation
- [normalize-path GitHub](https://github.com/jonschlinkert/normalize-path) - Official README and implementation
- [Node.js path module documentation](https://nodejs.org/api/path.html) - Official Node.js API docs
- [Cross-platform Node.js guide](https://github.com/ehmicky/cross-platform-node-guide/blob/main/docs/3_filesystem/file_paths.md) - Comprehensive path handling guide

### Secondary (MEDIUM confidence)

- [npm-compare: minimatch vs picomatch](https://npm-compare.com/glob,micromatch,minimatch,picomatch) - Performance benchmarks verified by multiple sources
- [TypeScript async constructors guide](https://www.xjavascript.com/blog/typescript-async-constructor/) - Established pattern with code examples
- [DEV Community: Async constructors](https://dev.to/somedood/the-proper-way-to-write-async-constructors-in-javascript-1o8c) - Pattern explanation and rationale
- [Recommended Node.js folder structure 2025](https://dev.to/pramod_boda/recommended-folder-structure-for-nodets-2025-39jl) - src/utils vs src/shared discussion

### Tertiary (LOW confidence)

- [Glob pattern specificity (Ketryx docs)](https://docs.ketryx.com/reference/glob-pattern-matching-algorithm) - Basic matching order, not weighted specificity
- [TypeScript monorepo packages (Nx blog)](https://nx.dev/blog/managing-ts-packages-in-monorepos) - Monorepo patterns, may be over-engineered for this use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - picomatch and normalize-path already in dependency tree, widely adopted, battle-tested
- Architecture: HIGH - Patterns verified against existing codebase (detection.ts wrapper, async patterns), consistent with Phase 12 decisions
- Pitfalls: MEDIUM - Based on common glob/path issues documented in libraries and guides, not Hivemind-specific testing

**Research date:** 2026-01-26
**Valid until:** ~60 days (stable domain - glob matching and path handling patterns change slowly)

**Key assumptions:**
- Picomatch remains in dependency tree via chokidar (true as of package.json inspection)
- Obsidian plugin will import shared code via relative imports or bundling (verified possible via search results)
- Phase 14 (validate) and Phase 15 (fix) will consume FolderMapper API (confirmed in requirements traceability)
- Config-driven approach aligns with existing template system architecture (verified in templates/types.ts)

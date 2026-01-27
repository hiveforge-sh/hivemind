# Technology Stack: Developer Experience Features

**Project:** Hivemind v3.0 - DX Milestone
**Researched:** 2026-01-26
**Scope:** Stack additions for interactive CLI wizard, frontmatter tools, Obsidian commands

## Executive Summary

The existing stack is well-positioned for these features. The main additions are:
1. **@inquirer/prompts** for interactive CLI wizards (replacing manual readline usage)
2. **picocolors** for terminal output styling (lightweight, ESM-compatible)
3. **No new dependencies for Obsidian plugin** - existing API fully supports command palette integration

## Current Stack (Validated - DO NOT CHANGE)

| Technology | Version | Purpose |
|------------|---------|---------|
| commander.js | (not in deps, custom CLI) | CLI structure |
| gray-matter | ^4.0.3 | Frontmatter parsing |
| zod | ^4.3.6 | Schema validation |
| Node.js readline/promises | built-in | Current interactive prompts |

**Observation:** The current CLI in `src/cli.ts` uses Node.js built-in `readline/promises` for interactive prompts. This works but is verbose and lacks features like input validation, select menus, and progress indicators.

## Recommended Additions

### 1. @inquirer/prompts (RECOMMENDED)

**Purpose:** Interactive CLI wizard for `npx hivemind init`

| Attribute | Value |
|-----------|-------|
| Package | `@inquirer/prompts` |
| Version | `^8.2.0` |
| Weekly Downloads | 3.7M+ |
| License | MIT |
| ESM Support | Yes (native) |

**Why @inquirer/prompts over alternatives:**

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **@inquirer/prompts** | RECOMMENDED | Modern rewrite, smaller bundle, native ESM, TypeScript-first, actively maintained |
| inquirer (legacy) | Not recommended | Old API, larger bundle, hundreds of dependencies |
| enquirer | Alternative | Fast and lightweight but less active development |
| prompts | Alternative | Good TypeScript support but fewer features |
| readline/promises | Current | Verbose, no validation, no multi-select |

**What it provides:**

```typescript
import { input, select, confirm, checkbox } from '@inquirer/prompts';

// Type-safe prompts with validation
const vaultPath = await input({
  message: 'Vault path:',
  validate: (path) => existsSync(path) || 'Path does not exist'
});

const template = await select({
  message: 'Select template:',
  choices: [
    { name: 'Worldbuilding', value: 'worldbuilding' },
    { name: 'Research', value: 'research' },
    { name: 'People Management', value: 'people-management' }
  ]
});
```

**Installation:**

```bash
npm install @inquirer/prompts
```

**Integration Notes:**
- Replace `readline.createInterface()` calls in `src/cli.ts`
- Works with existing `type: "module"` in package.json
- No changes to build configuration required

### 2. picocolors (RECOMMENDED)

**Purpose:** Terminal output styling for CLI feedback

| Attribute | Value |
|-----------|-------|
| Package | `picocolors` |
| Version | `^1.1.1` |
| Size | 7 kB (vs chalk's 101 kB) |
| Dependencies | 0 |
| ESM Support | Yes |

**Why picocolors over chalk:**

| Option | Verdict | Rationale |
|--------|---------|-----------|
| **picocolors** | RECOMMENDED | Smallest, fastest, no dependencies, dual CJS/ESM |
| chalk v5 | Alternative | Feature-rich but 14x larger, ESM-only may cause build issues |
| ansis | Alternative | Very fast but less community adoption |
| kleur | Alternative | Good but larger than picocolors |

**What it provides:**

```typescript
import pc from 'picocolors';

console.log(pc.green('Success:') + ' Config created');
console.log(pc.yellow('Warning:') + ' Path does not exist');
console.log(pc.red('Error:') + ' Invalid template');
console.log(pc.dim('Hint:') + ' Run npx hivemind init');
```

**Installation:**

```bash
npm install picocolors
```

### 3. ora (OPTIONAL - NOT RECOMMENDED)

**Purpose:** Terminal spinner for long operations

| Attribute | Value |
|-----------|-------|
| Package | `ora` |
| Version | `^9.0.0` |
| ESM Support | Yes (ESM-only since v6) |

**Verdict: NOT RECOMMENDED for this milestone**

**Rationale:**
- The `init` wizard is synchronous user input, no spinners needed
- Frontmatter validation is fast (<100ms), no spinner needed
- Adds complexity for minimal benefit
- If needed later for indexing progress, can be added then

## Obsidian Plugin Stack (NO ADDITIONS NEEDED)

The existing Obsidian plugin already has everything needed for command palette integration.

### Available in Current Plugin

| Capability | How to Use | Already Used |
|------------|------------|--------------|
| Command registration | `this.addCommand({ id, name, callback })` | Yes (6 commands) |
| Editor commands | `editorCallback: (editor, view) => {}` | Yes |
| Check commands | `checkCallback: (checking) => {}` | No (can add) |
| Modal dialogs | `new Modal(app).open()` | Yes (7 modal classes) |
| Suggest modals | `extends SuggestModal<T>` | No (can add) |
| Fuzzy suggest | `extends FuzzySuggestModal<T>` | No (can add) |
| Settings UI | `Setting` class | Yes |
| File operations | `app.vault.read/modify` | Yes |
| Frontmatter access | `app.metadataCache.getFileCache(file)` | Yes |

### Command Types Available

```typescript
// Simple command (global)
this.addCommand({
  id: 'add-frontmatter',
  name: 'Add frontmatter to current note',
  callback: () => { /* ... */ }
});

// Editor command (only when editing)
this.addCommand({
  id: 'fix-frontmatter',
  name: 'Fix frontmatter in current note',
  editorCallback: (editor, view) => { /* ... */ }
});

// Conditional command (show only when valid)
this.addCommand({
  id: 'validate-frontmatter',
  name: 'Validate frontmatter',
  checkCallback: (checking) => {
    const file = this.app.workspace.getActiveFile();
    if (!file) return false;
    if (!checking) this.validateFrontmatter(file);
    return true;
  }
});
```

### Modal Types for Entity Selection

```typescript
// For selecting entity type when adding frontmatter
class EntityTypeSuggestModal extends FuzzySuggestModal<string> {
  getItems(): string[] {
    return ['character', 'location', 'event', 'faction', 'lore'];
  }

  getItemText(item: string): string {
    return item.charAt(0).toUpperCase() + item.slice(1);
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent) {
    this.onSelect(item);
  }
}
```

**Verdict:** The plugin already uses `Modal` for multiple dialogs. Add `FuzzySuggestModal` for entity type selection - no new dependencies required.

## What NOT to Add

### commander.js

**Current state:** CLI uses custom argument parsing
**Recommendation:** DO NOT ADD

The CLI is simple enough that commander.js would be overkill. The current switch/case approach in `src/cli.ts` is adequate. If command complexity grows significantly, reconsider.

### YAML libraries (js-yaml, yaml)

**Current state:** gray-matter handles YAML internally
**Recommendation:** DO NOT ADD

gray-matter uses js-yaml internally. Do not add another YAML library. Use gray-matter's stringify for YAML output:

```typescript
import matter from 'gray-matter';

const result = matter.stringify(content, frontmatter);
```

### glob/fast-glob

**Current state:** Custom file scanning exists
**Recommendation:** DO NOT ADD

The vault scanning is handled by Obsidian's API in the plugin and custom Node.js fs operations in CLI. No need for glob libraries.

## Installation Summary

```bash
# Required additions
npm install @inquirer/prompts picocolors

# Types (if needed - check if included)
npm install -D @types/inquirer__prompts  # Usually not needed, types included
```

## Integration Points

### CLI (src/cli.ts)

| Current | After |
|---------|-------|
| `readline.createInterface()` | `@inquirer/prompts` functions |
| `console.log('Message')` | `console.log(pc.green('Message'))` |
| Manual validation loops | Inquirer `validate` option |

### Obsidian Plugin (obsidian-plugin/main.ts)

| Current | After |
|---------|-------|
| Custom `TypeSelectionModal` | `FuzzySuggestModal` subclass |
| 6 registered commands | Add 3 more commands |
| Manual frontmatter handling | Reuse existing `insertMissingFrontmatter` |

## Version Compatibility

| Package | Min Node.js | ESM | Existing Stack Compatible |
|---------|-------------|-----|---------------------------|
| @inquirer/prompts | 18+ | Yes | Yes (Node 20+) |
| picocolors | 6+ | Yes | Yes |
| obsidian API | N/A | N/A | Yes (1.4.10+) |

## Confidence Assessment

| Recommendation | Confidence | Rationale |
|----------------|------------|-----------|
| @inquirer/prompts | HIGH | Official npm docs, active maintenance, TypeScript-native |
| picocolors | HIGH | npm stats, benchmark data, production use by PostCSS/SVGO |
| No ora | HIGH | Not needed for sync operations |
| No Obsidian additions | HIGH | Verified from obsidian.d.ts type definitions |

## Sources

- [@inquirer/prompts npm](https://www.npmjs.com/package/@inquirer/prompts) - v8.2.0 documentation
- [Inquirer.js GitHub](https://github.com/SBoudrias/Inquirer.js) - Rewrite rationale
- [picocolors npm](https://www.npmjs.com/package/picocolors) - v1.1.1, benchmark data
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - Size comparison
- [commander npm](https://www.npmjs.com/package/commander) - v14.0.2 (evaluated, not recommended)
- [ora npm](https://www.npmjs.com/package/ora) - v9.0.0 (evaluated, not recommended)
- [chalk npm](https://www.npmjs.com/package/chalk) - v5.3.0 (evaluated, picocolors preferred)
- [Obsidian Developer Docs - Modals](https://docs.obsidian.md/Plugins/User+interface/Modals)
- [Obsidian Developer Docs - addCommand](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/addCommand)
- obsidian.d.ts type definitions (verified locally)

# Phase 12: Setup Wizard - Research

**Researched:** 2026-01-26
**Domain:** CLI interactive setup wizard, Node.js prompts and terminal styling
**Confidence:** HIGH

## Summary

This phase implements an interactive CLI wizard for Hivemind initialization. The research focused on the locked-in technology choices from CONTEXT.md: `@inquirer/prompts` for interactive prompts and `picocolors` for terminal styling. Both libraries are well-documented, actively maintained, and suitable for the wizard requirements.

The wizard needs to handle vault path validation, template selection with inline previews, folder structure auto-detection, config file generation, and Claude Desktop config snippet output with optional clipboard copy. Cross-platform compatibility (Windows, macOS, Linux) is critical for path handling.

**Primary recommendation:** Use `@inquirer/prompts` (standalone prompt packages) with `@inquirer/select` for template selection including description previews, `@inquirer/input` for path entry, and `@inquirer/confirm` for overwrite confirmations. Use `picocolors` for minimal color styling (green success, red errors). Use `clipboardy` for cross-platform clipboard functionality.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @inquirer/prompts | ^7.x | Interactive CLI prompts | Official rewrite of inquirer.js, smaller, faster, modern ES modules |
| @inquirer/select | ^4.x | Template selection with descriptions | Built-in description preview on highlight |
| @inquirer/input | ^4.x | Text input (vault path) | Supports validation, transformation |
| @inquirer/confirm | ^5.x | Yes/no confirmations | Simple boolean prompts |
| picocolors | ^1.1.x | Terminal color styling | 14x smaller than chalk, 2x faster, 76M+ weekly downloads |
| clipboardy | ^4.x | Cross-platform clipboard | Supports Windows/macOS/Linux/Wayland, async/sync APIs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (Node.js built-in path) | - | Cross-platform path handling | All path operations |
| (Node.js built-in fs) | - | Filesystem operations | Vault validation, config writing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @inquirer/prompts | enquirer | enquirer is unmaintained since 2020 |
| @inquirer/prompts | prompts | prompts lacks description preview feature |
| picocolors | chalk | chalk is 14x larger, 3x slower to load |
| clipboardy | copy-paste | copy-paste less actively maintained |

**Installation:**
```bash
npm install @inquirer/prompts picocolors clipboardy
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.ts                    # Main CLI entry point (existing)
├── cli/                      # CLI-specific modules (new)
│   ├── init/                 # Init wizard components
│   │   ├── wizard.ts         # Main wizard orchestrator
│   │   ├── prompts.ts        # Prompt configurations
│   │   ├── validators.ts     # Input validation functions
│   │   ├── detection.ts      # Vault structure detection
│   │   └── output.ts         # Config generation and output
│   └── shared/               # Shared CLI utilities
│       ├── colors.ts         # picocolors wrapper
│       └── clipboard.ts      # clipboardy wrapper
└── templates/
    ├── detector.ts           # (existing) Template auto-detection
    └── folder-mapper.ts      # (existing) Folder-to-type mapping
```

### Pattern 1: Select with Description Preview
**What:** Template selection shows description below the list as user navigates
**When to use:** Template selection step where users need context about each option
**Example:**
```typescript
// Source: @inquirer/select documentation
import { select, Separator } from '@inquirer/prompts';

const template = await select({
  message: 'Select a template',
  choices: [
    new Separator('--- Creative ---'),
    {
      name: 'Worldbuilding',
      value: 'worldbuilding',
      description: 'Fiction, games, RPGs - characters, locations, events, factions, lore',
    },
    new Separator('--- Professional ---'),
    {
      name: 'People Management',
      value: 'people-management',
      description: 'Teams, HR - people, goals, teams, 1:1 meetings',
    },
    new Separator('--- Research ---'),
    {
      name: 'Research',
      value: 'research',
      description: 'Academic, knowledge - papers, citations, concepts',
    },
    new Separator('--- Custom ---'),
    {
      name: 'Create custom template...',
      value: 'custom',
      description: 'Define your own entity types and relationships',
    },
  ],
});
```

### Pattern 2: Input with Validation
**What:** Validate vault path when user presses Enter, re-prompt if invalid
**When to use:** Vault path entry where path must exist and be accessible
**Example:**
```typescript
// Source: @inquirer/input documentation
import { input } from '@inquirer/prompts';
import { existsSync } from 'fs';
import { resolve } from 'path';

const vaultPath = await input({
  message: 'Enter your Obsidian vault path:',
  validate: (value) => {
    const resolved = resolve(value.trim());
    if (!value.trim()) {
      return 'Vault path is required';
    }
    if (!existsSync(resolved)) {
      return `Path does not exist: ${resolved}`;
    }
    return true;
  },
  transformer: (value) => resolve(value.trim()),
});
```

### Pattern 3: Breadcrumb Progress Display
**What:** Show wizard progress as a breadcrumb trail with current step highlighted
**When to use:** Throughout the wizard to orient users
**Example:**
```typescript
// Source: Custom implementation using picocolors
import pc from 'picocolors';

function renderBreadcrumb(current: number, steps: string[]): string {
  return steps.map((step, i) => {
    if (i < current) return pc.dim(step);
    if (i === current) return pc.bold(step);
    return pc.dim(step);
  }).join(pc.dim(' > '));
}

// Usage: "Vault > Template > Folders > Done"
console.log(renderBreadcrumb(1, ['Vault', 'Template', 'Folders', 'Done']));
```

### Pattern 4: Non-Interactive Mode
**What:** Support both preset file and individual flags for CI/automation
**When to use:** Non-interactive initialization for CI pipelines
**Example:**
```typescript
// Source: Best practice for CLI non-interactive mode
interface InitOptions {
  vault?: string;
  template?: string;
  config?: string;  // Path to preset JSON
  yes?: boolean;    // Skip confirmations
}

async function init(options: InitOptions) {
  // If --config provided, load preset
  if (options.config) {
    const preset = JSON.parse(readFileSync(options.config, 'utf-8'));
    return initFromPreset(preset);
  }

  // If all required options provided, skip prompts
  if (options.vault && options.template) {
    return initFromFlags(options);
  }

  // Otherwise, run interactive wizard
  return initInteractive();
}
```

### Anti-Patterns to Avoid
- **Auto-copying to clipboard:** Always ask first, not auto-copy (user decision)
- **Hardcoded path separators:** Use `path.join()` and `path.resolve()`, never `/` or `\\`
- **Blocking validation:** Validate on submit, not keystroke (UX decision)
- **Deep nesting of prompts:** Keep wizard linear, use Ctrl+C to restart (user decision)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Interactive prompts | Custom readline loops | @inquirer/prompts | Handles terminal state, keyboard events, cursor positioning |
| Terminal colors | ANSI escape codes | picocolors | Handles color support detection, NO_COLOR standard |
| Clipboard access | Platform-specific spawn | clipboardy | Handles PowerShell/pbcopy/xclip/wl-clipboard |
| Path normalization | String replacement | Node.js path module | Handles Windows/Unix differences correctly |
| Vault folder detection | Custom glob patterns | Existing TemplateDetector class | Already implemented, tested |
| Folder-to-type mapping | Hardcoded mappings | Existing FolderMapper class | Already has 30+ mappings, extensible |

**Key insight:** The existing `TemplateDetector` and `FolderMapper` classes in `src/templates/` already handle vault structure analysis. The wizard should use these existing implementations rather than duplicating logic.

## Common Pitfalls

### Pitfall 1: Windows Path Handling
**What goes wrong:** Paths with backslashes break or display incorrectly
**Why it happens:** Windows uses `\`, Unix uses `/`, string concatenation breaks
**How to avoid:** Always use `path.resolve()`, `path.join()`, and `path.normalize()`
**Warning signs:** Paths with mixed slashes, hardcoded separators

### Pitfall 2: TTY Detection
**What goes wrong:** Prompts hang or error in non-interactive environments (CI/pipes)
**Why it happens:** @inquirer/prompts requires TTY for interactive mode
**How to avoid:** Check `process.stdin.isTTY` before prompts, provide non-interactive fallback
**Warning signs:** CI pipelines timing out, `Error: Input stream ended unexpectedly`
```typescript
// Source: Best practice for TTY detection
if (!process.stdin.isTTY) {
  console.error('Interactive mode requires a terminal. Use --config or flags.');
  process.exit(1);
}
```

### Pitfall 3: Ctrl+C Handling
**What goes wrong:** Wizard exits silently or throws unhandled exception
**Why it happens:** @inquirer/prompts throws `ExitPromptError` on Ctrl+C
**How to avoid:** Wrap prompts in try/catch, handle `ExitPromptError` gracefully
**Warning signs:** `UnhandledPromiseRejectionWarning`, confusing error messages
```typescript
// Source: @inquirer/prompts documentation
import { ExitPromptError } from '@inquirer/prompts';

try {
  const answer = await input({ message: 'Your name:' });
} catch (error) {
  if (error instanceof ExitPromptError) {
    console.log('\nSetup cancelled.');
    process.exit(0);
  }
  throw error;
}
```

### Pitfall 4: Config File Overwrite Race
**What goes wrong:** User sees "config exists" message but file was just deleted
**Why it happens:** TOCTOU (time-of-check-time-of-use) race condition
**How to avoid:** Check existence immediately before write, handle EEXIST error
**Warning signs:** Sporadic "file exists" errors, test flakiness

### Pitfall 5: Color Support Detection
**What goes wrong:** Colors appear as garbled escape codes
**Why it happens:** Terminal doesn't support ANSI colors, NO_COLOR not respected
**How to avoid:** Use `picocolors.isColorSupported`, respect NO_COLOR env var
**Warning signs:** `[32m` appearing in output, tests with garbled output
```typescript
// Source: picocolors README
import pc from 'picocolors';

// Automatically respects NO_COLOR and terminal capabilities
console.log(pc.green('Success!'));  // Safe - degrades gracefully
```

## Code Examples

Verified patterns from official sources:

### Vault Path Input with Validation
```typescript
// Source: @inquirer/input docs + best practices
import { input } from '@inquirer/prompts';
import { existsSync, statSync } from 'fs';
import { resolve, normalize } from 'path';

const vaultPath = await input({
  message: 'Enter your Obsidian vault path:',
  default: process.cwd(),
  validate: (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Vault path is required';
    }

    const resolved = resolve(trimmed);
    if (!existsSync(resolved)) {
      return `Path does not exist: ${resolved}`;
    }

    const stats = statSync(resolved);
    if (!stats.isDirectory()) {
      return `Path is not a directory: ${resolved}`;
    }

    return true;
  },
});
```

### Template Selection with Grouped Categories
```typescript
// Source: @inquirer/select docs
import { select, Separator } from '@inquirer/prompts';

interface TemplateChoice {
  name: string;
  value: string;
  description: string;
}

const TEMPLATE_CHOICES = [
  new Separator('--- Creative ---'),
  {
    name: 'Worldbuilding',
    value: 'worldbuilding',
    description: 'Fiction, games, RPGs - characters, locations, events, factions, lore, assets',
  },
  new Separator('--- Professional ---'),
  {
    name: 'People Management',
    value: 'people-management',
    description: 'Teams, HR - people, goals, teams, 1:1 meetings',
  },
  new Separator('--- Technical ---'),
  {
    name: 'Software Architecture',
    value: 'software-architecture',
    description: 'Engineers - systems, ADRs, components, integrations',
  },
  {
    name: 'UX Research',
    value: 'ux-research',
    description: 'UX, product - interviews, insights, personas, journeys',
  },
  new Separator('--- Research ---'),
  {
    name: 'Research',
    value: 'research',
    description: 'Academic, knowledge - papers, citations, concepts, notes',
  },
  new Separator('--- Custom ---'),
  {
    name: 'Create custom template...',
    value: 'custom',
    description: 'Define your own entity types and relationships',
  },
];

const template = await select({
  message: 'Select a template for your vault:',
  choices: TEMPLATE_CHOICES,
});
```

### Clipboard Copy with Permission
```typescript
// Source: clipboardy docs + UX best practice
import { confirm } from '@inquirer/prompts';
import clipboard from 'clipboardy';
import pc from 'picocolors';

const mcpConfig = JSON.stringify({
  mcpServers: {
    hivemind: {
      command: 'npx',
      args: ['-y', '@hiveforge/hivemind-mcp', '--vault', vaultPath],
    },
  },
}, null, 2);

console.log('\nClaude Desktop configuration:');
console.log(pc.dim(mcpConfig));

const shouldCopy = await confirm({
  message: 'Copy to clipboard?',
  default: true,
});

if (shouldCopy) {
  await clipboard.write(mcpConfig);
  console.log(pc.green('Copied to clipboard!'));
}
```

### Auto-Detection with Confirmation
```typescript
// Source: Existing TemplateDetector + @inquirer/confirm
import { confirm, select } from '@inquirer/prompts';
import { TemplateDetector } from '../templates/detector.js';
import pc from 'picocolors';

const detector = new TemplateDetector();
const detection = await detector.detectTemplate(vaultPath);

if (detection && detection.confidence !== 'low') {
  console.log(`\nDetected: ${pc.bold(detection.templateId)} template`);
  console.log(pc.dim(`Matched folders: ${detection.matchedPatterns.join(', ')}`));

  const useDetected = await confirm({
    message: `Use ${detection.templateId} template?`,
    default: true,
  });

  if (useDetected) {
    return detection.templateId;
  }
}

// Fall through to manual selection
return await select({
  message: 'Select a template:',
  choices: TEMPLATE_CHOICES,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| inquirer (legacy) | @inquirer/prompts | 2023 | 80% smaller, faster, modern ES modules |
| chalk | picocolors | 2021 | 14x smaller, 2x faster, better defaults |
| readline/promises | @inquirer/prompts | - | Built-in validation, better UX |

**Deprecated/outdated:**
- `inquirer` package: Still maintained but legacy API, use `@inquirer/prompts` instead
- `chalk`: Works but much larger, use `picocolors` for new projects
- Manual `readline.createInterface`: Complex, use @inquirer/* packages

## Open Questions

Things that couldn't be fully resolved:

1. **Exact breadcrumb styling**
   - What we know: User decided "progress shown as breadcrumb"
   - What's unclear: Exact characters/symbols for current vs completed steps
   - Recommendation: Use dim for completed/upcoming, bold for current, simple `>` separator

2. **Custom template inline creation flow**
   - What we know: "Custom" option triggers inline template creation, full create-template experience
   - What's unclear: How to handle abandonment mid-creation (Ctrl+C) vs back to template selection
   - Recommendation: Ctrl+C cancels entire wizard (consistent with user decision of no back navigation)

## Sources

### Primary (HIGH confidence)
- @inquirer/prompts npm package - prompt types, validation, theming
- @inquirer/select npm package - description preview feature
- picocolors GitHub README - API, color support detection
- clipboardy GitHub - cross-platform support, API
- Node.js path module documentation - cross-platform path handling
- Existing Hivemind codebase - TemplateDetector, FolderMapper, cli.ts

### Secondary (MEDIUM confidence)
- GitHub: nodejs-cli-apps-best-practices - UX guidelines, TTY detection
- cross-platform-node-guide - path handling best practices

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm/GitHub, actively maintained
- Architecture: HIGH - Patterns from official docs, existing codebase patterns
- Pitfalls: HIGH - Known issues from official docs and best practice guides

**Research date:** 2026-01-26
**Valid until:** 60 days - libraries are stable, slow-moving

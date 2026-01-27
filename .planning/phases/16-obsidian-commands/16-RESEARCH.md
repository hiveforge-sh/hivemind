# Phase 16: Obsidian Commands - Research

**Researched:** 2026-01-27
**Domain:** Obsidian plugin development (TypeScript, commands, modals, UI)
**Confidence:** HIGH

## Summary

Obsidian plugin development uses a well-documented TypeScript API with specific patterns for commands, modals, and UI components. The official API provides Command, Modal, Notice, and Setting classes for building interactive features. Plugin structure is standardized with esbuild for bundling, TypeScript for type safety, and ESLint for code quality.

For Phase 16, the key challenge is integrating CLI functionality (validation, fixing) into Obsidian's native UI patterns. The existing `main.ts` already demonstrates basic modal patterns (TypeSelectionModal, MissingFrontmatterModal) and command registration. The research confirms these patterns align with Obsidian best practices and that the planned features (validation sidebar, fix modal, add command) have established precedents in the plugin ecosystem.

**Primary recommendation:** Reuse existing CLI logic (`src/cli/validate/*`, `src/cli/fix/*`) as backend engines, wrap them in Obsidian UI components (Modal, Notice, custom View for sidebar), and ensure all operations work within Obsidian's file system abstractions (TFile, Vault API) rather than Node.js fs module directly.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| obsidian | latest | Plugin API | Official API with TypeScript definitions, all plugins depend on this |
| TypeScript | 5.3.3+ | Type safety | Obsidian API ships with .d.ts files, TypeScript is standard for plugin development |
| esbuild | 0.27.2+ | Bundling | Fast bundler, official sample plugin uses this, compiles TS to single main.js |
| gray-matter | ^4.0.3 | Frontmatter parsing | Already used in CLI validation/fix, standard for parsing YAML frontmatter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ESLint | latest | Code quality | Official sample plugin includes ESLint config with Obsidian-specific rules |
| @inquirer/prompts | ^8.0.0 | N/A for Obsidian | Used in CLI only, NOT needed in plugin (use Obsidian Modal/SuggestModal instead) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Obsidian Modal | Custom HTML/CSS | Modal is native, styled by Obsidian theme, no maintenance burden |
| Obsidian Notice | Custom toast library | Notice is themed, positioned correctly on mobile/desktop automatically |
| Obsidian SuggestModal | Custom autocomplete | SuggestModal has fuzzy search built-in, keyboard navigation, theme integration |

**Installation:**
```bash
npm install obsidian --save-dev
npm install gray-matter
```

## Architecture Patterns

### Recommended Project Structure
```
obsidian-plugin/
├── main.ts              # Plugin entry point, commands registration
├── modals/              # Modal classes (Add, Validate, Fix)
├── views/               # Custom views (ValidationSidebar)
├── services/            # Backend logic adapters (wrap CLI logic)
├── manifest.json        # Plugin metadata
├── styles.css           # Plugin-specific styles (optional)
└── esbuild.config.mjs   # Build configuration
```

### Pattern 1: Command Registration
**What:** Register commands that appear in command palette (Ctrl/Cmd+P)
**When to use:** For all user-facing actions (Add, Validate, Fix)
**Example:**
```typescript
// Source: Official Obsidian sample plugin + existing main.ts
this.addCommand({
  id: 'add-frontmatter',
  name: 'Hivemind: Add frontmatter',
  editorCallback: (editor: Editor, view: MarkdownView) => {
    const file = view.file;
    if (file) {
      new AddFrontmatterModal(this.app, this, file).open();
    }
  }
});
```
**Key points:**
- `editorCallback` provides Editor and MarkdownView, use for active-file commands
- `callback` provides no context, use for vault-wide commands
- `checkCallback` allows conditional availability (return false to hide command)

### Pattern 2: Modal with User Input
**What:** Display modal with form fields, get user input, perform action
**When to use:** For Fix command (show missing fields, let user edit), Add command (preview + confirm)
**Example:**
```typescript
// Source: Existing TypeSelectionModal in main.ts (lines 1370-1532)
class AddFrontmatterModal extends Modal {
  plugin: HivemindPlugin;
  file: TFile;

  constructor(app: App, plugin: HivemindPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Add frontmatter' });

    // Use Setting class for input fields
    new Setting(contentEl)
      .setName('Entity type')
      .addDropdown(dropdown => dropdown
        .addOptions({character: 'Character', location: 'Location'})
        .onChange(value => { /* handle */ }));

    // Buttons
    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Cancel')
        .onClick(() => this.close()))
      .addButton(btn => btn
        .setButtonText('Add')
        .setCta()
        .onClick(async () => {
          await this.applyFrontmatter();
          this.close();
        }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

### Pattern 3: SuggestModal for Selection
**What:** Show list of items with fuzzy search, user selects one
**When to use:** Type selection when ambiguous, file selection for bulk operations
**Example:**
```typescript
// Source: Community plugins (workbench-obsidian, quick-preview)
class EntityTypeSuggestModal extends SuggestModal<string> {
  types: string[];
  onSelect: (type: string) => void;

  constructor(app: App, types: string[], onSelect: (type: string) => void) {
    super(app);
    this.types = types;
    this.onSelect = onSelect;
  }

  getSuggestions(query: string): string[] {
    return this.types.filter(type =>
      type.toLowerCase().includes(query.toLowerCase())
    );
  }

  renderSuggestion(type: string, el: HTMLElement) {
    el.createEl('div', { text: type });
  }

  onChooseSuggestion(type: string, evt: MouseEvent | KeyboardEvent) {
    this.onSelect(type);
  }
}
```

### Pattern 4: Custom View for Sidebar Panel
**What:** Persistent panel in sidebar showing validation results
**When to use:** Vault-wide validation (show all issues, clickable navigation)
**Example:**
```typescript
// Source: Panel Builder plugin, community patterns
class ValidationView extends ItemView {
  plugin: HivemindPlugin;

  getViewType(): string {
    return 'hivemind-validation';
  }

  getDisplayText(): string {
    return 'Hivemind Validation';
  }

  getIcon(): string {
    return 'check-circle';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl('h4', { text: 'Validation Results' });
    // Populate with validation results
  }

  async onClose() {
    // Cleanup
  }
}

// Register view in plugin onload()
this.registerView('hivemind-validation', (leaf) =>
  new ValidationView(leaf, this)
);

// Add command to open view
this.addCommand({
  id: 'open-validation-panel',
  name: 'Hivemind: Show validation panel',
  callback: () => {
    this.activateView();
  }
});

async activateView() {
  this.app.workspace.detachLeavesOfType('hivemind-validation');
  await this.app.workspace.getRightLeaf(false).setViewState({
    type: 'hivemind-validation',
    active: true,
  });
  this.app.workspace.revealLeaf(
    this.app.workspace.getLeavesOfType('hivemind-validation')[0]
  );
}
```

### Pattern 5: Notice for Feedback
**What:** Toast notification for quick feedback (success, error, info)
**When to use:** After operations complete, for valid file confirmation
**Example:**
```typescript
// Source: Existing main.ts (line 569, others)
new Notice('✅ Frontmatter updated successfully!');
new Notice('❌ Failed to validate: ' + error.message, 8000); // 8 second timeout
```

### Pattern 6: Context Menu Integration
**What:** Add items to file/folder right-click menu
**When to use:** Quick access to Add/Fix for specific files/folders
**Example:**
```typescript
// Source: Obsidian docs, customizable-menu plugin
this.registerEvent(
  this.app.workspace.on('file-menu', (menu, file) => {
    menu.addItem((item) => {
      item
        .setTitle('Hivemind: Add frontmatter')
        .setIcon('plus-circle')
        .onClick(async () => {
          new AddFrontmatterModal(this.app, this, file).open();
        });
    });
  })
);

this.registerEvent(
  this.app.workspace.on('file-menu', (menu, file, source) => {
    if (file instanceof TFolder) {
      menu.addItem((item) => {
        item
          .setTitle('Hivemind: Fix all in folder')
          .setIcon('wrench')
          .onClick(async () => {
            await this.fixAllInFolder(file);
          });
      });
    }
  })
);
```

### Anti-Patterns to Avoid
- **Using Node.js fs directly:** Use Obsidian's Vault API (`this.app.vault.read()`, `this.app.vault.modify()`) instead of `fs.readFile()` / `fs.writeFile()`. Vault API handles file caching and triggers proper events.
- **Blocking the UI thread:** Use async/await for all file operations. Show loading state ("Validating..." Notice) for long operations.
- **Hardcoding paths:** Always use `TFile.path` and `TFolder.path` from Obsidian's file system abstractions, not string manipulation.
- **Ignoring mobile:** Test on mobile (plugin manifest allows mobile). Modals should be scrollable, settings should be touch-friendly.
- **Mutating files without events:** Always use Vault API so Obsidian knows files changed (triggers re-index, live preview update).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy search for suggestions | Custom fuzzy matcher | `FuzzySuggestModal` base class | Built-in, keyboard shortcuts, theme-integrated |
| File picker | Custom file browser | `SuggestModal<TFile>` with `this.app.vault.getFiles()` | Fuzzy search, recent files sorting |
| Toast notifications | Custom overlay div | `Notice` class | Positioned correctly on mobile/desktop, theme colors, auto-dismiss |
| Settings UI | Custom HTML forms | `PluginSettingTab` + `Setting` class | Consistent with other plugins, responsive, themed |
| Frontmatter parsing | Regex parsing | `gray-matter` (already used in CLI) | Handles edge cases (YAML multi-line, escaped quotes) |
| YAML serialization | String concatenation | `gray-matter.stringify()` or existing `objectToYaml()` helper (main.ts:591-629) | Correct indentation, quoting rules |
| File system operations | Node.js `fs` | `this.app.vault` API | Cache management, event triggering, mobile compatibility |

**Key insight:** Obsidian's API is designed for consistency across plugins. Custom UI components break themes, confuse users, and require extra maintenance. The built-in components (Modal, Setting, Notice, SuggestModal) cover 95% of use cases.

## Common Pitfalls

### Pitfall 1: Using CLI Logic Directly
**What goes wrong:** CLI uses `fs.readFile()` and `fs.writeFile()` with absolute paths. Obsidian expects Vault API with relative paths (TFile).
**Why it happens:** CLI and plugin share validation/fix logic, tempting to reuse directly.
**How to avoid:** Create adapter layer in `obsidian-plugin/services/` that:
  - Converts TFile → file path for CLI functions
  - Converts CLI results → Obsidian Notice/Modal UI
  - Uses Vault API for file writes instead of CLI's writer.ts
**Warning signs:**
  - `fs.readFile()` or `fs.writeFile()` imported in plugin code
  - Paths like `/Users/name/vault/file.md` instead of `folder/file.md`
  - Files modified but Obsidian doesn't see changes (cache stale)

### Pitfall 2: Blocking UI with Synchronous Operations
**What goes wrong:** Vault scanning (1000+ files) freezes Obsidian for seconds.
**Why it happens:** JavaScript single-threaded, no async/await on long operations.
**How to avoid:**
  - Always use `async` functions for vault operations
  - Show Notice immediately ("Scanning vault...") before starting
  - Consider chunking: validate 100 files at a time with `await` between chunks
  - Update progress Notice every N files
**Warning signs:**
  - Obsidian UI unresponsive during validation/fix
  - "Application Not Responding" on large vaults
  - Users can't cancel long operations

### Pitfall 3: Modal State Management
**What goes wrong:** User opens Fix modal, switches files, modal shows stale data for old file.
**Why it happens:** Modal stores file reference in constructor, doesn't refresh when active file changes.
**How to avoid:**
  - Get current file in `onOpen()`, not just constructor
  - For persistent views (sidebar), subscribe to `this.app.workspace.on('active-leaf-change')` and refresh
  - Store TFile reference, re-read frontmatter on open (don't cache)
**Warning signs:**
  - Modal shows wrong file name in header
  - Applying changes modifies wrong file
  - Validation results don't match current file

### Pitfall 4: Memory Leaks in Event Listeners
**What goes wrong:** Plugin unloaded, but event listeners still firing, causing errors.
**Why it happens:** Forgot to unregister events in `onunload()`.
**How to avoid:**
  - Use `this.registerEvent()` for workspace events (auto-unregistered)
  - Use `this.registerDomEvent()` for DOM events (auto-unregistered)
  - Never use `addEventListener()` directly without cleanup
**Warning signs:**
  - Console errors after disabling plugin
  - Memory usage grows when enable/disable plugin repeatedly
  - Events firing twice (old + new listener)

### Pitfall 5: Obsidian API Version Assumptions
**What goes wrong:** Plugin uses `this.app.metadataCache.on('resolved')` but user has older Obsidian version, plugin breaks.
**Why it happens:** API evolves, new methods added, old plugins don't guard against missing APIs.
**How to avoid:**
  - Set `minAppVersion` in manifest.json (e.g., "1.4.0")
  - Check for API existence: `if (this.app.metadataCache.on) { ... }`
  - Test on minimum supported version before release
**Warning signs:**
  - Users report "X is not a function" errors
  - Works on dev machine (latest Obsidian) but not for users
  - Plugin breaks after Obsidian update

### Pitfall 6: Frontmatter Serialization Errors
**What goes wrong:** Plugin writes invalid YAML (missing quotes, wrong indentation), file becomes unreadable.
**Why it happens:** Hand-rolled YAML serialization misses edge cases (colons in strings, multi-line values).
**How to avoid:**
  - Reuse existing `objectToYaml()` from main.ts (lines 591-629) — already handles edge cases
  - OR use `gray-matter.stringify({ content, data: frontmatter })` for full round-trip
  - Test with complex frontmatter: nested objects, arrays, strings with special chars
**Warning signs:**
  - Files show parse errors after plugin modifies them
  - Frontmatter disappears or becomes invalid
  - YAML keys unquoted when they should be quoted (e.g., `123: value` should be `"123": value`)

## Code Examples

Verified patterns from existing codebase and official sources:

### Command Registration (Active File)
```typescript
// Source: main.ts lines 234-240
this.addCommand({
  id: 'check-missing-frontmatter',
  name: 'Check and insert missing frontmatter',
  editorCallback: (editor: Editor, view: MarkdownView) => {
    this.checkMissingFrontmatter(view.file);
  }
});
```

### Reading Frontmatter via Obsidian Cache
```typescript
// Source: main.ts lines 410-418
const cache = this.app.metadataCache.getFileCache(file);
if (!cache || !cache.frontmatter) {
  new Notice('No frontmatter found in note');
  return;
}
const frontmatter = cache.frontmatter;
```

### Writing Frontmatter via Vault API
```typescript
// Source: main.ts lines 544-575
async insertMissingFrontmatter(file: TFile, existingFrontmatter: Record<string, any>, newFields: Record<string, any>) {
  const content = await this.app.vault.read(file);
  const merged = this.deepMerge(existingFrontmatter, newFields);
  const yaml = this.objectToYaml(merged);

  let newContent: string;
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;

  if (frontmatterRegex.test(content)) {
    newContent = content.replace(frontmatterRegex, `---\n${yaml}\n---\n`);
  } else {
    newContent = `---\n${yaml}\n---\n\n${content}`;
  }

  await this.app.vault.modify(file, newContent);
  new Notice('✅ Frontmatter updated successfully!');
}
```

### Modal with Type Selection (Grid Layout)
```typescript
// Source: main.ts lines 1447-1481 (TypeSelectionModal)
const typeGrid = contentEl.createDiv({ cls: 'type-selection-grid' });
typeGrid.style.display = 'grid';
typeGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
typeGrid.style.gap = '10px';

for (const [type, description] of Object.entries(typeDescriptions)) {
  const typeBtn = typeGrid.createEl('button', { cls: 'type-selection-btn' });
  typeBtn.style.padding = '15px';

  typeBtn.createEl('div', { text: type, cls: 'type-name' })
    .style.fontWeight = 'bold';
  typeBtn.createEl('div', { text: description, cls: 'type-desc' })
    .style.fontSize = '0.8em';

  typeBtn.addEventListener('click', async () => {
    await this.applyType(type);
    this.close();
  });
}
```

### Using FolderMapper in Plugin
```typescript
// Source: main.ts lines 180-182
const folderMappings = templateRegistry.getFolderMappings();
this.folderMapper = await FolderMapper.createFromTemplate(folderMappings);
```

### Integrating CLI Validation Logic
```typescript
// Adapter pattern — wrap CLI validator for Obsidian
import { validateFile } from '../src/cli/validate/validator.js';

async validateActiveFile(file: TFile) {
  const vaultPath = (this.app.vault.adapter as any).basePath;
  const filePath = join(vaultPath, file.path);

  const result = await validateFile(filePath, vaultPath, { skipMissing: false });

  if (result.valid) {
    new Notice('✅ Valid frontmatter');
  } else {
    new ValidationResultModal(this.app, result).open();
  }
}
```

### Settings Tab
```typescript
// Source: main.ts lines 1534-1634 (HivemindSettingTab)
class HivemindSettingTab extends PluginSettingTab {
  plugin: HivemindPlugin;

  constructor(app: App, plugin: HivemindPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Hivemind Settings' });

    new Setting(containerEl)
      .setName('Auto-merge frontmatter')
      .setDesc('Merge missing fields when file has existing frontmatter')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoMerge)
        .onChange(async (value) => {
          this.plugin.settings.autoMerge = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Plugin uses `fs` module | Plugin uses Vault API (`app.vault.read/modify`) | Obsidian 0.9+ | Mobile support, cache invalidation, proper events |
| Custom modal HTML | Extend Modal class | Obsidian API 1.0 | Theme integration, mobile-friendly |
| String manipulation for frontmatter | gray-matter + Obsidian cache | gray-matter 4.0+ | Reliable parsing, preserves formatting |
| Separate plugins for each feature | Settings tab for configuration | Obsidian 1.0+ | One plugin, many features, user control |
| Auto-run on vault open | On-demand via command palette | Community feedback | Better performance, user control |

**Deprecated/outdated:**
- Direct DOM manipulation: Obsidian provides `createEl()` helpers (lines 703-824 in main.ts) — use these instead of `document.createElement()`
- Ribbon icons for every command: Clutters UI, use command palette instead (Phase 16 decision: no ribbon icons)
- Workspace.openLinkText: Deprecated in Obsidian 1.0, use `Workspace.getLeaf().openFile(file)` instead

## Open Questions

1. **Sidebar panel persistence**
   - What we know: Custom views can be registered with `registerView()`, opened with `setViewState()`
   - What's unclear: Should validation panel persist across Obsidian sessions, or be ephemeral?
   - Recommendation: Make it ephemeral (user opens via command, closes when done). Avoids state management complexity.

2. **Bulk operations progress feedback**
   - What we know: Notice class supports timeout parameter, can update text dynamically
   - What's unclear: Best UX for fixing 500 files — one Notice that updates, or modal with progress bar?
   - Recommendation: Use modal with progress (like existing CreateWorkflowModal pattern), allows cancel button, clearer feedback.

3. **Integration with existing plugin commands**
   - What we know: Plugin already has "Check and insert missing frontmatter" command (main.ts:234)
   - What's unclear: Should Phase 16 replace this, or coexist as separate commands?
   - Recommendation: Replace — Phase 16 commands are more capable (preview, type selection, validation). Deprecate old command with Notice redirecting to new one.

## Sources

### Primary (HIGH confidence)
- Obsidian Official Sample Plugin: https://github.com/obsidianmd/obsidian-sample-plugin — Build config, command patterns, modal examples
- Obsidian Developer Documentation: https://docs.obsidian.md/ — API reference, commands, modals, context menus
- Obsidian TypeScript API: https://github.com/obsidianmd/obsidian-api — Type definitions with TSDoc comments
- Existing main.ts: C:\Users\Preston\git\hivemind\obsidian-plugin\main.ts — Working patterns already in use (TypeSelectionModal, FolderMapper integration)
- CLI validation logic: C:\Users\Preston\git\hivemind\src\cli\validate\validator.ts — Backend logic to wrap
- CLI fix logic: C:\Users\Preston\git\hivemind\src\cli\fix\fixer.ts — Backend logic to wrap

### Secondary (MEDIUM confidence)
- Obsidian Plugin Best Practices (2026): https://phibr0.medium.com/how-to-create-your-own-obsidian-plugin-53f2d5d44046 — Command naming, TypeScript setup
- Workbench Plugin SuggestModal Example: https://github.com/ryanjamurphy/workbench-obsidian/blob/master/main.ts — SuggestModal patterns
- Panel Builder Plugin: https://github.com/ebullient/obsidian-panel-builder — Sidebar panel implementation
- Customizable Menu Plugin: https://github.com/kzhovn/obsidian-customizable-menu — Context menu integration patterns
- Obsidian Context Menus Documentation: https://docs.obsidian.md/Plugins/User+interface/Context+menus — Official context menu event handlers

### Tertiary (LOW confidence)
- Obsidian Forum discussions on commands and modals — Community patterns, not official guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Obsidian, TypeScript, esbuild are documented, already in use
- Architecture: HIGH - Patterns verified in existing main.ts (1636 lines, working plugin)
- Pitfalls: HIGH - Based on common issues in community plugins + existing codebase patterns

**Research date:** 2026-01-27
**Valid until:** 60 days (Obsidian API is stable, major versions announced well in advance)

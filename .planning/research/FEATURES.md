# Feature Landscape: CLI Setup Wizards and Frontmatter Management

**Domain:** Developer experience tools for MCP servers and markdown vaults
**Researched:** 2026-01-26
**Confidence:** HIGH (verified against existing patterns and official docs)

## Executive Summary

CLI setup wizards and frontmatter management tools follow well-established patterns in the JavaScript/TypeScript ecosystem. The key differentiator is not what features exist, but how gracefully they handle edge cases: existing configs, partial frontmatter, error recovery, and non-interactive environments. Hivemind already has foundational CLI commands (`init`, `fix`, `validate`); v3.0 should refine these patterns rather than reinvent them.

---

## Table Stakes

Features users expect from any CLI setup wizard or frontmatter tool. Missing these = product feels broken.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Interactive prompts with defaults** | Every npx init tool does this (create-react-app, vite, etc.) | Low | Node readline (existing) | Already implemented in `init()` |
| **Non-interactive mode via flags** | CI/CD pipelines, scripts need --yes or flag-based input | Low | CLI arg parsing | Add `--yes` flag with sensible defaults |
| **Detect existing config** | Don't overwrite user's work without confirmation | Low | fs.existsSync | Already implemented |
| **Validate config before use** | Clear errors > silent failures | Low | Zod schema (existing) | `validate` command exists |
| **Dry-run mode** | Show what would change before writing files | Medium | New flag + preview logic | Critical for `fix` command |
| **Progress feedback** | Users need to know something is happening | Low | Console output, spinners | Minimal implementation exists |
| **Clear error messages with recovery hints** | "X failed, try Y" not just stack traces | Medium | Error handling refactor | Partially exists |
| **Frontmatter detection** | Know if file has frontmatter block | Low | Regex/gray-matter | Already in gray-matter |
| **Frontmatter insertion** | Add YAML block to top of markdown | Low | String manipulation | Exists in `addFrontmatter()` |
| **Type inference from folder** | Characters/ folder = character type | Low | Path parsing | Exists in FolderMapper |
| **Bulk operation support** | Process multiple files, not just one | Medium | File iteration | Exists in `fix` command |
| **Skip already-valid files** | Don't re-process files that already have frontmatter | Low | Detection logic | Exists |
| **Ctrl+C graceful exit** | Interrupt doesn't corrupt files | Low | Signal handling | Node default handles this |
| **Obsidian command palette** | Ctrl+P access in Obsidian | Low | plugin.addCommand() | Exists for some commands |

### Complexity Legend
- **Low:** <50 lines of code, patterns well-understood
- **Medium:** 50-200 lines, some design decisions required
- **High:** >200 lines or requires research/experimentation

---

## Differentiators

Features that set Hivemind apart. Not expected, but valuable.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Preview diff before write** | Show exactly what changes, rsync-style | Medium | Diff generation | "Will add 47 frontmatter blocks to Characters/" |
| **Template-aware frontmatter** | Generate fields based on active template's entity type | Medium | Template registry | Not just generic frontmatter, template-specific fields |
| **Smart defaults from content** | Infer name from H1, tags from existing text | Medium | Content parsing | Reduces manual data entry |
| **Batch mode with CSV import** | Import metadata from spreadsheet | High | CSV parsing | For users with existing character sheets |
| **Undo/rollback support** | Backup files before modification | Medium | File backup logic | .hivemind/backups/ |
| **MCP client config auto-detection** | Detect Claude Desktop, Cursor, etc. and auto-configure | Medium | Platform detection | Exists in `setup-mcp` |
| **Claude Desktop snippet copy** | One-click copy config to clipboard | Low | Clipboard API | Quick onboarding |
| **Validation report export** | Save scan results to file for review | Low | File write | Useful for large vaults |
| **Folder mapping config** | User-defined folder-to-type mappings | Medium | Config schema extension | Beyond hardcoded defaults |
| **Obsidian modal for type selection** | GUI dropdown instead of numbered list | Medium | Obsidian Modal API | Better than CLI in editor context |
| **Real-time validation feedback** | Validate frontmatter as user types | High | Obsidian editor events | VS Code extension pattern |
| **Schema autocomplete** | Suggest valid values for enum fields | High | Language server | Major undertaking |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Auto-fix without confirmation** | Users lose trust when files change unexpectedly | Always preview, require explicit confirm |
| **Global config editing** | Modifying user's global configs (Claude Desktop) without explicit consent is invasive | Show config snippet, let user paste |
| **Silent failures** | Skipping files without telling user why | Log every skip with reason |
| **Wizard-only flow** | Forcing interactive prompts with no flag alternative breaks CI/CD | Always support non-interactive via flags |
| **Over-prompting** | 20 questions before first use | Max 5 high-signal prompts, smart defaults |
| **Template customization in wizard** | Config sprawl, decision fatigue | Ship opinionated defaults, allow config file override |
| **Frontmatter "migration"** | Overwriting existing frontmatter to "upgrade" schema | Merge, don't replace; preserve user data |
| **Implicit file writes** | Writing to disk during "validation" | Validation is read-only; separate fix command |
| **Platform-specific assumptions** | Assuming Windows paths or Mac paths | Use Node path module, test cross-platform |
| **Requiring Obsidian for CLI** | Making CLI depend on Obsidian running | CLI works standalone, plugin is additive |

---

## Feature Dependencies

```
Existing Features (v2.0)
    |
    +-- Template registry
    |       |
    |       +-- Entity type definitions
    |       +-- Field schemas per type
    |
    +-- Folder mapper
    |       |
    |       +-- Path-to-type inference
    |
    +-- CLI commands
    |       |
    |       +-- init (config wizard)
    |       +-- validate (config check)
    |       +-- fix (frontmatter insert)
    |       +-- setup-mcp (client config)
    |
    +-- Obsidian plugin
            |
            +-- check-missing-frontmatter command
            +-- Frontmatter templates by type

v3.0 Enhancements
    |
    +-- Dry-run mode (depends on: fix command)
    +-- Preview diff (depends on: dry-run)
    +-- Template-aware frontmatter (depends on: template registry)
    +-- Batch validation report (depends on: validate)
    +-- Non-interactive flags (depends on: init, fix)
    +-- Obsidian validate command (depends on: plugin)
    +-- Obsidian fix command (depends on: plugin)
```

---

## Expected Behavior Patterns

### CLI Setup Wizard (npx hivemind init)

**Expected flow based on industry standards:**

1. **Detection phase**
   - Check for existing config.json
   - If exists: prompt "Overwrite? (y/N)" or use --force flag
   - Detect if running in TTY (interactive) or pipe (non-interactive)

2. **Prompt phase** (interactive only)
   - Prompt for vault path (with sensible default: current directory)
   - Prompt for template selection (numbered list or fuzzy search)
   - Prompt for optional features (vector search, etc.)
   - Show summary before writing

3. **Write phase**
   - Write config.json with 2-space indentation
   - Display success message with next steps
   - Offer to continue to setup-mcp

4. **Non-interactive mode**
   ```bash
   npx hivemind init --vault ./my-vault --template worldbuilding --yes
   ```
   - All required params via flags
   - --yes skips confirmation
   - Fails with error if required param missing

**Sources:**
- [CLI Guidelines - clig.dev](https://clig.dev/)
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices)
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) for prompt patterns

### Vault Validation (npx hivemind validate)

**Expected behavior:**

1. **Config validation**
   - Check config.json exists and parses
   - Validate against Zod schema
   - Check vault path exists

2. **Vault scan**
   - Count markdown files
   - Identify files with valid frontmatter
   - Identify files with invalid frontmatter (parsing errors)
   - Identify files with missing frontmatter (no YAML block)
   - Identify files with unknown type

3. **Report output**
   ```
   Vault: C:\Users\vault
   Template: worldbuilding

   Files scanned: 247
   Valid: 198 (80%)
   Invalid frontmatter: 12 (5%)
   Missing frontmatter: 37 (15%)

   Invalid files:
     Characters/Alice.md - Line 3: Invalid YAML syntax
     Locations/Forest.md - Missing required field: type

   Missing frontmatter:
     Characters/Bob.md
     Characters/Carol.md
     ...

   Run "npx hivemind fix" to add missing frontmatter.
   ```

4. **Exit codes**
   - 0: All files valid
   - 1: Some files have issues (validation-only, not a crash)
   - 2: Config error (can't run validation)

**Sources:**
- [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) for report patterns
- [remark-lint-frontmatter-schema](https://github.com/JulianCataldo/remark-lint-frontmatter-schema) for frontmatter validation

### Frontmatter Fix (npx hivemind fix)

**Expected behavior:**

1. **Scan phase**
   - Read skipped-files.log or scan vault
   - Identify files needing frontmatter
   - Group by inferred type

2. **Preview phase (--dry-run)**
   ```
   Dry run mode - no files will be modified

   Would add frontmatter to 37 files:

   Characters/ (12 files)
     Alice.md -> type: character, id: character-alice
     Bob.md -> type: character, id: character-bob
     ...

   Locations/ (8 files)
     Forest.md -> type: location, id: location-forest
     ...

   Unknown folder (17 files)
     Notes/Ideas.md -> (would prompt for type)
     ...

   Run without --dry-run to apply changes.
   ```

3. **Interactive fix**
   - For each file (or batch):
     - Show inferred type
     - Confirm or select alternative
     - Show preview of frontmatter to add
     - Write on confirmation
   - Support "yes to all" for batch operations

4. **Non-interactive fix**
   ```bash
   npx hivemind fix --yes --default-type reference
   ```
   - Use inferred type where available
   - Use --default-type for unknown folders
   - Skip files that can't be auto-resolved (log them)

5. **Safety features**
   - Never modify existing frontmatter (only add to files without it)
   - Create backup before modification (optional, --backup flag)
   - Log all changes to .hivemind/fix.log

**Sources:**
- [obsidian-metadata](https://github.com/natelandau/obsidian-metadata) - batch frontmatter tool with dry-run
- [rsync --dry-run](https://www.digitalocean.com/community/tutorials/how-to-use-rsync-to-sync-local-and-remote-directories) pattern

### Obsidian Commands

**Expected command behaviors:**

| Command | Trigger | Behavior |
|---------|---------|----------|
| Add frontmatter | Ctrl+P "Hivemind: Add frontmatter" | Modal: select type, preview, insert |
| Fix frontmatter | Ctrl+P "Hivemind: Fix frontmatter" | Parse current file, show issues, offer fixes |
| Validate frontmatter | Ctrl+P "Hivemind: Validate frontmatter" | Check current file, show notice with result |
| Validate vault | Ctrl+P "Hivemind: Validate vault" | Full vault scan, show modal with report |

**UI patterns from Obsidian ecosystem:**
- Use Notice for quick feedback (valid/invalid)
- Use Modal for complex interactions (type selection, reports)
- Use SuggestModal for fuzzy search (template/type selection)
- Ribbon icon for quick access to common actions

**Sources:**
- [Metadata Menu plugin](https://mdelobelle.github.io/metadatamenu/) for frontmatter editing patterns
- [Frontmatter Generator plugin](https://www.obsidianstats.com/plugins/frontmatter-generator) for auto-generation patterns
- [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Vault) for command registration

---

## MVP Recommendation

For v3.0 MVP, prioritize:

### Must Have (Table Stakes)
1. **Dry-run for fix command** - Critical safety feature
2. **Non-interactive flags** - Enable CI/CD and scripting
3. **Validation report with exit codes** - Machine-readable output
4. **Obsidian validate command** - Ctrl+P access to validation

### Should Have (Differentiators)
5. **Preview diff** - Show exactly what will change
6. **Template-aware frontmatter** - Generate correct fields per type
7. **Obsidian add-frontmatter modal** - GUI type selection

### Defer to Post-MVP
- Batch CSV import
- Real-time validation
- Schema autocomplete
- Undo/rollback

---

## Existing Implementation Analysis

Hivemind v2.5.0 already has significant CLI infrastructure:

**CLI Commands (src/cli.ts):**
- `init` - Interactive setup wizard with 4 steps
- `validate` - Config and vault validation
- `fix` - Interactive frontmatter insertion from skipped-files.log
- `setup-mcp` - MCP client config generation
- `create-template` - Interactive template builder
- `validate-template` - Template file validation
- `add-template` - Add template from registry/URL/file
- `list-templates` - Show available templates
- `generate-catalog` - Export template catalog JSON
- `check-compatibility` - Verify template/Hivemind version compatibility

**Obsidian Plugin (obsidian-plugin/main.ts):**
- `check-missing-frontmatter` command exists
- Folder-to-type mappings (FOLDER_TYPE_MAPPINGS)
- Frontmatter templates per type (FRONTMATTER_TEMPLATES)
- `inferTypeFromPath()` function

**Gaps to Fill:**
1. No `--dry-run` flag for `fix` command
2. No `--yes` flag for non-interactive mode
3. No preview diff before write
4. `validate` doesn't scan vault for frontmatter issues (only config)
5. No Obsidian `validate-frontmatter` command (only `check-missing-frontmatter`)
6. No exit codes for scripting

---

## Sources

### CLI Patterns
- [Command Line Interface Guidelines](https://clig.dev/) - Comprehensive CLI UX guide
- [Node.js CLI Apps Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) - 1000+ stars, actively maintained
- [Inquirer.js](https://www.npmjs.com/package/@inquirer/prompts) - Standard Node.js prompt library
- [10 Design Principles for Delightful CLIs](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis) - Atlassian best practices
- [Top 8 CLI UX Patterns](https://medium.com/@kaushalsinh73/top-8-cli-ux-patterns-users-will-brag-about-4427adb548b7) - First-run wizards, dry-run, smart errors

### Frontmatter Tools
- [markdownlint / markdownlint-cli2](https://github.com/DavidAnson/markdownlint) - Markdown linting with frontmatter support
- [remark-lint-frontmatter-schema](https://github.com/JulianCataldo/remark-lint-frontmatter-schema) - YAML frontmatter JSON schema validation
- [obsidian-metadata](https://github.com/natelandau/obsidian-metadata) - Python CLI for batch Obsidian frontmatter updates
- [ObsidianFrontmatterEditor](https://github.com/SvenKleinhans/ObsidianFrontmatterEditor) - GUI frontmatter batch editing

### Obsidian Plugins
- [Metadata Menu](https://mdelobelle.github.io/metadatamenu/) - Context menu frontmatter editing
- [Frontmatter Generator](https://www.obsidianstats.com/plugins/frontmatter-generator) - Auto-generate frontmatter on save
- [Obsidian API Docs](https://docs.obsidian.md/Plugins/Vault) - Official plugin development

### UX Patterns
- [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) - NN/g research on wizard UX
- [CLI Tools That Support Dry Runs](https://nickjanetakis.com/blog/cli-tools-that-support-previews-dry-runs-or-non-destructive-actions) - Pattern examples

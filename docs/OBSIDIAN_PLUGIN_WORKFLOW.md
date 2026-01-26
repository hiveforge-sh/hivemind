# Obsidian Plugin Development & Release Workflow

This document explains how the Hivemind Obsidian plugin is developed, built, and automatically released.

## Table of Contents

- [Overview](#overview)
- [Plugin Architecture](#plugin-architecture)
- [Development Workflow](#development-workflow)
- [Build Process](#build-process)
- [Automated Release Workflow](#automated-release-workflow)
- [Version Synchronization](#version-synchronization)
- [Manual Testing](#manual-testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Hivemind Obsidian plugin provides in-vault integration with the MCP server, enabling:
- 🎨 **AI Image Generation** with worldbuilding context (via ComfyUI)
- 📝 **Frontmatter Templates** for characters, locations, events, etc.
- 🔍 **Quick Access** to MCP tools without leaving Obsidian
- ⚙️ **MCP Server Management** (start/stop from settings)

The plugin is **automatically released** alongside the main npm package using semantic-release and GitHub Actions.

---

## Plugin Architecture

### Directory Structure

```
obsidian-plugin/
├── main.ts              # Main plugin entry point
├── manifest.json        # Plugin metadata (version, name, etc.)
├── versions.json        # Version compatibility matrix
├── esbuild.config.mjs   # Build configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── workflow-templates/  # ComfyUI workflow definitions
    └── character-portrait.json
```

### Key Components

**`main.ts`** - Plugin implementation:
- `HivemindPlugin` class extends Obsidian's `Plugin`
- Manages MCP server lifecycle
- Provides commands and UI for image generation
- Handles frontmatter templates

**`manifest.json`** - Plugin metadata:
```json
{
  "id": "hivemind-mcp",
  "name": "Hivemind MCP",
  "version": "2.0.0",
  "minAppVersion": "1.4.0",
  "description": "Hivemind MCP integration...",
  "author": "HiveForge",
  "authorUrl": "https://github.com/hiveforge-sh/hivemind"
}
```

**`versions.json`** - Compatibility tracking:
```json
{
  "1.0.0": "1.4.0",
  "2.0.0": "1.4.0"
}
```

---

## Development Workflow

### Prerequisites

- Node.js 20+
- npm or pnpm
- Obsidian installed (for testing)

### Setup

```bash
# Navigate to plugin directory
cd obsidian-plugin

# Install dependencies
npm install

# Start development mode (watch + rebuild on changes)
npm run dev
```

### Development Mode

The `npm run dev` command:
1. Runs TypeScript compiler in watch mode
2. Uses esbuild to bundle `main.ts` → `main.js`
3. Generates inline source maps for debugging
4. Auto-rebuilds on file changes

### Testing During Development

1. **Create a test vault** in Obsidian (or use an existing one)

2. **Symlink the plugin** to your vault's plugins directory:

   ```bash
   # On Windows (PowerShell as Admin)
   New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\Documents\ObsidianVault\.obsidian\plugins\hivemind-mcp" -Target "C:\path\to\hivemind\obsidian-plugin"

   # On macOS/Linux
   ln -s /path/to/hivemind/obsidian-plugin ~/Documents/ObsidianVault/.obsidian/plugins/hivemind-mcp
   ```

3. **Enable the plugin** in Obsidian:
   - Settings → Community plugins → Enable "Hivemind MCP"

4. **Reload the plugin** after changes:
   - `Ctrl+P` → "Reload app without saving" (or restart Obsidian)

### Making Changes

1. Edit `main.ts` or other source files
2. esbuild automatically rebuilds `main.js`
3. Reload Obsidian to test changes
4. Check Obsidian's Developer Console (`Ctrl+Shift+I`) for errors

---

## Build Process

### Production Build

```bash
cd obsidian-plugin
npm run build
```

This command:
1. Runs TypeScript type checking (`tsc --noEmit`)
2. Bundles with esbuild in production mode:
   - No source maps
   - Tree shaking enabled
   - Minification enabled
   - Output: `main.js` (bundled plugin)

### Build Configuration

**`esbuild.config.mjs`**:
```javascript
const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", ...builtins],
  format: "cjs",
  target: "es2022",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});
```

**Key settings:**
- `bundle: true` - Bundles all dependencies into one file
- `external: ["obsidian", ...]` - Don't bundle Obsidian APIs
- `format: "cjs"` - CommonJS format (required by Obsidian)
- `target: "es2022"` - Modern JavaScript (Obsidian supports it)

---

## Automated Release Workflow

The plugin is **automatically released** when the main package releases via semantic-release.

### Release Flow

```
┌─────────────────────────────────────────────────────┐
│ 1. Push to master (conventional commit)            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. GitHub Actions: Release Workflow                │
│    - Run tests                                      │
│    - Run CodeQL analysis                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Semantic-release determines new version         │
│    Based on commit messages (feat/fix/etc.)        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Build Obsidian plugin                           │
│    cd obsidian-plugin && npm ci && npm run build   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 5. Sync plugin version                             │
│    node scripts/sync-plugin-version.cjs $VERSION   │
│    Updates: manifest.json, versions.json           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 6. Create GitHub Release                           │
│    Attaches: main.js, manifest.json                │
│    Tagged with version (e.g., v2.0.0)              │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 7. Publish to npm                                  │
│    npm publish @hiveforge/hivemind-mcp             │
└─────────────────────────────────────────────────────┘
```

### Workflow Configuration

**`.github/workflows/release.yml`**:
```yaml
- name: Release
  env:
    GITHUB_TOKEN: ${{ secrets.RELEASE_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: npx semantic-release
```

**`.releaserc.json`** - Semantic-release config:
```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    [
      "@semantic-release/exec",
      {
        "prepareCmd": "cd obsidian-plugin && npm ci && npm run build && cd .. && node scripts/sync-plugin-version.cjs ${nextRelease.version}"
      }
    ],
    [
      "@semantic-release/github",
      {
        "assets": [
          { "path": "obsidian-plugin/main.js" },
          { "path": "obsidian-plugin/manifest.json" }
        ]
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": [
          "package.json",
          "CHANGELOG.md",
          "obsidian-plugin/manifest.json",
          "obsidian-plugin/versions.json"
        ]
      }
    ]
  ]
}
```

---

## Version Synchronization

The plugin version is kept in sync with the main package version automatically.

### Sync Script

**`scripts/sync-plugin-version.cjs`**:
```javascript
const version = process.argv[2]; // e.g., "2.0.0"

// Update manifest.json
manifest.version = version;

// Update versions.json
versions[version] = manifest.minAppVersion;
```

### What Gets Updated

1. **`obsidian-plugin/manifest.json`**:
   ```json
   {
     "version": "2.0.0"  // ← Updated
   }
   ```

2. **`obsidian-plugin/versions.json`**:
   ```json
   {
     "1.0.0": "1.4.0",
     "2.0.0": "1.4.0"    // ← Added
   }
   ```

3. **Main `package.json`**:
   ```json
   {
     "version": "2.0.0"  // ← Updated
   }
   ```

These files are then committed back to the repository with a release commit.

---

## Manual Testing

### Test in Development Vault

1. **Create test notes** with frontmatter:
   ```markdown
   ---
   id: char-test
   type: character
   name: Test Character
   appearance:
     hair: brown
     eyes: blue
   ---
   # Test Character
   ```

2. **Test image generation**:
   - Open command palette (`Ctrl+P`)
   - Run "Generate character portrait"
   - Verify it connects to ComfyUI
   - Check generated image appears

3. **Test frontmatter insertion**:
   - Create new note
   - Run "Insert character template"
   - Verify template is inserted correctly

4. **Test MCP server integration**:
   - Enable "Auto-start MCP server" in settings
   - Restart Obsidian
   - Verify MCP server starts in background
   - Check server logs in settings panel

### Test Release Build

Before submitting a PR, test the production build:

```bash
cd obsidian-plugin
npm run build

# Check that main.js is generated
ls -lh main.js  # Should be ~50-100KB

# Copy to test vault
cp main.js ~/Documents/TestVault/.obsidian/plugins/hivemind-mcp/
cp manifest.json ~/Documents/TestVault/.obsidian/plugins/hivemind-mcp/

# Reload Obsidian and test
```

---

## Troubleshooting

### Plugin Doesn't Load

**Symptoms**: Plugin shows as installed but doesn't appear in command palette

**Solutions**:
1. Check Obsidian console for errors (`Ctrl+Shift+I`)
2. Verify `main.js` exists and is valid JavaScript
3. Check `manifest.json` has correct format
4. Try "Reload app without saving"
5. Disable and re-enable the plugin

### Build Errors

**Symptoms**: `npm run build` fails

**Solutions**:
1. Check TypeScript errors: `npm run build` (shows type errors)
2. Verify all imports are correct
3. Ensure `obsidian` is not bundled (check `external` in esbuild.config.mjs)
4. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Version Sync Issues

**Symptoms**: Plugin version doesn't match package version

**Solutions**:
1. Manually run sync script: `node scripts/sync-plugin-version.cjs 2.0.0`
2. Verify semantic-release config includes the `@semantic-release/exec` step
3. Check GitHub Actions logs for sync script errors

### MCP Server Won't Start

**Symptoms**: Plugin can't connect to MCP server

**Solutions**:
1. Verify MCP package is installed: `npm list -g @hiveforge/hivemind-mcp`
2. Check server path in settings (should be `npx @hiveforge/hivemind-mcp start`)
3. Manually start server in terminal to see error messages
4. Check vault path is configured correctly in MCP config

### ComfyUI Integration Issues

**Symptoms**: Image generation fails

**Solutions**:
1. Verify ComfyUI is running: `curl http://127.0.0.1:8188`
2. Check ComfyUI endpoint in plugin settings
3. Verify workflow template exists in `workflow-templates/`
4. Check console for API errors
5. Test workflow directly in ComfyUI first

---

## Contributing

When contributing to the plugin:

1. **Follow TypeScript best practices**
2. **Use conventional commits** for automatic versioning
3. **Test thoroughly** in a real Obsidian vault
4. **Update this documentation** if changing workflow
5. **Don't manually change version numbers** (handled by automation)

### Commit Message Examples

```bash
# New feature (triggers minor version bump)
git commit -m "feat: add support for location image generation"

# Bug fix (triggers patch version bump)
git commit -m "fix: resolve frontmatter template parsing error"

# Breaking change (triggers major version bump)
git commit -m "feat!: change MCP server protocol to v2

BREAKING CHANGE: Requires MCP server v2.0.0 or higher"

# Documentation (no version bump)
git commit -m "docs: update plugin installation instructions"
```

---

## Release Checklist

Before tagging a release (usually automatic):

- [ ] All tests pass
- [ ] Plugin builds successfully (`npm run build`)
- [ ] Manually tested in Obsidian vault
- [ ] Conventional commits used
- [ ] No manual version changes in manifest.json
- [ ] Release notes are clear and complete

The automated workflow handles everything else! 🚀

---

## Links

- **Main Repository**: https://github.com/hiveforge-sh/hivemind
- **npm Package**: https://www.npmjs.com/package/@hiveforge/hivemind-mcp
- **Obsidian Plugin**: Install from GitHub releases
- **Issues**: https://github.com/hiveforge-sh/hivemind/issues

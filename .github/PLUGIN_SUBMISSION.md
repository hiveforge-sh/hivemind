# Hivemind Community Plugin Submission Guide

This guide contains everything needed to submit Hivemind to the Obsidian community plugin directory.

## Section 1: Pre-Submission Checklist

- [ ] README.md has clear value proposition and screenshots
- [ ] manifest.json validates against Obsidian schema
- [ ] styles.css included in release assets
- [ ] License is MIT (compatible with community plugins)
- [ ] No GPL/AGPL dependencies in production bundle
- [ ] GitHub release exists with main.js, manifest.json, styles.css
- [ ] Release tag format matches manifest.json version

## Section 2: Prepared community-plugins.json Entry

```json
{
  "id": "hivemind-mcp",
  "name": "Hivemind",
  "author": "HiveForge",
  "description": "MCP server that gives AI tools structured context from your vault, with pluggable templates, HybridRAG search, and ComfyUI image generation.",
  "repo": "hiveforge-sh/hivemind"
}
```

**Note:** These values MUST exactly match obsidian-plugin/manifest.json

## Section 3: Submission Steps

### 1. Fork obsidian-releases repository

```
https://github.com/obsidianmd/obsidian-releases
```

### 2. Edit community-plugins.json

- Open `community-plugins.json` in your fork
- Add the JSON entry to the END of the array (before the closing `]`)
- Ensure proper JSON formatting (comma after previous entry)

### 3. Create Pull Request

- Title: `Add plugin: Hivemind`
- Description should include:
  - Brief description of what the plugin does
  - Link to repository
  - Confirmation that plugin follows guidelines

### 4. Wait for Automated Validation

- The obsidian-releases CI will run `validate-plugin-entry.yml`
- Fix any issues flagged by the bot

### 5. Respond to Review Feedback

- Obsidian team may request changes
- Address feedback promptly

## Section 4: Common Validation Failures

- **"ID contains reserved keyword"** → ID cannot contain "obsidian" or "plugin"
- **"Release missing required files"** → Ensure main.js, manifest.json, styles.css are individual assets
- **"Values don't match manifest.json"** → Entry must exactly match manifest.json values
- **"Entry not at end of array"** → Add to END of community-plugins.json, not alphabetically

## Section 5: After Approval

Once approved:
- Plugin appears in Obsidian community plugins within 24-48 hours
- Future releases are automatic (just create GitHub releases)
- No need to update community-plugins.json for version bumps

---

## JSON Entry Validation

The prepared entry above was generated from `obsidian-plugin/manifest.json`:

```json
{
  "id": "hivemind-mcp",
  "name": "Hivemind",
  "version": "3.3.1",
  "description": "MCP server that gives AI tools structured context from your vault, with pluggable templates, HybridRAG search, and ComfyUI image generation.",
  "author": "HiveForge",
  "repo": "hiveforge-sh/hivemind"
}
```

All values match exactly. The `version` field is not included in the community-plugins.json entry (it's read from releases).

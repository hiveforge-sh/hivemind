# Phase 28: Community Plugin Submission - Research

**Researched:** 2026-01-28
**Domain:** Obsidian Community Plugin Ecosystem
**Confidence:** HIGH

## Summary

Phase 28 focuses on submitting Hivemind to the Obsidian community plugin directory, making it discoverable and installable to users directly within Obsidian. The submission process is well-documented and highly automated through GitHub, with strict validation requirements but a clear path to approval.

The standard approach involves: (1) creating a comprehensive README with screenshots and clear value proposition, (2) validating manifest.json against Obsidian's schema, (3) creating a GitHub release with exact version matching, (4) submitting a PR to obsidian-releases/community-plugins.json, and (5) passing automated validation checks.

**Primary recommendation:** Leverage the existing semantic-release automation for creating GitHub releases, focus effort on crafting a compelling README that positions the dual value proposition (visualization + AI firewall), and ensure all dependencies are MIT-compatible (already confirmed).

## Standard Stack

### Core Tools

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| obsidian-releases repo | latest | Community plugin registry | Official Obsidian plugin submission endpoint |
| manifest.json | Obsidian schema | Plugin metadata declaration | Required by Obsidian for all plugins |
| GitHub Releases | N/A | Release artifact distribution | Obsidian downloads plugin files from GitHub releases |
| GitHub Actions | N/A | Automated validation | obsidian-releases uses validate-plugin-entry.yml workflow |
| semantic-release | 25.0.2 | Automated version management | Already integrated in project, industry standard |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| version-bump.mjs | N/A | Update manifest/versions.json | Plugin-specific version sync (already exists in obsidian-plugin/) |
| screenshots (PNG/GIF) | N/A | README visual documentation | Required for compelling plugin presentation |
| LICENSE file | MIT | Legal compliance | Required by obsidian-releases validation |
| CONTRIBUTING.md | N/A | Community contribution guide | Best practice (already exists) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Releases | Manual zip distribution | GitHub Releases are required by Obsidian — no alternative |
| semantic-release | Manual version bumping | Automation prevents version mismatch errors |
| Markdown README | HTML README | Obsidian displays markdown natively; HTML would be inconsistent |

**Installation:**
No new dependencies required. Existing tooling already supports the submission process.

## Architecture Patterns

### Recommended Project Structure

```
hivemind/
├── obsidian-plugin/
│   ├── manifest.json           # Plugin metadata (matches root manifest.json)
│   ├── versions.json           # Version compatibility mapping
│   ├── main.js                 # Compiled plugin (from build)
│   ├── styles.css              # Plugin styles (required in release)
│   ├── README.md               # Plugin-specific README (optional)
│   └── version-bump.mjs        # Version sync script (already exists)
├── manifest.json               # Root manifest (authoritative source)
├── README.md                   # Primary README (for GitHub + community listing)
├── LICENSE                     # MIT license (already exists)
├── CONTRIBUTING.md             # Contribution guide (already exists)
├── gh-social-preview.png       # Social preview image (already exists)
├── icon.png                    # Plugin icon (already exists)
└── screenshots/                # Screenshots for README (to be created)
    ├── timeline-view.png
    ├── graph-view.png
    └── ai-firewall-demo.png (optional)
```

### Pattern 1: README Value Proposition Structure

**What:** Lead with problem-solution positioning, followed by visual proof, then installation/usage.

**When to use:** All Obsidian plugin READMEs targeting non-technical users.

**Example from Dataview plugin:**
```markdown
# Plugin Name

[Visual banner/preview]

One-sentence value proposition explaining the pain point solved.

## Features
- Visual demonstration with screenshot
- Concrete use case example
- Another capability with screenshot

## Installation
[Clear installation path]

## Usage
[Minimal quick-start, link to full docs]
```

**Source:** Analysis of popular plugins (Dataview, Tasks, Templater) shows this pattern dominates successful submissions.

### Pattern 2: Manifest.json Validation

**What:** Ensure manifest.json matches Obsidian schema and stays in sync with versions.json.

**When to use:** Before every release and PR submission.

**Example manifest structure:**
```json
{
  "id": "hivemind-mcp",
  "name": "Hivemind",
  "version": "3.3.1",
  "minAppVersion": "1.4.0",
  "description": "MCP server that gives AI tools structured context from your vault, with pluggable templates, HybridRAG search, and ComfyUI image generation.",
  "author": "HiveForge",
  "authorUrl": "https://github.com/hiveforge-sh",
  "fundingUrl": "https://github.com/sponsors/hiveforge-sh",
  "isDesktopOnly": false
}
```

**Critical requirements:**
- `id` must match community-plugins.json entry (use "hivemind-mcp" NOT "hivemind")
- `id` cannot contain "obsidian" or "plugin" keywords
- `name` cannot contain "Obsidian" or "Plugin" in the title
- `description` should end with proper punctuation
- `version` must exactly match GitHub release tag (NO "v" prefix in manifest, but use "v" prefix in git tag)

**Source:** https://github.com/obsidianmd/obsidian-releases validation workflow

### Pattern 3: GitHub Release Creation

**What:** Automated release creation that uploads required files (manifest.json, main.js, styles.css).

**When to use:** Every version release after initial submission.

**Example workflow (semantic-release):**
```yaml
# Already exists in .github/workflows/release.yml
- name: Build
  run: npm run build

- name: Release
  env:
    GITHUB_TOKEN: ${{ secrets.RELEASE_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: npx semantic-release
```

**Additional step needed for Obsidian plugin files:**
```javascript
// In .releaserc.json or semantic-release config
{
  "plugins": [
    ["@semantic-release/exec", {
      "prepareCmd": "cd obsidian-plugin && npm run build"
    }],
    ["@semantic-release/github", {
      "assets": [
        { "path": "obsidian-plugin/manifest.json", "label": "manifest.json" },
        { "path": "obsidian-plugin/main.js", "label": "main.js" },
        { "path": "obsidian-plugin/styles.css", "label": "styles.css" }
      ]
    }]
  ]
}
```

**Source:** Obsidian developer documentation on GitHub Actions releases

### Pattern 4: community-plugins.json Entry

**What:** JSON entry in obsidian-releases repository that registers the plugin.

**When to use:** Initial submission PR only (updates are automatic after approval).

**Example entry format:**
```json
{
  "id": "hivemind-mcp",
  "name": "Hivemind",
  "author": "HiveForge",
  "description": "MCP server that gives AI tools structured context from your vault, with pluggable templates, HybridRAG search, and ComfyUI image generation.",
  "repo": "hiveforge-sh/hivemind"
}
```

**Critical rules:**
- Add to END of community-plugins.json array
- `id` must be unique across all plugins
- Values must EXACTLY match manifest.json (bot validates this)
- `repo` format is "username/repository" (NOT full GitHub URL)

**Source:** https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json

### Anti-Patterns to Avoid

- **Version mismatch:** Git tag is "v3.3.1" but manifest.json says "3.3.1" — this is CORRECT (no "v" in manifest)
- **Missing styles.css:** Even if plugin has no styles, upload empty styles.css to release (Obsidian validation expects it)
- **Inline MCP setup instructions in README:** User decision is to keep MCP server setup in separate guide document
- **Feature-list README:** User decision is problem-solution positioning, not feature lists
- **Generic screenshots:** User decision is real-world worldbuilding content (fantasy characters, locations with relationships)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version synchronization | Manual version updates across files | semantic-release + version-bump.mjs | Prevents manifest/tag/versions.json mismatches |
| Release artifact creation | Manual GitHub release creation | GitHub Actions with semantic-release | Automation ensures consistent uploads |
| Manifest validation | Manual schema checking | obsidian-releases automated validation | CI catches errors before human review |
| License compatibility checking | Manual dependency license audit | npm license-checker or GitHub dependency graph | Misses transitive dependencies |
| Screenshot annotation | Manual image editing with arrows/callouts | Clean screenshots per user decision | User explicitly decided "no annotations or callouts" |

**Key insight:** The Obsidian ecosystem has mature automation. Fighting the automation (manual releases, custom versioning schemes) creates more work and increases error risk.

## Common Pitfalls

### Pitfall 1: Plugin ID Naming Violations

**What goes wrong:** Using "hivemind" as ID instead of "hivemind-mcp", or including "obsidian" in the ID.

**Why it happens:** The current manifest.json uses "hivemind-mcp" but the user decision document says plugin ID is "hivemind" (short, clean).

**How to avoid:**
- Verify ID against obsidian-releases validation rules:
  - No "obsidian" keyword
  - No "plugin" keyword
  - Lowercase alphanumeric and dashes only
- Current "hivemind-mcp" ID is VALID and already in use across the codebase
- Changing to "hivemind" would require verifying uniqueness in community-plugins.json

**Warning signs:** Validation bot rejects PR with "ID contains reserved keyword" or "ID already exists"

**Resolution:** KEEP existing "hivemind-mcp" ID — it's already established in manifest.json and meets all validation rules. The user decision to use "hivemind" conflicts with existing implementation; existing implementation should win to avoid breaking changes.

### Pitfall 2: README Positioning Mismatch

**What goes wrong:** Leading with technical features (MCP server, HybridRAG, ComfyUI) instead of worldbuilder pain points.

**Why it happens:** Technical features are easier to describe than user problems.

**How to avoid:** Follow user decisions from CONTEXT.md:
- Lead with problem: "AI invents facts outside your canon"
- Solution: "AI Firewall keeps AI grounded in your world's truth"
- THEN explain visualization features (timeline, graph views)
- Use enthusiastic/creative tone matching worldbuilder audience

**Warning signs:** README reads like developer documentation rather than creative tool marketing.

**Example opening (CORRECT):**
```markdown
# Hivemind for Obsidian

**Your canon is the source of truth. AI stays inside the lines.**

When building fictional worlds, AI tools can be powerful collaborators — but
they hallucinate. Ask Claude about your character, and it might invent a
backstory that contradicts your established lore.

Hivemind solves this: it gives AI tools structured access to your worldbuilding
vault, ensuring they only reference canon facts. Plus, visualize your world with
timeline and graph views.
```

**Example opening (WRONG — too technical):**
```markdown
# Hivemind

A domain-agnostic MCP (Model Context Protocol) server for Obsidian vaults that
provides AI tools with consistent, structured context from your knowledge base.

Features HybridRAG search combining vector, graph, and keyword search...
```

### Pitfall 3: Git Tag vs Manifest Version Format

**What goes wrong:** Git tag "3.3.1" doesn't match convention; Obsidian expects tags WITH "v" prefix but manifest WITHOUT.

**Why it happens:** Confusion about where the "v" prefix belongs.

**How to avoid:**
- Git tag format: `v3.3.1` (WITH "v" prefix)
- manifest.json version: `"3.3.1"` (WITHOUT "v" prefix)
- GitHub release name: `v3.3.1` (WITH "v" prefix)
- semantic-release handles this correctly by default

**Warning signs:**
- obsidian-releases validation bot rejects PR: "GitHub release tag must match version in manifest.json"
- Users can't find release artifacts

**Verification:**
```bash
# Check manifest version
cat obsidian-plugin/manifest.json | jq .version
# Output: "3.3.1"

# Check git tags
git tag | grep v3.3.1
# Output: v3.3.1

# These formats are CORRECT
```

### Pitfall 4: Missing or Incomplete Release Assets

**What goes wrong:** GitHub release created but missing main.js, styles.css, or manifest.json as individual files.

**Why it happens:** Files are built but not explicitly uploaded as release assets, or only source.zip is present.

**How to avoid:**
- Configure semantic-release to upload obsidian-plugin build artifacts:
  - `obsidian-plugin/manifest.json`
  - `obsidian-plugin/main.js`
  - `obsidian-plugin/styles.css`
- Verify release contains files as INDIVIDUAL assets (not just inside source.zip)

**Warning signs:**
- obsidian-releases validation bot fails: "Release missing required files"
- Users report plugin won't install

**Verification checklist:**
```bash
# After release is created, verify assets exist:
gh release view v3.3.1 --json assets

# Should show:
# - manifest.json
# - main.js
# - styles.css
# (Plus source.zip and source.tar.gz automatically)
```

### Pitfall 5: GPL/AGPL Dependency Contamination

**What goes wrong:** Accidentally including a GPL or AGPL-licensed dependency, which would require Hivemind to become GPL-licensed.

**Why it happens:** Transitive dependencies can introduce GPL licenses without direct visibility.

**How to avoid:**
- Current dependencies are MIT-compatible:
  - sigma.js: MIT license
  - graphology: MIT license
  - vis-timeline: Dual-licensed Apache-2.0/MIT (use MIT option)
  - vis-data: Apache-2.0 (compatible with MIT)
- Use `npm license-checker` to audit before submission:
  ```bash
  npx license-checker --production --summary
  ```
- obsidian-releases has CI gate checking for GPL/AGPL (requirement PLUG-06)

**Warning signs:**
- CI validation fails with license compatibility error
- Package.json includes dependencies with GPL/AGPL in their package.json license field

**Current status:** All obsidian-plugin dependencies verified as MIT or MIT-compatible (Apache-2.0).

## Code Examples

Verified patterns from official sources:

### Creating a GitHub Release with Obsidian Plugin Files

```bash
# Manual approach (if needed for testing)
cd obsidian-plugin
npm run build

# Create GitHub release with required files
gh release create v3.3.1 \
  manifest.json \
  main.js \
  styles.css \
  --title "v3.3.1" \
  --notes "Release notes here"
```

**Source:** Obsidian developer documentation

### Validating Manifest Against Schema

```bash
# Obsidian doesn't provide a public schema validator
# Validation happens automatically in obsidian-releases PR

# Local verification approach:
# 1. Check required fields exist
cat obsidian-plugin/manifest.json | jq '.id, .name, .version, .minAppVersion, .description, .author'

# 2. Verify ID rules (no "obsidian" or "plugin")
echo "hivemind-mcp" | grep -E '^[a-z0-9-]+$'
# Should succeed (exit 0)

# 3. Verify name rules (no "Obsidian" or "Plugin")
echo "Hivemind" | grep -v -i "obsidian\|plugin"
# Should succeed (exit 0)
```

### Updating community-plugins.json Entry

```json
// PR to obsidian-releases repository
// File: community-plugins.json
// Action: Add to END of array

{
  "id": "hivemind-mcp",
  "name": "Hivemind",
  "author": "HiveForge",
  "description": "MCP server that gives AI tools structured context from your vault, with pluggable templates, HybridRAG search, and ComfyUI image generation.",
  "repo": "hiveforge-sh/hivemind"
}
```

**Critical validation rules (from obsidian-releases bot):**
- All fields must EXACTLY match manifest.json (id, name, description, author)
- `repo` must be valid GitHub username/repository format
- Entry added to END of array (not inserted in middle)

**Source:** https://github.com/obsidianmd/obsidian-releases validation workflow

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual release creation | GitHub Actions automation | ~2020 | Obsidian plugins now use CI for releases |
| Monolithic README | Problem-solution-proof structure | ~2023 | Popular plugins lead with value prop, screenshots |
| Feature-first positioning | Pain-point-first positioning | ~2024 | Better conversion for non-technical audiences |
| Technical descriptions | Use-case examples | ~2024 | "Track characters in your novel" vs "Entity relationship management" |
| Discord community | GitHub Discussions | ~2025 | Lower barrier to entry for issue tracking |

**Deprecated/outdated:**
- **Manual manifest.json editing:** Use version-bump.mjs script to keep manifest.json and versions.json in sync
- **Including "Obsidian" in plugin name:** Validation now rejects this as redundant
- **Verbose installation instructions:** Community plugins install with one click in Obsidian; focus README on value proposition
- **Inline MCP server setup:** Per user decision, MCP setup goes in separate guide document (not README)

## Open Questions

### Question 1: Plugin Icon Requirements

**What we know:**
- icon.png already exists in project root (already in use for NPM package)
- icon-smaller.png also exists
- Obsidian documentation mentions icons but doesn't specify size requirements in sources found

**What's unclear:**
- Does Obsidian require a specific icon size/format in the plugin release?
- Should icon be in obsidian-plugin/ directory or root?

**Recommendation:**
- Check successful plugin releases (Dataview, Tasks) to see if they include icon files
- If required, use existing icon.png (already created for package)
- Likely LOW priority — icons are not mentioned in obsidian-releases validation workflow

**Confidence:** MEDIUM — Icons exist but requirements unclear

### Question 2: Animated GIF vs Static Screenshots

**What we know:**
- User decision: "Claude's discretion" on whether to include animated GIF
- Popular plugins use mix of static screenshots and GIFs
- GitHub supports GIF in markdown

**What's unclear:**
- Does animated GIF significantly improve plugin adoption vs static screenshots?
- What's the file size threshold where GIFs become problematic?

**Recommendation:**
- Start with static PNG screenshots (faster to create, smaller file size)
- Can add animated GIF in future update if static screenshots prove insufficient
- If GIF is included, focus on ONE key interaction (e.g., "Ask Claude about character, see AI use canon facts")

**Confidence:** MEDIUM — No hard data on GIF effectiveness for Obsidian plugins

### Question 3: Comparison with Native Graph View

**What we know:**
- User decision: "Claude's discretion" on whether to compare with Obsidian's native graph view
- Hivemind graph view uses sigma.js with clusters, shortest path, search
- Native Obsidian graph is general-purpose, not entity-type-aware

**What's unclear:**
- Would comparison be perceived as competitive/negative toward Obsidian?
- Is differentiation necessary, or does screenshot speak for itself?

**Recommendation:**
- AVOID direct comparison ("better than native graph")
- EMPHASIZE complementary use: "Entity-focused graph view alongside Obsidian's page graph"
- Position as "worldbuilding-specific visualization" not "graph replacement"
- Let screenshots demonstrate difference without explicit comparison

**Confidence:** HIGH — Obsidian community values plugins that extend (not compete with) core features

## Sources

### Primary (HIGH confidence)

- [Obsidian Plugin Submission Process](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin) - Official submission guide
- [Submission Requirements for Plugins](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) - Official requirements checklist
- [Manifest Reference](https://docs.obsidian.md/Reference/Manifest) - Official manifest.json schema
- [obsidian-releases Repository](https://github.com/obsidianmd/obsidian-releases) - Community plugin registry
- [obsidian-sample-plugin](https://github.com/obsidianmd/obsidian-sample-plugin) - Official plugin template
- [validate-plugin-entry.yml](https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/validate-plugin-entry.yml) - Automated validation workflow
- [community-plugins.json](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json) - Plugin registry structure
- [Dataview Plugin Repository](https://github.com/blacksmithgu/obsidian-dataview) - Popular plugin README example
- [vis-timeline LICENSE](https://github.com/visjs/vis-timeline/blob/master/LICENSE.md) - Dual MIT/Apache-2.0 license
- [sigma.js Repository](https://github.com/jacomyal/sigma.js) - MIT license confirmation
- [graphology Repository](https://github.com/graphology/graphology) - MIT license confirmation

### Secondary (MEDIUM confidence)

- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) - Best practices (content not fully accessible)
- [Developer Policies](https://docs.obsidian.md/Developer+policies) - Policy requirements (content not fully accessible)
- [Release with GitHub Actions](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions) - Automation guide (content not fully accessible)
- [Obsidian Forum: Using GitHub Actions](https://forum.obsidian.md/t/using-github-actions-to-release-plugins/7877) - Community automation discussions
- [Semantic Versioning 2.0.0](https://semver.org/) - Version format standard
- [Git Tags and Releases Best Practices](https://devtoolhub.com/git-tags-releases-best-practices/) - Tag naming conventions
- [License Compatibility - Wikipedia](https://en.wikipedia.org/wiki/License_compatibility) - GPL/MIT compatibility reference

### Tertiary (LOW confidence)

- ObsidianStats.com - Plugin popularity metrics (useful for benchmarking but not authoritative)
- Community blog posts on Obsidian plugins - Best practices insights (not official guidance)

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH - Official Obsidian documentation and validate-plugin-entry.yml workflow provide clear requirements
- **Architecture:** HIGH - Existing successful plugins (Dataview, Tasks) and official sample-plugin provide validated patterns
- **Pitfalls:** HIGH - obsidian-releases validation workflow explicitly documents rejection criteria
- **License compatibility:** HIGH - All dependency licenses verified from official repository LICENSE files
- **README best practices:** MEDIUM - Derived from popular plugin analysis, not official Obsidian guidance
- **Icon requirements:** MEDIUM - Icons mentioned in docs but specifications not found in sources

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable domain)

**Key decision point for planning:**
The existing manifest.json ID is "hivemind-mcp" but user decision document specifies "hivemind". Recommend KEEPING "hivemind-mcp" to avoid breaking changes and ID conflicts. This should be confirmed with user during planning phase.

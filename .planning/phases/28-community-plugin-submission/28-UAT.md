---
status: partial
phase: 28-community-plugin-submission
source:
  - 28-01-SUMMARY.md
  - 28-02-SUMMARY.md
  - 28-03-SUMMARY.md
started: 2026-05-08
updated: 2026-05-08
---

## Current Test

[testing complete]

## Tests

### 1. README quality (worldbuilder positioning)
expected: |
  README.md leads with worldbuilder pain, uses "AI Firewall" framing,
  MCP setup is in a separate guide, reads cleanly.
result: pass

### 2. MCP_SETUP_GUIDE exists
expected: docs/MCP_SETUP_GUIDE.md exists with detailed AI client configuration.
result: pass
note: auto-verified — file exists.

### 3. Release config includes all Obsidian assets
expected: |
  .releaserc.json @semantic-release/github assets array includes
  main.js, manifest.json, styles.css as individual GitHub release assets.
result: pass
note: auto-verified — all three present in github plugin block.

### 4. manifest.json validates against Obsidian rules
expected: |
  obsidian-plugin/manifest.json has id, name, version, description, author;
  no "obsidian" or "plugin" reserved keywords in id/name.
result: pass
note: |
  auto-verified — id=hivemind-mcp, name=Hivemind, author=HiveForge,
  version=3.6.3, no reserved keywords.

### 5. PLUGIN_SUBMISSION.md complete
expected: |
  .github/PLUGIN_SUBMISSION.md contains the prepared community-plugins.json
  entry (matching manifest.json), submission steps, and validation failure list.
result: pass
note: auto-verified — file present, JSON entry matches manifest.

### 6. README screenshots render
expected: |
  README.md image references (docs/images/timeline-view.png and graph-view.png)
  resolve to real files so the README does not show broken images on GitHub.
result: issue
reported: |
  README references docs/images/timeline-view.png and docs/images/graph-view.png
  but the docs/images/ directory does not exist. README will show broken-image
  icons on GitHub until screenshots are captured and added.
severity: minor

### 7. PR submitted to obsidian-releases (PLUG-05)
expected: |
  A PR has been opened against obsidianmd/obsidian-releases adding the
  Hivemind entry to community-plugins.json.
result: pass
note: |
  user-confirmed during plan 28-03 execution. PR URL not yet recorded —
  28-03-SUMMARY.md carries pr_url_pending: true.

## Summary

total: 7
passed: 6
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "README image references resolve to real files"
  status: failed
  reason: "docs/images/ directory does not exist; README has broken image references for timeline-view.png and graph-view.png"
  severity: minor
  test: 6
  artifacts: [docs/images/timeline-view.png, docs/images/graph-view.png]
  missing: [actual screenshot captures from running plugin]

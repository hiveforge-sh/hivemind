# Migration Scripts

Automatically migrate existing Obsidian vaults to Hivemind format.

## Quick Start

```powershell
# 1. Preview changes (dry run - safe)
.\scripts\migrate-vault.ps1 -DryRun

# 2. Apply migration (creates backup first)
.\scripts\migrate-vault.ps1

# 3. Update config.json
# Point "vault.path" to your migrated vault

# 4. Start Hivemind
npm run build
node dist/index.js
```

## Features

- ✅ **94 files ready** in your DND vault
- ✅ Auto-maps folders → types (People→character, Places→location, etc.)
- ✅ Preserves existing frontmatter/tags
- ✅ Creates backup before modifying
- ✅ Safe dry-run mode

## See Full Documentation

Read `scripts/README.md` for complete details.

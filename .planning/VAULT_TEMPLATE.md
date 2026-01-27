# Vault Template with Conventions

## Overview

This document outlines the requirements and implementation plan for standardizing the Hivemind vault template with clear conventions for worldbuilding organization.

## Problem Statement

Users need a standardized vault template with clear conventions for organizing worldbuilding content. The current sample-vault has a basic structure and templates, but lacks:

- Comprehensive documentation on conventions
- Easy initialization for new users
- Best practices and examples
- CLI command for creating new vaults from template
- Clear field definitions and validation rules

## Goals

1. **Ease of Adoption**: Users can create a properly structured vault in minutes
2. **Clear Conventions**: Well-documented standards for organizing worldbuilding content
3. **Flexibility**: Conventions guide users without being overly prescriptive
4. **Validation**: Tools to help users catch mistakes early
5. **Examples**: Realistic sample content demonstrating best practices

## Proposed Implementation

### Phase 1: Documentation & Conventions

Create comprehensive documentation of vault conventions:

**VAULT_CONVENTIONS.md** should cover:
- **Folder Structure Rules**: Standard directories and their purposes
- **Frontmatter Field Definitions**: Required vs optional fields for each note type
- **Naming Conventions**: File naming and ID generation patterns
- **Wikilink Usage Patterns**: How to reference other entities
- **Status Workflow**: Draft → Pending → Canon progression
- **Canon Authority Levels**: High/Medium/Low and what they mean
- **Asset Organization**: How to store and track AI-generated assets
- **Best Practices**: Recommendations for each note type with examples

### Phase 2: Template Enhancement

Improve existing templates to be self-documenting:

**Template Improvements**:
- Add inline YAML comments explaining each field
- Include example values showing proper formatting
- Add validation hints and requirements
- Provide field usage guidance

**Additional Templates**:
- `.hivemind/config.json` with recommended settings
- `.gitignore` for vault repositories
- Starter `README.md` for new vaults
- `.obsidian/workspace.json` (optional) with recommended layout

### Phase 3: CLI Initialization

Add vault initialization command:

**`init-vault` Command Features**:
```bash
npx @hiveforge/hivemind-mcp init-vault [path]
```

- Copy complete template structure to target directory
- Interactive prompts for:
  - World name
  - Author information
  - Initial vault settings
- Create configured `config.json`
- Optional git repository initialization
- Support non-interactive mode with flags

**Implementation**:
- Add command to `src/cli.ts`
- Create template copying logic
- Add interactive prompts using inquirer or similar
- Update CLI help documentation
- Add unit tests

### Phase 4: Validation

Build vault validation tools:

**Validator Features**:
- Check folder structure exists and is correct
- Validate frontmatter schema for each note type
- Verify required fields are present
- Check wikilink targets exist
- Report warnings for best practice violations
- Output actionable error messages

**`validate-vault` Command**:
```bash
npx @hiveforge/hivemind-mcp validate-vault [path]
```

**Integration**:
- Run validation on MCP server startup (warnings only)
- Provide detailed validation reports on demand
- Allow users to skip validation if needed

### Phase 5: Examples & Polish

Expand sample vault with comprehensive examples:

**Sample Content**:
- **Characters**: Multiple characters with relationships, varying importance levels
- **Locations**: Hierarchy (continent → region → settlement → building)
- **Events**: Connected timeline showing cause and effect
- **Factions**: Organizations with members, goals, and conflicts
- **Lore**: Interconnected mythology and history entries
- **Assets**: AI-generated images with full generation metadata

**Additional Documentation**:
- Migration guide for existing vaults
- Video walkthrough (future consideration)
- Update main README with vault template section
- Create troubleshooting guide

## Technical Specifications

### Folder Structure

```
vault-root/
├── .hivemind/
│   └── config.json
├── .obsidian/
│   └── workspace.json (optional)
├── Characters/
├── Locations/
├── Events/
├── Factions/
├── Lore/
├── Assets/
│   ├── Images/
│   └── Workflows/
├── Templates/
│   ├── Character.md
│   ├── Location.md
│   ├── Event.md
│   ├── Faction.md
│   ├── Lore.md
│   └── Asset.md
└── README.md
```

### Frontmatter Schema

**Common Fields** (all note types):
```yaml
id: string (required, unique, pattern: {type}-{slug})
type: string (required, enum: character|location|event|faction|lore|asset)
status: string (required, enum: draft|pending|canon|non-canon|archived)
title: string (required)
world: string (optional)
importance: string (optional, enum: major|minor|background)
tags: string[] (optional)
aliases: string[] (optional)
created: date (required, YYYY-MM-DD)
updated: date (required, YYYY-MM-DD)
canon_authority: string (optional, enum: high|medium|low)
```

**Type-Specific Fields**: Defined per template

### Validation Rules

**Error Level** (must fix):
- Missing required fields
- Invalid enum values
- Malformed IDs
- Duplicate IDs

**Warning Level** (should fix):
- Missing recommended fields
- Broken wikilinks
- Inconsistent naming
- Best practice violations

**Info Level** (consider):
- Unused templates
- Orphaned notes
- Potential duplicates

## Success Criteria

- [ ] Users can run `npx @hiveforge/hivemind-mcp init-vault` to create a vault
- [ ] `VAULT_CONVENTIONS.md` documents all standards clearly
- [ ] All templates include inline documentation
- [ ] Validation command reports errors and warnings
- [ ] Sample vault demonstrates all features with realistic examples
- [ ] Main README includes vault template section
- [ ] Migration guide helps existing users adopt conventions

## Open Questions

1. **Versioning**: Should we version the vault template schema?
2. **Customization**: How much should users be able to customize folder structure?
3. **Obsidian Plugin Integration**: Should validation be available in-vault via plugin?
4. **Auto-migration**: Should we provide tools to auto-fix common issues?

## Out of Scope

- Visual vault browser/editor (Obsidian handles this)
- Cloud syncing (users handle with Obsidian Sync, Git, etc.)
- Content generation (MCP provides context, users create content)
- Template customization UI (users edit markdown files directly)

## Timeline Estimate

- **Phase 1**: 2-3 days (documentation)
- **Phase 2**: 1-2 days (template enhancement)
- **Phase 3**: 2-3 days (CLI command)
- **Phase 4**: 3-4 days (validation)
- **Phase 5**: 2-3 days (examples)

**Total**: ~2 weeks for complete implementation

## Dependencies

- None (independent feature)
- Should complete before community plugin submission
- Supports canon workflow implementation

## References

- Existing sample vault: `sample-vault/`
- Current templates: `sample-vault/Templates/`
- MCP server: `src/server.ts`
- CLI: `src/cli.ts`

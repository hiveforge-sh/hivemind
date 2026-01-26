# Community Templates

This directory contains community-contributed templates for Hivemind.

> **Full contribution guide**: See [CONTRIBUTING_TEMPLATES.md](../../../CONTRIBUTING_TEMPLATES.md) in the project root for detailed instructions, examples, and design guidelines.

## How to Contribute a Template

### 1. Create Your Template

Use the CLI wizard to create a new template:

```bash
npx @hiveforge/hivemind-mcp create-template
```

Follow the prompts to define:
- Template metadata (ID, name, description, version)
- Entity types (with custom fields)
- Relationship types (optional)

### 2. Validate Your Template

Before submitting, validate your template:

```bash
npx @hiveforge/hivemind-mcp validate-template template.json
```

### 3. Test Your Template

Create a test vault and verify your template works correctly:

1. Create a new directory for testing
2. Copy your `template.json` to the directory
3. Create a `config.json` that activates your template
4. Add some sample entities
5. Start the server and verify queries work

### 4. Submit a Pull Request

1. Fork the [hivemind repository](https://github.com/hiveforge-sh/hivemind)
2. Add your template to `src/templates/community/`
3. Update `src/templates/community/index.ts` to export your template
4. Add a sample vault in `samples/your-template-name/` (optional but recommended)
5. Submit a PR with a description of your template's use case

## Template Naming Conventions

- **Template ID**: lowercase with hyphens (e.g., `recipe-book`, `game-design`)
- **Entity type names**: lowercase with underscores (e.g., `character`, `quest_item`)
- **Field names**: camelCase (e.g., `firstName`, `hitPoints`)
- **Relationship IDs**: snake_case (e.g., `belongs_to`, `created_by`)

## Template Guidelines

1. **Be focused**: Templates should serve a specific domain or use case
2. **Be complete**: Include all entity types needed for the domain
3. **Be documented**: Add descriptions to entity types and fields
4. **Be consistent**: Follow naming conventions throughout
5. **Be tested**: Validate your template and test with sample data

## Quality Standards

Templates submitted for community review should:

- Pass validation (`validate-template` succeeds)
- Include at least 2 entity types
- Have meaningful descriptions
- Use appropriate field types (not everything should be a string)
- Define relationships where they make sense

## Questions?

- Open an issue on [GitHub](https://github.com/hiveforge-sh/hivemind/issues)
- Join the community discussion

# Contributing Templates to Hivemind

This guide explains how to create and contribute templates to the Hivemind project.

## What is a Template?

A template defines the entity types and relationships for a specific domain. Hivemind ships with built-in templates for worldbuilding, research, and people management. Community templates extend this to new domains like software architecture, UX research, and more.

## Quick Start

### Option 1: Use the CLI Wizard (Recommended)

```bash
npx @hiveforge/hivemind-mcp create-template
```

This interactive wizard will guide you through creating a valid template.

### Option 2: Create Manually

Create a `template.json` file with this structure:

```json
{
  "id": "my-template",
  "name": "My Template",
  "version": "1.0.0",
  "description": "A template for tracking X",
  "entityTypes": [
    {
      "name": "myentity",
      "displayName": "My Entity",
      "pluralName": "My Entities",
      "fields": [
        { "name": "title", "type": "string", "required": true },
        { "name": "priority", "type": "enum", "enumValues": ["low", "medium", "high"] }
      ]
    }
  ],
  "relationshipTypes": [
    {
      "id": "relates_to",
      "displayName": "Relates To",
      "sourceTypes": "any",
      "targetTypes": "any"
    }
  ]
}
```

Then validate it:

```bash
npx @hiveforge/hivemind-mcp validate-template template.json
```

## Template Requirements

### Template ID

- Lowercase letters, numbers, and hyphens only
- Must start with a letter
- Examples: `recipe-book`, `project-management`, `music-library`

### Version

- Must follow semantic versioning: `MAJOR.MINOR.PATCH`
- Start with `1.0.0` for new templates
- **When to bump versions:**
  - PATCH (1.0.0 → 1.0.1): Bug fixes, typo corrections, field description updates
  - MINOR (1.0.0 → 1.1.0): New optional fields, new entity types, new relationships
  - MAJOR (1.0.0 → 2.0.0): Breaking changes, removed fields, renamed entity types

### Minimum Hivemind Version

If your template uses features from a specific Hivemind version, specify `minHivemindVersion`:

```json
{
  "id": "my-template",
  "minHivemindVersion": "2.3.0"
}
```

Users can check compatibility with:

```bash
npx @hiveforge/hivemind-mcp check-compatibility my-template
```

### Entity Types

Each entity type must have:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Lowercase identifier (e.g., `recipe`, `project`) |
| `displayName` | Yes | Human-readable name (e.g., "Recipe", "Project") |
| `pluralName` | Yes | Plural form (e.g., "Recipes", "Projects") |
| `fields` | Yes | Array of field definitions |

### Fields

Each field must have:

| Property | Required | Description |
|----------|----------|-------------|
| `name` | Yes | camelCase identifier |
| `type` | Yes | One of: `string`, `number`, `boolean`, `enum`, `array`, `date`, `record` |
| `required` | No | Whether the field is required (default: false) |
| `enumValues` | If enum | Array of allowed values |
| `arrayItemType` | If array | Type of array items |
| `description` | No | Help text for users |

### Relationship Types

Relationships are optional but powerful. Each relationship type:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | snake_case identifier |
| `displayName` | Yes | Human-readable name |
| `sourceTypes` | Yes | Array of source entity types or `"any"` |
| `targetTypes` | Yes | Array of target entity types or `"any"` |
| `bidirectional` | No | If true, creates reverse relationship |
| `reverseId` | If bidirectional | ID for reverse relationship |

## Submitting Your Template

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/hivemind.git
cd hivemind
npm install
```

### 2. Create Your Template File

Create a new file in `src/templates/community/`:

```bash
# Example: src/templates/community/recipe-book.ts
```

```typescript
import type { TemplateDefinition } from '../types.js';

export const recipeBookTemplate: TemplateDefinition = {
  id: 'recipe-book',
  name: 'Recipe Book',
  version: '1.0.0',
  description: 'For organizing cooking recipes and meal planning',
  entityTypes: [
    {
      name: 'recipe',
      displayName: 'Recipe',
      pluralName: 'Recipes',
      fields: [
        { name: 'cuisine', type: 'enum', enumValues: ['italian', 'mexican', 'asian', 'american', 'french', 'other'] },
        { name: 'prepTime', type: 'number', description: 'Preparation time in minutes' },
        { name: 'cookTime', type: 'number', description: 'Cooking time in minutes' },
        { name: 'servings', type: 'number' },
        { name: 'difficulty', type: 'enum', enumValues: ['easy', 'medium', 'hard'] },
        { name: 'ingredients', type: 'array', arrayItemType: 'string', required: true },
        { name: 'dietary', type: 'array', arrayItemType: 'string', description: 'Dietary tags like vegetarian, gluten-free' },
      ],
    },
    {
      name: 'ingredient',
      displayName: 'Ingredient',
      pluralName: 'Ingredients',
      fields: [
        { name: 'category', type: 'enum', enumValues: ['produce', 'protein', 'dairy', 'grain', 'spice', 'other'] },
        { name: 'substitutes', type: 'array', arrayItemType: 'string' },
      ],
    },
  ],
  relationshipTypes: [
    {
      id: 'uses_ingredient',
      displayName: 'Uses Ingredient',
      sourceTypes: ['recipe'],
      targetTypes: ['ingredient'],
    },
    {
      id: 'variation_of',
      displayName: 'Variation Of',
      sourceTypes: ['recipe'],
      targetTypes: ['recipe'],
      bidirectional: true,
      reverseId: 'has_variation',
    },
  ],
};
```

### 3. Register Your Template

Update `src/templates/community/index.ts`:

```typescript
import { recipeBookTemplate } from './recipe-book.js';

export const communityTemplates: TemplateDefinition[] = [
  architectureTemplate,
  uxResearchTemplate,
  recipeBookTemplate,  // Add your template
];

export { architectureTemplate, uxResearchTemplate, recipeBookTemplate };
```

### 4. Add Tests

Create `tests/templates/community-templates.test.ts` or add to existing:

```typescript
describe('recipe-book template', () => {
  it('should have valid structure', () => {
    expect(recipeBookTemplate.id).toBe('recipe-book');
    expect(recipeBookTemplate.entityTypes).toHaveLength(2);
  });
});
```

### 5. Create Sample Vault (Optional but Recommended)

Create `samples/recipe-book/` with:

```
samples/recipe-book/
├── config.json
├── README.md
├── Recipes/
│   └── Spaghetti Carbonara.md
└── Ingredients/
    └── Guanciale.md
```

### 6. Submit Pull Request

1. Run tests: `npm test`
2. Run build: `npm run build`
3. Create a PR with:
   - Clear description of the template's purpose
   - Target audience
   - List of entity types and their use cases

## Template Design Guidelines

### 1. Keep It Focused

A template should serve a specific domain well. Don't try to cover everything.

**Good**: "UX Research" with interviews, insights, hypotheses, personas
**Bad**: "Everything" with dozens of generic entity types

### 2. Use Meaningful Relationships

Relationships should capture real domain semantics:

```typescript
// Good - captures domain meaning
{ id: 'supports', displayName: 'Supports', sourceTypes: ['insight'], targetTypes: ['hypothesis'] }

// Bad - too generic
{ id: 'relates', displayName: 'Relates', sourceTypes: 'any', targetTypes: 'any' }
```

### 3. Choose Appropriate Field Types

| Use Case | Recommended Type |
|----------|-----------------|
| Free text | `string` |
| Fixed options | `enum` |
| Yes/no flags | `boolean` |
| Quantities | `number` |
| Dates | `date` |
| Lists of strings | `array` with `arrayItemType: 'string'` |
| Structured data | `record` |

### 4. Make Required Fields Minimal

Only mark fields as `required` if the entity is meaningless without them. Users appreciate flexibility.

### 5. Document Your Template

Include a `description` in the template and consider adding descriptions to complex fields.

## Example Templates

See these templates for reference:

- **worldbuilding** (`src/templates/builtin/worldbuilding.ts`) - Fiction/games
- **research** (`src/templates/builtin/research.ts`) - Academic papers
- **software-architecture** (`src/templates/community/architecture.ts`) - ADRs/systems
- **ux-research** (`src/templates/community/ux-research.ts`) - User research

## Getting Help

- Open an issue with the `template` label
- Ask in discussions
- Review existing templates for patterns

## License

By contributing a template, you agree to license it under the same license as Hivemind (MIT).

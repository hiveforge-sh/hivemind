#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { homedir } from 'os';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
// FolderMapper and templateRegistry are now used internally by cli/fix modules
import { worldbuildingTemplate } from './templates/builtin/worldbuilding.js';
import { researchTemplate } from './templates/builtin/research.js';
import { peopleManagementTemplate } from './templates/builtin/people-management.js';
import { loadTemplateFile } from './templates/loader.js';
import { TemplateValidationError, TemplateDefinitionSchema } from './templates/validator.js';
import { communityTemplates, getCommunityTemplate, listCommunityTemplateIds } from './templates/community/index.js';
import type { TemplateDefinition, FieldConfig, EntityTypeConfig } from './templates/types.js';
import { checkTemplateCompatibility, getHivemindVersion } from './templates/version.js';
import { initCommand } from './cli/init/index.js';
import { outputMissingConfigError } from './cli/init/output.js';
import { validateCommand } from './cli/validate/index.js';
import { fixCommand } from './cli/fix/index.js';

/**
 * All available templates from registry (built-in + community)
 */
const AVAILABLE_TEMPLATES: Record<string, TemplateDefinition> = {
  // Built-in templates
  'worldbuilding': worldbuildingTemplate,
  'research': researchTemplate,
  'people-management': peopleManagementTemplate,
  // Community templates are added dynamically
};

// Add community templates to available templates
for (const template of communityTemplates) {
  AVAILABLE_TEMPLATES[template.id] = template;
}

async function start() {
  // Check if --vault flag is provided, skip config check in that case
  const hasVaultFlag = process.argv.includes('--vault');

  if (!hasVaultFlag) {
    const configPath = resolve(process.cwd(), 'config.json');
    if (!existsSync(configPath)) {
      outputMissingConfigError();
      process.exit(1);
    }
  }

  console.warn('🚀 Starting Hivemind MCP Server...\n');

  // Import and start the server (index.js handles --vault flag parsing)
  const { startServer } = await import('./index.js');
  await startServer();
}

// Note: The fix command has been moved to src/cli/fix/index.ts
// It now uses the validation-based approach instead of skipped-files.log

/**
 * Get vault path from config or args
 */
function getVaultPath(): string | null {
  // Check for --vault flag in args
  const vaultIndex = process.argv.indexOf('--vault');
  if (vaultIndex !== -1 && process.argv[vaultIndex + 1]) {
    return resolve(process.argv[vaultIndex + 1]);
  }

  // Check for config.json
  const configPath = resolve(process.cwd(), 'config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.vault?.path) {
        return resolve(config.vault.path);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.error('❌ config.json contains invalid JSON:');
        console.error(`   ${err.message}`);
        console.error('\n   Run: npx @hiveforge/hivemind-mcp validate');
        process.exit(1);
      }
      // Re-throw unexpected errors
      throw err;
    }
  }

  // Fall back to current directory
  return process.cwd();
}

/**
 * Get the MCP config file path for different clients
 */
function getMcpConfigPath(client: string): string {
  const platform = process.platform;

  switch (client) {
    case '1': // Claude Desktop
      if (platform === 'win32') {
        return join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
      } else if (platform === 'darwin') {
        return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      } else {
        return join(homedir(), '.config', 'claude', 'claude_desktop_config.json');
      }
    case '2': // GitHub Copilot
      return join(homedir(), '.copilot', 'mcp-config.json');
    default:
      return '(varies by client)';
  }
}

/**
 * Generate MCP config for different clients
 */
function generateMcpConfig(client: string, vaultPath?: string): object {
  const baseConfig = {
    command: 'npx',
    args: vaultPath
      ? ['-y', '@hiveforge/hivemind-mcp', '--vault', vaultPath]
      : ['-y', '@hiveforge/hivemind-mcp', 'start'],
  };

  if (client === '2') {
    // GitHub Copilot format
    return {
      mcpServers: {
        hivemind: {
          type: 'local',
          ...baseConfig,
          tools: ['*'],
        },
      },
    };
  }

  // Claude Desktop and generic format
  return {
    mcpServers: {
      hivemind: baseConfig,
    },
  };
}

/**
 * Write MCP config to file, merging with existing config
 */
function writeMcpConfig(configPath: string, newConfig: { mcpServers: { hivemind: object } }): void {
  let existingConfig: { mcpServers?: Record<string, unknown> } = { mcpServers: {} };

  if (existsSync(configPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      // Start fresh if existing config is invalid
    }
  }

  // Merge hivemind into existing config
  existingConfig.mcpServers = existingConfig.mcpServers || {};
  existingConfig.mcpServers.hivemind = newConfig.mcpServers.hivemind;

  // Ensure directory exists
  const dir = dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(existingConfig, null, 2));
}

/**
 * Setup MCP client configuration
 */
async function setupMcp() {
  const rl = readline.createInterface({ input, output });

  console.warn('\nHivemind MCP Client Setup');
  console.warn('=========================\n');

  try {
    // 1. Select MCP client
    console.warn('Which MCP client are you using?');
    console.warn('  1. Claude Desktop');
    console.warn('  2. GitHub Copilot');
    console.warn('  3. Other (show generic config)');

    const clientChoice = await rl.question('\nEnter choice (1-3): ');

    // 2. Get vault path
    const currentVault = getVaultPath();
    console.warn(`\nCurrent configured vault: ${currentVault || '(none)'}`);
    const vaultInput = await rl.question('Vault path (press Enter to use current, or enter new path): ');
    const resolvedVault = vaultInput.trim()
      ? resolve(vaultInput.trim())
      : currentVault || undefined;

    // 3. Generate config based on client
    const config = generateMcpConfig(clientChoice, resolvedVault);

    // 4. Show config file location
    const configPath = getMcpConfigPath(clientChoice);

    console.warn(`\n📁 Config file location:`);
    console.warn(`   ${configPath}\n`);

    console.warn('📋 Add this to your MCP config:\n');
    console.warn(JSON.stringify(config, null, 2));

    // 5. Offer to write config (only for known clients)
    if (clientChoice === '1' || clientChoice === '2') {
      const writeChoice = await rl.question('\nWrite to config file? (y/N): ');
      if (writeChoice.toLowerCase() === 'y') {
        writeMcpConfig(configPath, config as { mcpServers: { hivemind: object } });
        console.warn(`\n✅ Config written to ${configPath}`);
        console.warn('   Restart your MCP client to apply changes.');
      }
    }

    console.warn('\n📝 Next steps:');
    console.warn('  1. If you didn\'t write the config, copy the JSON above to your MCP client config');
    console.warn('  2. Restart your MCP client (Claude Desktop, VS Code, etc.)');
    console.warn('  3. Start using Hivemind tools in your AI conversations\n');

  } finally {
    rl.close();
  }
}

/**
 * Validate a template file
 */
async function validateTemplate() {
  const filePath = process.argv[3] || './template.json';

  console.warn(`🔍 Validating template file: ${filePath}\n`);

  if (!existsSync(filePath)) {
    console.error(`❌ Template file not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const template = loadTemplateFile(filePath);
    console.warn('✓ Template is valid!\n');
    console.warn(`ID: ${template.id}`);
    console.warn(`Name: ${template.name}`);
    console.warn(`Version: ${template.version}`);
    if (template.description) {
      console.warn(`Description: ${template.description}`);
    }

    console.warn(`\nEntity Types (${template.entityTypes.length}):`);
    for (const et of template.entityTypes) {
      const requiredFields = et.fields.filter(f => f.required).length;
      console.warn(`  - ${et.name} (${et.fields.length} fields, ${requiredFields} required)`);
    }

    if (template.relationshipTypes?.length) {
      console.warn(`\nRelationship Types (${template.relationshipTypes.length}):`);
      for (const rt of template.relationshipTypes) {
        const sourceStr = Array.isArray(rt.sourceTypes) ? rt.sourceTypes.join(', ') : rt.sourceTypes;
        const targetStr = Array.isArray(rt.targetTypes) ? rt.targetTypes.join(', ') : rt.targetTypes;
        console.warn(`  - ${rt.id}: ${sourceStr} → ${targetStr}${rt.bidirectional ? ' (bidirectional)' : ''}`);
      }
    }

    console.warn('\n✅ Template validation complete!');
  } catch (err) {
    if (err instanceof TemplateValidationError) {
      console.error(err.toUserMessage());
    } else {
      console.error(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    process.exit(1);
  }
}

/**
 * Interactive template creation wizard
 */
async function createTemplate() {
  console.warn('🧠 Hivemind Template Creator\n');
  console.warn('='.repeat(40) + '\n');

  const rl = readline.createInterface({ input, output });

  try {
    // 1. Template metadata
    const id = await promptRequired(rl, 'Template ID (lowercase with hyphens)');
    if (!/^[a-z][a-z0-9-]*$/.test(id)) {
      console.error('❌ Template ID must be lowercase alphanumeric with hyphens');
      rl.close();
      process.exit(1);
    }

    const name = await promptRequired(rl, 'Template name');
    const description = await rl.question('Description (optional): ');
    const version = (await rl.question('Version (default 1.0.0): ')).trim() || '1.0.0';

    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      console.error('❌ Version must follow semantic versioning (e.g., 1.0.0)');
      rl.close();
      process.exit(1);
    }

    // 2. Entity types
    console.warn('\n=== Entity Types ===\n');

    const entityTypes: EntityTypeConfig[] = [];

    while (true) {
      const entityName = (await rl.question("Entity name (lowercase, or 'done'): ")).trim().toLowerCase();
      if (entityName === 'done' || entityName === '') {
        if (entityTypes.length === 0) {
          console.warn('⚠️  Template must have at least one entity type.');
          continue;
        }
        break;
      }

      if (!/^[a-z][a-z0-9_]*$/.test(entityName)) {
        console.warn('❌ Entity name must be lowercase alphanumeric with underscores');
        continue;
      }

      const displayName = await promptRequired(rl, 'Display name');
      const pluralName = await promptRequired(rl, 'Plural name');

      // Fields
      const fields: FieldConfig[] = [];
      console.warn('');

      while (true) {
        const fieldName = (await rl.question("  Field name (or 'done'): ")).trim();
        if (fieldName === 'done' || fieldName === '') {
          break;
        }

        if (!/^[a-z][a-zA-Z0-9_]*$/.test(fieldName)) {
          console.warn('  ❌ Field name must be camelCase or snake_case');
          continue;
        }

        const fieldTypeInput = (await rl.question('  Field type [string/number/boolean/enum/array/date/record]: ')).trim().toLowerCase();
        const validTypes = ['string', 'number', 'boolean', 'enum', 'array', 'date', 'record'];
        if (!validTypes.includes(fieldTypeInput)) {
          console.warn('  ❌ Invalid field type');
          continue;
        }

        const field: FieldConfig = {
          name: fieldName,
          type: fieldTypeInput as FieldConfig['type'],
        };

        // Handle enum values
        if (fieldTypeInput === 'enum') {
          const enumValuesStr = await promptRequired(rl, '  Enum values (comma-separated)');
          field.enumValues = enumValuesStr.split(',').map(v => v.trim()).filter(v => v);
          if (field.enumValues.length === 0) {
            console.warn('  ❌ Enum must have at least one value');
            continue;
          }
        }

        // Handle array item type
        if (fieldTypeInput === 'array') {
          const itemTypeInput = (await rl.question('  Array item type [string/number/boolean]: ')).trim().toLowerCase();
          const validItemTypes = ['string', 'number', 'boolean'];
          if (validItemTypes.includes(itemTypeInput)) {
            field.arrayItemType = itemTypeInput as FieldConfig['type'];
          } else {
            field.arrayItemType = 'string';
          }
        }

        // Required?
        const requiredInput = (await rl.question('  Required? (y/n): ')).trim().toLowerCase();
        if (requiredInput === 'y' || requiredInput === 'yes') {
          field.required = true;
        }

        fields.push(field);
        console.warn(`  ✓ Added field: ${fieldName}\n`);
      }

      entityTypes.push({
        name: entityName,
        displayName,
        pluralName,
        fields,
      });

      console.warn(`✓ Added entity type: ${entityName}\n`);
    }

    // 3. Relationship types (optional)
    console.warn('\n=== Relationship Types (optional) ===\n');
    const addRelationships = (await rl.question('Add relationship types? (y/n): ')).trim().toLowerCase();

    const relationshipTypes: TemplateDefinition['relationshipTypes'] = [];

    if (addRelationships === 'y' || addRelationships === 'yes') {
      while (true) {
        const relId = (await rl.question("\nRelationship ID (snake_case, or 'done'): ")).trim().toLowerCase();
        if (relId === 'done' || relId === '') {
          break;
        }

        if (!/^[a-z][a-z0-9_]*$/.test(relId)) {
          console.warn('❌ Relationship ID must be snake_case');
          continue;
        }

        const relDisplayName = await promptRequired(rl, 'Display name');

        const sourceTypesInput = (await rl.question(`Source types (comma-separated, or 'any'): `)).trim();
        const sourceTypes: string[] | 'any' = sourceTypesInput.toLowerCase() === 'any'
          ? 'any'
          : sourceTypesInput.split(',').map(t => t.trim()).filter(t => t);

        const targetTypesInput = (await rl.question(`Target types (comma-separated, or 'any'): `)).trim();
        const targetTypes: string[] | 'any' = targetTypesInput.toLowerCase() === 'any'
          ? 'any'
          : targetTypesInput.split(',').map(t => t.trim()).filter(t => t);

        const bidirectionalInput = (await rl.question('Bidirectional? (y/n): ')).trim().toLowerCase();
        const bidirectional = bidirectionalInput === 'y' || bidirectionalInput === 'yes';

        let reverseId: string | undefined;
        if (bidirectional) {
          reverseId = await promptRequired(rl, 'Reverse ID (e.g., for "parent_of" the reverse is "child_of")');
        }

        relationshipTypes!.push({
          id: relId,
          displayName: relDisplayName,
          sourceTypes,
          targetTypes,
          bidirectional,
          reverseId,
        });

        console.warn(`✓ Added relationship type: ${relId}`);
      }
    }

    // 4. Build and validate template
    const template: TemplateDefinition = {
      id,
      name,
      version,
      entityTypes,
    };

    if (description) {
      template.description = description;
    }

    if (relationshipTypes && relationshipTypes.length > 0) {
      template.relationshipTypes = relationshipTypes;
    }

    // Validate before writing
    try {
      const { TemplateDefinitionSchema } = await import('./templates/validator.js');
      TemplateDefinitionSchema.parse(template);
    } catch (err) {
      console.error('\n❌ Template validation failed:');
      if (err instanceof TemplateValidationError) {
        console.error(err.toUserMessage());
      } else {
        console.error(err instanceof Error ? err.message : String(err));
      }
      rl.close();
      process.exit(1);
    }

    // Write template file
    const outputPath = resolve(process.cwd(), 'template.json');
    writeFileSync(outputPath, JSON.stringify(template, null, 2));

    console.warn('\n' + '='.repeat(40));
    console.warn(`\n✓ Template created: ${outputPath}\n`);
    console.warn('Next steps:');
    console.warn('  1. Review and edit template.json as needed');
    console.warn('  2. Validate: npx @hiveforge/hivemind-mcp validate-template');
    console.warn('  3. Add to config.json or use standalone template.json');
    console.warn('  4. Consider contributing: https://github.com/hiveforge-sh/hivemind/blob/master/CONTRIBUTING.md');
    console.warn('');

    rl.close();
  } catch (error) {
    console.error('Error during template creation:', error);
    rl.close();
    process.exit(1);
  }
}

/**
 * Helper: prompt for required input
 */
async function promptRequired(rl: readline.Interface, prompt: string): Promise<string> {
  while (true) {
    const value = (await rl.question(`${prompt}: `)).trim();
    if (value) return value;
    console.warn('  ⚠️  This field is required.');
  }
}

/**
 * Add a template from registry or URL
 */
async function addTemplate() {
  const templateArg = process.argv[3];

  console.warn('🧠 Hivemind - Add Template\n');

  // Show available templates if no argument
  if (!templateArg) {
    console.warn('Available templates:\n');
    console.warn('Built-in:');
    console.warn('  - worldbuilding     Characters, locations, events, factions, lore');
    console.warn('  - research          Papers, citations, concepts, notes');
    console.warn('  - people-management People, goals, teams, 1:1 meetings');
    console.warn('\nCommunity:');
    const communityIds = listCommunityTemplateIds();
    if (communityIds.length === 0) {
      console.warn('  (no community templates available)');
    } else {
      for (const id of communityIds) {
        const template = getCommunityTemplate(id);
        console.warn(`  - ${id.padEnd(20)} ${template?.description || template?.name || ''}`);
      }
    }
    console.warn('\nUsage:');
    console.warn('  npx @hiveforge/hivemind-mcp add-template <name>       - Add from registry');
    console.warn('  npx @hiveforge/hivemind-mcp add-template <url>        - Add from URL');
    console.warn('  npx @hiveforge/hivemind-mcp add-template <file.json>  - Add from local file');
    return;
  }

  let template: TemplateDefinition;

  // Check if it's a URL
  if (templateArg.startsWith('http://') || templateArg.startsWith('https://')) {
    console.warn(`📥 Fetching template from: ${templateArg}\n`);
    try {
      const response = await fetch(templateArg);
      if (!response.ok) {
        console.error(`❌ Failed to fetch template: ${response.status} ${response.statusText}`);
        process.exit(1);
      }
      const templateData = await response.json();
      const result = TemplateDefinitionSchema.safeParse(templateData);
      if (!result.success) {
        throw new TemplateValidationError('Invalid template from URL', result.error.issues);
      }
      template = result.data;
    } catch (err) {
      if (err instanceof TemplateValidationError) {
        console.error(err.toUserMessage());
      } else {
        console.error(`❌ Error fetching template: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exit(1);
    }
  }
  // Check if it's a local file
  else if (templateArg.endsWith('.json') || existsSync(templateArg)) {
    console.warn(`📂 Loading template from: ${templateArg}\n`);
    try {
      template = loadTemplateFile(templateArg);
    } catch (err) {
      if (err instanceof TemplateValidationError) {
        console.error(err.toUserMessage());
      } else {
        console.error(`❌ Error loading template: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exit(1);
    }
  }
  // Otherwise, look up in registry
  else {
    const registeredTemplate = AVAILABLE_TEMPLATES[templateArg];
    if (!registeredTemplate) {
      console.error(`❌ Template not found: ${templateArg}`);
      console.warn('\nAvailable templates:');
      for (const id of Object.keys(AVAILABLE_TEMPLATES)) {
        console.warn(`  - ${id}`);
      }
      process.exit(1);
    }
    template = registeredTemplate;
    console.warn(`📦 Using template from registry: ${templateArg}\n`);
  }

  // Show template info
  console.warn(`Template: ${template.name}`);
  console.warn(`ID: ${template.id}`);
  console.warn(`Version: ${template.version}`);
  if (template.description) {
    console.warn(`Description: ${template.description}`);
  }
  console.warn(`\nEntity Types (${template.entityTypes.length}):`);
  for (const et of template.entityTypes) {
    console.warn(`  - ${et.displayName} (${et.name})`);
  }
  if (template.relationshipTypes?.length) {
    console.warn(`\nRelationship Types (${template.relationshipTypes.length}):`);
    for (const rt of template.relationshipTypes) {
      console.warn(`  - ${rt.displayName} (${rt.id})`);
    }
  }

  // Ask how to save
  const rl = readline.createInterface({ input, output });

  try {
    console.warn('\nHow do you want to add this template?\n');
    console.warn('  1. Save as standalone template.json (recommended for custom templates)');
    console.warn('  2. Add to config.json (inline definition)');
    console.warn('  3. Just set as active template (for built-in/community templates)\n');

    const choice = await rl.question('Enter choice (1/2/3): ');

    switch (choice.trim()) {
      case '1': {
        // Save as standalone template.json
        const outputPath = resolve(process.cwd(), 'template.json');
        if (existsSync(outputPath)) {
          const overwrite = await rl.question('template.json already exists. Overwrite? (y/N): ');
          if (overwrite.toLowerCase() !== 'y') {
            console.warn('Cancelled.');
            rl.close();
            return;
          }
        }
        writeFileSync(outputPath, JSON.stringify(template, null, 2));
        console.warn(`\n✅ Template saved to: ${outputPath}`);
        console.warn('\nThe template will be automatically loaded when Hivemind starts.');
        break;
      }

      case '2': {
        // Add to config.json
        const configPath = resolve(process.cwd(), 'config.json');
        let config: { vault?: { path?: string }; template?: { activeTemplate?: string; templates?: TemplateDefinition[] } } = {};

        if (existsSync(configPath)) {
          try {
            config = JSON.parse(readFileSync(configPath, 'utf-8')) as typeof config;
          } catch {
            // Start fresh if config is invalid
          }
        }

        // Ensure template section exists
        if (!config.template) {
          config.template = { activeTemplate: template.id, templates: [] };
        }
        if (!config.template.templates) {
          config.template.templates = [];
        }

        // Check if template already exists
        const existingIndex = config.template.templates.findIndex(
          (t: TemplateDefinition) => t.id === template.id
        );

        if (existingIndex >= 0) {
          const overwrite = await rl.question(
            `Template "${template.id}" already exists in config. Overwrite? (y/N): `
          );
          if (overwrite.toLowerCase() !== 'y') {
            console.warn('Cancelled.');
            rl.close();
            return;
          }
          config.template.templates[existingIndex] = template;
        } else {
          config.template.templates.push(template);
        }

        // Set as active template
        config.template.activeTemplate = template.id;

        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.warn(`\n✅ Template added to: ${configPath}`);
        console.warn(`   Active template set to: ${template.id}`);
        break;
      }

      case '3': {
        // Just update activeTemplate in config.json
        const configPath = resolve(process.cwd(), 'config.json');
        let config: { vault?: { path?: string }; template?: { activeTemplate?: string } } = {};

        if (existsSync(configPath)) {
          try {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
          } catch {
            // Start fresh if config is invalid
          }
        }

        // Ensure template section exists
        if (!config.template) {
          config.template = { activeTemplate: template.id };
        } else {
          config.template.activeTemplate = template.id;
        }

        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.warn(`\n✅ Active template set to: ${template.id}`);
        console.warn(`   Updated: ${configPath}`);
        break;
      }

      default:
        console.warn('Cancelled.');
    }

    console.warn('\nNext steps:');
    console.warn('  1. Start Hivemind: npx @hiveforge/hivemind-mcp start');
    console.warn('  2. Create notes with the new entity types');
    console.warn(`  3. Use MCP tools like query_${template.entityTypes[0]?.name || 'entity'}`);

  } finally {
    rl.close();
  }
}

/**
 * List available templates
 */
async function listTemplates() {
  console.warn('🧠 Hivemind - Available Templates\n');

  console.warn('Built-in Templates:');
  console.warn('─'.repeat(60));

  const builtinIds = ['worldbuilding', 'research', 'people-management'];
  for (const id of builtinIds) {
    const template = AVAILABLE_TEMPLATES[id];
    console.warn(`\n  ${template.name} (${template.id})`);
    if (template.description) {
      console.warn(`  ${template.description}`);
    }
    console.warn(`  Entity types: ${template.entityTypes.map(e => e.name).join(', ')}`);
    if (template.category) {
      console.warn(`  Category: ${template.category}`);
    }
    if (template.tags?.length) {
      console.warn(`  Tags: ${template.tags.join(', ')}`);
    }
  }

  console.warn('\n\nCommunity Templates:');
  console.warn('─'.repeat(60));

  const communityIds = listCommunityTemplateIds();
  if (communityIds.length === 0) {
    console.warn('\n  (no community templates available)');
  } else {
    for (const id of communityIds) {
      const template = getCommunityTemplate(id);
      if (template) {
        console.warn(`\n  ${template.name} (${template.id})`);
        if (template.description) {
          console.warn(`  ${template.description}`);
        }
        console.warn(`  Entity types: ${template.entityTypes.map(e => e.name).join(', ')}`);
        if (template.category) {
          console.warn(`  Category: ${template.category}`);
        }
        if (template.tags?.length) {
          console.warn(`  Tags: ${template.tags.join(', ')}`);
        }
      }
    }
  }

  console.warn('\n\nTo add a template:');
  console.warn('  npx @hiveforge/hivemind-mcp add-template <template-id>');
}

/**
 * Template catalog entry for JSON output
 */
interface CatalogEntry {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  tags?: string[];
  author?: {
    name: string;
    url?: string;
  };
  repository?: string;
  sampleVault?: string;
  license?: string;
  minHivemindVersion?: string;
  source: 'builtin' | 'community';
  entityTypes: {
    name: string;
    displayName: string;
    pluralName: string;
    fieldCount: number;
  }[];
  relationshipCount: number;
}

/**
 * Generate a JSON catalog of all available templates
 */
async function generateCatalog() {
  const outputArg = process.argv[3];
  const outputPath = outputArg || './template-catalog.json';

  console.warn('🧠 Hivemind - Generating Template Catalog\n');

  const catalog: {
    version: string;
    generatedAt: string;
    templates: CatalogEntry[];
  } = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    templates: [],
  };

  // Add built-in templates
  const builtinIds = ['worldbuilding', 'research', 'people-management'];
  for (const id of builtinIds) {
    const template = AVAILABLE_TEMPLATES[id];
    catalog.templates.push(templateToCatalogEntry(template, 'builtin'));
  }

  // Add community templates
  for (const template of communityTemplates) {
    catalog.templates.push(templateToCatalogEntry(template, 'community'));
  }

  // Write catalog
  writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

  console.warn(`✅ Template catalog generated: ${outputPath}`);
  console.warn(`   Total templates: ${catalog.templates.length}`);
  console.warn(`   Built-in: ${builtinIds.length}`);
  console.warn(`   Community: ${communityTemplates.length}`);

  // Show summary
  console.warn('\nTemplates included:');
  for (const entry of catalog.templates) {
    console.warn(`  - ${entry.name} (${entry.id}) [${entry.source}]`);
  }
}

/**
 * Convert a template to a catalog entry
 */
function templateToCatalogEntry(
  template: TemplateDefinition,
  source: 'builtin' | 'community'
): CatalogEntry {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    description: template.description,
    category: template.category,
    tags: template.tags,
    author: template.author ? {
      name: template.author.name,
      url: template.author.url,
    } : undefined,
    repository: template.repository,
    sampleVault: template.sampleVault,
    license: template.license,
    minHivemindVersion: template.minHivemindVersion,
    source,
    entityTypes: template.entityTypes.map(et => ({
      name: et.name,
      displayName: et.displayName,
      pluralName: et.pluralName,
      fieldCount: et.fields.length,
    })),
    relationshipCount: template.relationshipTypes?.length || 0,
  };
}

/**
 * Check template compatibility with current Hivemind version
 */
async function checkCompatibility() {
  const templateArg = process.argv[3];

  console.warn('🧠 Hivemind - Template Compatibility Check\n');

  const hivemindVersion = getHivemindVersion();
  console.warn(`Hivemind version: ${hivemindVersion}\n`);

  // If no argument, check all registered templates
  if (!templateArg) {
    console.warn('Checking all templates:\n');

    let allCompatible = true;
    for (const [id, template] of Object.entries(AVAILABLE_TEMPLATES)) {
      const result = checkTemplateCompatibility(template.minHivemindVersion, template.version);
      const icon = result.compatible ? '✓' : '✗';
      console.warn(`  ${icon} ${id} (v${template.version})`);
      if (!result.compatible) {
        console.warn(`    ${result.message}`);
        allCompatible = false;
      }
    }

    console.warn('');
    if (allCompatible) {
      console.warn('✅ All templates are compatible');
    } else {
      console.warn('⚠️  Some templates have compatibility issues');
    }
    return;
  }

  // Check specific template by name or file
  let template: TemplateDefinition;

  // Check if it's a registered template
  if (AVAILABLE_TEMPLATES[templateArg]) {
    template = AVAILABLE_TEMPLATES[templateArg];
  }
  // Check if it's a file
  else if (existsSync(templateArg)) {
    try {
      template = loadTemplateFile(templateArg);
    } catch (err) {
      if (err instanceof TemplateValidationError) {
        console.error(err.toUserMessage());
      } else {
        console.error(`❌ Error loading template: ${err instanceof Error ? err.message : String(err)}`);
      }
      process.exit(1);
    }
  } else {
    console.error(`❌ Template not found: ${templateArg}`);
    console.warn('\nUse "list-templates" to see available templates, or provide a file path.');
    process.exit(1);
  }

  // Check compatibility
  const result = checkTemplateCompatibility(template.minHivemindVersion, template.version);

  console.warn(`Template: ${template.name} (${template.id})`);
  console.warn(`Template version: ${template.version}`);
  if (template.minHivemindVersion) {
    console.warn(`Requires Hivemind: >= ${template.minHivemindVersion}`);
  } else {
    console.warn('Requires Hivemind: (not specified)');
  }
  console.warn('');

  if (result.compatible) {
    console.warn(`✅ ${result.message}`);
  } else {
    console.warn(`❌ ${result.message}`);
    process.exit(1);
  }
}

// Parse command
const command = process.argv[2];

// Check if --vault flag is provided
if (command === '--vault') {
  start();
} else {
  switch (command) {
    case 'init':
      initCommand();
      break;
    case 'start':
      start();
      break;
    case 'validate':
      validateCommand();
      break;
    case 'setup-mcp':
      setupMcp();
      break;
    case 'fix':
      fixCommand();
      break;
    case 'create-template':
      createTemplate();
      break;
    case 'validate-template':
      validateTemplate();
      break;
    case 'add-template':
      addTemplate();
      break;
    case 'list-templates':
      listTemplates();
      break;
    case 'generate-catalog':
      generateCatalog();
      break;
    case 'check-compatibility':
      checkCompatibility();
      break;
    default:
      console.warn('Hivemind MCP Server\n');
      console.warn('Usage:');
      console.warn('  npx @hiveforge/hivemind-mcp init                       - Interactive setup wizard');
      console.warn('  npx @hiveforge/hivemind-mcp validate [path]            - Validate vault frontmatter');
      console.warn('    --json           Output machine-readable JSON');
      console.warn('    --quiet          Suppress output, only set exit code');
      console.warn('    --skip-missing   Skip files without frontmatter');
      console.warn('    --ignore <glob>  Exclude files matching pattern');
      console.warn('  npx @hiveforge/hivemind-mcp start                      - Start the MCP server');
      console.warn('  npx @hiveforge/hivemind-mcp setup-mcp                  - Generate MCP client config');
      console.warn('  npx @hiveforge/hivemind-mcp fix [path]                 - Add frontmatter to files (dry-run)');
      console.warn('    --apply          Apply changes (default: dry-run)');
      console.warn('    --yes            Skip prompts, use defaults');
      console.warn('    --json           Output machine-readable JSON');
      console.warn('    --verbose        Show all files in dry-run');
      console.warn('    --type <type>    Override folder mapping');
      console.warn('    --ignore <glob>  Exclude files matching pattern');
      console.warn('');
      console.warn('Template commands:');
      console.warn('  npx @hiveforge/hivemind-mcp list-templates             - List available templates');
      console.warn('  npx @hiveforge/hivemind-mcp add-template <name|url>    - Add a template');
      console.warn('  npx @hiveforge/hivemind-mcp create-template            - Create a new template interactively');
      console.warn('  npx @hiveforge/hivemind-mcp validate-template [file]   - Validate a template file');
      console.warn('  npx @hiveforge/hivemind-mcp generate-catalog [file]    - Generate template catalog JSON');
      console.warn('  npx @hiveforge/hivemind-mcp check-compatibility [name] - Check template compatibility');
      console.warn('');
      console.warn('Advanced:');
      console.warn('  npx @hiveforge/hivemind-mcp --vault <path>             - Start with specified vault path');
      console.warn('  npx @hiveforge/hivemind-mcp --vault .                  - Start with current directory as vault');
      process.exit(command ? 1 : 0);
  }
}

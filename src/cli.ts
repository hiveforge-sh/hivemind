#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { homedir } from 'os';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { FolderMapper } from './templates/folder-mapper.js';
import { templateRegistry } from './templates/registry.js';
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

  console.log('🚀 Starting Hivemind MCP Server...\n');

  // Import and start the server (index.js handles --vault flag parsing)
  const { startServer } = await import('./index.js');
  await startServer();
}

/**
 * Fix command: helps add frontmatter to skipped files
 */
async function fix() {
  const vaultPath = getVaultPath();
  if (!vaultPath) {
    outputMissingConfigError();
    process.exit(1);
  }

  const skippedLogPath = join(vaultPath, '.hivemind', 'skipped-files.log');

  if (!existsSync(skippedLogPath)) {
    console.log('✅ No skipped files log found. Run "npx @hiveforge/hivemind-mcp start" first to scan vault.');
    return;
  }

  console.log('🔧 Hivemind Fix - Add frontmatter to skipped files\n');

  // Read and parse skipped files log
  const logContent = readFileSync(skippedLogPath, 'utf-8');
  const skippedFiles = parseSkippedFilesLog(logContent);

  if (skippedFiles.length === 0) {
    console.log('✅ No skipped files found!');
    return;
  }

  console.log(`Found ${skippedFiles.length} file(s) needing frontmatter.\n`);

  // Initialize folder mapper
  const folderMapper = new FolderMapper();

  // Initialize template registry for entity types
  if (!templateRegistry.has('worldbuilding')) {
    templateRegistry.register(worldbuildingTemplate, 'builtin');
    templateRegistry.activate('worldbuilding');
  }
  const activeTemplate = templateRegistry.getActive();
  const entityTypes = activeTemplate?.entityTypes.map(e => e.name) || ['character', 'location', 'event', 'faction', 'lore', 'asset', 'reference'];

  const rl = readline.createInterface({ input, output });

  try {
    let fixed = 0;
    let skipped = 0;

    for (const filePath of skippedFiles) {
      const fullPath = join(vaultPath, filePath);

      if (!existsSync(fullPath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        skipped++;
        continue;
      }

      // Infer type from folder
      const inferredType = folderMapper.inferType(filePath);
      const fileName = basename(filePath, '.md');

      console.log(`\n📄 ${filePath}`);

      if (inferredType) {
        console.log(`   Inferred type: ${inferredType}`);
        const confirm = await rl.question(`   Use '${inferredType}'? (Y/n/skip): `);

        if (confirm.toLowerCase() === 'skip' || confirm.toLowerCase() === 's') {
          console.log('   Skipped.');
          skipped++;
          continue;
        }

        if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
          // Let user choose type
          const selectedType = await selectType(rl, entityTypes);
          if (selectedType) {
            await addFrontmatter(fullPath, selectedType, fileName);
            fixed++;
          } else {
            skipped++;
          }
        } else {
          // Use inferred type
          await addFrontmatter(fullPath, inferredType, fileName);
          fixed++;
        }
      } else {
        console.log('   Could not infer type from folder.');
        const selectedType = await selectType(rl, entityTypes);
        if (selectedType) {
          await addFrontmatter(fullPath, selectedType, fileName);
          fixed++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`\n✅ Done! Fixed: ${fixed}, Skipped: ${skipped}`);
    console.log('   Run "npx @hiveforge/hivemind-mcp start" to re-index vault.');

  } finally {
    rl.close();
  }
}

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
 * Parse skipped files from log content
 */
function parseSkippedFilesLog(content: string): string[] {
  const files: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match lines like "  • path/to/file.md"
    const match = line.match(/^\s+[•]\s+(.+\.md)$/);
    if (match) {
      files.push(match[1].trim());
    }
  }

  return files;
}

/**
 * Let user select an entity type
 */
async function selectType(rl: readline.Interface, types: string[]): Promise<string | null> {
  console.log('   Available types:');
  types.forEach((t, i) => console.log(`     ${i + 1}. ${t}`));
  console.log(`     0. Skip this file`);

  const choice = await rl.question('   Enter number: ');
  const num = parseInt(choice, 10);

  if (num === 0 || isNaN(num) || num < 1 || num > types.length) {
    return null;
  }

  return types[num - 1];
}

/**
 * Add frontmatter to a file
 */
async function addFrontmatter(filePath: string, entityType: string, name: string): Promise<void> {
  const content = readFileSync(filePath, 'utf-8');

  // Generate unique ID
  const id = generateId(name, entityType);

  // Create frontmatter
  const frontmatter = [
    '---',
    `id: ${id}`,
    `type: ${entityType}`,
    `status: draft`,
    `name: "${name}"`,
    `tags: []`,
    `aliases: []`,
    '---',
    '',
  ].join('\n');

  // Check if file already has frontmatter
  if (content.trimStart().startsWith('---')) {
    console.log('   ⚠️  File already has frontmatter block, skipping...');
    return;
  }

  // Prepend frontmatter
  const newContent = frontmatter + content;
  writeFileSync(filePath, newContent, 'utf-8');
  console.log(`   ✅ Added frontmatter (id: ${id})`);
}

/**
 * Generate a unique ID from name and type
 */
function generateId(name: string, entityType: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${entityType}-${slug}`;
}

async function validate() {
  console.log('\nHivemind Configuration Validator');
  console.log('================================\n');

  // Show config detection order
  console.log('📍 Config detection order:');
  console.log('   1. CLI --vault flag (highest priority)');
  console.log('   2. HIVEMIND_CONFIG_PATH environment variable');
  console.log('   3. ./config.json');
  console.log('   4. ./hivemind.config.json');
  console.log('   5. HIVEMIND_VAULT_PATH environment variable');
  console.log('');

  const configPath = resolve(process.cwd(), 'config.json');

  // Check config exists
  if (!existsSync(configPath)) {
    console.error('❌ config.json not found');
    console.log('   Run "npx @hiveforge/hivemind-mcp init" to create one');
    process.exit(1);
  }

  console.log(`📂 Found config at: ${configPath}\n`);

  // Load and validate config
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error('❌ config.json contains invalid JSON:');
      console.error(`   ${err.message}`);
      console.error('\n   Tip: Use a JSON validator like jsonlint.com to check syntax.');
    } else {
      console.error('❌ Error reading config.json:', err);
    }
    process.exit(1);
  }

  console.log('✅ Valid JSON syntax');

  // Import and use schema validation
  const { validateConfig: schemaValidate, formatValidationErrors } = await import('./config/schema.js');
  const validation = schemaValidate(config);

  if (!validation.success) {
    console.error('❌ Schema validation failed:');
    console.error(formatValidationErrors(validation.errors!));
    process.exit(1);
  }

  console.log('✅ Schema validation passed');

  // Check vault path
  if (!config.vault || typeof config.vault !== 'object' || !('path' in config.vault)) {
    console.error('❌ vault.path is missing in config');
    process.exit(1);
  }

  const vaultPath = resolve((config.vault as { path: string }).path);
  if (!existsSync(vaultPath)) {
    console.error(`❌ Vault path does not exist: ${vaultPath}`);
    console.log('\n   Tip: Update the path in config.json or create the directory.');
    process.exit(1);
  }

  console.log(`✅ Vault path exists: ${vaultPath}`);

  // Check for .md files
  const { readdirSync } = await import('fs');
  let mdCount = 0;
  function countMarkdown(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          countMarkdown(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          mdCount++;
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }
  countMarkdown(vaultPath);

  console.log(`✅ Found ${mdCount} markdown file(s)`);

  // Show active template if configured
  if (config.template && typeof config.template === 'object' && 'activeTemplate' in config.template) {
    console.log(`✅ Active template: ${(config.template as { activeTemplate: string }).activeTemplate}`);
  }

  // Check if built
  const distPath = resolve(process.cwd(), 'dist', 'index.js');
  if (!existsSync(distPath)) {
    console.warn('⚠️  dist/index.js not found - run "npm run build"');
  } else {
    console.log('✅ Server built (dist/index.js exists)');
  }

  console.log('\n✅ Configuration is valid!');
  console.log('\nTo start the server: npx @hiveforge/hivemind-mcp start');
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

  console.log('\nHivemind MCP Client Setup');
  console.log('=========================\n');

  try {
    // 1. Select MCP client
    console.log('Which MCP client are you using?');
    console.log('  1. Claude Desktop');
    console.log('  2. GitHub Copilot');
    console.log('  3. Other (show generic config)');

    const clientChoice = await rl.question('\nEnter choice (1-3): ');

    // 2. Get vault path
    const currentVault = getVaultPath();
    console.log(`\nCurrent configured vault: ${currentVault || '(none)'}`);
    const vaultInput = await rl.question('Vault path (press Enter to use current, or enter new path): ');
    const resolvedVault = vaultInput.trim()
      ? resolve(vaultInput.trim())
      : currentVault || undefined;

    // 3. Generate config based on client
    const config = generateMcpConfig(clientChoice, resolvedVault);

    // 4. Show config file location
    const configPath = getMcpConfigPath(clientChoice);

    console.log(`\n📁 Config file location:`);
    console.log(`   ${configPath}\n`);

    console.log('📋 Add this to your MCP config:\n');
    console.log(JSON.stringify(config, null, 2));

    // 5. Offer to write config (only for known clients)
    if (clientChoice === '1' || clientChoice === '2') {
      const writeChoice = await rl.question('\nWrite to config file? (y/N): ');
      if (writeChoice.toLowerCase() === 'y') {
        writeMcpConfig(configPath, config as { mcpServers: { hivemind: object } });
        console.log(`\n✅ Config written to ${configPath}`);
        console.log('   Restart your MCP client to apply changes.');
      }
    }

    console.log('\n📝 Next steps:');
    console.log('  1. If you didn\'t write the config, copy the JSON above to your MCP client config');
    console.log('  2. Restart your MCP client (Claude Desktop, VS Code, etc.)');
    console.log('  3. Start using Hivemind tools in your AI conversations\n');

  } finally {
    rl.close();
  }
}

/**
 * Validate a template file
 */
async function validateTemplate() {
  const filePath = process.argv[3] || './template.json';

  console.log(`🔍 Validating template file: ${filePath}\n`);

  if (!existsSync(filePath)) {
    console.error(`❌ Template file not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const template = loadTemplateFile(filePath);
    console.log('✓ Template is valid!\n');
    console.log(`ID: ${template.id}`);
    console.log(`Name: ${template.name}`);
    console.log(`Version: ${template.version}`);
    if (template.description) {
      console.log(`Description: ${template.description}`);
    }

    console.log(`\nEntity Types (${template.entityTypes.length}):`);
    for (const et of template.entityTypes) {
      const requiredFields = et.fields.filter(f => f.required).length;
      console.log(`  - ${et.name} (${et.fields.length} fields, ${requiredFields} required)`);
    }

    if (template.relationshipTypes?.length) {
      console.log(`\nRelationship Types (${template.relationshipTypes.length}):`);
      for (const rt of template.relationshipTypes) {
        const sourceStr = Array.isArray(rt.sourceTypes) ? rt.sourceTypes.join(', ') : rt.sourceTypes;
        const targetStr = Array.isArray(rt.targetTypes) ? rt.targetTypes.join(', ') : rt.targetTypes;
        console.log(`  - ${rt.id}: ${sourceStr} → ${targetStr}${rt.bidirectional ? ' (bidirectional)' : ''}`);
      }
    }

    console.log('\n✅ Template validation complete!');
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
  console.log('🧠 Hivemind Template Creator\n');
  console.log('='.repeat(40) + '\n');

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
    console.log('\n=== Entity Types ===\n');

    const entityTypes: EntityTypeConfig[] = [];

    while (true) {
      const entityName = (await rl.question("Entity name (lowercase, or 'done'): ")).trim().toLowerCase();
      if (entityName === 'done' || entityName === '') {
        if (entityTypes.length === 0) {
          console.log('⚠️  Template must have at least one entity type.');
          continue;
        }
        break;
      }

      if (!/^[a-z][a-z0-9_]*$/.test(entityName)) {
        console.log('❌ Entity name must be lowercase alphanumeric with underscores');
        continue;
      }

      const displayName = await promptRequired(rl, 'Display name');
      const pluralName = await promptRequired(rl, 'Plural name');

      // Fields
      const fields: FieldConfig[] = [];
      console.log('');

      while (true) {
        const fieldName = (await rl.question("  Field name (or 'done'): ")).trim();
        if (fieldName === 'done' || fieldName === '') {
          break;
        }

        if (!/^[a-z][a-zA-Z0-9_]*$/.test(fieldName)) {
          console.log('  ❌ Field name must be camelCase or snake_case');
          continue;
        }

        const fieldTypeInput = (await rl.question('  Field type [string/number/boolean/enum/array/date/record]: ')).trim().toLowerCase();
        const validTypes = ['string', 'number', 'boolean', 'enum', 'array', 'date', 'record'];
        if (!validTypes.includes(fieldTypeInput)) {
          console.log('  ❌ Invalid field type');
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
            console.log('  ❌ Enum must have at least one value');
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
        console.log(`  ✓ Added field: ${fieldName}\n`);
      }

      entityTypes.push({
        name: entityName,
        displayName,
        pluralName,
        fields,
      });

      console.log(`✓ Added entity type: ${entityName}\n`);
    }

    // 3. Relationship types (optional)
    console.log('\n=== Relationship Types (optional) ===\n');
    const addRelationships = (await rl.question('Add relationship types? (y/n): ')).trim().toLowerCase();

    const relationshipTypes: TemplateDefinition['relationshipTypes'] = [];

    if (addRelationships === 'y' || addRelationships === 'yes') {
      while (true) {
        const relId = (await rl.question("\nRelationship ID (snake_case, or 'done'): ")).trim().toLowerCase();
        if (relId === 'done' || relId === '') {
          break;
        }

        if (!/^[a-z][a-z0-9_]*$/.test(relId)) {
          console.log('❌ Relationship ID must be snake_case');
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

        console.log(`✓ Added relationship type: ${relId}`);
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

    console.log('\n' + '='.repeat(40));
    console.log(`\n✓ Template created: ${outputPath}\n`);
    console.log('Next steps:');
    console.log('  1. Review and edit template.json as needed');
    console.log('  2. Validate: npx @hiveforge/hivemind-mcp validate-template');
    console.log('  3. Add to config.json or use standalone template.json');
    console.log('  4. Consider contributing: https://github.com/hiveforge-sh/hivemind/blob/master/CONTRIBUTING.md');
    console.log('');

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
    console.log('  ⚠️  This field is required.');
  }
}

/**
 * Add a template from registry or URL
 */
async function addTemplate() {
  const templateArg = process.argv[3];

  console.log('🧠 Hivemind - Add Template\n');

  // Show available templates if no argument
  if (!templateArg) {
    console.log('Available templates:\n');
    console.log('Built-in:');
    console.log('  - worldbuilding     Characters, locations, events, factions, lore');
    console.log('  - research          Papers, citations, concepts, notes');
    console.log('  - people-management People, goals, teams, 1:1 meetings');
    console.log('\nCommunity:');
    const communityIds = listCommunityTemplateIds();
    if (communityIds.length === 0) {
      console.log('  (no community templates available)');
    } else {
      for (const id of communityIds) {
        const template = getCommunityTemplate(id);
        console.log(`  - ${id.padEnd(20)} ${template?.description || template?.name || ''}`);
      }
    }
    console.log('\nUsage:');
    console.log('  npx @hiveforge/hivemind-mcp add-template <name>       - Add from registry');
    console.log('  npx @hiveforge/hivemind-mcp add-template <url>        - Add from URL');
    console.log('  npx @hiveforge/hivemind-mcp add-template <file.json>  - Add from local file');
    return;
  }

  let template: TemplateDefinition;

  // Check if it's a URL
  if (templateArg.startsWith('http://') || templateArg.startsWith('https://')) {
    console.log(`📥 Fetching template from: ${templateArg}\n`);
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
    console.log(`📂 Loading template from: ${templateArg}\n`);
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
      console.log('\nAvailable templates:');
      for (const id of Object.keys(AVAILABLE_TEMPLATES)) {
        console.log(`  - ${id}`);
      }
      process.exit(1);
    }
    template = registeredTemplate;
    console.log(`📦 Using template from registry: ${templateArg}\n`);
  }

  // Show template info
  console.log(`Template: ${template.name}`);
  console.log(`ID: ${template.id}`);
  console.log(`Version: ${template.version}`);
  if (template.description) {
    console.log(`Description: ${template.description}`);
  }
  console.log(`\nEntity Types (${template.entityTypes.length}):`);
  for (const et of template.entityTypes) {
    console.log(`  - ${et.displayName} (${et.name})`);
  }
  if (template.relationshipTypes?.length) {
    console.log(`\nRelationship Types (${template.relationshipTypes.length}):`);
    for (const rt of template.relationshipTypes) {
      console.log(`  - ${rt.displayName} (${rt.id})`);
    }
  }

  // Ask how to save
  const rl = readline.createInterface({ input, output });

  try {
    console.log('\nHow do you want to add this template?\n');
    console.log('  1. Save as standalone template.json (recommended for custom templates)');
    console.log('  2. Add to config.json (inline definition)');
    console.log('  3. Just set as active template (for built-in/community templates)\n');

    const choice = await rl.question('Enter choice (1/2/3): ');

    switch (choice.trim()) {
      case '1': {
        // Save as standalone template.json
        const outputPath = resolve(process.cwd(), 'template.json');
        if (existsSync(outputPath)) {
          const overwrite = await rl.question('template.json already exists. Overwrite? (y/N): ');
          if (overwrite.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            rl.close();
            return;
          }
        }
        writeFileSync(outputPath, JSON.stringify(template, null, 2));
        console.log(`\n✅ Template saved to: ${outputPath}`);
        console.log('\nThe template will be automatically loaded when Hivemind starts.');
        break;
      }

      case '2': {
        // Add to config.json
        const configPath = resolve(process.cwd(), 'config.json');
        let config: any = {};

        if (existsSync(configPath)) {
          try {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
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
          (t: any) => t.id === template.id
        );

        if (existingIndex >= 0) {
          const overwrite = await rl.question(
            `Template "${template.id}" already exists in config. Overwrite? (y/N): `
          );
          if (overwrite.toLowerCase() !== 'y') {
            console.log('Cancelled.');
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
        console.log(`\n✅ Template added to: ${configPath}`);
        console.log(`   Active template set to: ${template.id}`);
        break;
      }

      case '3': {
        // Just update activeTemplate in config.json
        const configPath = resolve(process.cwd(), 'config.json');
        let config: any = {};

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
        console.log(`\n✅ Active template set to: ${template.id}`);
        console.log(`   Updated: ${configPath}`);
        break;
      }

      default:
        console.log('Cancelled.');
    }

    console.log('\nNext steps:');
    console.log('  1. Start Hivemind: npx @hiveforge/hivemind-mcp start');
    console.log('  2. Create notes with the new entity types');
    console.log(`  3. Use MCP tools like query_${template.entityTypes[0]?.name || 'entity'}`);

  } finally {
    rl.close();
  }
}

/**
 * List available templates
 */
async function listTemplates() {
  console.log('🧠 Hivemind - Available Templates\n');

  console.log('Built-in Templates:');
  console.log('─'.repeat(60));

  const builtinIds = ['worldbuilding', 'research', 'people-management'];
  for (const id of builtinIds) {
    const template = AVAILABLE_TEMPLATES[id];
    console.log(`\n  ${template.name} (${template.id})`);
    if (template.description) {
      console.log(`  ${template.description}`);
    }
    console.log(`  Entity types: ${template.entityTypes.map(e => e.name).join(', ')}`);
    if (template.category) {
      console.log(`  Category: ${template.category}`);
    }
    if (template.tags?.length) {
      console.log(`  Tags: ${template.tags.join(', ')}`);
    }
  }

  console.log('\n\nCommunity Templates:');
  console.log('─'.repeat(60));

  const communityIds = listCommunityTemplateIds();
  if (communityIds.length === 0) {
    console.log('\n  (no community templates available)');
  } else {
    for (const id of communityIds) {
      const template = getCommunityTemplate(id);
      if (template) {
        console.log(`\n  ${template.name} (${template.id})`);
        if (template.description) {
          console.log(`  ${template.description}`);
        }
        console.log(`  Entity types: ${template.entityTypes.map(e => e.name).join(', ')}`);
        if (template.category) {
          console.log(`  Category: ${template.category}`);
        }
        if (template.tags?.length) {
          console.log(`  Tags: ${template.tags.join(', ')}`);
        }
      }
    }
  }

  console.log('\n\nTo add a template:');
  console.log('  npx @hiveforge/hivemind-mcp add-template <template-id>');
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

  console.log('🧠 Hivemind - Generating Template Catalog\n');

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

  console.log(`✅ Template catalog generated: ${outputPath}`);
  console.log(`   Total templates: ${catalog.templates.length}`);
  console.log(`   Built-in: ${builtinIds.length}`);
  console.log(`   Community: ${communityTemplates.length}`);

  // Show summary
  console.log('\nTemplates included:');
  for (const entry of catalog.templates) {
    console.log(`  - ${entry.name} (${entry.id}) [${entry.source}]`);
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

  console.log('🧠 Hivemind - Template Compatibility Check\n');

  const hivemindVersion = getHivemindVersion();
  console.log(`Hivemind version: ${hivemindVersion}\n`);

  // If no argument, check all registered templates
  if (!templateArg) {
    console.log('Checking all templates:\n');

    let allCompatible = true;
    for (const [id, template] of Object.entries(AVAILABLE_TEMPLATES)) {
      const result = checkTemplateCompatibility(template.minHivemindVersion, template.version);
      const icon = result.compatible ? '✓' : '✗';
      console.log(`  ${icon} ${id} (v${template.version})`);
      if (!result.compatible) {
        console.log(`    ${result.message}`);
        allCompatible = false;
      }
    }

    console.log('');
    if (allCompatible) {
      console.log('✅ All templates are compatible');
    } else {
      console.log('⚠️  Some templates have compatibility issues');
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
    console.log('\nUse "list-templates" to see available templates, or provide a file path.');
    process.exit(1);
  }

  // Check compatibility
  const result = checkTemplateCompatibility(template.minHivemindVersion, template.version);

  console.log(`Template: ${template.name} (${template.id})`);
  console.log(`Template version: ${template.version}`);
  if (template.minHivemindVersion) {
    console.log(`Requires Hivemind: >= ${template.minHivemindVersion}`);
  } else {
    console.log('Requires Hivemind: (not specified)');
  }
  console.log('');

  if (result.compatible) {
    console.log(`✅ ${result.message}`);
  } else {
    console.log(`❌ ${result.message}`);
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
      validate();
      break;
    case 'setup-mcp':
      setupMcp();
      break;
    case 'fix':
      fix();
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
      console.log('Hivemind MCP Server\n');
      console.log('Usage:');
      console.log('  npx @hiveforge/hivemind-mcp init                       - Interactive setup wizard');
      console.log('  npx @hiveforge/hivemind-mcp validate                   - Validate configuration');
      console.log('  npx @hiveforge/hivemind-mcp start                      - Start the MCP server');
      console.log('  npx @hiveforge/hivemind-mcp setup-mcp                  - Generate MCP client config');
      console.log('  npx @hiveforge/hivemind-mcp fix                        - Add frontmatter to skipped files');
      console.log('');
      console.log('Template commands:');
      console.log('  npx @hiveforge/hivemind-mcp list-templates             - List available templates');
      console.log('  npx @hiveforge/hivemind-mcp add-template <name|url>    - Add a template');
      console.log('  npx @hiveforge/hivemind-mcp create-template            - Create a new template interactively');
      console.log('  npx @hiveforge/hivemind-mcp validate-template [file]   - Validate a template file');
      console.log('  npx @hiveforge/hivemind-mcp generate-catalog [file]    - Generate template catalog JSON');
      console.log('  npx @hiveforge/hivemind-mcp check-compatibility [name] - Check template compatibility');
      console.log('');
      console.log('Advanced:');
      console.log('  npx @hiveforge/hivemind-mcp --vault <path>             - Start with specified vault path');
      console.log('  npx @hiveforge/hivemind-mcp --vault .                  - Start with current directory as vault');
      process.exit(command ? 1 : 0);
  }
}

#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, basename } from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { FolderMapper } from './templates/folder-mapper.js';
import { templateRegistry } from './templates/registry.js';
import { worldbuildingTemplate } from './templates/builtin/worldbuilding.js';

const DEFAULT_CONFIG = {
  vault: {
    path: '',
    watchForChanges: true,
    debounceMs: 100
  },
  server: {
    transport: 'stdio'
  },
  indexing: {
    strategy: 'incremental',
    batchSize: 100,
    enableVectorSearch: false,
    enableFullTextSearch: true
  }
};

async function init() {
  console.log('🧠 Hivemind MCP Server - Configuration Setup\n');

  const rl = readline.createInterface({ input, output });

  try {
    // Check if config already exists
    const configPath = resolve(process.cwd(), 'config.json');
    if (existsSync(configPath)) {
      const overwrite = await rl.question('config.json already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    // Ask for vault path
    const vaultPath = await rl.question('Enter your Obsidian vault path: ');
    if (!vaultPath.trim()) {
      console.error('❌ Vault path is required');
      rl.close();
      process.exit(1);
    }

    const resolvedPath = resolve(vaultPath.trim());
    if (!existsSync(resolvedPath)) {
      console.warn(`⚠️  Warning: Path does not exist: ${resolvedPath}`);
      const proceed = await rl.question('Continue anyway? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    // Optional: Enable vector search
    const enableVector = await rl.question('Enable vector search (experimental)? (y/N): ');

    // Create config
    const config = {
      ...DEFAULT_CONFIG,
      vault: {
        ...DEFAULT_CONFIG.vault,
        path: resolvedPath
      },
      indexing: {
        ...DEFAULT_CONFIG.indexing,
        enableVectorSearch: enableVector.toLowerCase() === 'y'
      }
    };

    // Write config
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Configuration saved to ${configPath}`);
    console.log('\n📝 Next steps:');
    console.log('  1. Build the project: npm run build');
    console.log('  2. Start the server: npm start');
    console.log('  3. Configure your MCP client to connect to this server');

    rl.close();
  } catch (error) {
    console.error('Error during setup:', error);
    rl.close();
    process.exit(1);
  }
}

async function start() {
  // Check if --vault flag is provided, skip config check in that case
  const hasVaultFlag = process.argv.includes('--vault');
  
  if (!hasVaultFlag) {
    const configPath = resolve(process.cwd(), 'config.json');
    if (!existsSync(configPath)) {
      console.error('❌ config.json not found. Run "npx @hiveforge/hivemind-mcp init" first.');
      console.error('   Or use: npx @hiveforge/hivemind-mcp --vault <path>');
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
    console.error('❌ Could not determine vault path. Use --vault flag or create config.json');
    process.exit(1);
  }

  const skippedLogPath = join(vaultPath, '.hivemind', 'skipped-files.log');

  if (!existsSync(skippedLogPath)) {
    console.log('✅ No skipped files log found. Run "npx hivemind start" first to scan vault.');
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
    console.log('   Run "npx hivemind start" to re-index vault.');

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
    } catch {
      // Ignore config parse errors
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
  const configPath = resolve(process.cwd(), 'config.json');

  console.log('🔍 Validating Hivemind configuration...\n');

  // Check config exists
  if (!existsSync(configPath)) {
    console.error('❌ config.json not found');
    console.log('   Run "npx hivemind init" to create one');
    process.exit(1);
  }

  // Load and validate config
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    console.log('✅ config.json found and valid JSON');

    // Check vault path
    if (!config.vault?.path) {
      console.error('❌ vault.path is missing in config');
      process.exit(1);
    }

    const vaultPath = resolve(config.vault.path);
    if (!existsSync(vaultPath)) {
      console.error(`❌ Vault path does not exist: ${vaultPath}`);
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
      } catch (err) {
        // Skip directories we can't read
      }
    }
    countMarkdown(vaultPath);

    console.log(`✅ Found ${mdCount} markdown file(s)`);

    // Check if built
    const distPath = resolve(process.cwd(), 'dist', 'index.js');
    if (!existsSync(distPath)) {
      console.warn('⚠️  dist/index.js not found - run "npm run build"');
    } else {
      console.log('✅ Server built (dist/index.js exists)');
    }

    console.log('\n✅ Configuration is valid!');
    console.log('\nTo start the server: npm start');

  } catch (error) {
    console.error('❌ Error reading config.json:', error);
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
      init();
      break;
    case 'start':
      start();
      break;
    case 'validate':
      validate();
      break;
    case 'fix':
      fix();
      break;
    default:
      console.log('Hivemind MCP Server\n');
      console.log('Usage:');
      console.log('  npx @hiveforge/hivemind-mcp init              - Interactive configuration setup');
      console.log('  npx @hiveforge/hivemind-mcp validate          - Validate configuration');
      console.log('  npx @hiveforge/hivemind-mcp start             - Start the MCP server');
      console.log('  npx @hiveforge/hivemind-mcp fix               - Add frontmatter to skipped files');
      console.log('  npx @hiveforge/hivemind-mcp --vault <path>    - Start with specified vault path');
      console.log('  npx @hiveforge/hivemind-mcp --vault .         - Start with current directory as vault');
      process.exit(command ? 1 : 0);
  }
}

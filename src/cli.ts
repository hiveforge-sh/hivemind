#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

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
    default:
      console.log('Hivemind MCP Server\n');
      console.log('Usage:');
      console.log('  npx @hiveforge/hivemind-mcp init              - Interactive configuration setup');
      console.log('  npx @hiveforge/hivemind-mcp validate          - Validate configuration');
      console.log('  npx @hiveforge/hivemind-mcp start             - Start the MCP server');
      console.log('  npx @hiveforge/hivemind-mcp --vault <path>    - Start with specified vault path');
      console.log('  npx @hiveforge/hivemind-mcp --vault .         - Start with current directory as vault');
      process.exit(command ? 1 : 0);
  }
}

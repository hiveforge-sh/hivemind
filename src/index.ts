#!/usr/bin/env node

import { HivemindServer } from './server.js';
import type { HivemindConfig } from './types/index.js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function parseArgs(): { vault?: string } {
  const args: { vault?: string } = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--vault' && process.argv[i + 1]) {
      args.vault = process.argv[i + 1];
      i++; // Skip next argument
    }
  }
  
  return args;
}

function loadConfig(): HivemindConfig {
  const args = parseArgs();
  
  // CLI vault flag takes highest priority
  if (args.vault) {
    const vaultPath = resolve(args.vault);
    console.error(`Using vault from CLI flag: ${vaultPath}`);
    return {
      vault: {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 100,
      },
      server: {
        transport: 'stdio',
      },
      indexing: {
        strategy: 'incremental',
        batchSize: 100,
        enableVectorSearch: false,
        enableFullTextSearch: true,
      },
    };
  }
  
  // Try to load config from multiple locations
  const configPaths = [
    join(process.cwd(), 'config.json'),
    join(process.cwd(), 'hivemind.config.json'),
    process.env.HIVEMIND_CONFIG_PATH,
  ].filter((path): path is string => !!path);

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      console.error(`Loading config from: ${configPath}`);
      const configData = readFileSync(configPath, 'utf-8');
      return JSON.parse(configData) as HivemindConfig;
    }
  }

  // Default configuration
  console.error('No config file found, using defaults');
  return {
    vault: {
      path: process.env.HIVEMIND_VAULT_PATH || join(process.cwd(), 'sample-vault'),
      watchForChanges: true,
      debounceMs: 100,
    },
    server: {
      transport: 'stdio',
    },
    indexing: {
      strategy: 'incremental',
      batchSize: 100,
      enableVectorSearch: false, // Disabled for MVP
      enableFullTextSearch: true,
    },
  };
}

export async function startServer() {
  const config = loadConfig();
  const server = new HivemindServer(config);
  await server.start();
}

async function main() {
  try {
    await startServer();
  } catch (error) {
    console.error('Failed to start Hivemind server:', error);
    process.exit(1);
  }
}

main();

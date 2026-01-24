#!/usr/bin/env node

import { HivemindServer } from './server.js';
import type { HivemindConfig } from './types/index.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadConfig(): HivemindConfig {
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

async function main() {
  try {
    const config = loadConfig();
    const server = new HivemindServer(config);
    await server.start();
  } catch (error) {
    console.error('Failed to start Hivemind server:', error);
    process.exit(1);
  }
}

main();

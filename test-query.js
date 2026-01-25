import { HivemindServer } from './dist/server.js';
import { readFileSync } from 'fs';

async function testQuery() {
  // Load config
  const config = JSON.parse(readFileSync('./config.json', 'utf-8'));
  
  // Create server instance
  const server = new HivemindServer(config);
  
  // Manually initialize without starting MCP transport
  console.log('Initializing server...');
  await server['vaultReader'].scanVault();
  
  const allNotes = server['vaultReader'].getAllNotes();
  server['graphBuilder'].buildGraph(allNotes);
  server['isIndexed'] = true;
  
  console.log('\n=== Vault Stats ===');
  const stats = server['vaultReader'].getStats();
  console.log(`Total notes: ${stats.totalNotes}`);
  console.log('By type:', stats.byType);
  
  // Test query for Xeth WITHOUT content
  console.log('\n=== Querying for Xeth\'Toldaz (metadata only) ===');
  const result1 = await server['handleQueryCharacter']({ 
    id: 'character-xethtoldaz',
    includeContent: false 
  });
  console.log(result1.content[0].text);
  
  // Test query for Xeth WITH content (default 500 chars)
  console.log('\n=== Querying for Xeth\'Toldaz (with content, default limit) ===');
  const result2 = await server['handleQueryCharacter']({ 
    id: 'character-xethtoldaz',
    includeContent: true,
    contentLimit: 500
  });
  console.log(result2.content[0].text);
  
  // Test search WITHOUT content snippets
  console.log('\n=== Searching for "Xeth" (no content) ===');
  const searchResult1 = await server['handleSearchVault']({ 
    query: 'Xeth', 
    limit: 5,
    includeContent: false
  });
  console.log(searchResult1.content[0].text);
  
  // Test search WITH content snippets
  console.log('\n=== Searching for "Xeth" (with snippets) ===');
  const searchResult2 = await server['handleSearchVault']({ 
    query: 'Xeth', 
    limit: 5,
    includeContent: true,
    contentLimit: 200
  });
  console.log(searchResult2.content[0].text);
}

testQuery().catch(console.error);

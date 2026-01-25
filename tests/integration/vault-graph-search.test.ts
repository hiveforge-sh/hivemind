import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultReader } from '../../src/vault/reader.js';
import { GraphBuilder } from '../../src/graph/builder.js';
import { SearchEngine } from '../../src/search/engine.js';
import { HivemindDatabase } from '../../src/graph/database.js';
import type { VaultConfig } from '../../src/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';

describe('Integration: Vault → Graph → Search', () => {
  let tempDir: string;
  let vaultPath: string;
  let db: HivemindDatabase;
  let reader: VaultReader;
  let builder: GraphBuilder;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-integration-'));
    vaultPath = join(tempDir, 'vault');
    mkdirSync(vaultPath);

    const config: VaultConfig = {
      path: vaultPath,
      dbPath: join(tempDir, 'test.db')
    };

    db = new HivemindDatabase({ path: config.dbPath });
    reader = new VaultReader(config);
    builder = new GraphBuilder(db);
    searchEngine = new SearchEngine(db);
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createMarkdownFile = (relativePath: string, content: string) => {
    const fullPath = join(vaultPath, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf(join('/')));
    mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  };

  describe('Full Pipeline', () => {
    it('should index vault, build graph, and enable search', async () => {
      createMarkdownFile('characters/alice.md', `---
id: alice
type: character
status: canon
title: Alice the Brave
---

Alice is a warrior who lives in [[castle]].
`);

      createMarkdownFile('characters/bob.md', `---
id: bob
type: character
status: canon
title: Bob the Wizard
---

Bob is a powerful wizard.
`);

      // Scan → Build → Search
      await reader.scanVault();
      builder.buildGraph(reader.getAllNotes());

      const stats = db.getStats();
      expect(stats.nodes).toBe(2);

      const searchResults = await searchEngine.search('wizard');
      expect(searchResults.nodes.some(n => n.id === 'bob')).toBe(true);
    });

    it('should filter search results by type', async () => {
      createMarkdownFile('char.md', `---
id: char-1
type: character
status: canon
---
A brave warrior.
`);

      createMarkdownFile('loc.md', `---
id: loc-1
type: location
status: canon
---
A brave fortress.
`);

      await reader.scanVault();
      builder.buildGraph(reader.getAllNotes());

      const results = await searchEngine.search('brave', {
        filters: { type: ['character'] }
      });

      expect(results.nodes.every(n => n.type === 'character')).toBe(true);
    });

    it('should filter search results by status', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: draft
---
Content
`);

      await reader.scanVault();
      builder.buildGraph(reader.getAllNotes());

      const results = await searchEngine.search('character', {
        filters: { status: ['canon'] }
      });

      expect(results.nodes.every(n => n.status === 'canon')).toBe(true);
    });
  });

  describe('Relationship Discovery', () => {
    it('should discover wikilink relationships', async () => {
      createMarkdownFile('alice.md', `---
id: alice
type: character
status: canon
---
Alice knows [[bob]].
`);

      createMarkdownFile('bob.md', `---
id: bob
type: character
status: canon
---
Bob is a character.
`);

      await reader.scanVault();
      builder.buildGraph(reader.getAllNotes());

      const aliceRels = db.getRelationships('alice');
      const bobRels = db.getRelationships('bob');

      expect(aliceRels.length + bobRels.length).toBeGreaterThan(0);
    });

    it('should support cross-type relationships', async () => {
      createMarkdownFile('alice.md', `---
id: alice
type: character
status: canon
---
Alice lives in [[city]].
`);

      createMarkdownFile('city.md', `---
id: city
type: location
status: canon
---
A big city.
`);

      await reader.scanVault();
      builder.buildGraph(reader.getAllNotes());

      const graphData = builder.getGraph();
      expect(graphData.edges.size).toBeGreaterThan(0);
    });
  });

  describe('Statistics Aggregation', () => {
    it('should aggregate vault statistics', async () => {
      createMarkdownFile('char1.md', `---
id: char-1
type: character
status: canon
---
Content
`);

      createMarkdownFile('char2.md', `---
id: char-2
type: character
status: draft
---
Content
`);

      createMarkdownFile('loc1.md', `---
id: loc-1
type: location
status: canon
---
Content
`);

      await reader.scanVault();
      const vaultStats = reader.getStats();

      expect(vaultStats.totalNotes).toBe(3);
      expect(vaultStats.byType.character).toBe(2);
      expect(vaultStats.byType.location).toBe(1);
      expect(vaultStats.byStatus.canon).toBe(2);
      expect(vaultStats.byStatus.draft).toBe(1);
    });
  });
});

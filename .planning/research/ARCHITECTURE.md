# Hivemind Architecture: MCP Server + Obsidian Knowledge Vault

**Version:** 1.0
**Last Updated:** 2025
**Status:** Research Document

## Table of Contents

1. [MCP Server Architecture](#1-mcp-server-architecture)
2. [Data Layer Architecture](#2-data-layer-architecture)
3. [Query Architecture](#3-query-architecture)
4. [Integration Patterns](#4-integration-patterns)
5. [Scalability & Performance](#5-scalability--performance)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Reference Architectures](#7-reference-architectures)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Developer Experience Features Architecture](#9-developer-experience-features-architecture)

---

## 1. MCP Server Architecture

### 1.1 Overview: Client-Host-Server Model

MCP follows a **strict client-host-server** isolation model (introduced late 2024 by Anthropic):

```
[User Application]
        |
     [Host/MCP Hub]
     /  |  \
[Client1][Client2][Client3]
   |         |         |
[Server1] [Server2] [Server3]
```

**Key Points:**
- **Host** = Application orchestrator (e.g., Obsidian, AI chat client) that manages security, session lifecycle, context aggregation
- **Clients** = Lightweight, 1:1 connection handler for each server; stateful but narrowly scoped
- **Servers** = Resource providers (files, databases, knowledge graphs, tools); operate independently with zero cross-server visibility
- **Communication** = JSON-RPC 2.0 over stateful sessions; supports bidirectional requests, responses, and one-way notifications

### 1.2 Transport Layer Patterns

#### **Stdio Transport** (Local-Only)
- **Use Case:** Development, single-client scenarios, tight performance requirements
- **Pros:** Simple implementation, lowest latency, no HTTP overhead
- **Cons:** One client at a time, cannot support remote access without proxy, process-bound
- **Implementation:**
  ```typescript
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  const transport = new StdioServerTransport();
  await transport.listen(server);
  ```

#### **Streamable HTTP/SSE** (Production)
- **Use Case:** Remote clients, concurrent connections, browser-based clients, production deployments
- **Pros:** Multi-client, streaming notifications, web-native, scalable
- **Cons:** HTTP overhead, connection state management, SSE complexity
- **Implementation:**
  ```typescript
  import { StreamableHttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
  const transport = new StreamableHttpServerTransport({ port: 3000 });
  await transport.listen(server);
  ```

#### **Proxy Pattern** (Bridge)
- **Use Case:** Running stdio server remotely, gradual migration to HTTP
- **Example:** mcp-proxy bridges stdio to HTTP/SSE endpoints
  ```bash
  npx mcp-proxy --port 8080 tsx server.js
  ```
- **Benefit:** Write core logic once (stdio), expose via multiple transports

### 1.3 State Management in MCP

**Session State:**
- Each client maintains a **single stateful connection** to its server
- Host keeps **session metadata** (client ID, capabilities, auth context)
- Servers maintain **no inter-client state**

**Capability Negotiation:**
- During init, client and server exchange: resources, tools, prompts, sampling (for remote model control)
- Allows new capabilities to be added without breaking older clients

**Context Delivery:**
- Host aggregates context from multiple servers into a unified "context tree"
- Servers only see context specific to their requests
- No server can peek at other servers' data or the full conversation

### 1.4 Authentication & Authorization Models

**MCP-Native Approach:**
- MCP itself is **transport-agnostic** on auth; security is delegated to the host
- Servers should accept **connection tokens or API keys** from the host as initialization data

**For Hivemind (Vault Server):**

1. **Local Single-User Model:**
   - No explicit auth needed (file system permissions handle access)
   - Vault path is known at server start
   - Host (Obsidian plugin or CLI tool) manages vault access

2. **Multi-Device Sync Model:**
   - Host provides a **device token** (derived from Obsidian Sync or custom sync layer)
   - Server validates token before returning vault contents
   - Servers in different sync groups maintain separate caches

3. **Optional Remote Access:**
   - TLS 1.3 with mutual auth (cert pinning)
   - OAuth 2.0 or mTLS for API servers
   - All data encrypted in transit and at rest

### 1.5 Multi-Client Handling

**Design Principles:**
- Each MCP server should be **stateless and idempotent** for each request
- Multiple clients can issue requests in parallel; responses are isolated
- Use **request IDs** and **sequence numbers** to handle ordering

**Concurrency Patterns:**
- **Per-Request Isolation:** Each request gets its own context, no shared mutable state
- **Shared Read-Only Resources:** Large objects (knowledge graphs, vector indices) cached in memory, shared safely
- **Async/Await:** Use non-blocking operations; don't block one client's request on another's

**Example: Multi-Tool Requests**
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Each call is independent; host orchestrates results
  const toolName = request.params.name;
  const args = request.params.arguments;

  // Tool execution should be atomic and stateless
  const result = await executeTool(toolName, args);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

---

## 2. Data Layer Architecture

### 2.1 Vault Reading & Watching Patterns

**Core Design:** The Obsidian vault is a **directory of plain Markdown files**. Hivemind must efficiently:
1. Read and parse vault contents
2. Detect changes (watch file system)
3. Update internal indexes incrementally
4. Serve queries from updated indexes

#### **Reading Strategy**

```
[Vault Directory]
    |
[File System Watcher] -> [Event Queue]
    |
[Async Indexer]
    |
[In-Memory Index] <- [Vector DB] <- [Knowledge Graph]
    |
[Query Handler]
```

**Implementation Patterns:**
- **Recursive Directory Walk:** Initial vault load; use fs.walk() or glob to enumerate all .md files
- **File Watchers:** Use chokidar (Node.js) or similar to detect creates, updates, deletes
  - Debounce rapid changes (multiple saves) into single re-index operations
  - Tolerate file system delays (e.g., Obsidian's sync may rename/move files during save)

#### **Watching & Incremental Updates**

```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch(vaultPath, {
  persistent: true,
  ignored: /(^|[\/\\])\.|\.obsidian/,
  ignoreInitial: false,
  awaitWriteFinish: { stabilityThreshold: 500 }
});

watcher.on('add', (path) => queue.push({ event: 'add', path }));
watcher.on('change', (path) => queue.push({ event: 'change', path }));
watcher.on('unlink', (path) => queue.push({ event: 'delete', path }));

// Process queue with debouncing
setInterval(async () => {
  const batch = queue.splice(0, 100); // Process in batches
  if (batch.length > 0) {
    await updateIndexes(batch);
  }
}, 1000);
```

**Debouncing Strategy:**
- Collect events in a queue with a **1-2 second debounce window**
- Batch process: re-index multiple changes in a single transaction
- Prevents thrashing the index on rapid edits

### 2.2 Markdown Parsing Pipelines

**Parsing Steps:**

1. **Markdown -> AST:** Convert .md to abstract syntax tree
   - Tool: remark + remark-parse (JavaScript) or markdown-rs (Rust)
   - Preserve frontmatter (YAML), code blocks, links

2. **Metadata Extraction:**
   - **Frontmatter:** Tags, aliases, parent note (for hierarchy)
   - **Headings:** Section structure, outline
   - **Links:** [[Internal]], [External](url), backlinks
   - **Code Blocks:** Language, content (for reference, not indexing)
   - **Callouts/Admonitions:** Structured annotations

3. **Chunking Strategy:**
   - **Semantic chunks:** Split by heading level (H1, H2, H3)
   - **Size limits:** Target 512-1024 tokens per chunk (fits in embedding context)
   - **Overlap:** 50-100 tokens between chunks for context continuity
   - **Preserve hierarchy:** Track parent headings for context

**Example Pipeline:**
```typescript
import { unified } from 'unified';
import parse from 'remark-parse';
import { visit } from 'unist-util-visit';

async function parseVaultFile(filePath: string): Promise<NoteAst> {
  const content = await fs.readFile(filePath, 'utf-8');
  const processor = unified().use(parse);
  const ast = processor.parse(content);

  const chunks: Chunk[] = [];
  const links: Link[] = [];
  let currentHeading = '';

  visit(ast, (node) => {
    if (node.type === 'heading') {
      currentHeading = getHeadingText(node);
    } else if (node.type === 'paragraph') {
      const text = getNodeText(node);
      chunks.push({
        heading: currentHeading,
        text,
        tokens: tokenize(text).length
      });
    } else if (node.type === 'link') {
      links.push({ target: node.url, anchor: getNodeText(node) });
    }
  });

  return { filePath, chunks, links };
}
```

### 2.3 Knowledge Graph Construction from Markdown

**Three-Layer Construction:**

#### **Layer 1: Document-Level Nodes**
```
Node: { id, title, file, frontmatter, chunks }
```
- One node per .md file
- Frontmatter becomes node properties (tags, aliases)

#### **Layer 2: Explicit Links**
```
Edge: { source_id, target_id, type: 'references' | 'tagged' | 'hierarchical' }
```
- [[Internal Links]] in content -> references edges
- Shared tags -> implicit tagged relationships
- Parent/child from frontmatter or folder structure -> hierarchical edges

#### **Layer 3: Implicit Semantic Relationships** (Optional, LLM-based)
```
Edge: { source_id, target_id, type: 'discusses', 'relates_to', etc., confidence }
```
- Use embedding similarity or LLM extraction to find latent connections
- Lower confidence than explicit links; useful for discovery

**Implementation:**
```typescript
class KnowledgeGraphBuilder {
  graph = new Map<string, Node>();
  edges: Edge[] = [];

  async buildFromVault(notes: NoteAst[]): Promise<void> {
    // Layer 1: Add document nodes
    for (const note of notes) {
      const node: Node = {
        id: note.filePath,
        title: note.title,
        type: 'document',
        properties: note.frontmatter,
        chunks: note.chunks
      };
      this.graph.set(node.id, node);
    }

    // Layer 2: Add explicit edges
    for (const note of notes) {
      for (const link of note.links) {
        const targetId = this.resolveLink(link.target);
        if (targetId) {
          this.edges.push({
            source: note.filePath,
            target: targetId,
            type: 'references',
            weight: 1.0
          });
        }
      }
    }

    // Layer 3: Optional LLM-based extraction
    if (this.options.llmExtraction) {
      await this.extractSemanticEdges();
    }
  }

  exportToNeo4j(): string {
    // Generate Cypher queries for bulk import
    const queries: string[] = [];
    for (const node of this.graph.values()) {
      queries.push(`CREATE (:Note { id: "${node.id}", ... })`);
    }
    for (const edge of this.edges) {
      queries.push(
        `MATCH (a), (b) WHERE a.id = "${edge.source}" AND b.id = "${edge.target}"
         CREATE (a)-[:${edge.type}]->(b)`
      );
    }
    return queries.join('\n');
  }
}
```

**Storage Options:**
- **In-Memory (Development):** Map<id, Node>, Map<id, Edge[]>
- **SQLite (Local):** Nodes and edges in tables; fast joins, portable
- **Neo4j (Production):** Full ACID, advanced querying, multi-instance replication

### 2.4 Index Building & Incremental Updates

**Index Types:**

1. **Full-Text Index:** BM25 on note titles and content
   - **Tool:** Elasticsearch, MeiliSearch, or SQLite FTS5
   - **Update:** Incremental; re-index changed notes only

2. **Vector Index:** Embeddings for semantic search
   - **Storage:** Pinecone, Weaviate, pgvector, or FAISS (local)
   - **Chunking:** 512-1024 token chunks with 50-token overlap
   - **Embeddings:** Use text-embedding-3-small (OpenAI) or open-source nomic-embed-text

3. **Knowledge Graph Index:** Entity/relationship lookups
   - **Storage:** Neo4j, Memgraph, or in-memory adjacency list
   - **Queries:** Cypher for traversals, pattern matching

#### **Incremental Update Process**

```
[File Change Event]
    |
[Extract Changes] -> [Parse Markdown] -> [Update KG Nodes/Edges]
    |
[Re-Compute Embeddings] -> [Update Vector Index]
    |
[Update Full-Text Index] -> [Invalidate Query Cache]
    |
[Notify Clients] (via MCP notifications)
```

**Algorithms:**

```typescript
async function incrementalUpdate(changes: FileChange[]): Promise<void> {
  const transaction = await db.startTransaction();

  try {
    for (const change of changes) {
      switch (change.event) {
        case 'add':
          const note = await parseFile(change.path);
          await addNodeToGraph(note);
          await embedAndIndexNote(note);
          break;

        case 'change':
          const oldNote = graph.get(change.path);
          const newNote = await parseFile(change.path);

          // Update node properties, edges
          await updateNodeInGraph(oldNote, newNote);

          // Re-embed changed chunks only
          const changedChunks = diff(oldNote.chunks, newNote.chunks);
          await reEmbedChunks(changedChunks);
          break;

        case 'delete':
          // Remove node and all incident edges
          await removeNodeFromGraph(change.path);
          break;
      }
    }

    await transaction.commit();
    await invalidateQueryCache(); // Cache invalidation
    await notifyClients('vault-updated', { timestamp: Date.now() });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}
```

### 2.5 Caching Strategies

**Multi-Level Caching:**

1. **Query Result Cache**
   - **What:** Cached results of common queries (e.g., "find all notes tagged #worldbuilding")
   - **TTL:** Invalidated on vault changes; 24-hour hard expiry
   - **Storage:** In-memory LRU (least-recently-used) or Redis
   - **Key:** Query hash + vault state hash

2. **Embedding Cache**
   - **What:** Pre-computed embeddings for note chunks
   - **TTL:** Permanent until chunk changes
   - **Storage:** SQLite with blob columns or vector DB
   - **Benefit:** Avoid re-embedding unchanged content

3. **Index Page Cache** (for vector DB)
   - **What:** Frequently accessed HNSW graph nodes cached in RAM
   - **Strategy:** "Hot" vectors (popular topics) in memory; "cold" on disk
   - **Benefit:** Faster similarity search

4. **Full-Text Index Cache**
   - **What:** Preprocessed term index (inverse mapping term -> documents)
   - **Strategy:** Memory-mapped file for large indexes; mmap() for fast access

5. **KG Traversal Cache**
   - **What:** Cached graph traversals (e.g., "all nodes reachable from X in 3 hops")
   - **TTL:** Invalidated on graph modifications
   - **Benefit:** Fast multi-hop reasoning without re-traversing

**Cache Invalidation Strategy:**
```typescript
class CacheManager {
  private cache = new LRU<string, any>({ max: 1000 });
  private vaultStateHash: string;

  async invalidateOn(changes: FileChange[]): Promise<void> {
    // Compute new vault state
    const newHash = hashVaultState();

    // Selective invalidation
    for (const change of changes) {
      // Invalidate queries that reference this file
      const relatedQueries = this.findQueriesAffectedBy(change.path);
      for (const query of relatedQueries) {
        this.cache.delete(query);
      }
    }

    this.vaultStateHash = newHash;
  }

  private findQueriesAffectedBy(filePath: string): string[] {
    // Find queries that mention this file or its entities
    return Array.from(this.cache.keys()).filter(key => {
      const metadata = this.queryMetadata.get(key);
      return metadata?.referencedFiles.includes(filePath);
    });
  }
}
```

---

## 3. Query Architecture

### 3.1 Query Routing & Planning

**Query Types:**

1. **Keyword Search:** "Find notes about dragons"
2. **Semantic Search:** "Tell me about large reptilian creatures"
3. **Graph Traversal:** "What characters are connected to the Dales?"
4. **Hybrid:** Combination of the above

**Router Logic:**
```
[User Query]
    |
[Intent Classification] -> Is it keyword? semantic? graph? hybrid?
    |
    +-> [Full-Text Retrieval] (BM25)
    |
    +-> [Vector Search] (embeddings + similarity)
    |
    +-> [Graph Query] (Cypher/GQL)
    |
[Rerank & Merge Results]
    |
[Context Ranking & Filtering]
    |
[Format Response]
```

**Implementation:**
```typescript
class QueryRouter {
  async route(query: string): Promise<SearchResult[]> {
    // Classify query
    const intent = await classifyIntent(query);

    const results: SearchResult[] = [];

    if (intent.keyword) {
      results.push(...await fullTextSearch(query));
    }
    if (intent.semantic) {
      results.push(...await vectorSearch(query));
    }
    if (intent.graph) {
      results.push(...await graphQuery(extractGraphPattern(query)));
    }

    // Merge and rank results
    const merged = mergeResults(results);
    const ranked = await rerankResults(merged, query);

    return ranked.slice(0, 10); // Top K
  }
}
```

### 3.2 GraphRAG vs. Vector RAG Patterns

**Vector RAG (Semantic Search):**
- **Strengths:** Great for fuzzy matching, synonym handling, open-domain queries
- **Weaknesses:** No multi-hop reasoning, struggles with structured relationships
- **Best for:** "What is the history of the Kingdoms?" (narrative exploration)

**GraphRAG (Structured Knowledge):**
- **Strengths:** Multi-hop reasoning, explicit relationships, hallucination reduction
- **Weaknesses:** Requires entities/relationships to be pre-extracted, misses unstructured nuance
- **Best for:** "Who rules the Dales and what are their alliances?" (fact retrieval)

**HybridRAG (Recommended for Hivemind):**
- **Combine:** Vector search for semantic relevance + Graph traversal for structured context
- **Process:**
  1. Vector search finds semantically relevant chunks
  2. Graph traversal expands to related entities
  3. Merge and rerank results
  4. LLM generates final answer with unified context

### 3.3 Hybrid Search Implementation

```typescript
class HybridSearchEngine {
  async search(query: string, options: SearchOptions = {}): Promise<Context> {
    // Parallel execution for speed
    const [vectorResults, graphResults] = await Promise.all([
      this.vectorSearch(query),
      this.graphSearch(query)
    ]);

    // Merge results
    const merged = this.mergeResults(vectorResults, graphResults);

    // Rerank using cross-encoder
    const reranked = await this.rerankWithCrossEncoder(query, merged);

    // Format for LLM context
    return this.formatContext(reranked, options);
  }

  private async vectorSearch(query: string): Promise<VectorResult[]> {
    const embedding = await this.embedder.embed(query);

    // Search vector DB for similar chunks
    const results = await this.vectorDb.similaritySearch(embedding, {
      limit: 20,
      threshold: 0.7
    });

    return results.map(r => ({
      type: 'vector',
      id: r.id,
      content: r.metadata.text,
      score: r.score,
      source: r.metadata.file
    }));
  }

  private async graphSearch(query: string): Promise<GraphResult[]> {
    // Extract entities from query
    const entities = await this.extractEntities(query);

    // Traverse graph for related nodes
    const patterns = entities.map(e =>
      this.graphDb.query(`
        MATCH (n) WHERE n.name = "${e}"
        MATCH (n)-[*1..2]-(related)
        RETURN related, n
      `)
    );

    const results = await Promise.all(patterns);

    return results.flat().map(r => ({
      type: 'graph',
      id: r.related.id,
      content: r.related.properties,
      score: r.n ? 1.0 : 0.5, // Direct connections higher score
      source: r.related.file
    }));
  }

  private mergeResults(vectorResults: VectorResult[], graphResults: GraphResult[]): MergedResult[] {
    const merged = new Map<string, MergedResult>();

    for (const vr of vectorResults) {
      merged.set(vr.id, {
        id: vr.id,
        vectorScore: vr.score,
        graphScore: 0,
        content: vr.content,
        source: vr.source
      });
    }

    for (const gr of graphResults) {
      if (merged.has(gr.id)) {
        merged.get(gr.id)!.graphScore = gr.score;
      } else {
        merged.set(gr.id, {
          id: gr.id,
          vectorScore: 0,
          graphScore: gr.score,
          content: JSON.stringify(gr.content),
          source: gr.source
        });
      }
    }

    return Array.from(merged.values());
  }
}
```

### 3.4 Context Ranking & Filtering

**Ranking Signals:**
1. **Relevance Score:** Vector similarity + graph centrality
2. **Recency:** Recently modified files ranked higher (configurable)
3. **Importance:** Page rank on knowledge graph (who links to this?)
4. **Diversity:** Don't return 5 chunks from same file (spread across sources)
5. **Query Specificity:** Exact matches > fuzzy > broad results

**Filtering:**
- **Tag-based:** User can filter by tags ("Only from #canon")
- **Scope-based:** Limit to specific folder ("Only in Characters/")
- **Time-based:** Edited within last N days
- **Confidence-based:** Only include edges/relationships above confidence threshold

```typescript
interface RankingContext {
  relevance: number;      // 0-1 from search engine
  recency: number;        // Time decay factor
  pageRank: number;       // Graph centrality
  querySpecificity: number; // How well query matches
  diversityPenalty: number; // Penalty if too many from same source
}

function rankResults(
  results: SearchResult[],
  query: string,
  options: FilterOptions
): RankedResult[] {
  const weights = {
    relevance: 0.5,
    recency: 0.1,
    pageRank: 0.2,
    specificity: 0.1,
    diversity: 0.1
  };

  return results
    .filter(r => applyFilters(r, options))
    .map(r => ({
      ...r,
      score: computeScore(r, weights, query)
    }))
    .sort((a, b) => b.score - a.score);
}
```

### 3.5 Response Assembly

**Context Window Management:**
- **Target:** Fit relevant context + response in LLM context window
- **Strategy:** Include highest-ranked chunks until context limit (e.g., 4000 tokens)

**Response Format:**
```json
{
  "context": [
    {
      "file": "Characters/Aragorn.md",
      "excerpt": "...",
      "relevance": 0.92
    }
  ],
  "related": [
    {
      "type": "character",
      "name": "Arwen",
      "relation": "loves"
    }
  ],
  "sources": ["Characters/Aragorn.md", "Locations/Rivendell.md"],
  "timestamp": 1234567890
}
```

---

## 4. Integration Patterns

### 4.1 ComfyUI Workflow Integration

**Vision:** Hivemind -> ComfyUI allows worldbuilding vault to drive AI image generation

**Architecture:**

```
[Hivemind Query] -> [Extract Descriptions]
    |
[Prompt Engineering] -> [ComfyUI Workflow]
    |
[Node Parameters] <- [Vault Data Mapping]
    |
[Generate Images] -> [Store in Vault/Gallery]
```

**Implementation Pattern:**

```typescript
class ComfyUIBridge {
  async generateArtFromVault(
    character: VaultNote,
    workflowTemplate: string
  ): Promise<string> {
    // Extract key details from character note
    const { appearance, role, era } = parseCharacter(character);

    // Build ComfyUI workflow JSON
    const workflow = {
      1: { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "model.safetensors" } },
      2: { class_type: "CLIPTextEncode", inputs: {
        text: this.buildPrompt(appearance, role, era),
        clip: [1, 0]
      }},
      3: { class_type: "KSampler", inputs: {
        seed: this.hashNote(character.id),
        model: [1, 0]
      }},
      4: { class_type: "VAEDecode", inputs: {
        samples: [3, 0],
        vae: [1, 0]
      }},
      5: { class_type: "SaveImage", inputs: {
        images: [4, 0],
        filename_prefix: character.id
      }}
    };

    // Submit to ComfyUI
    const result = await fetch('http://localhost:8188/api/prompt', {
      method: 'POST',
      body: JSON.stringify(workflow)
    });

    const { prompt_id } = await result.json();

    // Wait for completion
    return this.waitForCompletion(prompt_id);
  }

  private buildPrompt(appearance: string, role: string, era: string): string {
    return `A portrait of a ${role}: ${appearance},
            cinematic lighting, detailed features, trending on artstation`;
  }
}
```

**Key Patterns:**
- **Deterministic Seeds:** Hash note ID -> consistent image for same character
- **Workflow Templates:** Store reusable ComfyUI JSONs in vault (e.g., .comfy/templates/)
- **Prompt Injection:** Extract data from vault -> parameterize prompts
- **Result Storage:** Generated images -> linked in vault notes

### 4.2 Multiple AI Tool Support

**Generic Tool Integration Framework:**

```typescript
interface AIToolAdapter {
  name: string;
  apiEndpoint: string;
  schemas: {
    input: JsonSchema;
    output: JsonSchema;
  };
  transform: (vaultData: any) => ToolInput;
  postProcess: (result: ToolOutput) => VaultData;
}

class AIToolRegistry {
  private tools = new Map<string, AIToolAdapter>();

  register(tool: AIToolAdapter) {
    this.tools.set(tool.name, tool);
  }

  async invoke(toolName: string, vaultContext: VaultNote): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) throw new Error(`Tool not found: ${toolName}`);

    // Transform vault data to tool input
    const input = tool.transform(vaultContext);

    // Call tool API
    const response = await fetch(tool.apiEndpoint, {
      method: 'POST',
      body: JSON.stringify(input)
    });

    const result = await response.json();

    // Post-process and return to vault format
    return tool.postProcess(result);
  }
}

// Example adapters
const comfyAdapter: AIToolAdapter = {
  name: 'comfyui',
  apiEndpoint: 'http://localhost:8188/api/prompt',
  schemas: { /* ... */ },
  transform: (note) => ({ prompt: note.content }),
  postProcess: (result) => ({ generatedImages: result.filenames })
};

const anthropicAdapter: AIToolAdapter = {
  name: 'anthropic',
  apiEndpoint: 'https://api.anthropic.com/messages',
  schemas: { /* ... */ },
  transform: (note) => ({ messages: [{ content: note.content }] }),
  postProcess: (result) => ({ analysis: result.content[0].text })
};
```

### 4.3 Asset Reference Delivery

**Problem:** Vault contains references to images, videos, etc. How to serve them via MCP?

**Solution: File-Serving Resource Handler**

```typescript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = new URL(request.params.uri);

  if (uri.protocol === 'file:') {
    // Local file within vault
    const filePath = uri.pathname;

    // Security: ensure path is within vault
    if (!isWithinVault(filePath)) {
      throw new Error('Access denied');
    }

    const content = await fs.readFile(filePath);
    const mimeType = getMimeType(filePath);

    return {
      contents: [{
        type: 'text',
        text: content.toString('base64'),  // Base64 for binary
        mimeType
      }]
    };
  }

  if (uri.protocol === 'asset:') {
    // Asset registry lookup
    const assetId = uri.pathname;
    const asset = await assetRegistry.get(assetId);
    return { contents: [asset] };
  }
});
```

**Asset Registry:**
- Maintain mapping: asset:character-1 -> /vault/assets/characters/aragorn.png
- Support versioning: asset:character-1@v2
- Enable CDN-ready paths for remote deployments

### 4.4 Bidirectional Sync (Vault <-> Generated Content)

**Pattern: Generated content (images, summaries, relationships) written back to vault**

```typescript
class BidirectionalSyncManager {
  // LLM generates summary, write back to vault
  async generateAndSyncSummary(noteId: string, llmResponse: string): Promise<void> {
    const note = await vaultReader.read(noteId);

    // Insert summary into vault note
    const updatedContent = `${note.content}

## Generated Summary
${llmResponse}`;

    // Write back to vault
    await vaultWriter.write(noteId, {
      ...note,
      content: updatedContent,
      frontmatter: {
        ...note.frontmatter,
        'generated-summary': true,
        'generated-at': new Date().toISOString()
      }
    });

    // Notify clients of update
    await this.notifyClients('note-updated', { noteId });
  }

  // Generated image linked from vault
  async linkGeneratedAsset(noteId: string, assetPath: string): Promise<void> {
    const note = await vaultReader.read(noteId);

    const assetLink = `![Generated Image](${assetPath})`;

    const updatedContent = `${note.content}

## Generated Assets
${assetLink}`;

    await vaultWriter.write(noteId, { ...note, content: updatedContent });
  }

  // Conflict resolution for concurrent edits
  async mergeGeneratedEdits(
    noteId: string,
    userContent: string,
    aiContent: string
  ): Promise<string> {
    // Use CRDT or 3-way merge
    const baseContent = await vaultReader.readVersion(noteId, 'previous');

    // Attempt automatic merge
    const merged = threeWayMerge(baseContent, userContent, aiContent);

    if (merged.hasConflicts) {
      // Mark conflicts in note for manual resolution
      return applyConflictMarkers(merged.result);
    }

    return merged.result;
  }
}
```

**Conflict Resolution Strategy:**
- **User Content Priority:** If both user and AI edit same section, keep user changes
- **Conflict Markers:** Mark conflicts with standard syntax for manual review
- **Versioning:** Keep revision history; allow reverting generated content
- **CRDT-Based Sync:** Use Yjs or Automerge for complex collaborative scenarios

---

## 5. Scalability & Performance

### 5.1 Vault Size Limits & Handling

**Tested Scenarios:**
- **Small (< 100 notes):** < 50 MB total; sub-second search latency; in-memory index
- **Medium (100-1K notes):** 50-500 MB; second-scale latency; single-machine with SSD
- **Large (1K-10K notes):** 500 MB-5 GB; requires distributed indexes; sharding
- **Extra-Large (> 10K notes):** Multi-machine clusters; federation

**Scaling Strategy:**

```
Small Vault (In-Memory)
    |
Medium Vault (Local SSD + Incremental Indexing)
    |
Large Vault (Distributed Index, Sharding by Tag/Folder)
    |
Extra-Large Vault (Multiple Vault Instances, Federation)
```

**Implementation:**
```typescript
class VaultScaler {
  private vaultSize: number;

  async optimizeForSize(): Promise<void> {
    const stats = await this.analyzeVault();
    this.vaultSize = stats.totalBytes;

    if (this.vaultSize < 50_000_000) {
      // Small: use in-memory, aggressively cache
      this.config.cacheStrategy = 'all-in-memory';
      this.config.indexType = 'in-memory-hash';
    } else if (this.vaultSize < 500_000_000) {
      // Medium: use SSD + selective caching
      this.config.cacheStrategy = 'lru-disk';
      this.config.indexType = 'sqlite-fts';
    } else if (this.vaultSize < 5_000_000_000) {
      // Large: distributed indexes
      this.config.cacheStrategy = 'distributed-redis';
      this.config.indexType = 'elasticsearch-sharded';
    } else {
      // Extra-Large: multi-instance federation
      this.config.architecture = 'federated';
    }
  }
}
```

### 5.2 Query Performance at Scale

**Optimization Techniques:**

1. **Index Strategy by Query Type:**
   - Keyword: BM25 on full-text index (fast)
   - Semantic: Vector search with quantization (fast)
   - Graph: Cached path indexes (fast for common traversals)

2. **Query Caching:**
   - Cache recent queries by hash
   - Invalidate on vault changes
   - TTL: 24 hours or on modification

3. **Parallel Execution:**
   - Run vector + graph searches in parallel
   - Merge results asynchronously
   - Stream results to client rather than buffering

4. **Approximate Algorithms:**
   - HNSW instead of exact KNN (faster, slight accuracy trade-off)
   - Probabilistic counting for cardinality (HyperLogLog)
   - Sketch structures for frequency estimation

**Latency Targets:**
- Keyword search: < 100 ms
- Vector search: < 200 ms (on cached indexes)
- Graph traversal (2-3 hops): < 150 ms
- Hybrid search: < 300 ms
- Response assembly (LLM context): < 500 ms

### 5.3 Incremental Indexing

**Batch Processing Schedule:**
- **Real-time (< 100 ms debounce):** Detect file changes
- **Incremental (0.5-2 s):** Parse markdown, update graph, re-embed chunks
- **Background (hourly):** Rebalance indexes, compute statistics, prune cache

```typescript
class IndexingScheduler {
  private queues = {
    realtime: new PriorityQueue<FileChange>(),
    incremental: new BatchQueue<FileChange>({ batchSize: 100, debounce: 1000 }),
    background: new CronJob('0 * * * *')  // Hourly
  };

  async processQueues(): Promise<void> {
    // Real-time: Immediate notification to clients
    if (this.queues.realtime.size > 0) {
      const change = this.queues.realtime.dequeue();
      await this.updateInMemoryIndexes(change);
      await this.notifyClients('change-detected', change);
    }

    // Incremental: Batch update indexes
    this.queues.incremental.on('batch', async (batch) => {
      const transaction = await db.startTransaction();
      try {
        for (const change of batch) {
          await this.updatePersistentIndexes(change);
        }
        await transaction.commit();
      } catch {
        await transaction.rollback();
      }
    });

    // Background: Maintenance
    this.queues.background.on('tick', async () => {
      await this.rebalanceIndexes();
      await this.computeGraphStatistics();
      await this.pruneCache();
    });
  }
}
```

### 5.4 Memory Management

**Memory Budget:**
- **Vector Index:** ~20 MB per 1000 vectors (with quantization)
- **Full-Text Index:** ~10% of source data size
- **KG In-Memory:** ~100 KB per 1000 nodes
- **Query Cache:** ~5 MB per 1000 cached results

**Strategies:**
1. **Quantization:** Store vectors at 8-bit instead of 32-bit (4x savings)
2. **Compression:** Delta-encode timestamps, use sparse representation for graphs
3. **Lazy Loading:** Load chunks on-demand rather than keeping all in memory
4. **LRU Eviction:** Keep hot indexes in RAM; evict cold ones to disk

```typescript
class MemoryManager {
  private budget = 512 * 1024 * 1024; // 512 MB
  private usage = 0;

  async allocate(type: 'vector' | 'index' | 'cache', size: number): Promise<void> {
    if (this.usage + size > this.budget) {
      await this.evictColdResources(size - (this.budget - this.usage));
    }

    this.usage += size;
  }

  private async evictColdResources(needed: number): Promise<void> {
    const resources = this.rankByTemperature();
    let freed = 0;

    for (const resource of resources) {
      if (!resource.isPinned) {
        freed += await resource.offloadToDisk();
        if (freed >= needed) break;
      }
    }
  }
}
```

### 5.5 Concurrency Patterns

**Multi-Client Handling:**
- **Request Isolation:** Each request has its own context
- **Read-Write Locks:** Lock indexes during updates, allow concurrent reads
- **Event Queue:** Serialize file change events to prevent race conditions

```typescript
class ConcurrencyManager {
  private indexLock = new RWLock();
  private fileChanges = new Queue<FileChange>();

  async readIndex<T>(fn: () => Promise<T>): Promise<T> {
    await this.indexLock.readLock();
    try {
      return await fn();
    } finally {
      this.indexLock.unlock();
    }
  }

  async writeIndex<T>(fn: () => Promise<T>): Promise<T> {
    await this.indexLock.writeLock();
    try {
      return await fn();
    } finally {
      this.indexLock.unlock();
    }
  }

  async processFileChanges(): Promise<void> {
    while (this.fileChanges.size > 0) {
      const batch = this.fileChanges.dequeueBatch(100);
      await this.writeIndex(async () => {
        // Update all indexes atomically
      });
    }
  }
}
```

---

## 6. Deployment Architecture

### 6.1 Local-First Design

**Core Principle:** Vault and indexes live on user's machine; cloud is optional

**Deployment Scenarios:**

1. **Single-User Local**
   - MCP server runs locally (stdio transport)
   - All data on user's disk
   - No cloud dependency

2. **Multi-Device Sync (Obsidian Sync Compatible)**
   - Local instance on each device
   - Obsidian Sync handles vault synchronization
   - Indexes rebuilt locally (or cached if unchanged)

3. **Optional Cloud Backup**
   - Encrypted backups of vault to S3/etc
   - Indexes NOT synced (rebuilt on-demand)
   - API gateway for remote access (Oauth2 + mTLS)

### 6.2 Single-User vs. Multi-User Models

#### **Single-User (Default)**
```yaml
Device: MacBook
├── Vault: ~/Library/Mobile Documents/iCloud~md~obsidian/
├── MCP Server: stdio process
└── Indexes: ~/.hivemind/indexes/
```

#### **Multi-User (Team Worldbuilding)**
```
S3 Vault Bucket (shared)
├── Obsidian Sync Backend (or Git)
└── Indexes (per-user, local rebuild)

User 1:                  User 2:
├── MCP Server (HTTP)    ├── MCP Server (HTTP)
├── Local Indexes        └── Local Indexes
└── Client (Obsidian)
```

**Key Difference:**
- Single-user: No auth needed; local file access
- Multi-user: Central vault store; per-user auth; per-user index caches

### 6.3 Configuration Management

**Config File Structure:**
```yaml
# ~/.hivemind/config.yaml
vault:
  path: ~/obsidian-vault
  type: local  # or 'obsidian-sync', 's3', 'git'

server:
  transport: stdio  # or 'http', 'sse'
  port: 3000

indexing:
  strategy: incremental  # or 'batch'
  batch-size: 100
  debounce-ms: 1000

search:
  embedding-model: text-embedding-3-small
  vector-db: faiss  # or 'pinecone', 'weaviate'
  kg-db: sqlite  # or 'neo4j'

cache:
  query-ttl-hours: 24
  memory-budget-mb: 512
  strategy: lru

integrations:
  comfyui:
    enabled: true
    endpoint: http://localhost:8188
  anthropic:
    enabled: true
    api-key: ${ANTHROPIC_API_KEY}
```

### 6.4 Vault Portability

**Design:** Vault can be moved/synced without losing functionality

**Challenges:**
- Absolute paths in index metadata
- Relative links might break

**Solutions:**
```typescript
class VaultPortability {
  // Store relative paths in indexes
  async reindex(oldPath: string, newPath: string): Promise<void> {
    const scale = newPath.length - oldPath.length;

    for (const index of this.indexes) {
      await index.updateReferencePaths((path: string) => {
        return path.replace(oldPath, newPath);
      });
    }
  }

  // Canonicalize paths in cross-references
  toRelativePath(absolutePath: string, vaultRoot: string): string {
    return path.relative(vaultRoot, absolutePath);
  }

  toAbsolutePath(relativePath: string, vaultRoot: string): string {
    return path.resolve(vaultRoot, relativePath);
  }
}
```

### 6.5 Distribution Models

**Option 1: NPM Package**
```bash
npm install hivemind-mcp
hivemind-mcp --vault ~/my-vault --transport stdio
```

**Option 2: Obsidian Plugin (Embedded MCP Server)**
- Plugin runs MCP server in-process
- Communicates via postMessage() or WebWorker
- Zero configuration

**Option 3: Standalone Binary (Tauri/Electron)**
- Desktop app with UI
- Auto-updates
- System tray integration

**Option 4: Docker Container**
```dockerfile
FROM node:18
RUN npm install -g hivemind-mcp
ENTRYPOINT ["hivemind-mcp", "--vault", "/vault", "--transport", "http", "--port", "3000"]
```

---

## 7. Reference Architectures

### 7.1 Existing MCP Server Architectures

**Pattern 1: Filesystem Server (MCP Official Example)**
- Exposes local files as resources
- Read/write operations through MCP tools
- Security: path validation, chroot jailing

**Pattern 2: Database Server**
- Exposes query tools (SQL, Cypher, etc.)
- Resource listing for tables/schemas
- Streaming large result sets

**Pattern 3: API Proxy Server**
- Wraps external APIs (Slack, GitHub, etc.)
- Authentication via OAuth or API key
- Rate limiting and caching

**Pattern 4: Multi-Tool Server** (Closest to Hivemind)
- Multiple domains (resources, tools, prompts)
- Complex state (indexes, caches)
- Real-time notifications for updates

### 7.2 Similar Systems: Obsidian Plugins & Knowledge Bases

**Obsidian Plugins (Reference):**
- **Dataview:** Query language over vault; shows indexes exist locally
- **Graph View:** In-memory KG visualization
- **Templater:** Template + scripting; shows state management
- **Sync:** Local-first arch with bidirectional sync

**External Knowledge Systems:**
- **Athens Research:** Local-first knowledge base with semantic reasoning
- **Logseq:** Similar Obsidian competitor; also local markdown-based

**Key Insight:** Success requires:
1. Fast local indexes (sub-100ms queries)
2. Incremental sync
3. Privacy-first (all local)
4. Extensibility (plugins, integrations)

### 7.3 Anti-Patterns to Avoid

**NO Blocking Operations**
- Don't parse entire vault on startup
- Don't lock index during all queries
- Don't wait for embeddings synchronously

**Solution:** Async/await, background processing, lazy loading

**NO Unbounded Memory**
- Don't keep all vectors in RAM
- Don't cache infinite query results
- Don't duplicate data across indexes

**Solution:** LRU caches, quantization, deduplication

**NO Single Point of Failure**
- Don't store only one copy of vault
- Don't lose indexes if process crashes
- Don't require cloud for core functionality

**Solution:** Local-first, persistent indexes, graceful degradation

**NO Tight Coupling**
- Don't hardcode vector DB choice
- Don't assume MCP is only transport
- Don't embed business logic in query router

**Solution:** Adapter pattern, plugin architecture, dependency injection

---

## 8. Implementation Roadmap

### Phase 1: MVP (Foundation)
- [ ] MCP server skeleton (stdio transport)
- [ ] Vault reader + file watcher
- [ ] Markdown parser + chunker
- [ ] In-memory KG (Map-based)
- [ ] Full-text search (BM25 via SQLite FTS5)
- [ ] Basic vector search (FAISS local)
- [ ] Query router (keyword + semantic)
- [ ] Tests + documentation

### Phase 2: Integration & Scale
- [ ] HTTP/SSE transport support
- [ ] Incremental indexing + batch processing
- [ ] Cache layer (LRU, query caching)
- [ ] Context ranking + filtering
- [ ] Asset reference delivery
- [ ] ComfyUI integration POC
- [ ] Performance testing (latency, memory)

### Phase 3: Production
- [ ] Multi-user support (auth layer)
- [ ] Neo4j GraphRAG integration
- [ ] Bidirectional sync (generated content)
- [ ] Conflict resolution (CRDT or OT)
- [ ] Cloud deployment options
- [ ] Obsidian plugin wrapper
- [ ] Monitoring & observability

### Phase 4: Advanced
- [ ] Multi-vault federation
- [ ] Advanced AI tool composition
- [ ] Real-time collaborative editing
- [ ] Custom embedding fine-tuning
- [ ] Advanced graph analytics (centrality, clusters)
- [ ] Web UI dashboard

---

## 9. Developer Experience Features Architecture

**Added:** 2026-01-26
**Focus:** Setup Wizard, Frontmatter Tools Integration

This section documents the architecture for Developer Experience (DX) features: `init`, `validate`, `fix` commands and Obsidian plugin frontmatter tools.

### 9.1 Current Component Overview

The codebase has clear component boundaries supporting DX features:

```
                    +-------------------+
                    |   CLI (cli.ts)    |
                    |   - init          |
                    |   - validate      |
                    |   - fix           |
                    +--------+----------+
                             |
                             v
+-------------------+   +-----------+   +------------------+
|  Config Loader    |<->| Template  |<->| Obsidian Plugin  |
|  (config/schema)  |   | Registry  |   | (main.ts)        |
+-------------------+   +-----------+   +------------------+
        |                    |                   |
        v                    v                   v
+-------------------+   +-----------+   +------------------+
|  VaultReader      |   | Template  |   | FrontmatterModal |
|  (vault/reader)   |   | Validator |   | TypeInference    |
+-------------------+   +-----------+   +------------------+
        |                                        |
        v                                        v
+-------------------+               +------------------+
|  MarkdownParser   |               | YAML Generation  |
|  (parser/markdown)|               | (inline)         |
+-------------------+               +------------------+
```

### 9.2 Existing Components to Leverage

| Component | Location | Current Use | Integration Point |
|-----------|----------|-------------|-------------------|
| `VaultReader` | `src/vault/reader.ts` | Scans vault, indexes files | `validate` command file discovery |
| `MarkdownParser` | `src/parser/markdown.ts` | Extracts frontmatter, validates | `fix` command frontmatter parsing |
| `TemplateRegistry` | `src/templates/registry.ts` | Entity type definitions | Schema validation for frontmatter |
| `FolderMapper` | `src/templates/folder-mapper.ts` | Infers type from path | Auto-type detection in `fix` |
| `validateConfig` | `src/config/schema.ts` | Config.json validation | `validate` command |

### 9.3 Duplication Analysis

**Duplicated Code Between CLI and Obsidian Plugin:**

1. **Folder-to-type mappings** - Identical logic in:
   - `src/templates/folder-mapper.ts` (DEFAULT_FOLDER_MAPPINGS)
   - `obsidian-plugin/main.ts` (FOLDER_TYPE_MAPPINGS)

2. **Frontmatter templates** - Similar structures in:
   - `src/cli.ts` (implicit in `addFrontmatter()`)
   - `obsidian-plugin/main.ts` (FRONTMATTER_TEMPLATES)

3. **Type inference** - Same algorithm in:
   - `src/templates/folder-mapper.ts` (FolderMapper.inferType)
   - `obsidian-plugin/main.ts` (inferTypeFromPath)

4. **ID generation** - Same slug algorithm in:
   - `src/cli.ts` (generateId)
   - `obsidian-plugin/main.ts` (generateId methods)

**Recommendation:** Extract to shared modules in `src/frontmatter/`.

### 9.4 Recommended New Modules

#### `src/frontmatter/generator.ts`

```typescript
/**
 * Generates frontmatter from templates.
 */
export class FrontmatterGenerator {
  constructor(private registry: TemplateRegistry) {}

  generateForType(
    entityType: string,
    fileName: string,
    existingFrontmatter?: Record<string, any>
  ): Record<string, any> {
    const entityConfig = this.registry.getEntityType(entityType);
    if (!entityConfig) throw new Error(`Unknown type: ${entityType}`);

    const id = this.generateId(fileName, entityType);
    const frontmatter: Record<string, any> = {
      id,
      type: entityType,
      status: 'draft',
      ...existingFrontmatter,
    };

    // Add template-defined fields with defaults
    for (const field of entityConfig.fields) {
      if (frontmatter[field.name] === undefined) {
        frontmatter[field.name] = field.default ?? this.getDefaultForType(field.type);
      }
    }

    return frontmatter;
  }

  private generateId(name: string, type: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${type}-${slug}`;
  }
}
```

#### `src/frontmatter/validator.ts`

```typescript
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class FrontmatterValidator {
  constructor(private registry: TemplateRegistry) {}

  validate(frontmatter: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required base fields
    if (!frontmatter.id) errors.push({ field: 'id', message: 'Missing required field', severity: 'error' });
    if (!frontmatter.type) errors.push({ field: 'type', message: 'Missing required field', severity: 'error' });
    if (!frontmatter.status) errors.push({ field: 'status', message: 'Missing required field', severity: 'error' });

    // Template-specific validation
    const entityType = this.registry.getEntityType(frontmatter.type);
    if (entityType) {
      for (const field of entityType.fields) {
        if (field.required && frontmatter[field.name] === undefined) {
          errors.push({ field: field.name, message: 'Missing required field', severity: 'error' });
        }
      }
    }

    return errors;
  }
}
```

### 9.5 Integration Points for DX Features

#### `npx hivemind init` (Setup Wizard)

**Current State:** Already implemented in `src/cli.ts` `init()` function.
**No new components needed** - enhance existing with:
- Auto-detect vault structure (use VaultReader)
- Suggest template based on folder names (use FolderMapper)

#### `npx hivemind validate` (Validation Command)

**Current State:** Partially implemented in `src/cli.ts` `validate()` function.
**Enhancement Needed:**
- Add frontmatter validation using `MarkdownParser`
- Add template schema validation using `TemplateRegistry`

#### `npx hivemind fix` (Frontmatter Fix)

**Current State:** Implemented in `src/cli.ts` `fix()` function.
**Enhancement Needed:**
- Add `--all` flag to scan all files without frontmatter
- Use `VaultReader.findMarkdownFiles()` directly
- Template-aware frontmatter generation

#### Obsidian Plugin Commands

**Current State:** Implemented in `obsidian-plugin/main.ts`.
**Architecture Decision:** Plugin is intentionally standalone for:
- Zero runtime dependencies on main package
- Offline functionality
- Faster load times

### 9.6 Suggested Build Order

**Phase 1: Foundation (No User-Facing Changes)**
1. Extract `FrontmatterGenerator` from CLI and Obsidian plugin
2. Extract `FrontmatterValidator`
3. Extract `FrontmatterSerializer` from Obsidian plugin

**Phase 2: Enhanced CLI Commands**
4. Enhance `validate` command with frontmatter validation
5. Enhance `fix` command with `--all` flag

**Phase 3: Obsidian Plugin Sync (Optional)**
6. Update Obsidian plugin to use template registry (if needed)

### 9.7 Anti-Patterns to Avoid

**NO Over-Coupling CLI and Plugin**
- Plugin must be self-contained for distribution
- Share types and interfaces, not implementations

**NO Validation in Multiple Places**
- Centralize in `FrontmatterValidator`, import where possible

**NO Direct File Manipulation in Commands**
- Use `VaultReader` for reads, consistent write helper

**NO Hardcoded Entity Types**
- Derive types from `TemplateRegistry.getActive().entityTypes`

---

## Summary: Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Transport** | stdio (MVP) -> HTTP/SSE (prod) | Fast local, scalable remote |
| **KG Storage** | SQLite (local) -> Neo4j (prod) | Simple -> powerful graph queries |
| **Embeddings** | FAISS (local) -> Pinecone (prod) | Free local -> managed service |
| **Search** | Hybrid (vector + graph) | Best of both worlds |
| **Indexing** | Incremental + batch background | Fast updates + optimal performance |
| **Sync** | Local-first + CRDT-style merge | Privacy + offline-first |
| **Caching** | Multi-level (query, embedding, index) | Performance at scale |
| **Deployment** | Single-user local (default) | Privacy, simplicity |

---

## References & Further Reading

- **MCP Spec:** https://modelcontextprotocol.io/
- **GraphRAG:** https://arxiv.org/html/2408.04948v1 (HybridRAG paper)
- **Local-First Software:** https://www.inkandswitch.com/local-first/
- **Knowledge Graphs:** https://neo4j.com/blog/developer/unstructured-text-to-knowledge-graph/
- **Vector Databases:** https://memgraph.com/blog/why-hybridrag
- **Obsidian Architecture:** https://github.com/obsidianmd/obsidian-sample-plugin

---

**Document Generated:** 2025
**Last Updated:** 2026-01-26 (Added DX Features Architecture)
**Status:** Production-Ready Research Guide
**Maintainer:** Hivemind Architecture Team

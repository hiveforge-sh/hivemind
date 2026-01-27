# Hivemind Architecture: Executive Summary

## Project Vision
Combine **MCP protocol** (Model Context Protocol by Anthropic, Nov 2024) with **Obsidian markdown vaults** to create a knowledge-aware AI context system that:
- Reads worldbuilding vaults as local markdown files
- Maintains local-first knowledge graphs and indexes
- Provides intelligent context to AI tools (Claude, ComfyUI, etc.)
- Supports bidirectional sync (AI-generated content back to vault)

---

## Core Architecture (3-Layer)

```
┌─────────────────────────────────────────────────────────┐
│                 MCP Host Layer                          │
│  (Obsidian Plugin / CLI Tool / Desktop App)             │
└─────────────────────────────────────────────────────────┘
             │                    │                │
      ┌──────▼──────┐     ┌──────▼──────┐   ┌────▼──────┐
      │ MCP Client  │     │ MCP Client  │   │MCP Client │
      │(Vault)      │     │(Graph)      │   │(Tools)    │
      └──────┬──────┘     └──────┬──────┘   └────┬──────┘
             │                    │                │
┌────────────┴────────────────────┴────────────────┴────────────┐
│              MCP Server (Hivemind)                            │
│                                                               │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐         │
│  │Vault Reader  │  │Markdown     │  │Knowledge     │         │
│  │& Watcher     │→→│Parser &     │→→│Graph Builder │         │
│  │              │  │Chunker      │  │(SQLite/Neo4j)│         │
│  └──────────────┘  └─────────────┘  └──────────────┘         │
│                                             │                 │
│  ┌──────────────┐  ┌─────────────┐  ┌──────▼──────┐         │
│  │Full-Text     │  │Vector       │  │Query Router │         │
│  │Index (FTS5)  │  │Index (FAISS)│  │(Hybrid)     │         │
│  │              │  │             │  │             │         │
│  └──────────────┘  └─────────────┘  └──────┬──────┘         │
│         ▲                ▲                  │                 │
│         └────────────┬───┴──────────────────┘                 │
│                      │                                        │
│              ┌───────▼─────────┐                              │
│              │Query Cache      │                              │
│              │Result Ranking   │                              │
│              │Context Assembly │                              │
│              └─────────────────┘                              │
└────────────────────────────────────────────────────────────┘
                      │
    ┌─────────────────┼──────────────────┐
    │                 │                  │
┌───▼─────┐  ┌───────▼──────┐  ┌───────▼──────┐
│ ComfyUI │  │ Anthropic    │  │ Other AI     │
│ Workflow│  │ Claude API   │  │ Tools        │
│(Images) │  │(Analysis)    │  │(Custom)      │
└─────────┘  └──────────────┘  └──────────────┘
```

---

## 7 Key Architecture Pillars

### 1. **MCP Server Architecture** ✅
**Pattern:** Client-Host-Server with strict isolation
- **Host:** Manages security, session lifecycle, context aggregation
- **Clients:** 1:1 dedicated connection to server (stateful but isolated)
- **Servers:** Resource providers with zero cross-visibility
- **Communication:** JSON-RPC 2.0 over stdio/HTTP/SSE

**Transport Selection:**
- **Local:** Stdio (fast, simple, single-client)
- **Remote:** HTTP/SSE (multi-client, streaming, scalable)
- **Bridge:** MCP Proxy (write once, expose multiple ways)

**Key Innovation:** Unlike REST APIs, MCP maintains stateful connections enabling real-time notifications and context streaming.

---

### 2. **Data Layer Architecture** ✅
**Pattern:** Vault → Parser → Knowledge Graph → Indexes

**Data Flow:**
```
Obsidian Vault (.md files)
    ↓ (watch + debounce)
File Watcher (chokidar)
    ↓ (incremental batch)
Markdown Parser (remark AST)
    ↓ (extract entities, links, structure)
Knowledge Graph (SQLite/Neo4j)
    ↓ (parallel index updates)
┌─────────────────────────────────────┐
│ Full-Text Index (BM25/FTS5)         │
│ Vector Index (FAISS/Pinecone)       │
│ Graph Index (Cypher queries)        │
│ Query Cache (LRU)                   │
└─────────────────────────────────────┘
```

**Incremental Update Strategy:**
- **Real-time:** Detect file changes (< 100 ms debounce)
- **Batch:** Process in groups (100 files, 1-2 sec windows)
- **Background:** Rebalance indexes hourly

**Caching Strategy (Multi-Level):**
1. Query result cache (LRU, 24h TTL)
2. Embedding cache (persistent, invalidated on chunk change)
3. Index page cache (hot vectors in RAM, cold on disk)
4. Full-text cache (memory-mapped for fast access)
5. Graph traversal cache (cached paths, invalidated on edits)

**Storage Tiers by Vault Size:**
- **< 100 notes:** In-memory (< 50 MB)
- **100-1K notes:** SQLite + FAISS local (50-500 MB)
- **1K-10K notes:** Sharded indexes, distributed (500 MB-5 GB)
- **> 10K notes:** Multi-instance federation

---

### 3. **Query Architecture** ✅
**Pattern:** HybridRAG (Vector + Graph)

**Best of Both Worlds:**
- **Vector Search:** Fuzzy matching, synonym handling, open-domain queries
- **Graph Search:** Multi-hop reasoning, explicit relationships, hallucination reduction
- **Hybrid:** Run both in parallel, merge and rerank results

**Query Router:**
```
User Query
    ↓
[Classify Intent] (keyword/semantic/graph/hybrid)
    ↓
Parallel Execution:
├─→ Full-Text Search (BM25) → top 20 keyword results
├─→ Vector Search (embeddings) → top 20 semantic results
└─→ Graph Traversal (2-3 hops) → related entities/relationships
    ↓
[Merge Results] (deduplicate, union)
    ↓
[Rerank] (cross-encoder, relevance + recency + PageRank + diversity)
    ↓
[Filter] (tag-based, scope-based, confidence threshold)
    ↓
[Rank] (top 10 results, ranked by composite score)
    ↓
[Format Context] (chunk assembly, token budget management)
```

**Performance Targets:**
- Keyword search: < 100 ms
- Vector search: < 200 ms
- Graph traversal: < 150 ms
- Hybrid search: < 300 ms
- Full response: < 500 ms

---

### 4. **Integration Patterns** ✅
**Pattern:** Generic Tool Adapter Framework

**ComfyUI Integration:**
```
Vault Note (Character)
    ↓ (extract description)
AI Prompt Engineering
    ↓
ComfyUI Workflow (JSON)
    ↓ (deterministic seed from note ID)
Generate Images
    ↓
Link Back to Vault
```

**Multi-Tool Support:**
```
┌─────────────────────┐
│ AI Tool Registry    │
│                     │
│ - ComfyUI           │
│ - Anthropic Claude  │
│ - Custom APIs       │
│ - Composition       │
└─────────────────────┘
     │
[Vault Data] → [Transform] → [Tool Input]
                               │
                            [API Call]
                               │
                          [Post-process] → [Vault Output]
```

**Bidirectional Sync:**
- **Generated content** (images, summaries, relationships) written back to vault
- **Conflict resolution:** User content priority, CRDT-style merge for concurrent edits
- **Version history:** Keep revision history, allow reverting AI-generated content

---

### 5. **Scalability & Performance** ✅
**Pattern:** Progressive Optimization (Lazy, Adaptive, Distributed)

**Memory Management:**
- Quantization: 8-bit vectors (4x savings)
- Compression: Delta-encode timestamps, sparse graphs
- LRU eviction: Hot indexes in RAM, cold on disk
- Budget: ~512 MB for typical 1K-note vault

**Concurrency:**
- Request isolation (each request = separate context)
- RW locks on indexes (concurrent readers, exclusive writers)
- Event queue for file changes (serialize updates)
- Async/await everywhere (non-blocking operations)

**Index Maintenance:**
- Real-time (< 100 ms): Detect and notify
- Incremental (1-2 sec): Update persistent indexes
- Background (hourly): Rebalance, compute stats, prune cache

---

### 6. **Deployment Architecture** ✅
**Pattern:** Local-First with Optional Cloud

**Default: Single-User Local**
```
~/obsidian-vault/
├── Notes...
└── .obsidian/

~/.hivemind/
├── config.yaml
├── indexes/
│   ├── full-text.db
│   ├── vectors.faiss
│   └── graph.db
└── cache/
    └── queries.json
```

**Configuration:**
```yaml
vault:
  path: ~/obsidian-vault
  type: local  # or obsidian-sync, s3, git

server:
  transport: stdio  # or http, sse
  port: 3000

indexing:
  strategy: incremental
  batch-size: 100
  debounce-ms: 1000

search:
  embedding-model: text-embedding-3-small
  vector-db: faiss  # or pinecone
  kg-db: sqlite  # or neo4j
```

**Distribution Models:**
1. **NPM Package:** `npm install -g hivemind-mcp`
2. **Obsidian Plugin:** Embedded MCP server in plugin
3. **Standalone Binary:** Tauri/Electron desktop app
4. **Docker:** Containerized for cloud deployment

---

### 7. **Reference Architectures** ✅
**Anti-Patterns to Avoid:**
- ❌ Blocking operations → ✅ Async/await, background processing
- ❌ Unbounded memory → ✅ LRU caches, quantization
- ❌ Single point of failure → ✅ Local-first, persistent indexes
- ❌ Tight coupling → ✅ Adapter pattern, plugins

**Lessons from Similar Systems:**
- **Obsidian Plugins:** Must be fast locally; Dataview shows indexes work
- **Athens Research:** Local-first knowledge base; semantic reasoning
- **Logseq:** Markdown-based competitor; sync patterns useful

---

## Technical Decisions Summary

| Component | Choice | Why |
|-----------|--------|-----|
| **MCP Transport** | Stdio (MVP) → HTTP/SSE (prod) | Fast local dev, scalable remote ops |
| **Vault Format** | Obsidian Markdown + Frontmatter | Standard, portable, human-editable |
| **Knowledge Graph** | SQLite (local) → Neo4j (prod) | Simple local, powerful graph queries |
| **Vector DB** | FAISS (local) → Pinecone (prod) | Free local, managed remote scaling |
| **Full-Text Index** | SQLite FTS5 | Built-in, ACID, no dependencies |
| **Search Strategy** | Hybrid (Vector + Graph) | Combines semantic + structural reasoning |
| **Indexing** | Incremental + batch background | Fast updates + optimal performance |
| **Sync Model** | Local-first + CRDT-style merge | Privacy, offline-first, resilience |
| **Caching** | Multi-level (query, embedding, index) | Performance at scale with bounded memory |
| **Deployment** | Single-user local (default) | Privacy, simplicity, zero-config |

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-4)
- [ ] MCP server skeleton (stdio)
- [ ] Vault reader + file watcher
- [ ] Markdown parser + chunker
- [ ] In-memory KG (Map-based)
- [ ] Full-text search (SQLite FTS5)
- [ ] Vector search (FAISS local)
- [ ] Hybrid query router
- [ ] Basic tests + docs

### Phase 2: Integration & Scale (Weeks 5-8)
- [ ] HTTP/SSE transport
- [ ] Incremental indexing
- [ ] Multi-level caching
- [ ] Context ranking + filtering
- [ ] Asset reference delivery
- [ ] ComfyUI integration POC
- [ ] Performance testing

### Phase 3: Production (Weeks 9-12)
- [ ] Multi-user auth
- [ ] Neo4j GraphRAG
- [ ] Bidirectional sync
- [ ] Conflict resolution
- [ ] Cloud deployment
- [ ] Obsidian plugin
- [ ] Monitoring + observability

### Phase 4: Advanced (Weeks 13+)
- [ ] Multi-vault federation
- [ ] Advanced AI composition
- [ ] Real-time collaboration
- [ ] Custom embeddings
- [ ] Web UI dashboard

---

## Key Insights from Research

### 1. **MCP is Remarkably Well-Designed** (Late 2024)
- Strict isolation prevents one server from breaking another
- JSON-RPC 2.0 is proven, extensible foundation
- Host-centric security model is correct for local tools
- Still young ecosystem; good opportunity for early adoption

### 2. **HybridRAG is the Industry Consensus for 2024-2026**
- Pure vector search: Too fuzzy, hallucination-prone
- Pure graph search: Requires pre-extracted structure
- **Hybrid:** Runs both, merges results → best accuracy
- Tools like Neo4j, Memgraph pushing this pattern

### 3. **Local-First + Incremental Indexing is Non-Negotiable**
- Users demand privacy (data on their machine)
- Background indexing enables real-time responsiveness
- CRDT/OT patterns solve sync conflicts without central authority
- Obsidian's success proves this model works at scale

### 4. **Caching at Multiple Levels is Critical**
- Single-level cache insufficient for compound queries
- Query cache + embedding cache + index cache needed
- With quantization, large indexes fit in RAM
- LRU eviction provides automatic scaling

### 5. **Simple Storage Beats Complex Databases (for MVP)**
- SQLite FTS5 for full-text search (built-in, no server)
- FAISS for local vectors (single file, no external service)
- Map-based in-memory graph for small vaults
- Neo4j only needed when crossing 5K+ nodes

---

## Success Metrics

### Performance
- [ ] Sub-100ms keyword search
- [ ] Sub-200ms vector search
- [ ] Sub-300ms hybrid search
- [ ] < 512 MB memory for 1K-note vault

### Reliability
- [ ] 99.9% uptime (local process)
- [ ] Graceful degradation if index corrupted
- [ ] Automatic recovery from partial failures
- [ ] Full audit trail of index updates

### User Experience
- [ ] Zero-config local setup
- [ ] Sub-second response time for queries
- [ ] Seamless Obsidian plugin integration
- [ ] Clear documentation + examples

### Scalability
- [ ] Supports 1K notes on single machine
- [ ] Horizontal scaling to 10K+ notes with sharding
- [ ] Multi-user via federation (team worldbuilding)
- [ ] Optional cloud sync without breaking local-first design

---

## Conclusion

**Hivemind** combines three powerful trends:
1. **MCP Protocol** (AI context standardization)
2. **Local-First Architecture** (privacy, resilience)
3. **Knowledge Graphs** (semantic + structural reasoning)

The result: A system where your worldbuilding vault becomes an AI-aware knowledge base, providing rich context to any AI tool while keeping all data local and under your control.

The architecture prioritizes:
- **Simplicity** (start with SQLite, FAISS, in-memory graphs)
- **Performance** (incremental indexing, multi-level caching)
- **Privacy** (local-first, optional sync)
- **Extensibility** (generic tool adapters, plugin ecosystem)

This is a pragmatic, battle-tested architecture drawn from production knowledge graph systems, proven local-first apps, and the emerging MCP ecosystem.

---

## Next Steps

1. **Study Full Architecture Document** (`.planning/research/ARCHITECTURE.md`)
2. **Review Reference Implementations:**
   - MCP SDK examples: https://github.com/modelcontextprotocol/
   - Vector DB patterns: https://memgraph.com/blog/why-hybridrag
   - Local-first software: https://www.inkandswitch.com/local-first/
3. **Prototype MVP:**
   - Stdio MCP server
   - Vault watcher + Markdown parser
   - SQLite FTS5 + FAISS search
   - Basic hybrid query router
4. **Benchmark & Optimize:**
   - Measure real-world latencies
   - Profile memory usage
   - Identify bottlenecks early

---

**Document Generated:** 2025  
**Research Source:** 2024-2026 MCP, GraphRAG, Local-First Architecture, Vector DB patterns  
**Status:** Ready for Development

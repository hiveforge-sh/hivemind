# Hivemind Technology Stack - Executive Summary

## Quick Reference

### Canonical Recommendation

```
Obsidian Vault (Markdown + YAML)
         ↓
  MCP Server (TypeScript/Node.js with Express)
         ↓
  Neo4j GraphRAG (Knowledge Graph + Vector Search)
         ↓
  AI Clients (Claude, ChatGPT, etc.)
```

---

## Core Technology Choices

### 1. MCP Server: TypeScript (Recommended)

✅ **Why TypeScript**:
- Official SDK (`@modelcontextprotocol/sdk`) is mature and well-documented
- Strong type safety with Zod validation
- Excellent developer experience
- Supports both stdio (local) and HTTP/SSE (cloud) transports
- Large MCP community resources

🔵 **Alternative**: Python (if doing heavy RAG/ML processing)

**Stack**: 
- Runtime: Node.js 20+
- Framework: Express.js 4.18+
- Build: TypeScript 5.3+

---

### 2. Obsidian Vault: Markdown + YAML Frontmatter

✅ **Structure**:
```
Worlds/
├── GreatWorld/
│   ├── 01-Overview
│   ├── 02-Geography/
│   ├── 03-Cultures/
│   ├── 04-Characters/
│   ├── 05-History/
│   ├── 06-Systems/
│   └── 07-Assets/
├── Templates/
└── Meta/
```

✅ **Metadata Standard**:
```yaml
---
title: Entity Name
type: character|location|event|faction|system
world: GreatWorld
status: canon|draft|wip|archived
canon_authority: high|medium|low
tags: [tag1, tag2]
relationships: [[RelatedEntity]]
aliases: [Alternative Name]
---
```

✅ **Essential Plugins**:
- **Dataview** (dynamic queries of frontmatter)
- **Canvas** (visual relationship maps)
- **Templater** (consistent note creation)
- **Obsidian Git** (version control)

---

### 3. Knowledge Graph: Neo4j GraphRAG

✅ **Why GraphRAG**:
- Hybrid retrieval: structural queries + semantic search (vectors)
- Explainability: trace which facts were retrieved
- Multi-hop relationship inference
- Production-ready (enterprise use)
- GraphRAG Python SDK is mature

**Architecture**:
```
Obsidian Markdown (source)
    ↓ [MCP Server]
Neo4j Graph DB
├── Nodes: Entities (characters, locations, events, etc.)
├── Edges: Relationships (from [[wikilinks]])
└── Vectors: Embeddings (from text-embedding-3-large)
    ↓ [Hybrid Query]
AI Client Context
```

**Setup**:
- **Dev**: Docker container (`docker run neo4j:5.17`)
- **Prod**: Neo4j AuraDB (managed cloud, ~$100-500/mo)

**Embedding Model**: OpenAI `text-embedding-3-large` (or `bge-large-en-v1.5` for open-source)

---

### 4. Asset Management

✅ **Image Storage**:
```
Worlds/GreatWorld/07-Assets/
├── characters/
├── locations/
├── references/
└── shared-reference-images/
```

✅ **ComfyUI Workflows**:
```
Worlds/GreatWorld/08-Generation/
├── workflows/
│   ├── character-portrait-v1.json
│   └── location-panorama-v2.json
└── logs/
    ├── 2026-01-24-stark-lord.json
    └── 2026-01-24-winterfell.json
```

✅ **Provenance Tracking**: Every generated image includes:
- Generation timestamp
- Workflow version
- Prompt used
- Model/parameters
- Seed (for reproducibility)
- Canonical reference (wiki-link)

---

## Compatibility & Versioning

| Component | Version | Status | Support Until |
|-----------|---------|--------|---------------|
| Obsidian | 1.4+ | ✅ Stable | 2027-01 |
| MCP SDK (TS) | 1.0+ | ✅ Stable | 2025-06 |
| Neo4j | 5.17+ | ✅ LTS | 2026-10 |
| TypeScript | 5.3+ | ✅ Current | 2026-01 |
| ComfyUI | 0.1.3+ | ✅ Stable | Ongoing |

---

## Key Design Principles

### 1. **Obsidian as Source of Truth**
- Single markdown-based canonical vault
- Git-backed for version control
- Wiki-links create explicit knowledge graph
- YAML frontmatter enables structured queries

### 2. **MCP as API Layer**
- Serves vault data as "resources" to AI clients
- Implements "tools" for queries, generation, validation
- Transforms markdown into structured context
- Ensures AI never writes directly to vault

### 3. **Neo4j as Query Engine**
- Syncs from Obsidian markdown
- Enables fast semantic + structural search
- Provides graph traversal for relationship inference
- Vector embeddings for fuzzy matching

### 4. **Immutable Canon + Extensible AI**
- Core vault is canonical (high authority)
- AI-generated content is annotated (low authority)
- Conflicts resolved by canon_authority level
- AI augments but doesn't modify core world

---

## Implementation Roadmap

### Phase 1: Prototype (Week 1-2)
- [ ] Set up TypeScript MCP server skeleton
- [ ] Create Obsidian vault template structure
- [ ] Implement basic Dataview queries
- [ ] Connect Neo4j Docker instance
- [ ] Build vault → Neo4j sync pipeline

### Phase 2: Core Features (Week 3-4)
- [ ] Implement MCP resources (vault entities)
- [ ] Implement MCP tools (query, validate)
- [ ] Hybrid RAG retrieval (GraphRAG pipeline)
- [ ] Asset management system
- [ ] ComfyUI workflow integration

### Phase 3: Production (Week 5-6)
- [ ] Docker containerization
- [ ] Neo4j AuraDB migration
- [ ] Cloud deployment
- [ ] Monitoring & logging
- [ ] Security hardening

### Phase 4: Polish (Week 7-8)
- [ ] Documentation
- [ ] User templates
- [ ] Example worlds
- [ ] Performance optimization

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| MCP resource retrieval | <100ms | ✅ Achievable |
| Graph query (10K nodes) | <50ms | ✅ Achievable |
| RAG context generation | <500ms | ✅ Achievable |
| Concurrent users | 100+ | ✅ Achievable |
| Vault size | <500MB | ✅ Achievable |
| Asset storage | <5GB | ✅ Achievable |

---

## Security Considerations

1. **Vault Access**: Encrypted Git repo (GitHub private)
2. **Neo4j**: Password-protected, network-isolated
3. **MCP Server**: Authentication for cloud deployment
4. **AI Context**: Rate limiting, prompt validation
5. **Assets**: S3 with signed URLs, CloudFront distribution

---

## Cost Estimates (Annual)

| Component | Development | Production |
|-----------|-------------|-----------|
| Neo4j | Free (Docker) | $1,200-6,000/yr |
| Cloud VPS | Free (local) | $200-500/yr |
| S3 Storage | Free tier | $100-300/yr |
| OpenAI API | Pay-per-use | $100-500/yr |
| Domain/SSL | N/A | $15-50/yr |
| **Total** | **~$0** | **~$1,600-7,350/yr** |

---

## Next Steps

1. **Review & Approve Stack**: Finalize tech choices
2. **Create Architecture Design**: Detailed system diagrams
3. **Set Up Development Environment**: Local Neo4j, Obsidian, MCP server
4. **Build Vault Template**: Example world structure
5. **Implement Core MCP Server**: Resources and tools
6. **Integrate Dataview**: Query engine for frontmatter
7. **Connect GraphRAG**: Neo4j sync pipeline
8. **Test End-to-End**: From vault to AI client

---

**Reference**: See `STACK.md` for comprehensive documentation with citations and detailed technical specifications.

**Last Updated**: January 24, 2026  
**Version**: 1.0.0

# Hivemind Technology Stack Research

**Project**: Hivemind - An MCP Server + Obsidian Vault System for Worldbuilding  
**Status**: Research & Planning (Updated January 2026)  
**Scope**: Production-ready technology recommendations for canonical worldbuilding system with AI context integration

---

## Table of Contents

1. [MCP Server Implementation](#1-mcp-server-implementation-options)
2. [Obsidian Integration](#2-obsidian-integration)
3. [Knowledge Graph / RAG Options](#3-knowledge-graph--rag-options)
4. [Asset Management](#4-asset-management)
5. [Recommended Stack](#5-recommended-stack)
6. [Compatibility Matrix](#6-compatibility-matrix)
7. [Resources & References](#7-resources--references)

---

## 1. MCP Server Implementation Options

### Overview

The Model Context Protocol (MCP) is an open standard allowing AI applications to connect to external systems with a structured interface. MCP enables Hivemind's vault to serve as a canonical context source for AI tools, ensuring consistent worldbuilding across generation tools.

**Key Insight**: Both TypeScript and Python are production-ready with robust official SDKs. Choice depends on integration preferences and team expertise.

### 1.1 TypeScript/JavaScript

**Official SDK**: `@modelcontextprotocol/sdk` (npm)

**Strengths**:
- **Production-Ready**: Mature TypeScript SDK with strong type safety via Zod schema validation
- **Web Integration**: Ideal for web-based AI clients and browser environments
- **Developer Experience**: Strong TypeScript ecosystem, excellent tooling
- **Transport Flexibility**: Built-in support for stdio and HTTP/SSE transports
- **Real-time Capabilities**: Natural async/await patterns for long-running operations
- **Ecosystem**: Broader MCP server examples and community resources (2024-2026)

**Weaknesses**:
- Runtime overhead compared to native languages
- Requires Node.js runtime
- Less ideal for long-running data processing

**Key Dependencies**:
```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "zod": "^3.x",
  "typescript": "^5.x"
}
```

**Installation**:
```bash
npm install @modelcontextprotocol/sdk zod
```

**Documentation**:
- Official Docs: https://modelcontextprotocol.io/docs/sdk
- TypeScript SDK Repo: https://github.com/modelcontextprotocol/typescript-sdk
- FreeCodeCamp Guide: https://www.freecodecamp.org/news/how-to-build-a-custom-mcp-server-with-typescript-a-handbook-for-developers/

### 1.2 Python

**Official SDK**: `modelcontextprotocol` (PyPI)

**Strengths**:
- **Data-Centric Design**: Excellent for processing vault data, embeddings, and complex transformations
- **ML Integration**: Native support for vector operations, RAG pipelines, Neo4j queries
- **Rapid Development**: Quick prototyping and iteration
- **Maturity**: Stable Python SDK with full MCP spec compliance
- **System Integration**: Better for shell commands, file processing, native library integration

**Weaknesses**:
- Less optimized for real-time HTTP serving
- Heavier memory footprint for long-running processes
- Dependency management complexity in production

**Key Dependencies**:
```txt
modelcontextprotocol>=0.4.0
pydantic>=2.0
aiohttp>=3.9
```

**Installation**:
```bash
pip install modelcontextprotocol pydantic aiohttp
```

**Documentation**:
- Official Docs: https://modelcontextprotocol.io/docs/sdk
- Python SDK Repo: https://github.com/modelcontextprotocol/python-sdk
- MCP Tutorials: https://modelcontextprotocol.info/docs/tutorials/

### 1.3 Framework Recommendations

#### For Hivemind (TypeScript Preferred)

**Primary**: **Express.js** or **Hono** (lightweight framework)
- Reason: Simple HTTP routing for MCP resources and tools
- Plays well with TypeScript and async operations
- Lightweight for containerization

**Alternative**: **Fastify**
- Better performance benchmarks than Express
- Built-in TypeScript support

**Code Structure**:
```
mcp-server/
├── src/
│   ├── server.ts           # MCP server initialization
│   ├── resources/          # Resource handlers (vault data)
│   ├── tools/              # Tool handlers (queries, generation)
│   ├── prompts/            # Prompt templates
│   └── types/              # Shared TypeScript types
├── tsconfig.json
├── package.json
└── dist/                   # Compiled output
```

#### For Hivemind (Python Alternative)

**Primary**: **FastAPI** with `httpx` for HTTP transport
- Modern, async-first design
- Excellent TypedDict/Pydantic integration
- Better for embedding vector databases

**Alternative**: **Starlette** (FastAPI's foundation)
- Minimal overhead
- Full async support

### 1.4 Transport Layers

**For Hivemind Use Cases**:

| Transport | Best For | Implementation |
|-----------|----------|-----------------|
| **stdio** | Local development, Claude Desktop | Native subprocess |
| **HTTP + SSE** | Remote AI clients, cloud deployment | Express/FastAPI endpoint |
| **HTTP Polling** | Firewalled environments | Simple HTTP POST/GET |

**Recommendation**: Start with stdio for development, add HTTP/SSE for cloud/remote scenarios.

### 1.5 Performance Considerations

- **Typical Latency**: <100ms for MCP resource queries
- **Concurrent Users**: Single MCP server can handle 10-100 concurrent AI clients
- **Memory**: ~50-100MB base, +10-20MB per active context
- **Scalability**: Consider multiple server instances behind load balancer if >100 concurrent users

---

## 2. Obsidian Integration

### Overview

Obsidian serves as the canonical vault—a sophisticated markdown-based knowledge base with rich metadata capabilities. The vault structure directly influences how the MCP server queries and returns canonical data.

### 2.1 Vault Structure & Organization

**Recommended Hierarchy** (for worldbuilding):

```
vault/
├── 00-INDEX/              # Table of contents, starting points
│   └── README.md
├── Worlds/                # Multiple world support
│   ├── GreatWorld/
│   │   ├── 01-Overview.md
│   │   ├── 02-Geography/
│   │   │   ├── Continents/
│   │   │   ├── Regions/
│   │   │   └── Locations/
│   │   ├── 03-Cultures/
│   │   ├── 04-Characters/
│   │   ├── 05-History/
│   │   │   ├── Timeline.md
│   │   │   └── Events/
│   │   ├── 06-Systems/
│   │   │   ├── Magic/
│   │   │   ├── Technology/
│   │   │   └── Politics/
│   │   └── 07-Assets/     # Related images, workflows
├── Templates/             # Consistent note structure
│   ├── character.md
│   ├── location.md
│   ├── event.md
│   └── faction.md
├── Assets/                # Generated images, ComfyUI workflows
│   ├── images/
│   ├── comfyui-workflows/
│   └── generation-logs/
└── Meta/                  # Configuration, research, drafts
    ├── vault-config.yaml
    └── research/
```

**Key Principles**:
1. **Canonical Folder**: Use `/Worlds/{WorldName}/` as the primary domain for each fictional world
2. **Numbered Sections**: 01-, 02- prefixes for sequential discovery
3. **Wiki-links**: Use `[[Link Format]]` abundantly for cross-references
4. **Relative Assets**: Keep images and workflows near their source notes

### 2.2 Metadata & Frontmatter Standards

**YAML Frontmatter Format** (top of every note):

```yaml
---
title: Character Name or Location Title
type: character|location|event|faction|system|artifact
world: GreatWorld
created: 2026-01-24
updated: 2026-01-24
tags: [magic, nobility, warrior, main-character]
status: canon|draft|wip|archived
canon_authority: high|medium|low
relationships:
  - [[RelatedCharacter]]
  - [[RelatedLocation]]
aliases:
  - Alternative Name 1
  - Alternative Name 2
---
```

**Field Definitions**:

| Field | Type | Purpose | MCP Use |
|-------|------|---------|---------|
| `title` | string | Display name | Primary identifier |
| `type` | enum | Entity classification | Filtering & retrieval |
| `world` | string | World namespace | Multi-world support |
| `created` | ISO 8601 | Creation timestamp | Versioning |
| `updated` | ISO 8601 | Last modification | Cache invalidation |
| `tags` | list | Free-form categorization | Cross-cutting concerns |
| `status` | enum | Canonicity level | Content filtering |
| `canon_authority` | enum | Authority ranking | Conflict resolution |
| `relationships` | list | Wiki-links | Graph traversal |
| `aliases` | list | Alternative names | Query expansion |

**Canonical Status Definitions**:
- **canon**: Fully established, immutable
- **draft**: Under development, subject to change
- **wip**: Work in progress, experimental
- **archived**: Superseded or deprecated

**Canon Authority Levels** (for conflict resolution):
- **high**: Core established canon (cannot be changed by AI)
- **medium**: Established but can be extended
- **low**: Provisional, subject to revision

### 2.3 Dataview Plugin Integration

**Installation**: Built into modern Obsidian (>v1.4) or install from Community Plugins

**Purpose**: Dynamic querying of vault frontmatter, enabling canonical context generation

**Essential Queries** (for MCP):

1. **List all characters in a location**:
```dataview
table title, status, aliases
from "Worlds/GreatWorld/04-Characters"
where contains(relationships, "[[Current Location]]")
```

2. **Timeline of events**:
```dataview
table title, date, description
from "Worlds/GreatWorld/05-History/Events"
sort date asc
```

3. **Canon completeness report**:
```dataview
table type, status, canon_authority
from "Worlds/GreatWorld"
where status != "archived"
group by type
```

4. **Entity index**:
```dataview
list rows.title
from "Worlds/GreatWorld"
where type != null
group by type
```

### 2.4 Plugin Ecosystem

**Recommended Plugins** (for Hivemind):

| Plugin | Purpose | MCP Relevance |
|--------|---------|---------------|
| **Dataview** | YAML querying, dynamic lists | Core—enables structured queries |
| **Templater** | Auto-populate new notes | Consistency enforcement |
| **Canvas** | Visual relationship mapping | Knowledge graph visualization |
| **Admonitions** | Rich callout formatting | Better frontmatter presentation |
| **Obsidian Git** | Version control integration | Audit trail & collaboration |
| **Folder Note** | Create index notes for folders | Navigation & discovery |
| **Tag Wrangler** | Tag management & renaming | Metadata cleanup |
| **Breadcrumbs** | Hierarchical navigation | Explicit parent-child relationships |

**Optional for AI Integration**:
- **Copilot**: Local AI suggestions (complements MCP)
- **Smart Typography**: Consistent formatting

### 2.5 Markdown Conventions

**Document Structure** (recommended):

```markdown
---
[YAML frontmatter as above]
---

# Title

> [!info]
> **Type**: Character | Location | Event
> **World**: GreatWorld
> **Canon Authority**: High
> **Status**: Canon

## Overview
Brief summary (1-2 sentences)

## Details
Main content organized by sections

### Subsection
Detailed information

### Relationships
- [[RelatedEntity1]]: relationship type
- [[RelatedEntity2]]: relationship type

### Timeline
- Date: Event description
- Date: Event description

### Assets
- ![Image Caption](../Assets/images/filename.png)
- Workflow: [[ComfyUI Workflow Name]]

---
Last updated: 2026-01-24
```

**Best Practices**:
1. Use H2 (##) for major sections, H3 (###) for subsections
2. Embedded images with relative paths for portability
3. Ample wiki-links to create knowledge graph
4. Consistent section naming across similar entities
5. Never use complex nested YAML (Dataview limitation)

### 2.6 Compatibility Requirements

**Minimum Obsidian Version**: v1.4.0+
- Required for Dataview performance
- Canvas support for visual mapping

**Required APIs**:
- Vault API (file reading)
- Metadata API (frontmatter access)
- DataviewAPI (query execution)

**Obsidian Sync Considerations**:
- Vault should be Git-backed for version control
- Assets should be included in Git (or use Git LFS for large files)
- `.obsidian/` folder can be excluded from sync

---

## 3. Knowledge Graph / RAG Options

### Overview

The knowledge graph serves two purposes:
1. **Query Engine**: Fast retrieval of canonical facts during AI context generation
2. **Context Augmentation**: Multi-hop relationships to provide comprehensive context

Hivemind uses a **hybrid approach**: explicit relationships from Obsidian + graph traversal for inference.

### 3.1 Neo4j GraphRAG (Recommended)

**What It Is**: Neo4j database + vector embeddings + LangChain integration

**Architecture**:
```
Obsidian Vault (markdown)
        ↓
   MCP Server (Python)
        ↓
  Python GraphRAG SDK
        ↓
   Neo4j Database
     (graph nodes)
        ↓
  Vector Index (embeddings)
        ↓
AI Client (receives augmented context)
```

**Strengths**:
- **Hybrid Retrieval**: Combines structural queries (relationships) + semantic search (vectors)
- **Explainability**: Trace exactly which facts were retrieved
- **Relationship Inference**: Discover multi-hop connections (e.g., "characters in locations affected by events")
- **Performance**: Fast traversal of 10K-100K nodes/relationships
- **Production-Ready**: Widely used in enterprise RAG systems (2024-2026)
- **Managed Option**: Neo4j Aura (cloud) or self-hosted

**Weaknesses**:
- Operational overhead (requires running Neo4j instance)
- Learning curve (Cypher query language)
- Requires embedding pipeline (extract entities, generate vectors)

**Setup**:

```python
from neo4j_graphrag_python import GraphRAG
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    auth=("neo4j", "password")
)

rag = GraphRAG(
    driver=driver,
    embedding_provider="openai",  # or your preferred provider
)

# Retrieve context for a character
context = rag.retrieve(
    query="What are the political alliances of House Stark?",
    top_k=5
)
```

**Key Resources**:
- GitHub: https://github.com/neo4j/neo4j-graphrag-python
- Docs: https://neo4j.com/docs/neo4j-graphrag-python/current/
- Tutorial: https://neo4j.com/blog/developer/rag-tutorial/
- Neo4j + AWS: https://docs.aws.amazon.com/architecture-diagrams/latest/knowledge-graphs-and-graphrag-with-neo4j/

**Deployment Options**:

| Option | Cost | Operations | Scale |
|--------|------|-----------|-------|
| **Neo4j Community (self-hosted)** | Free | DIY | <100K nodes |
| **Neo4j AuraDB (managed)** | $100-500/mo | Minimal | 1M+ nodes |
| **Docker Container** | Free | Moderate | <500K nodes |

**Recommended Setup for Hivemind**: Docker container initially, AuraDB for production scale.

### 3.2 Lightweight Alternatives

#### Memgraph

**Best For**: Real-time analysis, lighter deployment footprint

**Strengths**:
- Neo4j-compatible Cypher queries
- In-memory performance (low latency)
- Embeddable C++ core
- Open-source

**Weaknesses**:
- Smaller community than Neo4j
- Less mature vector integration

**Use Case**: If you need <5ms query latency and can fit graph in RAM.

#### ArangoDB

**Best For**: Multi-model needs (graph + document + key-value)

**Strengths**:
- Native graph + document storage
- ACID transactions
- Embeddable version available
- Simpler schema flexibility

**Weaknesses**:
- AQL is less standard than Cypher
- Smaller RAG ecosystem

**Use Case**: If you need flexible schema evolution and mixed data models.

#### Embedded SQLite + Custom Graph Layer

**Best For**: Single-user, development-stage vaults

**Strengths**:
- Zero operational overhead
- No external dependencies
- Portable (single file)

**Weaknesses**:
- Manual relationship traversal
- Limited query optimization
- Doesn't scale beyond 10K nodes

**Use Case**: Prototype/MVP validation only.

### 3.3 Vector Database (If Standalone Needed)

**Decision**: Only use if NOT using GraphRAG hybrid approach.

**Recommended Options**:
- **Pinecone**: Managed, simple API
- **Weaviate**: Open-source, semantic search
- **Milvus**: Self-hosted, high-performance
- **Chroma**: Lightweight, local-first

**For Hivemind**: Skip pure vector DB. Use Neo4j GraphRAG instead (superior for worldbuilding context).

### 3.4 Embedding Models

**For WorldBuilding Context** (specialized):

| Model | Provider | Context Length | Specialization |
|-------|----------|-----------------|-----------------|
| **text-embedding-3-large** | OpenAI | 8192 tokens | General (good baseline) |
| **UAE-Large-V1** | OpenAI | 256 tokens | High-quality, efficient |
| **Llama 2 Embeddings** | Meta | 4096 tokens | Open-source alternative |
| **bge-large-en-v1.5** | BAAI | 512 tokens | Domain-focused, efficient |

**Recommendation for Hivemind**: Start with **text-embedding-3-large** (OpenAI), migrate to **bge-large-en-v1.5** (open-source) if cost/privacy becomes concern.

**Pipeline**:
```python
from openai import OpenAI

client = OpenAI()

# Chunk Obsidian notes into embeddings
chunks = split_markdown_into_chunks(vault_notes)

for chunk in chunks:
    embedding = client.embeddings.create(
        model="text-embedding-3-large",
        input=chunk["content"]
    )
    # Store in Neo4j
    store_embedding_in_neo4j(
        chunk_id=chunk["id"],
        embedding=embedding.data[0].embedding,
        metadata=chunk["metadata"]
    )
```

### 3.5 Hybrid Search Implementation

**Query Flow** (recommended):

```python
def retrieve_context(query: str, world: str = "GreatWorld"):
    """Retrieve canonical context for AI augmentation."""
    
    # Step 1: Structural query (exact matches)
    structural_results = neo4j_query(
        f"""
        MATCH (n:Entity)-[r:RELATED_TO]-(m:Entity)
        WHERE n.world = $world AND n.name CONTAINS $query
        RETURN n, r, m LIMIT 10
        """,
        {"world": world, "query": query}
    )
    
    # Step 2: Semantic query (vector similarity)
    query_embedding = embed(query)
    semantic_results = neo4j_vector_search(
        embedding=query_embedding,
        world=world,
        top_k=5
    )
    
    # Step 3: Merge and rank
    combined = deduplicate_and_rank(
        structural_results,
        semantic_results,
        boost_structural=1.2
    )
    
    return combined[:10]
```

---

## 4. Asset Management

### Overview

Assets include:
1. **Generated Images** (from ComfyUI or similar)
2. **ComfyUI Workflows** (JSON configurations)
3. **Reference Images** (inspiration, reference photos)
4. **Generation Logs** (metadata, provenance)

### 4.1 File Organization

**Recommended Structure**:

```
vault/
├── Worlds/
│   └── GreatWorld/
│       ├── 07-Assets/
│       │   ├── characters/
│       │   │   ├── stark-lord.png
│       │   │   ├── stark-lady.png
│       │   │   └── stark-heir.png
│       │   ├── locations/
│       │   │   ├── winterfell-main-gate.png
│       │   │   ├── winterfell-throne-room.png
│       │   │   └── winterfell-landscape.png
│       │   └── references/
│       │       ├── medieval-castles/
│       │       └── winter-imagery/
│       │
│       └── 08-Generation/
│           ├── workflows/
│           │   ├── character-portrait-v1.json
│           │   ├── location-panorama-v2.json
│           │   └── assets-index.md
│           └── logs/
│               ├── 2026-01-24-stark-lord-portrait.json
│               └── 2026-01-24-winterfell-exterior.json
└── Assets/
    └── shared-reference-images/
```

**Key Principles**:
1. **Generated Images**: Paired with reference metadata
2. **Workflows**: Separate from generated outputs
3. **Logs**: Track generation parameters and timestamps
4. **Relative Paths**: All image links use relative paths (`../Assets/images/filename.png`)

### 4.2 Image Storage Patterns

**For Each Generated Image**:

Create a companion metadata note:

```yaml
---
title: Character Portrait - Lord Stark
type: asset
asset_type: character-portrait
character: [[Lord Stark]]
location: [[Winterfell]]
created: 2026-01-24T14:32:00Z
generation_model: ComfyUI-flux-1-dev
workflow_version: character-portrait-v1
generation_log: ../Generation/logs/2026-01-24-stark-lord-portrait.json
tags: [character, portrait, canon-reference]
status: canon
---

![Lord Stark Portrait](../Assets/characters/stark-lord.png)

## Generation Details
Generated using workflow `character-portrait-v1.json`

## References
- [[Lord Stark]] character page
- Referenced from medieval nobility paintings
```

**Storage Limits**:
- Keep individual images <5MB (PNG compression)
- Use Git LFS for image files if vault > 500MB
- Archive old generations annually

### 4.3 ComfyUI Workflow Storage

**Workflow File Format**:

```json
{
  "meta": {
    "title": "Character Portrait Generator",
    "description": "Generates realistic character portraits with consistent style",
    "version": "1.0",
    "comfyui_version": "0.1.3",
    "created": "2026-01-24",
    "updated": "2026-01-24",
    "author": "Hivemind",
    "tags": ["character", "portrait", "flux"]
  },
  "workflow": {
    // Standard ComfyUI node graph
    // See: https://docs.comfy.org/specs/workflow_json
  },
  "generation_settings": {
    "model": "flux-1-dev",
    "sampler": "euler",
    "steps": 30,
    "cfg_scale": 7.5,
    "seed": -1,
    "recommended_prompts": [
      "Portrait of a noble warrior, detailed, fantasy art"
    ]
  }
}
```

**Storage Location**: `Worlds/{World}/08-Generation/workflows/{workflow-name}.json`

**Versioning**: Use semantic versioning (`v1.0`, `v1.1`, etc.)

**Documentation**: Each workflow should have a companion markdown file:

```markdown
# Character Portrait Workflow v1.0

## Overview
Generates realistic character portraits using Flux-1-dev model.

## Usage
1. Load workflow in ComfyUI
2. Set character description in prompt
3. Adjust CFG scale (7-9 for consistency, 5-7 for variation)
4. Run generation

## Parameters
- **Model**: Flux-1-dev
- **Sampler**: Euler (or dpmpp_2m_sde)
- **Steps**: 30-50 (recommended 35)
- **CFG Scale**: 7.5 (adjustable)

## Output
Generates 1024x1024 PNG images

## Requirements
- ComfyUI with Flux nodes installed
- CUDA or Metal support for GPU acceleration

---
Last Updated: 2026-01-24
```

### 4.4 Generation Settings Provenance

**MCP Tool Output** (include with every generation):

```python
@server.call_tool()
async def generate_character_portrait(arguments: dict):
    """Generate character portrait with full provenance."""
    
    character_name = arguments["character_name"]
    world = arguments["world"]
    
    # Load character canonical data
    character = vault.get_entity(character_name, world)
    
    # Generate image via ComfyUI
    result = await comfyui_client.generate(
        workflow_file=f"workflows/character-portrait-v1.json",
        prompt_params={
            "character_description": character["description"],
            "setting": character.get("location", "generic"),
            "style": "realistic, fantasy, detailed"
        }
    )
    
    # Record provenance
    provenance = {
        "timestamp": datetime.now().isoformat(),
        "character": character_name,
        "world": world,
        "workflow_version": "1.0",
        "comfyui_version": comfyui_client.version,
        "workflow_file": "workflows/character-portrait-v1.json",
        "prompt_used": result.prompt,
        "seed": result.seed,
        "image_path": f"Assets/characters/{character_name.lower()}.png",
        "canonical_reference": f"[[{character_name}]]"
    }
    
    # Store provenance log
    vault.save_generation_log(provenance)
    
    return {
        "image_url": result.image_path,
        "provenance": provenance
    }
```

**Log File Storage**:

```
Worlds/GreatWorld/08-Generation/logs/
├── 2026-01-24-stark-lord-portrait.json
├── 2026-01-24-stark-lady-portrait.json
└── 2026-01-24-winterfell-exterior.json
```

**Log Format**:

```json
{
  "timestamp": "2026-01-24T14:32:00Z",
  "character": "Lord Stark",
  "world": "GreatWorld",
  "workflow_version": "character-portrait-v1",
  "comfyui_version": "0.1.3",
  "prompt_used": "Portrait of a noble warrior...",
  "seed": 12345,
  "image_path": "../Assets/characters/stark-lord.png",
  "canonical_reference": "[[Lord Stark]]",
  "model": "flux-1-dev",
  "generation_time_seconds": 45,
  "parameters": {
    "steps": 35,
    "cfg_scale": 7.5,
    "sampler": "euler"
  }
}
```

### 4.5 File Organization Best Practices

**Image Naming Convention**:
```
{entity-type}-{entity-name}-{variant}-{version}.{ext}
character-stark-lord-portrait-v1.png
location-winterfell-exterior-v2.png
event-battle-of-trident-concept-v1.png
```

**Cleanup Procedures**:
1. **Monthly**: Archive workflow iterations >6 months old
2. **Quarterly**: Review generation logs for failed attempts
3. **Yearly**: Consolidate similar assets, delete duplicates
4. **Version Control**: Use Git commits for asset metadata changes

**Backup Strategy**:
- Daily: Automatic via Git commits (including assets)
- Weekly: Full vault backup to cloud storage (AWS S3, Backblaze)
- Monthly: Offline backup on external drive

---

## 5. Recommended Stack

### 5.1 Primary Recommendation (Hivemind Canonical)

```
┌─────────────────────────────────────────────────────────────┐
│                    Hivemind Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐                                        │
│  │  Obsidian Vault  │  Source of Truth                       │
│  │  (Markdown +     │  ├─ World canonical data               │
│  │   Frontmatter)   │  ├─ Character/Location details         │
│  │                  │  ├─ History & Events                   │
│  │                  │  └─ Asset metadata                     │
│  └────────┬─────────┘                                        │
│           │                                                   │
│           │ Git + Local Sync                                 │
│           │                                                   │
│  ┌────────▼──────────────────────────────────────────┐       │
│  │     MCP Server (TypeScript/Node.js)               │       │
│  ├────────────────────────────────────────────────────┤       │
│  │ Core Modules:                                      │       │
│  │ ├─ Vault Indexer (watches markdown changes)       │       │
│  │ ├─ MCP Resources (vault entities)                 │       │
│  │ ├─ MCP Tools (query, generate, validate)          │       │
│  │ ├─ Neo4j Sync (graph updates from markdown)       │       │
│  │ └─ Asset Manager (image/workflow handling)        │       │
│  │                                                    │       │
│  │ Transport: stdio (local) + HTTP/SSE (cloud)      │       │
│  └────────┬────────────┬────────────┬────────────────┘       │
│           │            │            │                        │
│           │            │            └──────────────┐         │
│           │            │                           │         │
│  ┌────────▼────┐  ┌───▼──────┐  ┌──────────────┐ │         │
│  │ Neo4j Graph │  │  Dataview │  │  ComfyUI API │ │         │
│  │   Database  │  │  Queries  │  │  Integration │ │         │
│  │             │  │           │  │              │ │         │
│  │ • Entities  │  │ • Index   │  │ • Generate   │ │         │
│  │ • Relations │  │ • Report  │  │ • Validate   │ │         │
│  │ • Vectors   │  │           │  │ • Log        │ │         │
│  └─────────────┘  └───────────┘  └──────────────┘ │         │
│                                                    │         │
│  ┌────────────────────────────────────────────────▼─┐       │
│  │        AI Client Integration Layer                │       │
│  ├──────────────────────────────────────────────────┤       │
│  │ Claude API │ ChatGPT API │ Local LLM │ Custom   │       │
│  └──────────────────────────────────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Stack Components

| Layer | Component | Technology | Version | Rationale |
|-------|-----------|-----------|---------|-----------|
| **Vault** | Source of Truth | Obsidian | 1.4.0+ | Rich metadata, community support |
| **Server** | MCP Runtime | TypeScript/Node | 20+ | Type safety, performance, MCP support |
| **Framework** | HTTP Server | Express.js | 4.18+ | Simplicity, maturity, middleware ecosystem |
| **Graph DB** | Knowledge Graph | Neo4j | 5.10+ | GraphRAG, Cypher, proven at scale |
| **Embedding** | Vector Store | Neo4j Vector Index | 5.17+ | Integrated with Neo4j, no separate DB |
| **Query Engine** | Dataview | Dataview Plugin | Latest | Dynamic vault queries, metadata |
| **Asset Gen** | Image Generation | ComfyUI | 0.1.3+ | Workflow-based, reproducible, community nodes |
| **Storage** | Version Control | Git + GitHub | - | Audit trail, collaboration, backups |
| **Monitoring** | Observability | Winston Logger | 3.x | Structured logging for MCP events |

### 5.3 Full Technology Details

**Server Dependencies (package.json)**:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.18.2",
    "zod": "^3.22.4",
    "pydantic": "^2.5.0",
    "neo4j": "^5.16.0",
    "axios": "^1.6.2",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1",
    "yaml": "^2.3.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.6",
    "tsx": "^4.7.0"
  }
}
```

**Environment Configuration (.env)**:

```env
# Obsidian Vault
VAULT_PATH=/path/to/obsidian/vault
VAULT_WORLD=GreatWorld

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<secure-password>

# MCP Server
MCP_PORT=3000
MCP_TRANSPORT=stdio|http

# OpenAI (for embeddings)
OPENAI_API_KEY=<api-key>

# ComfyUI
COMFYUI_API_URL=http://localhost:8188
COMFYUI_WORKFLOW_PATH=/path/to/workflows

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/hivemind.log
```

**Database Schema (Neo4j Cypher)**:

```cypher
// Create indexes for performance
CREATE INDEX entity_world FOR (e:Entity) ON (e.world, e.name);
CREATE INDEX entity_type FOR (e:Entity) ON (e.type);
CREATE TEXT INDEX entity_text FOR (e:Entity) ON (e.description);
CREATE VECTOR INDEX entity_embedding 
  FOR (e:Entity) ON (e.embedding) 
  OPTIONS {indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }};

// Define node labels and properties
CALL apoc.schema.assert({Entity: ['world', 'name', 'type', 'status']}, {}, true)
```

### 5.4 Deployment Topology

**Development**:
- Obsidian: Local file sync
- MCP Server: stdio on developer machine
- Neo4j: Docker container (local)
- ComfyUI: Optional local instance

**Production**:
- Obsidian: GitHub-backed vault (private repo)
- MCP Server: Docker container on VPS/K8s
- Neo4j: AuraDB (managed cloud)
- ComfyUI: Serverless API (RunComfy or similar)
- Assets: S3 + CloudFront CDN

---

## 6. Compatibility Matrix

### Version Support Timeline

| Component | Current | Tested With | Support Until |
|-----------|---------|-------------|---------------|
| Obsidian | 1.5.x | MCP 0.4.x | 2027-01 |
| MCP SDK (TS) | 1.0.x | Node 20 LTS | 2025-06 |
| Neo4j | 5.17.x | GraphRAG 0.2.x | 2026-10 |
| TypeScript | 5.3.x | Node 20 | 2026-01 |
| ComfyUI | 0.1.3+ | API stable | Ongoing |

### Breaking Changes (Known)

1. **Dataview Plugin**: May require syntax updates in Obsidian 1.6+ (monitor GitHub)
2. **Neo4j 5.x → 6.x** (2026): Will require code updates for new query API
3. **MCP 1.0 → 2.0** (2026): Expected, backward compatibility likely

### Migration Path

```
Current (2026-01)
    ↓ [v1.0 Release]
Stable (2026-06)
    ↓ [Neo4j 5.17 LTS]
Long-term Support (2026-2027)
    ↓ [MCP 2.0 Preview]
Next Generation (2027)
```

---

## 7. Resources & References

### Official Documentation

**MCP (Model Context Protocol)**:
- Main Docs: https://modelcontextprotocol.io/docs
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Python SDK: https://github.com/modelcontextprotocol/python-sdk
- SDK Reference: https://modelcontextprotocol.io/docs/sdk

**Obsidian**:
- Help Vault: https://help.obsidian.md
- Markdown Guide: https://www.markdownguide.org/tools/obsidian/
- Developer API: https://docs.obsidian.md/Home
- Community Plugins: https://obsidian.md/plugins

**Dataview**:
- GitHub: https://github.com/blacksmithgu/obsidian-dataview
- Query Language: https://blacksmithgu.github.io/obsidian-dataview/
- Example Vault: https://s-blu.github.io/obsidian_dataview_example_vault/

**Neo4j GraphRAG**:
- Python Package: https://github.com/neo4j/neo4j-graphrag-python
- Documentation: https://neo4j.com/docs/neo4j-graphrag-python/current/
- Tutorial: https://neo4j.com/blog/developer/rag-tutorial/
- With AWS: https://docs.aws.amazon.com/architecture-diagrams/latest/knowledge-graphs-and-graphrag-with-neo4j/

**ComfyUI**:
- Official Repo: https://github.com/comfyanonymous/ComfyUI
- Workflow Specs: https://docs.comfy.org/specs/workflow_json
- Manager: https://github.com/ltdrdata/ComfyUI-Manager
- Workflows: https://comfyworkflows.com

### Community Resources

**Worldbuilding with Obsidian**:
- witchka's Templates: https://github.com/witchka/Obsidian-Worldbuilding-Templates
- Uluscri's Templates: https://uluscri.itch.io/uluscris-worldbuilding-templates
- YouTube Guides: Search "Obsidian worldbuilding tutorial"

**MCP Ecosystem**:
- MCP Hub: https://www.mcphub.ai
- Community Servers: https://github.com/modelcontextprotocol
- Tutorials: https://modelcontextprotocol.info/docs/tutorials/

**Articles & Guides** (2024-2026):
- "How to Build an MCP Server with TypeScript" - FreeCodeCamp
- "Setting Up GraphRAG with Neo4j" - Analytics Vidhya
- "YAML Frontmatter Best Practices in Obsidian" - Various community guides
- "ComfyUI Production Playbook" - Cohorte Projects

---

## Appendix: Quick Start Configuration

### Minimal Setup (Development)

**Prerequisites**:
- Node.js 20+
- Obsidian 1.4.0+
- Docker (for Neo4j)
- Git

**Steps**:

```bash
# 1. Clone Hivemind repository
git clone https://github.com/yourusername/hivemind.git
cd hivemind

# 2. Install dependencies
npm install

# 3. Start Neo4j (Docker)
docker run -d \
  --name neo4j \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5.17

# 4. Configure .env
cp .env.example .env
# Edit .env with your paths and Neo4j credentials

# 5. Build TypeScript
npm run build

# 6. Start MCP server
npm run dev

# 7. Open Obsidian, point vault to your world
# Configure MCP client to connect to stdio://./dist/server.js
```

### Production Checklist

- [ ] Neo4j AuraDB instance created
- [ ] Obsidian vault on GitHub (private)
- [ ] MCP server containerized (Docker)
- [ ] Asset storage configured (S3)
- [ ] Logging to CloudWatch/ELK
- [ ] Monitoring alerts set up
- [ ] Backup strategy documented
- [ ] CI/CD pipeline configured
- [ ] Load testing completed
- [ ] Security audit passed

---

**Document Status**: ✅ Complete - January 24, 2026  
**Last Updated**: 2026-01-24  
**Maintainer**: Hivemind Team  
**Version**: 1.0.0

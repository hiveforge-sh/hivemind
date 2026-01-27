# Hivemind Implementation Checklist

Based on comprehensive feature research from January 2025.

## Quick Start Reference

### For Understanding the System
1. Read: `.planning/research/RESEARCH_SUMMARY.md` (5-min overview)
2. Read: `.planning/research/FEATURES.md` (30-min deep dive)

### Core Decisions Already Made ✓
- **Single source of truth:** Obsidian vault (not external DB)
- **Architecture:** MCP server as bridge between Obsidian + Claude/AI tools
- **Data format:** YAML frontmatter + wikilinks in markdown notes
- **Approval workflow:** Git-based (main branch = canon, feature branches = proposals)
- **Asset tracking:** Embed metadata in images, version workflows

---

## MVP Checklist (v0.1)

### MCP Server Core
- [ ] Set up MCP server project structure
- [ ] Implement `query_character(id)` tool
  - Return character YAML + relationships
  - Format context for Claude (XML tags)
- [ ] Implement `query_location(id)` tool
  - Return location data + inhabitants
  - Include navigation/connections
- [ ] Create `/world/index` resource
  - List all characters, locations, events
  - Include metadata (status, importance)
- [ ] Add authentication/permissions
  - Role-based: writer, reviewer, admin

### Obsidian Templates
- [ ] Character template (see FEATURES.md section 2.2A)
  - Required fields: id, type, status, name, appearance, relationships
  - Asset references for images
- [ ] Location template (see FEATURES.md section 2.2B)
  - Required fields: id, type, status, name, region, inhabitants
  - Connections to other locations
- [ ] Asset metadata template
  - For tracking generated images + workflows
- [ ] Document templates in vault README

### Canon Status System
- [ ] Add status field to YAML schema (draft/pending/canon/non-canon)
- [ ] Create Canon Status index in `_Index/Canon Status.md`
  - Track approval_by, approval_date
  - Link to notes
- [ ] Document manual approval process
- [ ] Set permissions: canon entries read-only except via PR

### Integration with Claude
- [ ] Test basic query: "Tell me about [character]"
- [ ] Verify context formatting (XML, conciseness)
- [ ] Test consistency check: "Would [character] do [action]?"
- [ ] Document prompt patterns for users

### Testing & Validation
- [ ] Create sample vault with 5-10 test characters
- [ ] Validate YAML parsing in MCP server
- [ ] Test all query patterns from FEATURES.md section 1.2
- [ ] Verify relationships resolve correctly
- [ ] Check context window usage (stays within Claude limits)

---

## Phase 1: Core Setup (Week 1-2)

### Technical Implementation
- [ ] Initialize MCP server (Python/TypeScript/Rust)
- [ ] Add Obsidian vault parser
- [ ] Implement caching layer (character/location queries frequently repeated)
- [ ] Set up git integration (read vault from git, track versions)

### Documentation
- [ ] Write MCP server API documentation
  - Tools available
  - Resources exposed
  - Error codes and meanings
- [ ] Create quick-start guide for users
  - How to set up vault
  - How to structure first character
  - How to ask Claude worldbuilding questions
- [ ] Document template examples
  - Filled-in character example
  - Filled-in location example

### Testing
- [ ] Unit tests for YAML parsing
- [ ] Integration tests for MCP tools
- [ ] End-to-end test: create character → query via MCP → ask Claude
- [ ] Load test: 100+ characters still responsive

---

## Phase 2: Expansion (Week 3-4)

### Enhanced Query Tools
- [ ] `query_characters(filters)` - filtered character queries
  - By status (draft/canon)
  - By importance (major/minor)
  - By relationship (connected to specific character)
- [ ] `query_timeline(era, date_range)` - timeline queries
- [ ] `query_relationships(entity_id)` - relationship graph

### Consistency Validation
- [ ] Build validator tool: `validate_consistency()`
  - Check relationships bidirectional
  - Verify no timeline conflicts
  - Validate character knowledge (can't know secrets early)
  - Flag orphaned references
- [ ] Create validation report format
- [ ] Documentation on consistency rules

### Context Generation
- [ ] `generate_context(entity_id, purpose)` tool
  - Customize context by task type (portrait, dialogue, plot)
  - Each type returns different information
  - Format optimized for task (XML for Claude)

### Asset Support
- [ ] Asset template + metadata schema
- [ ] Index asset files in `/world/assets`
- [ ] Extract metadata from ComfyUI PNG workflows
- [ ] Link assets to character/location notes

---

## Phase 3: Polish & Scaling (Week 5+)

### Performance
- [ ] Implement query caching with invalidation
- [ ] Index full-text search on character descriptions
- [ ] Handle large vaults (1000+ notes) gracefully
- [ ] Streaming responses for large contexts

### Collaborative Features (Optional v0.2+)
- [ ] Approval workflow implementation
  - Tracking tool: `submit_for_review(note_id)`
  - Review tracking in index
  - Status transition: draft → pending → canon
- [ ] Comment/feedback system
  - Can add to notes during review
  - Track reviewers and their feedback
- [ ] Change attribution
  - Git log integration
  - Show who created what

### Web Interface (v1.0+)
- [ ] Simple web view of world
  - Browse characters, locations
  - Search and filter
  - View relationships visually
- [ ] Canon approval dashboard
  - See pending reviews
  - Approve/reject with comments
  - Audit trail

---

## Key Files to Create/Modify

### Core MCP Server
```
hivemind/
├── src/
│   ├── mcp_server.py (or .ts/.rs)
│   ├── vault_parser.py
│   ├── tools/
│   │   ├── query_tools.py
│   │   ├── context_gen.py
│   │   └── validation.py
│   └── models/
│       ├── character.py
│       ├── location.py
│       └── asset.py
├── tests/
│   ├── test_mcp_tools.py
│   ├── test_vault_parsing.py
│   └── test_consistency.py
├── sample_vault/
│   ├── Characters/
│   │   └── example-character.md
│   ├── Locations/
│   │   └── example-location.md
│   └── Templates/
│       ├── Character.md
│       ├── Location.md
│       └── Event.md
└── docs/
    ├── MCP_API.md
    ├── TEMPLATES.md
    └── QUICK_START.md
```

### Obsidian Vault Template
```
obsidian-worldbuilding-vault/
├── Characters/
│   ├── _template.md
│   └── [example characters]
├── Locations/
│   ├── _template.md
│   └── [example locations]
├── Events/
│   ├── _template.md
│   └── [example events]
├── Assets/
│   ├── Characters/
│   ├── Locations/
│   └── ComfyUI Workflows/
├── _Index/
│   ├── All Characters.md (Dataview query)
│   ├── All Locations.md
│   ├── Timeline.md
│   └── Canon Status.md
├── Templates/
│   ├── Character.md
│   ├── Location.md
│   ├── Event.md
│   └── Asset.md
├── README.md (setup instructions)
└── obsidian.json (vault settings)
```

---

## Implementation Patterns (Copy These!)

### Character Query Pattern
```python
def query_character(character_id: str) -> dict:
    """
    Fetch character data with relationships.
    """
    note = vault.get_note(f"Characters/{character_id}.md")
    if not note:
        return {"error": f"Character '{character_id}' not found"}
    
    character = parse_yaml(note.frontmatter)
    character['relationships'] = resolve_relationships(character.get('relationships', []))
    character['related_assets'] = find_assets_for(character_id)
    
    return {
        "id": character['id'],
        "name": character['name'],
        "appearance": character.get('appearance'),
        "personality": character.get('personality'),
        "relationships": character['relationships'],
        "assets": character['related_assets'],
        "status": character.get('status', 'draft'),
        "last_modified": note.modified_date
    }
```

### Context Generation Pattern
```python
def generate_context(entity_id: str, purpose: str) -> str:
    """
    Generate task-specific context bundle.
    
    purpose: "portrait", "dialogue", "plot", "description", "consistency_check"
    """
    character = query_character(entity_id)
    
    if purpose == "portrait":
        return format_xml("""
            <character>
                <name>{name}</name>
                <appearance>{appearance}</appearance>
                <mood>{current_mood}</mood>
                <clothing>{clothing}</clothing>
                <style_notes>{style}</style_notes>
            </character>
        """, character)
    
    elif purpose == "dialogue":
        return format_xml("""
            <character>
                <name>{name}</name>
                <voice>
                    <speech_patterns>{speech}</speech_patterns>
                    <vocabulary>{vocab}</vocabulary>
                </voice>
                <personality>{personality}</personality>
                <relationship_with>{target}</relationship_with>
            </character>
        """, character)
    
    # ... other purposes
```

### Validation Pattern
```python
def validate_consistency(content: dict) -> dict:
    """
    Validate proposed content against canon.
    """
    issues = []
    warnings = []
    
    # Check 1: Relationships are bidirectional
    for relationship in content.get('relationships', []):
        target = vault.get_note(relationship['target'])
        if not find_reverse_relationship(target, content['id']):
            warnings.append(f"One-way relationship: {content['id']} → {relationship['target']}")
    
    # Check 2: Age consistent with timeline
    if content.get('birth_year'):
        age = current_year - content['birth_year']
        if age != content.get('age'):
            issues.append(f"Age mismatch: {age} ≠ {content.get('age')}")
    
    # Check 3: Knowledge consistency
    knowledge = content.get('knowledge', [])
    for fact in knowledge:
        if not verify_knowledge_plausibility(content['id'], fact):
            warnings.append(f"Unlikely knowledge: {content['id']} knowing {fact}")
    
    return {
        "errors": issues,
        "warnings": warnings,
        "suggestions": generate_suggestions(issues, warnings),
        "is_valid": len(issues) == 0
    }
```

---

## Success Criteria for MVP

1. **Basic Functionality**
   - [ ] Claude can query "Tell me about [character]" and get consistent data
   - [ ] MCP server handles 100+ characters without slowdown
   - [ ] Relationships resolve bidirectionally

2. **Data Integrity**
   - [ ] Canon status respected (no editing approved entries)
   - [ ] Assets linked correctly to entities
   - [ ] Metadata parsing robust (handles malformed YAML gracefully)

3. **User Experience**
   - [ ] Setting up vault takes <15 minutes
   - [ ] First character query works on first try
   - [ ] Error messages are helpful (not cryptic)

4. **Documentation**
   - [ ] README explains what Hivemind is (and isn't)
   - [ ] Templates have clear instructions
   - [ ] API docs have examples for each tool

---

## Related Documents

- **FEATURES.md** - Comprehensive feature research (40KB, all details)
- **RESEARCH_SUMMARY.md** - Quick summary of findings (7KB)
- **ARCHITECTURE.md** - System design and diagrams
- **STACK.md** - Technology choices and alternatives

---

## Notes for Implementation

### Important Assumptions
1. **Obsidian remains the editor** - Hivemind never modifies vault directly
2. **Git is version control** - All changes tracked via git commits
3. **YAML frontmatter is sufficient** - No custom schema enforcement needed for MVP
4. **Wikilinks work natively** - Obsidian's `[[link]]` syntax is primary relationship model
5. **Dataview plugin available** - Users install it; MCP server can use queries

### Known Limitations
1. **Nested YAML not fully supported** - Use flat properties in frontmatter
2. **Real-time sync not supported** - Vault must be committed to git before querying
3. **Concurrent editing not handled** - Single writer model initially
4. **Large vault performance** - May need caching for 1000+ notes

### Future Flexibility
- Can add strict schema in v0.2 without breaking vault
- Can add web interface later without changing data format
- Can add multi-user support after git merge workflow proven
- Can integrate ComfyUI after core features stable

---

Generated: January 2025
Related to: Hivemind MCP Server for Obsidian Worldbuilding

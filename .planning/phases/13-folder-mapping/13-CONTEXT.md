# Phase 13: Folder Mapping & Shared Infrastructure - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Configuration and shared logic for mapping vault folders to entity types, with platform-agnostic path handling. CLI and Obsidian plugin both consume the same mapping logic — no duplication. This phase delivers the infrastructure; validate/fix commands and Obsidian commands are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Config format
- Array of mapping objects: `[{ "folder": "People/", "types": ["character"] }]`
- Support glob patterns (e.g., `**/Characters/` matches nested folders anywhere)
- Mappings live inside template config (each template defines its own mappings)
- A mapping can list multiple types, triggering a prompt when matched: `{ "folder": "Notes/", "types": ["lore", "event"] }`

### Conflict resolution
- Most specific pattern wins when multiple globs match (longer/more specific takes priority)
- When no mapping matches: prompt user for type (CLI prompts, Obsidian shows modal)
- Optional fallback type in config — unmatched files use fallback instead of prompting
- When mapping lists multiple types: Claude's discretion on pick-one vs union behavior

### Shared module API
- Claude's discretion on location (src/shared/ or src/utils/ based on codebase structure)
- Async API: `resolveType(filePath, config)` returns a Promise
- Full result object: `{ types: [...], matchedPattern: "...", confidence: ... }` — richer context for consumers
- Claude's discretion on built-in vs injected glob matcher (balance testability and simplicity)

### Path normalization
- Claude's discretion on internal format (likely forward slashes for glob compatibility)
- Auto-normalize backslashes to forward slashes on config load — no warning, just works
- Case-sensitive matching: "People/" only matches "People/", not "people/"
- Paths in config are relative to vault root only — no absolute paths allowed

### Claude's Discretion
- Module location (src/shared/ vs src/utils/)
- Internal path format (forward slashes recommended)
- Glob matcher strategy (built-in vs injected)
- Multi-type resolution behavior (pick one vs union of fields)

</decisions>

<specifics>
## Specific Ideas

- Glob patterns should feel familiar to users who know gitignore or minimatch
- "Most specific wins" is intuitive — `People/Heroes/` should beat `People/` without users configuring priority

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-folder-mapping*
*Context gathered: 2026-01-26*

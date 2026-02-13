# Phase 23: Tech Debt Cleanup - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean accumulated technical debt before adding temporal and graph complexity. Five specific debt items: template registry deduplication (DEBT-01/02), cli/init test coverage (DEBT-03), process.chdir() Stryker exclusion (DEBT-04), and child_process import (DEBT-05). No new features.

</domain>

<decisions>
## Implementation Decisions

### Template Deduplication (DEBT-01/02)
- Plugin imports directly from the existing template registry module (single shared import, no duplication)
- Template initialization pattern (shared function vs separate init flows) is Claude's discretion based on codebase analysis
- API changes acceptable as long as end-user behavior is identical
- Registry scope (all template data vs frontmatter only) is Claude's discretion

### Test Coverage (DEBT-03)
- Mix of unit and integration tests — Claude decides ratio based on what's being tested
- Follow existing test patterns and conventions in the codebase
- Edge case coverage (hard-to-trigger error paths) is Claude's judgment per case
- Mutation testing alignment is Claude's discretion based on existing CI gates

### Exclusion Resolution (DEBT-04/05)
- process.chdir() — Claude decides whether to fix or document based on feasibility
- child_process — isolate to specific module with clear justification for Obsidian reviewers (not remove)
- When documenting: code comment + architecture decision record (ADR)
- ADR location is Claude's discretion based on existing project conventions

### Cleanup Boundaries
- Fix trivial adjacent debt discovered during work (one-line fixes, obvious cleanups in same file)
- Don't go hunting for additional debt beyond the 5 listed items
- Group commits logically (e.g., DEBT-01 and DEBT-02 together)
- Update existing tests to match refactored structure (behavior preserved = update tests)
- Sequencing/priority order is Claude's discretion based on dependencies and risk

### Claude's Discretion
- Template initialization pattern (shared function vs separate init)
- Template registry scope expansion
- Test ratio (unit vs integration)
- Edge case coverage decisions
- Mutation testing requirements
- process.chdir() fix vs document
- ADR location
- Debt item sequencing

</decisions>

<specifics>
## Specific Ideas

- child_process should be isolated and documented for Obsidian review team — this directly affects Phase 28 (community plugin submission)
- Template registry deduplication is prerequisite for Phase 27 (graph view) per STATE.md

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-tech-debt-cleanup*
*Context gathered: 2026-01-27*

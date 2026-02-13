# Phase 28: Community Plugin Submission - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Prepare and submit Hivemind to Obsidian community plugin directory. This includes README documentation, manifest validation, release artifacts, and PR submission to obsidian-releases. Does not include new features or code changes beyond what's required for submission.

</domain>

<decisions>
## Implementation Decisions

### README Content
- Lead with problem-solution: explain the pain point Hivemind solves before features
- Minimal technical detail — just enough to get started, link out for more
- Standard sections: Overview, Installation, Usage, Screenshots, License
- Include "Why Hivemind?" section (1-2 paragraphs on motivation)
- Link to GitHub issues for troubleshooting (no inline troubleshooting section)

### Installation Guidance
- MCP server setup in separate guide document, not inline in README
- List minimum version requirements (e.g., "Obsidian 1.4+") without exact tested versions
- Cover both plugin AND CLI installation with equal depth
- Link to GitHub issues for problems, no FAQ section

### Visual Assets
- Feature both timeline and graph views prominently (equal billing)
- Use real-world-looking content (believable worldbuilding/research examples, not "Character A")
- Clean screenshots without annotations or callouts

### Plugin Identity
- Name: "Hivemind for Obsidian"
- Plugin ID in manifest: "hivemind" (short, clean)
- Target audience: Worldbuilders (fiction writers, game designers, RPG creators)
- Tone: Enthusiastic/creative — match the energy of the audience
- Include specific use case examples: "Track characters, locations, timelines in your novel"
- Community: GitHub Discussions only (no Discord initially)
- License: MIT badge at top of README, link to LICENSE file
- Contribution guidelines: Separate CONTRIBUTING.md file

### AI Firewall Positioning
- Give AI integration equal billing with visualization features
- Use the term "AI Firewall" explicitly — "your canon is the source of truth"
- Include concrete examples: "Ask AI about your character — it knows they're from City X, not Y"
- Describe as "MCP-compatible" rather than listing specific tools
- Position as responsible AI use — AI augments your world, doesn't invent outside it

### Claude's Discretion
- Whether to include animated GIF showing interactions
- Whether to include comparison with Obsidian's native graph view
- Exact tagline/one-liner phrasing for plugin description

</decisions>

<specifics>
## Specific Ideas

- "AI Firewall" concept: Hivemind ensures AI tools work within the bounds of your established canon, preventing hallucination outside your world's truth
- Dual value proposition: "Visualize your world + keep AI grounded in your canon"
- Real-world screenshot content should look like actual worldbuilding (fantasy characters, locations with relationships) not generic test data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-community-plugin-submission*
*Context gathered: 2026-01-28*

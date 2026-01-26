# UX Research Sample Vault

This sample vault demonstrates the `ux-research` template for synthesizing user research data.

## Use Case

This template helps product and research teams:

- **Synthesize interviews**: Extract and link insights across multiple user sessions
- **Track hypotheses**: Manage assumptions with evidence relationships
- **Build personas**: Create data-driven user archetypes
- **Validate assumptions**: Connect experiments to hypotheses

## Structure

```
ux-research/
├── Interviews/        # Individual research sessions
├── Insights/          # Key learnings from research
├── Hypotheses/        # Testable assumptions
├── Personas/          # Archetypal user representations
├── Experiments/       # Tests to validate hypotheses
└── config.json        # Template configuration
```

## Entity Types

| Type | Description |
|------|-------------|
| `interview` | A research session with a participant |
| `insight` | A key learning derived from research |
| `hypothesis` | A testable assumption about user behavior |
| `persona` | An archetypal user representation |
| `experiment` | A test to validate or invalidate hypotheses |

## Relationships

| Relationship | Description |
|--------------|-------------|
| `supports` | Evidence supports a hypothesis or insight |
| `contradicts` | Evidence contradicts a hypothesis or insight |
| `derived_from` | Insight/persona derived from interviews |
| `validates` | Experiment validates a hypothesis |
| `invalidates` | Experiment invalidates a hypothesis |
| `informed_by` | Hypothesis informed by an insight |

## Example Queries

With this vault indexed, you can ask AI questions like:

- "What evidence supports the mobile-first hypothesis?"
- "Which insights contradict our current assumptions?"
- "Show me all interviews with enterprise users"
- "What hypotheses are still untested?"
- "Summarize the key frustrations across all personas"

## Canon Workflow for Research

Use the canon workflow to manage research quality:

| Status | Meaning |
|--------|---------|
| `draft` | Initial notes, not yet reviewed |
| `pending` | Ready for team review |
| `canon` | Validated, team-approved insights |

**Example**: An insight starts as `draft` during synthesis, moves to `pending` for team review, and becomes `canon` when the team agrees it's a reliable finding.

## Getting Started

```bash
# Start Hivemind with this vault
npx @hiveforge/hivemind-mcp --vault samples/ux-research

# Or copy to your own location
cp -r samples/ux-research ~/my-research
cd ~/my-research
npx @hiveforge/hivemind-mcp --vault .
```

## Research Synthesis Tips

1. **Start with interviews**: Create interview notes with key quotes
2. **Extract insights**: Link insights to supporting interviews
3. **Form hypotheses**: Create testable assumptions informed by insights
4. **Build personas**: Synthesize patterns into user archetypes
5. **Plan experiments**: Design tests to validate critical hypotheses

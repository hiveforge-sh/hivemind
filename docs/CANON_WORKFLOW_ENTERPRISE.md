# Canon Workflow for Enterprise Use Cases

The canon workflow is Hivemind's content lifecycle system that ensures AI assistants work with verified, approved information. While originally designed for fiction worldbuilding, this pattern is powerful for enterprise knowledge management.

## The AI Memory Firewall

Modern AI assistants are eager to help—sometimes too eager. Without guardrails, they'll confidently generate plausible-sounding but fictional details when context is missing. The canon workflow creates an **AI memory firewall**: content marked as `canon` is trusted source material, while `draft` content is clearly labeled as unverified.

This prevents:
- AI inventing technical details not in your architecture docs
- AI fabricating user quotes not from actual interviews
- AI generating "facts" that contradict approved decisions
- AI mixing verified research with speculative content

## Status Lifecycle

```
draft → pending → canon
         ↓         ↓
     non-canon  archived
```

| Status | Meaning | AI Behavior |
|--------|---------|-------------|
| `draft` | Work in progress | AI acknowledges as unverified |
| `pending` | Awaiting review | AI treats cautiously, flags status |
| `canon` | Approved truth | AI uses confidently as ground truth |
| `non-canon` | Rejected/alternative | AI excludes from authoritative answers |
| `archived` | Historical reference | AI uses for context, notes staleness |

## Enterprise Use Cases

### 1. Architecture Decision Records (ADRs)

Software teams use ADRs to document technical decisions. The canon workflow ensures AI assistants only reference approved decisions.

**Workflow:**

1. **Draft**: Architect proposes a new decision
   ```yaml
   ---
   id: adr-005-api-versioning
   type: decision
   status: draft
   name: "API Versioning Strategy"
   decisionStatus: proposed
   ---
   ```

2. **Pending**: Submit for team review
   ```bash
   # AI tool: submit_for_review
   # Changes status to 'pending', adds review metadata
   ```

3. **Canon**: After team approval
   ```yaml
   status: canon
   decisionStatus: accepted
   ```

**AI Behavior:**
- When asked "What's our API versioning strategy?", AI cites only `canon` ADRs
- Draft proposals are clearly labeled: "There's a draft proposal (ADR-005) but it hasn't been approved yet"
- Superseded decisions are noted: "ADR-001 was superseded by ADR-003"

### 2. UX Research Synthesis

Research teams generate insights from user interviews. The canon workflow prevents AI from mixing validated findings with preliminary observations.

**Workflow:**

1. **Draft**: Researcher creates initial insight
   ```yaml
   ---
   id: insight-mobile-checkout
   type: insight
   status: draft
   confidence: low
   evidenceCount: 1
   ---
   ```

2. **Pending**: Insight reviewed by research lead
   ```yaml
   status: pending
   confidence: medium
   evidenceCount: 3
   ```

3. **Canon**: Validated through multiple sources
   ```yaml
   status: canon
   confidence: high
   evidenceCount: 5
   actionable: true
   ```

**AI Behavior:**
- Recommendations cite only `canon` insights with `confidence: high`
- Draft insights are flagged: "Early observation (needs validation): ..."
- Contradicting evidence is surfaced when relevant

### 3. Hypothesis Validation

Product teams track hypotheses through experimentation. Canon status reflects validation state.

**Workflow:**

```yaml
# Before experiment
---
id: hypothesis-enterprise-mobile
type: hypothesis
status: draft
hypothesisStatus: untested
---

# During experiment
status: pending
hypothesisStatus: testing

# After validation
status: canon
hypothesisStatus: validated
```

**AI Behavior:**
- When planning features, AI prioritizes `validated` hypotheses
- Invalidated hypotheses are noted to prevent repeated mistakes
- Untested hypotheses are clearly labeled as assumptions

### 4. Technical Documentation

Engineering teams maintain runbooks, API docs, and system descriptions. Canon workflow ensures AI doesn't mix outdated docs with current truth.

**Workflow:**

1. System documentation starts as `draft` during development
2. Moves to `pending` during code review
3. Becomes `canon` when deployed to production
4. Moves to `archived` when system is deprecated

**AI Behavior:**
- Troubleshooting advice uses only `canon` runbooks
- Deprecated systems are flagged when mentioned
- Version mismatches between docs and deployed code are detected

## MCP Tools

Hivemind provides tools for managing the canon workflow:

### `get_canon_status`

List all entities grouped by status, optionally filtered by type.

```json
{
  "entityType": "decision",
  "status": "pending"
}
```

**Use Case:** Review queue for pending ADRs.

### `submit_for_review`

Move content from `draft` to `pending` status.

```json
{
  "entityId": "adr-005-api-versioning"
}
```

**Use Case:** Architect submitting ADR for team review.

### `validate_consistency`

Check for consistency issues across the vault.

```json
{
  "entityType": "insight"
}
```

**Detects:**
- Canon content referencing draft content
- Missing required fields
- Broken wikilinks
- Duplicate IDs

### `search_vault`

Filter search results by status.

```json
{
  "query": "authentication",
  "status": "canon"
}
```

**Use Case:** Find only approved documentation about authentication.

## Best Practices

### 1. Start Everything as Draft

Never create content directly as `canon`. The workflow exists to ensure review.

### 2. Define Clear Approval Criteria

Document what moves content from `pending` to `canon`:

| Type | Approval Criteria |
|------|-------------------|
| ADR | 2+ senior engineer approvals |
| Insight | 3+ supporting interviews |
| Hypothesis | Statistically significant A/B test |
| Runbook | Tested in staging environment |

### 3. Use Confidence Fields

For research content, use `confidence` alongside `status`:

```yaml
status: canon
confidence: high  # or medium, low
evidenceCount: 5
```

This allows nuanced AI responses: "This is approved research, but confidence is medium due to limited sample size."

### 4. Archive, Don't Delete

When content becomes outdated:
```yaml
status: archived
archivedReason: "Superseded by ADR-010"
archivedDate: 2024-03-15
```

This preserves historical context while signaling AI to deprioritize.

### 5. Link Evidence

Use wikilinks to connect assertions to evidence:

```markdown
## Key Finding

Enterprise users abandon mobile checkout [[P01 - Enterprise Buyer|P01]], [[P05 - Procurement Lead|P05]], [[P08 - Office Manager|P08]].
```

AI can then cite specific sources when referencing findings.

## Integration with Review Tools

### GitHub/GitLab

Status changes can trigger PR reviews:

```yaml
# In CI workflow
- name: Check ADR status changes
  run: |
    # Alert when status moves to 'pending'
    git diff --name-only | xargs grep -l "status: pending" | \
      xargs -I {} gh pr comment --body "ADR ready for review: {}"
```

### Slack/Teams

Notification on canon promotion:

```yaml
# Webhook on status change
if frontmatter.status == 'canon' and previous.status == 'pending':
    notify_channel("New approved ADR: {frontmatter.name}")
```

## Example: Full ADR Lifecycle

**Day 1: Proposal**
```yaml
---
id: adr-007-event-sourcing
type: decision
status: draft
name: "Adopt Event Sourcing for Order Service"
decisionStatus: proposed
proposedDate: 2024-03-01
proposedBy: alice
context: "Order service needs audit trail and replay capability"
---
```

**Day 3: Team Discussion**
```yaml
status: pending
decisionStatus: proposed
reviewers: ["bob", "carol"]
```

**Day 7: Approved**
```yaml
status: canon
decisionStatus: accepted
acceptedDate: 2024-03-07
acceptedBy: ["bob", "carol", "alice"]
consequences: ["6-month migration timeline", "Team training required"]
```

**Year 2: Superseded**
```yaml
status: archived
decisionStatus: superseded
supersededBy: "[[ADR-015 CQRS Migration]]"
archivedDate: 2025-03-15
```

## Related Documentation

- [Setup Guide](./SETUP_GUIDE.md) — Getting started with Hivemind
- [Vault Migration Guide](./VAULT_MIGRATION_GUIDE.md) — Adding frontmatter to existing vaults
- [Software Architecture Template](../samples/architecture/README.md) — ADR examples
- [UX Research Template](../samples/ux-research/README.md) — Research synthesis examples

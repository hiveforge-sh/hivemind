# People Management Sample Vault

This is a sample vault demonstrating the **people-management** template for Hivemind.

## Entity Types

- **People**: Team members, contacts, and individuals
- **Goals**: Objectives, OKRs, and targets
- **Teams**: Groups, departments, and organizational units
- **1:1 Meetings**: 1:1 meeting notes and follow-ups

## Folder Structure

```
vault/
├── People/
│   ├── Sarah Chen.md
│   └── Alex Rivera.md
├── Teams/
│   └── Platform Team.md
├── Goals/
│   └── Q1 2024 Platform Reliability.md
├── 1-1s/
│   └── 2024-01-22 Sarah-Alex.md
└── config.json
```

## Usage

1. Copy this sample vault to your desired location
2. Open it as an Obsidian vault
3. Configure Hivemind MCP server with the vault path
4. Start managing your team!

## Relationships

The people-management template includes relationship types like:

- `member_of` / `has_member` - Team membership
- `leads` / `led_by` - Team leadership
- `reports_to` / `manages` - Reporting relationships
- `owns_goal` / `owned_by` - Goal ownership
- `contributes_to` / `has_contributor` - Goal contributions
- `supports` / `supported_by` - Goal hierarchies (OKR structure)
- `attended` / `had_attendee` - 1:1 meeting participants

## Workflow Tips

### Weekly 1:1s

1. Create a new 1:1 note before each meeting
2. Review previous 1:1 for follow-up items
3. Document discussion, wins, and challenges
4. Create action items with owners and due dates

### Quarterly Planning

1. Create objective-level goals for the quarter
2. Create key result goals linked to objectives
3. Assign owners and contributors
4. Track progress with `currentValue` and `progress` fields

### Team Management

1. Keep team rosters up to date
2. Link people to their teams and managers
3. Document team rituals and meeting cadences
4. Track team goals and metrics

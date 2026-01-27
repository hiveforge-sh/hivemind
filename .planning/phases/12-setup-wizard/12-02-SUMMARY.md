---
phase: 12-setup-wizard
plan: 02
subsystem: cli-wizard
status: complete
tags: [cli, interactive, wizard, templates, auto-detection, inquirer]
requires: [12-01]
provides:
  - Interactive template selection with grouped categories
  - Vault path prompting with validation
  - Auto-detection from folder structure with confirmation
  - Wizard orchestrator with graceful error handling
affects: [12-03]
tech-stack:
  added: []
  patterns:
    - "@inquirer/prompts select with description field for inline preview"
    - "Separator for category grouping in select lists"
    - "ExitPromptError from @inquirer/core for Ctrl+C handling"
    - "Breadcrumb progress indicator for multi-step flows"
key-files:
  created:
    - src/cli/init/prompts.ts
    - src/cli/init/detection.ts
    - src/cli/init/wizard.ts
  modified: []
decisions:
  - id: wizard-breadcrumb-pattern
    choice: "Breadcrumb progress (Vault > Template > Config > Done)"
    rationale: "Visual feedback for multi-step process, shows current position"
    alternatives: ["Step numbers (1/4, 2/4)", "No progress indicator"]
  - id: custom-template-deferred
    choice: "Defer custom template creation to post-setup"
    rationale: "Simplifies initial wizard flow, custom templates can be added later"
    alternatives: ["Inline custom template builder", "Exit wizard to create custom first"]
  - id: detection-confidence-threshold
    choice: "Only confirm medium/high confidence detections"
    rationale: "Low confidence wastes user time, better to show manual selection"
    alternatives: ["Confirm all detections", "Auto-apply high confidence only"]
metrics:
  duration: 3min
  completed: 2026-01-26
---

# Phase 12 Plan 02: Interactive Wizard Core Summary

Interactive wizard with template selection, vault path input, and auto-detection using @inquirer/prompts with grouped categories and inline description preview.

## Objective Achievement

Successfully created the core interactive wizard experience:

- **Prompts module (prompts.ts)**: Template selection with grouped categories, vault path input with validation, confirmation prompts
- **Detection wrapper (detection.ts)**: Wraps existing TemplateDetector with user confirmation flow
- **Wizard orchestrator (wizard.ts)**: Main flow with TTY check, breadcrumb progress, graceful Ctrl+C handling

## Implementation Details

### Task 1: Create prompts module with template selection

**Files**: `src/cli/init/prompts.ts`

**Approach**:
- Defined TEMPLATE_CHOICES with Separator for category grouping (Creative, Professional, Technical, Research, Custom)
- Each template choice includes description field for inline preview as user navigates
- promptVaultPath uses validateVaultPath for inline validation on Enter
- promptTemplateSelection returns template ID string
- promptConfirm and promptOverwriteConfig for yes/no prompts

**Key patterns**:
- `new Separator(dim('--- Category ---'))` for visual category grouping
- `validate` function returns `true | string` per @inquirer conventions
- Description field enables inline preview below select list

**Commit**: `f5361ac`

### Task 2: Create detection wrapper with confirmation

**Files**: `src/cli/init/detection.ts`

**Approach**:
- Wraps existing TemplateDetector class from `src/templates/detector.ts`
- Runs detection, shows results if confidence is medium/high
- Prompts user to confirm detected template
- Falls through to manual selection if user declines or no match

**Key patterns**:
- Only confirm medium/high confidence (low confidence skips to manual)
- Display matched folders and confidence level for transparency
- Reuses existing detection logic, just adds confirmation layer

**Commit**: `2787ed2`

### Task 3: Create wizard orchestrator

**Files**: `src/cli/init/wizard.ts`

**Approach**:
- TTY check before any prompts (bail for non-interactive environments)
- Check for existing config.json and prompt to overwrite
- Prompt for vault path with validation
- Run auto-detection with confirmation
- Handle custom template selection (deferred to post-setup)
- Breadcrumb progress indicator (Vault > Template > Config > Done)
- Graceful Ctrl+C handling with ExitPromptError from @inquirer/core

**Key patterns**:
- `process.stdin.isTTY` check prevents hanging in non-interactive environments
- `ExitPromptError` catch for graceful Ctrl+C exit
- `renderBreadcrumb(step)` shows current position in multi-step flow
- Returns `WizardResult` with `cancelled` flag for orchestration

**Commit**: `504a9fa`

## Technical Decisions

### Why breadcrumb instead of step numbers?

Breadcrumbs (Vault > Template > Config > Done) provide semantic context, not just numeric position. User knows what's coming next and where they are in the flow.

### Why defer custom templates?

Custom template creation requires entity type definition, relationship mapping, and validation rules. This adds significant complexity to initial setup. Better to get users started with a preset, then offer customization later via dedicated command.

### Why only confirm medium/high confidence detections?

Low confidence means weak signal - likely to be wrong. Showing low confidence detection wastes user time and adds friction. Better to skip straight to manual selection when confidence is low.

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**Build verification**:
- All files created successfully
- TypeScript compilation passes with no errors
- Imports resolve correctly

**Integration points**:
- prompts.ts imports validators.ts (validates vault path)
- detection.ts imports TemplateDetector from templates/detector.ts
- wizard.ts imports prompts.ts and detection.ts
- All color utilities from cli/shared/colors.ts

## Files Changed

**Created**:
- `src/cli/init/prompts.ts` (90 lines)
- `src/cli/init/detection.ts` (48 lines)
- `src/cli/init/wizard.ts` (101 lines)

**Modified**: None

## Next Phase Readiness

**Ready for 12-03**: Breadcrumb system enables smooth integration of folder mapping prompt.

**Blockers**: None

**Integration notes**:
- Wizard returns WizardResult with vaultPath and templateId
- Next plan should handle config generation from WizardResult
- Custom template creation can be added as separate command post-setup

## Key Learnings

1. **@inquirer/prompts structure**: ExitPromptError is in @inquirer/core, not @inquirer/prompts
2. **Separator usage**: dim() styling works inside Separator text for subtle category labels
3. **Description field**: Automatically shows below select list as user navigates - no extra config needed
4. **TTY check timing**: Must check process.stdin.isTTY before ANY prompt calls to avoid hanging

## Commit Summary

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `f5361ac` | Create prompts module with template selection |
| 2 | `2787ed2` | Create detection wrapper with confirmation |
| 3 | `504a9fa` | Create wizard orchestrator |

**Total commits**: 3
**Duration**: 3 minutes
**Lines added**: 239
**Files created**: 3

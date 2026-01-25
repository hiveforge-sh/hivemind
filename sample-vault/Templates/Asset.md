---
id: asset-{{slug}}
type: asset
status: draft
title: {{Asset Description}}
world: {{World Name}}
tags: []
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
canon_authority: pending

# Asset-specific fields
asset_type: image
file_path: Assets/{{filename}}
file_format: png
depicts: []
generation_date: {{date:YYYY-MM-DD}}
generator: ComfyUI
workflow_id: "[[Workflow Name]]"
prompt:
negative_prompt:
model:
seed:
parameters: {}
approved_by:
approval_date:
---

# {{Asset Description}}

![[{{filename}}]]

## Generation Details

**Prompt:** {{prompt}}

**Model:** {{model}}
**Seed:** {{seed}}

## Usage

This asset depicts: {{comma-separated entities}}

## Approval Status

- Status: {{draft|pending|approved}}
- Canon authority: {{low|medium|high}}

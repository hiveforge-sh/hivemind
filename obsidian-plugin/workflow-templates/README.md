# ComfyUI Workflow Templates

These starter workflows help you generate images from your worldbuilding notes with zero configuration.

## Prerequisites

Before using these templates, you need:

### 1. ComfyUI Installed and Running
- Download from: https://github.com/comfyanonymous/ComfyUI
- Start ComfyUI and verify it's accessible in your browser
- Default: http://127.0.0.1:8188 (or http://127.0.0.1:8000)

### 2. A Stable Diffusion Checkpoint Model

**These templates require SDXL by default.** Download one of these:

**SDXL Base 1.0** (Recommended - Best Quality)
- Download: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors
- Size: ~6.9 GB
- VRAM: 8+ GB recommended
- Place in: `ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors`

**Stable Diffusion 1.5** (Alternative - Faster/Lower VRAM)
- Download: https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned-emaonly.safetensors
- Size: ~4 GB
- VRAM: 4+ GB
- Place in: `ComfyUI/models/checkpoints/v1-5-pruned-emaonly.safetensors`
- **Note:** You'll need to edit the templates to use this model instead (see Customization section)

After downloading, restart ComfyUI to detect the new model.

## Quick Start

1. **Copy these workflows to your vault:**
   - Copy all .json files to: `<your-vault>/workflows/`
   - **Note:** JSON files won't appear in Obsidian's file explorer (this is normal!)
   - They're hidden by default, but the MCP server can see and use them
   - To verify they're there, check with Windows File Explorer

2. **Make sure you have a checkpoint model:**
   - Default: `sd_xl_base_1.0.safetensors` (SDXL)
   - Or edit the workflows to use your preferred model
   - Place models in ComfyUI's `models/checkpoints/` directory

3. **Reconnect the MCP server in Obsidian:**
   - Click status bar to disconnect/reconnect
   - This rescans the workflows directory

4. **Generate!**
   - Open a character/location note
   - Run "Generate image from current note"
   - Select a workflow and click generate

## Included Templates

### character-portrait.json
Portrait headshots using: {{name}}, {{age}}, {{appearance.hair}}, {{appearance.eyes}}, {{appearance.build}}
- Size: 512x768 (portrait)
- Steps: 20, CFG: 7.0

### character-full-body.json
Full body designs using: {{name}}, {{age}}, {{species}}, {{appearance.build}}, {{appearance.clothing}}, {{appearance.hair}}, {{appearance.eyes}}
- Size: 512x768 (portrait)
- Steps: 25, CFG: 7.5

### location-landscape.json
Environments using: {{name}}, {{description}}, {{atmosphere}}
- Size: 768x512 (landscape)
- Steps: 25, CFG: 7.0

### item-object.json
Items/props using: {{name}}, {{material}}, {{appearance}}
- Size: 512x512 (square)
- Steps: 20, CFG: 7.5

## Customization

See full documentation in the main README for how to customize models, settings, and add more context fields.

# Testing the Obsidian Plugin Locally

## Quick Start

### Step 1: Build the Plugin

```bash
cd obsidian-plugin
npm install  # If not already done
npm run build
```

This creates `main.js` in the `obsidian-plugin/` directory.

### Step 2: Create Plugin Folder in Your Vault

Navigate to your Obsidian vault and create the plugin folder:

```bash
# On Windows
cd "F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch\.obsidian\plugins"
mkdir hivemind-mcp

# Or use PowerShell
New-Item -ItemType Directory -Path ".obsidian\plugins\hivemind-mcp" -Force
```

### Step 3: Copy Plugin Files

Copy these files from `obsidian-plugin/` to your vault's plugin folder:

```bash
# From the hivemind project root
Copy-Item "obsidian-plugin\main.js" -Destination "F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch\.obsidian\plugins\hivemind-mcp\"
Copy-Item "obsidian-plugin\manifest.json" -Destination "F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch\.obsidian\plugins\hivemind-mcp\"
```

**Required files:**
- `main.js` (the built plugin code)
- `manifest.json` (plugin metadata)

**Optional:**
- `styles.css` (if you create custom styles later)

### Step 4: Enable Plugin in Obsidian

1. Open Obsidian
2. Go to Settings (gear icon)
3. Navigate to: **Community plugins**
4. If you see "Restricted mode is on", turn it OFF
5. Click **"Browse"** or scroll to installed plugins
6. Find **"Hivemind"** in the list
7. Toggle it ON

### Step 5: Verify Installation

You should see:
- ✅ Brain circuit icon in the left ribbon
- ✅ Status bar shows "Hivemind: Disconnected"
- ✅ New commands in command palette (Ctrl/Cmd + P):
  - "Hivemind: Generate image from current note"
  - "Hivemind: Browse ComfyUI workflows"
  - "Hivemind: Connect to MCP server"
  - "Hivemind: Disconnect from MCP server"

---

## Development Workflow

### Hot Reload During Development

For faster iteration, use the dev build with file watching:

```bash
cd obsidian-plugin
npm run dev
```

This watches for file changes and automatically rebuilds `main.js`.

**After each rebuild:**
1. In Obsidian: Open Command Palette (Ctrl/Cmd + P)
2. Type: "Reload app without saving"
3. Press Enter

This reloads the plugin without restarting Obsidian.

### Alternative: Symlink for Auto-Update

Instead of copying files manually, create a symbolic link:

```powershell
# From the hivemind project root
cd "F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch\.obsidian\plugins"

# Create symlink
New-Item -ItemType SymbolicLink -Path "hivemind-mcp" -Target "C:\Users\Preston\git\hivemind\obsidian-plugin"
```

Now changes to `obsidian-plugin/main.js` automatically appear in your vault!

---

## Testing the Plugin

### Test 1: Connect to MCP Server

1. **Start MCP server manually** (or let plugin auto-start):
   ```bash
   npx @hiveforge/hivemind-mcp start
   ```

2. **In Obsidian:**
   - Command Palette → "Hivemind: Connect to MCP server"
   - Status bar should show: "Hivemind: Connected"

3. **Check console for errors:**
   - View → Toggle Developer Tools (Ctrl+Shift+I)
   - Look for MCP connection messages

### Test 2: Browse Workflows

1. **First, create a test workflow** in your vault:
   
   Create `workflows/test-workflow.json`:
   ```json
   {
     "id": "test-workflow",
     "name": "Test Workflow",
     "description": "Simple test workflow",
     "workflow": {
       "3": {
         "class_type": "KSampler",
         "inputs": { "seed": 12345 }
       },
       "6": {
         "class_type": "CLIPTextEncode",
         "inputs": { "text": "{{appearance.hair}} person" }
       }
     },
     "contextFields": ["appearance"]
   }
   ```

2. **Restart MCP server** to scan workflows:
   ```bash
   # Stop current server (Ctrl+C)
   npx @hiveforge/hivemind-mcp start
   ```

3. **In Obsidian:**
   - Command Palette → "Hivemind: Browse ComfyUI workflows"
   - Should show "Test Workflow" in modal

### Test 3: Generate Image (Without ComfyUI)

**Note:** This will fail gracefully without ComfyUI running, but tests the plugin logic.

1. **Create a test character note:**

   `Characters/Test Character.md`:
   ```markdown
   ---
   id: character-test
   type: character
   age: 30
   appearance:
     hair: brown
   ---
   
   # Test Character
   
   A test character for plugin testing.
   ```

2. **Open the note in Obsidian**

3. **Run command:**
   - Command Palette → "Hivemind: Generate image from current note"
   - Should show workflow selection modal
   - Select "Test Workflow"
   - **Expected:** Error message about ComfyUI not running (this is OK!)

4. **Check console for detailed error:**
   - Developer Tools (Ctrl+Shift+I)
   - Should see network error or connection refused

### Test 4: Settings Tab

1. **Open Settings** → Hivemind
2. **Verify fields:**
   - MCP server command
   - Auto-start MCP server toggle
   - ComfyUI endpoint
3. **Try changing values** and saving

---

## Debugging

### View Console Logs

1. **Open Developer Tools:**
   - View → Toggle Developer Tools
   - Or: Ctrl+Shift+I (Windows/Linux), Cmd+Option+I (Mac)

2. **Check Console tab** for:
   - Plugin initialization messages
   - MCP communication logs
   - Error stack traces

### Common Issues

#### Plugin Doesn't Appear

**Issue:** Plugin not showing in Settings → Community plugins

**Solution:**
1. Check files are in correct location:
   ```
   <vault>/.obsidian/plugins/hivemind-mcp/
   ├── main.js
   └── manifest.json
   ```
2. Ensure manifest.json is valid JSON
3. Restart Obsidian completely

#### "Hivemind: Disconnected" Stays

**Issue:** MCP server won't connect

**Solution:**
1. Check MCP server is actually running
2. Verify command in settings is correct
3. Check console for spawn errors:
   ```javascript
   // Look for errors like:
   Error: spawn npx ENOENT
   ```
4. Try running MCP command manually first:
   ```bash
   npx @hiveforge/hivemind-mcp start
   ```

#### Commands Not Working

**Issue:** Generate image command fails

**Solutions:**
1. Verify note has required frontmatter:
   ```yaml
   id: character-test
   type: character  # Must be 'character' or 'location'
   ```
2. Check MCP server is connected (status bar)
3. Review console for specific error messages

#### MCP Communication Errors

**Issue:** "MCP server not connected"

**Debug:**
1. Check Developer Console for JSON-RPC messages:
   ```javascript
   // Should see requests like:
   {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{...}}
   ```
2. Verify MCP server is receiving stdin
3. Check if MCP process crashed (look for exit messages)

### Manual MCP Testing

Test MCP server separately to isolate issues:

```bash
# Start MCP server
npx @hiveforge/hivemind-mcp start

# In another terminal, test with echo
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx @hiveforge/hivemind-mcp start
```

---

## Full Integration Test with ComfyUI

### Prerequisites

1. **ComfyUI running:**
   ```bash
   cd /path/to/ComfyUI
   python main.py
   # Should show: http://127.0.0.1:8188
   ```

2. **MCP server enabled:**
   Edit `config.json`:
   ```json
   {
     "comfyui": {
       "enabled": true,
       "endpoint": "http://127.0.0.1:8188"
     }
   }
   ```

### End-to-End Test

1. **Create real character:**
   
   `Characters/Test Hero.md`:
   ```markdown
   ---
   id: character-hero
   type: character
   age: 25
   appearance:
     hair: dark brown, long
     eyes: blue
     build: athletic
   personality:
     traits: brave, determined, kind
   ---
   
   # Test Hero
   
   A brave hero on a quest.
   ```

2. **Create real ComfyUI workflow:**
   - Open ComfyUI in browser: http://127.0.0.1:8188
   - Create/load a simple workflow
   - Add a prompt node with template: `{{appearance.hair}} person, {{personality.traits}}`
   - Click "Save (API Format)" → Copy JSON
   - Save to `workflows/real-workflow.json`

3. **Restart MCP server** to load workflow

4. **In Obsidian:**
   - Open Test Hero note
   - Command: "Generate image from current note"
   - Select your workflow
   - **Wait for generation** (10-60 seconds)
   - Check `assets/images/` for output

5. **Verify:**
   - Image file created in vault
   - Database record in `.hivemind/vault.db` → assets table
   - Success message in Obsidian
   - Console shows progress logs

---

## Production Build

When ready to distribute:

```bash
cd obsidian-plugin
npm run build  # Production build (minified, no sourcemaps)
```

Then package:
```bash
# Create release folder
mkdir release
cp main.js manifest.json release/

# Zip for distribution
Compress-Archive -Path release/* -DestinationPath hivemind-plugin-v0.1.0.zip
```

---

## Tips

- **Keep Developer Tools open** while testing
- **Use verbose logging** during development
- **Test incrementally** - don't try everything at once
- **Verify MCP server works independently** before plugin testing
- **Create backup of vault** before extensive testing

## Next Steps

After local testing works:
1. Create example workflows for documentation
2. Test with real ComfyUI generations
3. Create video demo
4. Publish to Obsidian community plugins (optional)

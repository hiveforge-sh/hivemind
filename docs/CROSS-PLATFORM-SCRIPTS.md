# Cross-Platform Script Guidelines

When creating automation scripts for this repository, always provide versions for all major platforms.

## Required Versions

For any automation script, provide:

1. **PowerShell** (`.ps1`) - Works on Windows, macOS, Linux
2. **Bash** (`.sh`) - Works on macOS, Linux, WSL

## File Naming Convention

Use the same base name with different extensions:
- `script-name.ps1` - PowerShell version
- `script-name.sh` - Bash version

## Platform-Specific Guidelines

### PowerShell Scripts (.ps1)

**Header:**
```powershell
#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Brief description

.DESCRIPTION
    Detailed description

.PARAMETER ParamName
    Parameter description

.EXAMPLE
    ./script.ps1 -Param value
#>

param(
    [string]$Param = "default"
)
```

**Best Practices:**
- Use `#!/usr/bin/env pwsh` shebang for cross-platform
- Use approved verbs (Get-, Set-, New-, etc.)
- Include parameter validation
- Use `Write-Host` with colors for user feedback
- Handle errors with `try/catch` or `$LASTEXITCODE`
- Use `param()` block for parameters

**Error Handling:**
```powershell
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error occurred" -ForegroundColor Red
    exit 1
}
```

### Bash Scripts (.sh)

**Header:**
```bash
#!/usr/bin/env bash
#
# Brief description
#
# Usage:
#   ./script.sh ARG1 [ARG2]
#

set -euo pipefail
```

**Best Practices:**
- Use `#!/usr/bin/env bash` shebang
- Always use `set -euo pipefail` for safety
  - `e`: Exit on error
  - `u`: Error on undefined variable
  - `o pipefail`: Exit on pipe failure
- Use color codes for output consistency
- Validate inputs before processing
- Use functions for reusable logic
- Make executable with `git update-index --chmod=+x script.sh`

**Color Codes:**
```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}Success${NC}"
```

## Common Patterns

### Parameter Handling

**PowerShell:**
```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Required,
    
    [string]$Optional = "default"
)
```

**Bash:**
```bash
REQUIRED="${1:-}"
OPTIONAL="${2:-default}"

if [[ -z "$REQUIRED" ]]; then
    echo "Error: Required parameter missing"
    exit 1
fi
```

### GitHub CLI Usage

Both scripts should use `gh` CLI for consistency:

```powershell
# PowerShell
gh api repos/owner/repo --jq '.field'
```

```bash
# Bash
gh api repos/owner/repo --jq '.field'
```

### Cross-Platform Paths

**PowerShell:**
```powershell
# Use Join-Path for cross-platform paths
$path = Join-Path $PSScriptRoot "subdir" "file.txt"
```

**Bash:**
```bash
# Use forward slashes (work on all platforms)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
path="$SCRIPT_DIR/subdir/file.txt"
```

## Testing

Test both versions on:
- ✅ Windows (PowerShell 7+)
- ✅ macOS (bash, zsh)
- ✅ Linux (bash)

## Examples

See existing scripts:
- `scripts/setup-repo-standards.ps1` (PowerShell)
- `scripts/setup-repo-standards.sh` (Bash)

Both scripts provide identical functionality with platform-appropriate idioms.

## Git Configuration

For bash scripts, set executable bit via Git (works on Windows too):

```bash
git update-index --chmod=+x scripts/script-name.sh
```

This ensures the executable bit is tracked in Git and works across all platforms.

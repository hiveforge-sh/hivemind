#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Apply hivemind repository standards to other repositories

.DESCRIPTION
    This script configures a repository with the same standards as hivemind:
    - Enables auto-merge
    - Sets up branch protection rules
    - Configures Dependabot auto-merge workflow

.PARAMETER Owner
    The GitHub organization or user (default: hiveforge-sh)

.PARAMETER Repo
    The repository name to configure

.PARAMETER Branch
    The branch to protect (default: main)

.EXAMPLE
    .\setup-repo-standards.ps1 -Repo my-project
    .\setup-repo-standards.ps1 -Repo my-project -Branch master
#>

param(
    [string]$Owner = "hiveforge-sh",
    [string]$Repo,
    [string]$Branch = "main"
)

if (-not $Repo) {
    Write-Host "Error: -Repo parameter is required" -ForegroundColor Red
    Write-Host "Usage: .\setup-repo-standards.ps1 -Repo <repository-name>"
    exit 1
}

$fullRepo = "$Owner/$Repo"

Write-Host "🔧 Configuring repository: $fullRepo" -ForegroundColor Cyan
Write-Host ""

# 1. Enable auto-merge
Write-Host "✓ Enabling auto-merge..." -ForegroundColor Yellow
gh repo edit $fullRepo --enable-auto-merge
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Failed to enable auto-merge" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Auto-merge enabled" -ForegroundColor Green

# 2. Set up branch protection
Write-Host "✓ Setting up branch protection on '$Branch'..." -ForegroundColor Yellow

$protection = @{
    required_status_checks = $null
    enforce_admins = $false
    required_pull_request_reviews = $null
    restrictions = $null
    allow_force_pushes = $false
    allow_deletions = $false
    required_linear_history = $false
    required_conversation_resolution = $false
} | ConvertTo-Json -Compress

try {
    $protection | gh api -X PUT "repos/$fullRepo/branches/$Branch/protection" --input - | Out-Null
    Write-Host "  ✅ Branch protection configured" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to set branch protection: $_" -ForegroundColor Red
    exit 1
}

# 3. Check for Dependabot auto-merge workflow
Write-Host "✓ Checking Dependabot auto-merge workflow..." -ForegroundColor Yellow

$workflowPath = ".github/workflows/dependabot-auto-merge.yml"
$hasWorkflow = gh api "repos/$fullRepo/contents/$workflowPath" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Dependabot auto-merge workflow exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Dependabot auto-merge workflow not found" -ForegroundColor Yellow
    Write-Host "     Copy from hivemind: .github/workflows/dependabot-auto-merge.yml" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Repository configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Copy workflow files from hivemind if needed:"
Write-Host "     - .github/workflows/dependabot-auto-merge.yml"
Write-Host "     - .github/workflows/test.yml (customize for your project)"
Write-Host "     - .github/dependabot.yml"
Write-Host ""
Write-Host "  2. Update branch protection with required status checks:"
Write-Host "     gh api -X PUT repos/$fullRepo/branches/$Branch/protection \\"
Write-Host "       --input protection.json"
Write-Host ""

# Hivemind Vault Migration Script
# Adds Hivemind frontmatter fields to existing Obsidian notes
# Preserves existing frontmatter and content

param(
    [string]$VaultPath = "F:\Heimdall-Dropbox\Obsidian Vaults\DND-Wayward Watch\DND Wayward Watch",
    [switch]$DryRun = $false,
    [switch]$CreateBackup = $true
)

# Color output helpers
function Write-Success { param([string]$msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Info { param([string]$msg) Write-Host "→ $msg" -ForegroundColor Cyan }
function Write-Warn { param([string]$msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Err { param([string]$msg) Write-Host "✗ $msg" -ForegroundColor Red }

# Folder to Hivemind type mapping
$folderTypeMap = @{
    'People' = 'character'
    'Places' = 'location'
    'Organizations' = 'faction'
    'Creatures' = 'lore'
    'Events' = 'event'
    'Quests' = 'event'
    'Loot' = 'asset'
    'Sessions' = 'lore'
}

# Generate ID from filename
function Get-HivemindId {
    param([string]$fileName, [string]$type)
    
    $base = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
    $normalized = $base.ToLower() -replace '\s+', '-' -replace '[^\w\-]', ''
    
    return "$type-$normalized"
}

# Parse existing frontmatter
function Get-Frontmatter {
    param([string]$content)
    
    if ($content -match '^---\r?\n(.*?)\r?\n---\r?\n(.*)$(?s)') {
        return @{
            HasFrontmatter = $true
            Frontmatter = $matches[1]
            Body = $matches[2]
        }
    }
    
    return @{
        HasFrontmatter = $false
        Frontmatter = ""
        Body = $content
    }
}

# Check if frontmatter already has Hivemind fields
function Test-HasHivemindFields {
    param([string]$frontmatter)
    
    $hasId = $frontmatter -match '(?m)^id:\s*'
    $hasType = $frontmatter -match '(?m)^type:\s*'
    $hasStatus = $frontmatter -match '(?m)^status:\s*'
    
    return @{
        HasId = $hasId
        HasType = $hasType
        HasStatus = $hasStatus
        IsComplete = $hasId -and $hasType -and $hasStatus
    }
}

# Add Hivemind fields to frontmatter
function Add-HivemindFields {
    param(
        [string]$frontmatter,
        [string]$id,
        [string]$type,
        [string]$title
    )
    
    $today = Get-Date -Format "yyyy-MM-dd"
    $lines = $frontmatter -split "`n"
    $newLines = @()
    
    $hasId = $false
    $hasType = $false
    $hasStatus = $false
    $hasTitle = $false
    $hasCreated = $false
    $hasUpdated = $false
    
    foreach ($line in $lines) {
        if ($line -match '^id:\s*') { $hasId = $true }
        if ($line -match '^type:\s*') { $hasType = $true }
        if ($line -match '^status:\s*') { $hasStatus = $true }
        if ($line -match '^title:\s*') { $hasTitle = $true }
        if ($line -match '^created:\s*') { $hasCreated = $true }
        if ($line -match '^updated:\s*') { $hasUpdated = $true }
        
        $newLines += $line
    }
    
    # Add missing fields at the beginning
    $fieldsToAdd = @()
    if (-not $hasId) { $fieldsToAdd += "id: $id" }
    if (-not $hasType) { $fieldsToAdd += "type: $type" }
    if (-not $hasStatus) { $fieldsToAdd += "status: canon" }
    if (-not $hasTitle) { $fieldsToAdd += "title: $title" }
    if (-not $hasCreated) { $fieldsToAdd += "created: `"$today`"" }
    if (-not $hasUpdated) { $fieldsToAdd += "updated: `"$today`"" }
    
    if ($fieldsToAdd.Count -gt 0) {
        $result = $fieldsToAdd -join "`n"
        if ($newLines.Count -gt 0 -and $newLines[0].Trim() -ne '') {
            $result += "`n" + ($newLines -join "`n")
        }
        return $result
    }
    
    return $frontmatter
}

# Process a single file
function Process-File {
    param(
        [string]$filePath,
        [string]$type,
        [hashtable]$stats
    )
    
    $fileName = [System.IO.Path]::GetFileName($filePath)
    $relativePath = $filePath.Replace($VaultPath, '').TrimStart('\')
    
    Write-Info "Processing: $relativePath"
    
    try {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $parsed = Get-Frontmatter -content $content
        $title = [System.IO.Path]::GetFileNameWithoutExtension($fileName)
        $id = Get-HivemindId -fileName $fileName -type $type
        
        if ($parsed.HasFrontmatter) {
            $check = Test-HasHivemindFields -frontmatter $parsed.Frontmatter
            
            if ($check.IsComplete) {
                Write-Warn "  Already has Hivemind fields, skipping"
                $stats.Skipped++
                return
            }
            
            $newFrontmatter = Add-HivemindFields -frontmatter $parsed.Frontmatter -id $id -type $type -title $title
            $newContent = "---`n$newFrontmatter`n---`n$($parsed.Body)"
        }
        else {
            $today = Get-Date -Format "yyyy-MM-dd"
            $frontmatter = @"
id: $id
type: $type
status: canon
title: $title
created: "$today"
updated: "$today"
"@
            $newContent = "---`n$frontmatter`n---`n$content"
        }
        
        if (-not $DryRun) {
            Set-Content $filePath -Value $newContent -Encoding UTF8 -NoNewline
            Write-Success "  Added Hivemind fields (id: $id, type: $type)"
            $stats.Modified++
        }
        else {
            Write-Success "  [DRY RUN] Would add: id=$id, type=$type"
            $stats.Modified++
        }
    }
    catch {
        Write-Err "  Failed: $_"
        $stats.Failed++
    }
}

# Main
Write-Host "`n═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🔧 Hivemind Vault Migration Script" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

if (-not (Test-Path $VaultPath)) {
    Write-Err "Vault path not found: $VaultPath"
    exit 1
}

Write-Info "Vault: $VaultPath"
Write-Info "Mode: $(if ($DryRun) { 'DRY RUN (no changes)' } else { 'LIVE (will modify files)' })"
Write-Info "Backup: $(if ($CreateBackup) { 'Yes' } else { 'No' })"
Write-Host ""

if ($CreateBackup -and -not $DryRun) {
    $backupDir = Join-Path (Split-Path $VaultPath -Parent) ".hivemind-backup-$(Split-Path $VaultPath -Leaf)-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Info "Creating backup: $backupDir"
    Copy-Item $VaultPath -Destination $backupDir -Recurse -Exclude ".git",".obsidian",".trash","node_modules",".hivemind-backup-*"
    Write-Success "Backup created successfully"
    Write-Host ""
}

$stats = @{
    Total = 0
    Modified = 0
    Skipped = 0
    Failed = 0
}

foreach ($folderName in $folderTypeMap.Keys) {
    $folderPath = Join-Path $VaultPath $folderName
    
    if (-not (Test-Path $folderPath)) {
        Write-Warn "Folder not found: $folderName (skipping)"
        continue
    }
    
    $type = $folderTypeMap[$folderName]
    Write-Host "`n📁 Processing folder: $folderName (type: $type)" -ForegroundColor Yellow
    
    $files = Get-ChildItem $folderPath -Filter *.md -Recurse
    
    foreach ($file in $files) {
        $stats.Total++
        Process-File -filePath $file.FullName -type $type -stats $stats
    }
}

Write-Host "`n═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   📊 Migration Summary" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Total files processed: $($stats.Total)" -ForegroundColor White
Write-Success "Modified: $($stats.Modified)"
Write-Warn "Skipped (already complete): $($stats.Skipped)"
if ($stats.Failed -gt 0) {
    Write-Err "Failed: $($stats.Failed)"
}

if ($DryRun) {
    Write-Host "`n💡 This was a DRY RUN. No files were modified." -ForegroundColor Yellow
    Write-Host "   Run again without -DryRun to apply changes.`n" -ForegroundColor Yellow
}
else {
    Write-Host "`n✅ Migration complete!" -ForegroundColor Green
    Write-Host "   Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Restart Hivemind: node dist/index.js" -ForegroundColor White
    Write-Host "   2. Check database indexing" -ForegroundColor White
    Write-Host "   3. Ask Claude about your DND world!`n" -ForegroundColor White
}

Write-Host "═══════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

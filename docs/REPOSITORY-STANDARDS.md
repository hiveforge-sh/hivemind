# Repository Standards

This repository follows the `hiveforge-sh` organization standards for CI/CD, security, and automation.

## Quick Setup for New Repositories

**Recommended:** Use the centralized [hiveforge-sh/scripts](https://github.com/hiveforge-sh/scripts) repository:

**Windows (PowerShell):**
```powershell
# Download and run
Invoke-WebRequest https://raw.githubusercontent.com/hiveforge-sh/scripts/master/setup-repo/setup-repo-standards.ps1 -OutFile setup.ps1
./setup.ps1 -Repo your-repo-name
Remove-Item setup.ps1
```

**macOS/Linux (Bash):**
```bash
# Download and run
curl -sSL https://raw.githubusercontent.com/hiveforge-sh/scripts/master/setup-repo/setup-repo-standards.sh | bash -s your-repo-name
```

**Or use local scripts from this repository:**

**Windows (PowerShell):**
```powershell
# From the hivemind repository
./scripts/setup-repo-standards.ps1 -Repo your-repo-name

# For repositories with 'master' branch instead of 'main'
./scripts/setup-repo-standards.ps1 -Repo your-repo-name -Branch master
```

**macOS/Linux (Bash):**
```bash
# From the hivemind repository
./scripts/setup-repo-standards.sh your-repo-name

# For repositories with 'master' branch instead of 'main'
./scripts/setup-repo-standards.sh your-repo-name master
```

## What Gets Configured

### 1. Auto-merge Feature
- Enables GitHub's auto-merge button on pull requests
- Allows Dependabot PRs to merge automatically after CI passes

### 2. Branch Protection Rules
- Protects default branch (main/master)
- Prevents force pushes and branch deletion
- Requires status checks to pass (configure per-repo)
- Admins can bypass rules when needed

### 3. Dependabot Auto-merge
- Automatically merges minor and patch dependency updates
- Only merges after all CI checks pass
- Uses squash merge to keep history clean

## Manual Setup (Alternative)

### Organization-Level Settings (One-time)

Configure these at https://github.com/organizations/hiveforge-sh/settings:

1. **Member privileges**
   - Base permissions: Read (default)
   - Allow members to create repositories: Enable as needed

2. **Dependabot**
   - Enable Dependabot alerts: ✅
   - Enable Dependabot security updates: ✅

3. **Code security and analysis**
   - Dependency graph: ✅
   - Secret scanning: ✅
   - Code scanning (CodeQL): ✅ for public repos

### Repository-Level Settings (Per-repo)

1. **Enable auto-merge:**
   ```bash
   gh repo edit OWNER/REPO --enable-auto-merge
   ```

2. **Set up branch protection:**
   ```bash
   gh api -X PUT repos/OWNER/REPO/branches/BRANCH/protection \
     --input .github/branch-protection.json
   ```

3. **Copy workflow files from hivemind:**
   - `.github/workflows/dependabot-auto-merge.yml` - Auto-merge Dependabot PRs
   - `.github/workflows/test.yml` - CI/CD template (customize for your stack)
   - `.github/dependabot.yml` - Dependency update schedule

## Repository Template

For new projects, use the workflow files from this repository as a template:

```bash
# Clone hivemind
git clone https://github.com/hiveforge-sh/hivemind.git

# Copy workflow files to your new project
cp -r hivemind/.github/workflows your-project/.github/
cp hivemind/.github/dependabot.yml your-project/.github/

# Customize for your project
# Edit .github/workflows/test.yml with your build/test commands
```

## Standard Workflows

### `dependabot-auto-merge.yml`
- Runs on Dependabot PRs
- Auto-merges patch/minor updates
- Waits for CI to pass

### `test.yml` (Template)
- Multi-OS testing (Ubuntu, Windows, macOS)
- Multi-version testing (Node 20, 22)
- Concurrency control (cancels redundant runs)
- Job timeouts (prevents hanging workflows)
- Explicit lint and type-check steps

### `release.yml` (Optional)
- Semantic versioning with semantic-release
- Automated NPM publishing
- CodeQL security scanning
- Provenance attestation

## Branch Protection Template

Recommended settings for `main`/`master` branch:

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Test (ubuntu-latest, 20)",
      "Lint",
      "Build"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

Customize the `contexts` array with your CI job names.

## Testing the Setup

After configuration, create a test PR or wait for Dependabot:

```bash
# Check branch protection
gh api repos/OWNER/REPO/branches/BRANCH/protection

# List workflows
gh workflow list -R OWNER/REPO

# Check auto-merge setting
gh repo view OWNER/REPO --json autoMergeAllowed
```

## Troubleshooting

### Auto-merge not working?
- Verify auto-merge is enabled: `gh repo view --json autoMergeAllowed`
- Check branch protection rules exist
- Ensure required status checks are passing
- Verify Dependabot workflow has correct permissions

### Branch protection API errors?
- Branch must exist before protecting it
- Push at least one commit to the default branch
- Use correct branch name (main vs master)

### Workflows not running?
- Check workflow file syntax: `gh workflow view WORKFLOW`
- Verify permissions in workflow file
- Check repository settings → Actions → Allow all actions

## Further Reading

- [HiveForge Scripts Repository](https://github.com/hiveforge-sh/scripts) - Centralized automation scripts
- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

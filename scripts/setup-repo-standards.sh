#!/usr/bin/env bash
#
# Apply hivemind repository standards to other repositories
#
# Usage:
#   ./setup-repo-standards.sh REPO [BRANCH]
#   ./setup-repo-standards.sh my-project
#   ./setup-repo-standards.sh my-project master
#

set -euo pipefail

# Default values
OWNER="${GITHUB_ORG:-hiveforge-sh}"
REPO="${1:-}"
BRANCH="${2:-main}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Functions
error() {
    echo -e "${RED}❌ $1${NC}" >&2
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${CYAN}$1${NC}"
}

step() {
    echo -e "${YELLOW}✓ $1${NC}"
}

# Validate inputs
if [[ -z "$REPO" ]]; then
    error "Repository name is required\nUsage: $0 <repository-name> [branch]"
fi

FULL_REPO="$OWNER/$REPO"

info "🔧 Configuring repository: $FULL_REPO"
echo ""

# 1. Check and enable auto-merge
step "Checking auto-merge..."
ALLOW_AUTO_MERGE=$(gh api "repos/$FULL_REPO" --jq '.allow_auto_merge')
if [[ "$ALLOW_AUTO_MERGE" == "true" ]]; then
    success "  Auto-merge already enabled (skipped)"
else
    if gh repo edit "$FULL_REPO" --enable-auto-merge >/dev/null 2>&1; then
        success "  Auto-merge enabled"
    else
        error "  Failed to enable auto-merge"
    fi
fi

# 2. Check and set up branch protection
step "Checking branch protection on '$BRANCH'..."
if gh api "repos/$FULL_REPO/branches/$BRANCH/protection" >/dev/null 2>&1; then
    success "  Branch protection already exists (skipped)"
    echo -e "${GRAY}     To update: gh api -X PUT repos/$FULL_REPO/branches/$BRANCH/protection --input protection.json${NC}"
else
    PROTECTION='{
        "required_status_checks": null,
        "enforce_admins": false,
        "required_pull_request_reviews": null,
        "restrictions": null,
        "allow_force_pushes": false,
        "allow_deletions": false,
        "required_linear_history": false,
        "required_conversation_resolution": false
    }'
    
    if echo "$PROTECTION" | gh api -X PUT "repos/$FULL_REPO/branches/$BRANCH/protection" --input - >/dev/null 2>&1; then
        success "  Branch protection configured"
    else
        error "  Failed to set branch protection"
    fi
fi

# 3. Check for Dependabot auto-merge workflow
step "Checking Dependabot auto-merge workflow..."
WORKFLOW_PATH=".github/workflows/dependabot-auto-merge.yml"
if gh api "repos/$FULL_REPO/contents/$WORKFLOW_PATH" >/dev/null 2>&1; then
    success "  Dependabot auto-merge workflow exists"
else
    warning "  Dependabot auto-merge workflow not found"
    echo -e "${GRAY}     Copy from hivemind: .github/workflows/dependabot-auto-merge.yml${NC}"
fi

echo ""
info "🎉 Repository configuration complete!"
echo ""
info "Configuration summary:"

# Get repository info
REPO_INFO=$(gh api "repos/$FULL_REPO" --jq '{name, url, allow_auto_merge}')
REPO_NAME=$(echo "$REPO_INFO" | jq -r '.name')
REPO_URL=$(echo "$REPO_INFO" | jq -r '.url')
AUTO_MERGE=$(echo "$REPO_INFO" | jq -r '.allow_auto_merge')

echo "  Repository: $REPO_NAME"
echo "  URL: $REPO_URL"
echo "  Auto-merge: $AUTO_MERGE"

# Get protection info
if PROTECTION_INFO=$(gh api "repos/$FULL_REPO/branches/$BRANCH/protection" 2>/dev/null); then
    STATUS_COUNT=$(echo "$PROTECTION_INFO" | jq -r '.required_status_checks.contexts | length')
    FORCE_PUSH=$(echo "$PROTECTION_INFO" | jq -r '.allow_force_pushes.enabled')
    DELETE=$(echo "$PROTECTION_INFO" | jq -r '.allow_deletions.enabled')
    
    echo "  Branch: $BRANCH (protected)"
    echo "  Status checks: $STATUS_COUNT required"
    echo "  Force pushes: $(if [[ "$FORCE_PUSH" == "false" ]]; then echo "blocked"; else echo "allowed"; fi)"
    echo "  Delete branch: $(if [[ "$DELETE" == "false" ]]; then echo "blocked"; else echo "allowed"; fi)"
fi

echo ""
info "Next steps:"
echo "  1. Copy workflow files from hivemind if needed:"
echo "     - .github/workflows/dependabot-auto-merge.yml"
echo "     - .github/workflows/test.yml (customize for your project)"
echo "     - .github/dependabot.yml"
echo ""
echo "  2. Update branch protection with required status checks:"
echo "     gh api -X PUT repos/$FULL_REPO/branches/$BRANCH/protection \\"
echo "       --input protection.json"
echo ""

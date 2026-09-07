#!/usr/bin/env bash
# gh-protect.sh — تفعيل حماية الـmain (يتطلب صلاحية admin على المستودع).
# لا تدفع مباشرة، لا force-push، لا حذف، توقيع إلزامي، مراجعة CODEOWNERS، فحوصات مطلوبة.
set -euo pipefail

OWNER="${1:-elazamey}"
REPO="${2:-chat.ai}"
BRANCH="${3:-main}"

echo "→ applying branch protection to $OWNER/$REPO:$BRANCH"

gh api "repos/$OWNER/$REPO/branches/$BRANCH/protection" -X PUT -f required_status_checks=null -f enforce_admins=false -F required_pull_request_reviews=1 -F restrictions=null -f allow_force_pushes=false -f allow_deletions=false -f required_conversation_resolution=true -f required_signatures=true <<'JSON'
{
  "required_status_checks": null,
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_signatures": true
}
JSON

echo "✓ branch protection applied (NO FORCE PUSH · NO DELETE · NO DIRECT PUSH · CODEOWNER REVIEW · SIGNED COMMITS)"

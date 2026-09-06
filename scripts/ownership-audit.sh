#!/usr/bin/env bash
# ownership-audit.sh — مراقبة مضادة للاستحواذ (Anti-Takeover).
# يقارن الحالة الفعلية على GitHub بهوية المشروع المعلنة، ويطلق OWNERSHIP_ALERT عند أي انحراف.
set -uo pipefail

OWNER_DECLARED="elazamey"
REPO="chat.ai"
ALERT=0

echo "== Celia ownership audit =="

# 1) مالك المستودع الفعلي
ACTUAL_OWNER="$(gh api "repos/$OWNER_DECLARED/$REPO" --jq '.owner.login' 2>/dev/null || echo 'UNKNOWN')"
if [ "$ACTUAL_OWNER" != "$OWNER_DECLARED" ]; then
  echo "OWNERSHIP_ALERT: repository owner changed: declared=$OWNER_DECLARED actual=$ACTUAL_OWNER"
  ALERT=1
else
  echo "✓ repository owner: $ACTUAL_OWNER"
fi

# 2) حماية الفرع الرئيسي
if gh api "repos/$OWNER_DECLARED/$REPO/branches/main/protection" >/dev/null 2>&1; then
  echo "✓ main branch is protected"
else
  echo "OWNERSHIP_ALERT: main branch protection is NOT enabled (run scripts/gh-protect.sh)"
  ALERT=1
fi

# 3) وجود الهوية والترخيص
for f in PROJECT_IDENTITY.yaml PROJECT_GENESIS.md LICENSE THIRD_PARTY_NOTICES.md .github/CODEOWNERS; do
  if [ -f "$f" ]; then echo "✓ $f present"; else echo "OWNERSHIP_ALERT: missing $f"; ALERT=1; fi
done

echo "== result: $([ $ALERT -eq 0 ] && echo OK || echo ALERTS_PRESENT) =="
exit $ALERT

#!/usr/bin/env bash
# invariant: exit 1 on any em-dash in repo prose, so the CLAUDE.md rule is enforced by a check, not by memory.
# hazard: a blind character swap passes this check and ruins the sentence; rewrite each hit by hand.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

# Built from bytes so this file never contains the character it bans.
DASH="$(printf '\342\200\224')"

hits="$(grep -rIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=assets \
  --include='*.md' --include='*.mdx' --include='*.yaml' --include='*.yml' \
  --include='*.sh' --include='*.mjs' --include='*.py' --include='*.json' \
  -e "$DASH" . || true)"

if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  printf '\ncheck-prose: FAIL (%s em-dashes)\n' "$(printf '%s\n' "$hits" | wc -l | tr -d ' ')"
  exit 1
fi
echo "check-prose: PASS"

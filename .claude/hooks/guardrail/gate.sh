#!/usr/bin/env bash
# PreToolUse(Edit|Write) guardrail: deny edits/writes until every required
# planning file has been opened with the Read tool in this session.
# Emits a PreToolUse permission decision as JSON; always exits 0.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJDIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STATE="$PROJDIR/.claude/.guardrail"
REQFILE="$SCRIPT_DIR/required-reads.txt"

input="$(cat)"
sid_raw="$(printf '%s' "$input" | jq -r '.session_id // "nosession"')"
sid="$(printf '%s' "$sid_raw" | tr -c 'A-Za-z0-9._-' '_')"
statefile="$STATE/$sid.read"

missing=""
while IFS= read -r req; do
  [ -z "$req" ] && continue
  grep -qxF "$req" "$statefile" 2>/dev/null || missing="${missing}  - ${req}"$'\n'
done < "$REQFILE"

# All read -> allow (no output, exit 0 lets the tool proceed normally).
[ -z "$missing" ] && exit 0

reason="BLOCKED by repo guardrail: read the planning docs before editing code.

Unread this session (open each with the Read tool):
${missing}
These define the binding charter (constitution.md), the active plan, phase-outs,
and known gotchas. Read them, then retry the edit. Disable via /hooks if this is
a trivial non-code session."

jq -nc --arg r "$reason" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0

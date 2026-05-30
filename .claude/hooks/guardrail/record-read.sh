#!/usr/bin/env bash
# PostToolUse(Read) guardrail: when one of the required planning files is read
# with the Read tool, record it against this session so the gate can unlock.
# Always exits 0 silently — never interferes with the Read.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJDIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STATE="$PROJDIR/.claude/.guardrail"
REQFILE="$SCRIPT_DIR/required-reads.txt"

input="$(cat)"
sid_raw="$(printf '%s' "$input" | jq -r '.session_id // "nosession"')"
sid="$(printf '%s' "$sid_raw" | tr -c 'A-Za-z0-9._-' '_')"
fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
[ -z "$fp" ] && exit 0

# Normalize: lowercase, backslashes -> forward slashes.
norm() { printf '%s' "$1" | tr 'A-Z\\' 'a-z/'; }
fp_norm="$(norm "$fp")"

mkdir -p "$STATE"
statefile="$STATE/$sid.read"

while IFS= read -r req; do
  [ -z "$req" ] && continue
  req_norm="$(norm "$req")"
  case "$fp_norm" in
    *"$req_norm")
      grep -qxF "$req" "$statefile" 2>/dev/null || printf '%s\n' "$req" >> "$statefile"
      ;;
  esac
done < "$REQFILE"

exit 0
